from functools import wraps
from flask import request, jsonify
import jwt
import os
from datetime import datetime
from supabase import create_client, Client

# Inicializar cliente de Supabase para consultas internas
url_supabase = os.environ.get('SUPABASE_URL')
clave_supabase = os.environ.get('SUPABASE_KEY')
supabase_cliente = create_client(url_supabase, clave_supabase) if url_supabase and clave_supabase else None

JWT_SECRET = os.environ.get('SUPABASE_JWT_SECRET', 'clave_super_secreta_desarrollo')

def requerir_autenticacion_y_suscripcion(f):
    @wraps(f)
    def decorador(*args, **kwargs):
        token = None
        
        # Verificar si el token está en el header de autorización
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({"error": "Token de autorización faltante"}), 401

        try:
            # Obtener el usuario autenticado directamente a través de Supabase Auth
            # Esto evita problemas con el algoritmo de firma del JWT (ej. HS256 vs ES256)
            if supabase_cliente:
                try:
                    res_usuario = supabase_cliente.auth.get_user(token)
                    id_usuario = res_usuario.user.id
                    correo_usuario = res_usuario.user.email
                except Exception as auth_err:
                    return jsonify({"error": f"Token inválido o expirado en Supabase Auth: {str(auth_err)}"}), 401
            else:
                # Decodificación local sin firma si no está inicializado el cliente (solo desarrollo)
                datos_token = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
                id_usuario = datos_token.get('sub')
                correo_usuario = datos_token.get('email')
            
            if not id_usuario:
                return jsonify({"error": "El token no contiene información válida del usuario"}), 401
            
            # Si el usuario es el SuperAdmin, configuramos permisos directamente
            if correo_usuario == 'superadmin@gympross.com':
                request.id_gimnasio_seguro = None
                request.rol_usuario_seguro = 'superadmin'
                return f(*args, **kwargs)
            
            if not supabase_cliente:
                return jsonify({"error": "Cliente de Supabase no configurado en el backend"}), 500
                
            try:
                # Consultar la tabla usuarios_personal y gimnasios en una sola llamada (join) para mayor velocidad
                respuesta = supabase_cliente.table('usuarios_personal') \
                    .select('id_gimnasio, rol_usuario, gimnasios(estado_suscripcion, fecha_vencimiento)') \
                    .eq('id_usuario', id_usuario) \
                    .maybe_single() \
                    .execute()
                    
                if not respuesta.data:
                    return jsonify({"error": "El usuario no tiene un perfil registrado en el gimnasio"}), 403
                    
                id_gimnasio = respuesta.data.get('id_gimnasio')
                rol_usuario = respuesta.data.get('rol_usuario')
                gimnasio_datos = respuesta.data.get('gimnasios')
                
                if not gimnasio_datos:
                    return jsonify({"error": "El gimnasio asignado al usuario no existe"}), 404
            except Exception as e:
                # Fallback si el join falla por temas de esquema
                respuesta = supabase_cliente.table('usuarios_personal') \
                    .select('id_gimnasio, rol_usuario') \
                    .eq('id_usuario', id_usuario) \
                    .maybe_single() \
                    .execute()
                    
                if not respuesta.data:
                    return jsonify({"error": "El usuario no tiene un perfil registrado en el gimnasio"}), 403
                    
                id_gimnasio = respuesta.data.get('id_gimnasio')
                rol_usuario = respuesta.data.get('rol_usuario')
                
                # Consultar la tabla gimnasios para validar suscripción
                respuesta_gimnasio = supabase_cliente.table('gimnasios') \
                    .select('estado_suscripcion, fecha_vencimiento') \
                    .eq('id_gimnasio', id_gimnasio) \
                    .maybe_single() \
                    .execute()
                    
                if not respuesta_gimnasio.data:
                    return jsonify({"error": "El gimnasio asignado al usuario no existe"}), 404
                    
                gimnasio_datos = respuesta_gimnasio.data
            
            if gimnasio_datos.get('estado_suscripcion') == 'suspendido':
                return jsonify({"error": "Suscripción suspendida. Contacte al administrador."}), 403
                
            fecha_vencimiento_str = gimnasio_datos.get('fecha_vencimiento')
            if fecha_vencimiento_str:
                # Normalizar formato de zona horaria Z a +00:00 para Python
                if fecha_vencimiento_str.endswith('Z'):
                    fecha_vencimiento_str = fecha_vencimiento_str[:-1] + '+00:00'
                
                fecha_vencimiento = datetime.fromisoformat(fecha_vencimiento_str)
                # Comparar con fecha y hora actual en la misma zona horaria
                if datetime.now(fecha_vencimiento.tzinfo) > fecha_vencimiento:
                    return jsonify({"error": "Suscripción vencida. Contacte al administrador."}), 403

            # Inyectar las variables validadas y seguras en la petición para uso en controladores
            request.id_gimnasio_seguro = id_gimnasio
            request.rol_usuario_seguro = rol_usuario
            request.id_usuario_seguro = id_usuario

        except jwt.ExpiredSignatureError:
            return jsonify({"error": "El token ha expirado"}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({"error": f"Token inválido: {str(e)}"}), 401
        except Exception as e:
            return jsonify({"error": f"Error interno en el intermediario de autenticación: {str(e)}"}), 500
            
        return f(*args, **kwargs)
    
    return decorador

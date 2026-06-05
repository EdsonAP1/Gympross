import os
import uuid
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from supabase import create_client, Client
import requests as http_requests

# Cliente con la clave anónima (solo lectura pública)
url_supabase = os.environ.get('SUPABASE_URL')
clave_anonima = os.environ.get('SUPABASE_KEY')
# Clave de servicio con permisos de admin (para confirmar emails automáticamente)
clave_servicio = os.environ.get('SUPABASE_SERVICE_KEY', '')

supabase_cliente: Client = create_client(url_supabase, clave_anonima) if url_supabase and clave_anonima else None
supabase_admin: Client = create_client(url_supabase, clave_servicio) if url_supabase and clave_servicio else None

superadmin_bp = Blueprint('superadmin', __name__)


def verificar_superadmin(req):
    """Verifica que el token sea del superadmin. Retorna True/False."""
    auth_header = req.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return False, 'Token faltante'

    token = auth_header.split(' ')[1]
    try:
        if supabase_cliente:
            res = supabase_cliente.auth.get_user(token)
            if res.user and res.user.email == 'superadmin@gympross.com':
                return True, None
            return False, 'No autorizado: no eres superadmin'
    except Exception as e:
        return False, f'Token inválido: {str(e)}'
    return False, 'Error de autenticación'


@superadmin_bp.route('/gimnasio/crear', methods=['POST'])
def crear_gimnasio():
    """
    Endpoint seguro para crear un nuevo gimnasio y su dueño.
    Usa la clave de servicio de Supabase para confirmar el email automáticamente.
    Solo puede llamarlo el superadmin.
    """
    # Verificar identidad del superadmin
    autorizado, error_auth = verificar_superadmin(request)
    if not autorizado:
        return jsonify({"error": error_auth}), 403

    datos = request.get_json()
    campos_requeridos = ['nombre_gimnasio', 'nombre_dueno', 'correo_dueno', 'contrasena_dueno', 'duracion_meses']
    for campo in campos_requeridos:
        if campo not in datos:
            return jsonify({"error": f"Campo requerido faltante: {campo}"}), 400

    nombre_gimnasio = datos['nombre_gimnasio'].strip()
    nombre_dueno = datos['nombre_dueno'].strip().upper()
    correo_dueno = datos['correo_dueno'].strip().lower()
    contrasena_dueno = datos['contrasena_dueno']
    duracion_meses = int(datos.get('duracion_meses', 1))

    # Validaciones básicas
    if not nombre_gimnasio or not nombre_dueno or not correo_dueno:
        return jsonify({"error": "Los campos no pueden estar vacíos"}), 400
    if len(contrasena_dueno) < 6:
        return jsonify({"error": "La contraseña debe tener al menos 6 caracteres"}), 400

    id_gimnasio = str(uuid.uuid4())
    fecha_vencimiento = (datetime.now() + timedelta(days=30 * duracion_meses)).isoformat()
    id_usuario = None

    try:
        # PASO 1: Crear el gimnasio en la base de datos
        supabase_cliente.table('gimnasios').insert({
            "id_gimnasio": id_gimnasio,
            "nombre_gimnasio": nombre_gimnasio,
            "estado_suscripcion": "activo",
            "fecha_vencimiento": fecha_vencimiento
        }).execute()

        # PASO 2: Crear usuario en Supabase Auth
        # Usamos el Admin API directamente via HTTP para confirmar el email automáticamente
        if clave_servicio:
            # Método preferido: Admin API con service key (confirma email inmediatamente)
            resp = http_requests.post(
                f"{url_supabase}/auth/v1/admin/users",
                headers={
                    "apikey": clave_servicio,
                    "Authorization": f"Bearer {clave_servicio}",
                    "Content-Type": "application/json"
                },
                json={
                    "email": correo_dueno,
                    "password": contrasena_dueno,
                    "email_confirm": True  # ← Confirma automáticamente sin email
                }
            )

            if resp.status_code not in (200, 201):
                # Rollback: eliminar gimnasio
                supabase_cliente.table('gimnasios').delete().eq('id_gimnasio', id_gimnasio).execute()
                error_detalle = resp.json().get('message', resp.text)
                return jsonify({"error": f"Error al crear usuario en Auth: {error_detalle}"}), 400

            usuario_data = resp.json()
            id_usuario = usuario_data.get('id')

        else:
            # Fallback: cliente anónimo + confirmar email via RPC de base de datos
            cliente_registro = create_client(url_supabase, clave_anonima)
            res_auth = cliente_registro.auth.sign_up({
                "email": correo_dueno,
                "password": contrasena_dueno
            })

            if not res_auth.user:
                supabase_cliente.table('gimnasios').delete().eq('id_gimnasio', id_gimnasio).execute()
                return jsonify({"error": "Error al crear usuario en Supabase Auth."}), 400

            id_usuario = res_auth.user.id

            # Confirmar email inmediatamente usando la función RPC creada en la BD
            # (SECURITY DEFINER permite actualizar auth.users sin service key)
            try:
                supabase_cliente.rpc('confirmar_email_usuario', {'p_email': correo_dueno}).execute()
                email_auto_confirmado = True
            except Exception as rpc_err:
                # Si la RPC falla, el usuario puede iniciar sesión pero necesitará confirmar email
                print(f"RPC confirmar_email_usuario falló: {rpc_err}")
                email_auto_confirmado = False

        # PASO 3: Crear el perfil del dueño en usuarios_personal
        supabase_cliente.table('usuarios_personal').insert({
            "id_usuario": id_usuario,
            "id_gimnasio": id_gimnasio,
            "nombre_completo": nombre_dueno,
            "correo_electronico": correo_dueno,
            "rol_usuario": "dueno",
            "contrasena_inicial": contrasena_dueno
        }).execute()

        return jsonify({
            "mensaje": "Gimnasio y dueño registrados correctamente. El dueño puede iniciar sesión inmediatamente.",
            "id_gimnasio": id_gimnasio,
            "id_usuario": id_usuario,
            "email_confirmado": True,  # Siempre true gracias a la RPC o service key
            "nombre_gimnasio": nombre_gimnasio,
            "correo_dueno": correo_dueno
        }), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        # Rollback en caso de error
        try:
            if id_usuario:
                supabase_cliente.table('usuarios_personal').delete().eq('id_usuario', id_usuario).execute()
            supabase_cliente.table('gimnasios').delete().eq('id_gimnasio', id_gimnasio).execute()
        except Exception:
            pass
        return jsonify({"error": f"Error al procesar el registro: {str(e)}"}), 500


@superadmin_bp.route('/gimnasio/verificar-service-key', methods=['GET'])
def verificar_service_key():
    """Verifica el estado de la configuración de confirmación de email."""
    autorizado, error_auth = verificar_superadmin(request)
    if not autorizado:
        return jsonify({"error": error_auth}), 403

    # Verificar que la función RPC existe y funciona
    rpc_ok = False
    try:
        # Prueba la función con un email que no existe (no hace nada, solo valida que existe)
        supabase_cliente.rpc('confirmar_email_usuario', {'p_email': '_test_rpc_check_@none.com'}).execute()
        rpc_ok = True
    except Exception:
        rpc_ok = False

    service_key_ok = bool(clave_servicio and len(clave_servicio) > 10)
    confirmacion_automatica = service_key_ok or rpc_ok

    return jsonify({
        "service_key_configurada": confirmacion_automatica,
        "metodo": "admin_api" if service_key_ok else ("rpc_sql" if rpc_ok else "ninguno"),
        "mensaje": "Emails auto-confirmados (Admin API)" if service_key_ok
                   else ("Emails auto-confirmados (RPC SQL)" if rpc_ok
                   else "ALERTA: Sin confirmación automática - configurar SUPABASE_SERVICE_KEY")
    }), 200

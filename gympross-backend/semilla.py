import os
import uuid
from dotenv import load_dotenv
from supabase import create_client, Client

def sembrar_base_datos():
    # Cargar variables de entorno
    load_dotenv()
    
    url_supabase = os.getenv("SUPABASE_URL")
    clave_anonima = os.getenv("SUPABASE_KEY")
    
    if not url_supabase or not clave_anonima:
        print("Error: SUPABASE_URL o SUPABASE_KEY no estan configuradas en el .env")
        return

    # Inicializar cliente de Supabase
    supabase: Client = create_client(url_supabase, clave_anonima)
    print("Conexion inicializada con Supabase.")

    # 1. Crear un gimnasio de prueba si no existe
    id_gimnasio = str(uuid.uuid4())
    nombre_gimnasio = "GymPross Central"
    
    # Comprobar si ya existe algún gimnasio
    gimnasios_existentes = supabase.table("gimnasios").select("*").execute()
    if len(gimnasios_existentes.data) > 0:
        id_gimnasio = gimnasios_existentes.data[0]["id_gimnasio"]
        nombre_gimnasio = gimnasios_existentes.data[0]["nombre_gimnasio"]
        print(f"Usando gimnasio existente: {nombre_gimnasio} ({id_gimnasio})")
    else:
        # Insertar gimnasio de prueba
        from datetime import datetime, timedelta
        fecha_vencimiento = (datetime.now() + timedelta(days=365)).isoformat()
        
        datos_gimnasio = {
            "id_gimnasio": id_gimnasio,
            "nombre_gimnasio": nombre_gimnasio,
            "estado_suscripcion": "activo",
            "fecha_vencimiento": fecha_vencimiento
        }
        supabase.table("gimnasios").insert(datos_gimnasio).execute()
        print(f"Gimnasio de prueba creado: {nombre_gimnasio} ({id_gimnasio})")

    # 2. Registrar usuarios en Supabase Auth
    credenciales_usuarios = [
        {"email": "superadmin@gympross.com", "password": "password123", "rol": "superadmin", "nombre": "Administrador Global"},
        {"email": "dueno@gympross.com", "password": "password123", "rol": "dueno", "nombre": "Juan Dueno"},
        {"email": "recepcion@gympross.com", "password": "password123", "rol": "recepcionista", "nombre": "Maria Recepcion"}
    ]

    usuarios_creados = []
    
    for cred in credenciales_usuarios:
        try:
            # Registrar usuario usando Auth
            respuesta_auth = supabase.auth.sign_up({
                "email": cred["email"],
                "password": cred["password"]
            })
            
            if respuesta_auth.user:
                id_usuario = respuesta_auth.user.id
                print(f"Usuario registrado en Auth: {cred['email']} con ID: {id_usuario}")
                usuarios_creados.append({
                    "id_usuario": id_usuario,
                    "email": cred["email"],
                    "rol": cred["rol"],
                    "nombre": cred["nombre"]
                })
        except Exception as e:
            # Si el usuario ya existe en auth, intentaremos buscarlo en auth.users a traves de sql o asumiremos el error.
            print(f"Nota: No se pudo registrar a {cred['email']} (es posible que ya exista). Detalle: {e}")

    # 3. Vincular los usuarios en la tabla public.usuarios_personal (excepto superadmin que no pertenece a un gimnasio especifico)
    for usuario in usuarios_creados:
        if usuario["rol"] == "superadmin":
            continue
            
        try:
            datos_personal = {
                "id_usuario": usuario["id_usuario"],
                "id_gimnasio": id_gimnasio,
                "nombre_completo": usuario["nombre"],
                "correo_electronico": usuario["email"],
                "rol_usuario": usuario["rol"]
            }
            supabase.table("usuarios_personal").insert(datos_personal).execute()
            print(f"Perfil de personal creado para: {usuario['email']} con rol: {usuario['rol']}")
        except Exception as e:
            print(f"No se pudo insertar en usuarios_personal para {usuario['email']}: {e}")

    print("\n--- PASO ADICIONAL REQUERIDO EN SQL ---")
    print("Ejecuta la siguiente consulta SQL en tu editor SQL de Supabase para confirmar manualmente los correos de prueba:")
    print("UPDATE auth.users SET email_confirmed_at = NOW(), confirmed_at = NOW();")
    print("----------------------------------------\n")

if __name__ == "__main__":
    sembrar_base_datos()

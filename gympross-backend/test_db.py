import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_KEY')
supabase = create_client(url, key)

res_gim = supabase.table('gimnasios').select('*').execute()
print("GIMNASIOS:")
for g in res_gim.data:
    print(f"ID: {g['id_gimnasio']} | Nombre: {g['nombre_gimnasio']} | Estado: {g['estado_suscripcion']} | Vence: {g['fecha_vencimiento']}")

res_usr = supabase.table('usuarios_personal').select('*').execute()
print("\nUSUARIOS PERSONAL:")
for u in res_usr.data:
    print(f"ID Usuario: {u['id_usuario']} | Gimnasio ID: {u['id_gimnasio']} | Nombre: {u['nombre_completo']} | Email: {u['correo_electronico']} | Rol: {u['rol_usuario']} | Clave Inicial: {u.get('contrasena_inicial', 'N/A')}")


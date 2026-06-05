import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

# Cargar variables de entorno (simulado por ahora)
load_dotenv()

# Inicialización de la aplicación
app = Flask(__name__)
CORS(app)

# Configuración básica
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'clave_super_secreta_desarrollo')

# Registro de controladores (Blueprints)
from app.controladores.recepcion_controlador import recepcion_bp
from app.controladores.superadmin_controlador import superadmin_bp
app.register_blueprint(recepcion_bp, url_prefix='/api/recepcion')
app.register_blueprint(superadmin_bp, url_prefix='/api/superadmin')


@app.route('/')
def inicio():
    return {"mensaje": "API REST de GymPross en funcionamiento. Backend activo."}

if __name__ == '__main__':
    # En modo desarrollo usaremos el puerto 5000
    puerto = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=puerto, debug=True)

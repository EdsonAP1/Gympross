import os
import random
from flask import Blueprint, request, jsonify
from app.intermediarios import requerir_autenticacion_y_suscripcion
from datetime import datetime, timedelta
from supabase import create_client, Client
from concurrent.futures import ThreadPoolExecutor

# Inicializar cliente de Supabase
url_supabase = os.environ.get('SUPABASE_URL')
clave_supabase = os.environ.get('SUPABASE_KEY')
supabase_cliente: Client = create_client(url_supabase, clave_supabase) if url_supabase and clave_supabase else None

recepcion_bp = Blueprint('recepcion', __name__)

@recepcion_bp.route('/totem/marcar-asistencia', methods=['POST'])
@requerir_autenticacion_y_suscripcion
def marcar_asistencia_totem():
    """
    Endpoint para el Tótem de Entrada.
    Recibe {"pin_acceso": "123456"}
    Valida y registra asistencia de clientes (con asignación de casillero aleatorio y check-out automático) o personal.
    """
    datos = request.get_json()
    if not datos or 'pin_acceso' not in datos:
        return jsonify({"error": "PIN de acceso requerido"}), 400
        
    pin_ingresado = datos['pin_acceso']
    id_gimnasio = request.id_gimnasio_seguro

    # 1. Buscar en la tabla clientes
    res_cliente = supabase_cliente.table('clientes') \
        .select('*') \
        .eq('id_gimnasio', id_gimnasio) \
        .eq('pin_acceso', pin_ingresado) \
        .execute()

    if res_cliente.data and len(res_cliente.data) > 0:
        cliente = res_cliente.data[0]
        id_cliente = cliente['id_cliente']

        # Verificar fecha de vencimiento e invalidar membresía si expiró
        fecha_vencimiento_str = cliente.get('fecha_vencimiento')
        dias_restantes = 0
        if fecha_vencimiento_str:
            if fecha_vencimiento_str.endswith('Z'):
                fecha_vencimiento_str = fecha_vencimiento_str[:-1] + '+00:00'
            fecha_venc = datetime.fromisoformat(fecha_vencimiento_str)
            delta = fecha_venc - datetime.now(fecha_venc.tzinfo)
            dias_restantes = max(0, delta.days)
            if datetime.now(fecha_venc.tzinfo) > fecha_venc:
                supabase_cliente.table('clientes').update({"estado_membresia": "vencida"}).eq('id_cliente', id_cliente).execute()
                cliente['estado_membresia'] = 'vencida'
                dias_restantes = 0

        if cliente.get('estado_membresia') == 'vencida':
            return jsonify({
                "error": "Membresía vencida. Por favor, pase por recepción.",
                "tipo": "cliente_vencido",
                "nombre": cliente['nombre_completo'],
                "foto": cliente.get('url_foto_perfil') or "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200",
                "dias_restantes": 0
            }), 403

        # Buscar si ya tiene ingreso activo para check-out automático
        res_asis_activa = supabase_cliente.table('asistencias') \
            .select('*') \
            .eq('id_gimnasio', id_gimnasio) \
            .eq('tipo_persona', 'cliente') \
            .eq('id_referencia', id_cliente) \
            .is_('fecha_salida', 'null') \
            .execute()

        if res_asis_activa.data and len(res_asis_activa.data) > 0:
            # --- CASO DE SALIDA (AUTO CHECK-OUT) ---
            asis_activa = res_asis_activa.data[0]
            llave_devuelta = asis_activa.get('numero_llave')

            # Registrar salida
            supabase_cliente.table('asistencias') \
                .update({"fecha_salida": datetime.now().isoformat()}) \
                .eq('id_asistencia', asis_activa['id_asistencia']) \
                .execute()

            # Liberar casillero en el cliente
            supabase_cliente.table('clientes') \
                .update({"casillero_asignado": None}) \
                .eq('id_cliente', id_cliente) \
                .execute()

            msg = f"Hasta luego, {cliente['nombre_completo']}. "
            if llave_devuelta:
                msg += f"Has devuelto el casillero {llave_devuelta} automáticamente."
            else:
                msg += "Esperamos que hayas tenido un excelente entrenamiento."

            return jsonify({
                "mensaje": msg,
                "tipo": "cliente_salida",
                "nombre": cliente['nombre_completo'],
                "foto": cliente.get('url_foto_perfil') or "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200",
                "numero_llave": llave_devuelta,
                "dias_restantes": dias_restantes
            }), 200
        else:
            # --- CASO DE ENTRADA (CHECK-IN CON ASIGNACIÓN ALEATORIA) ---
            # 1. Obtener cantidad de casilleros del gimnasio
            gimnasio = supabase_cliente.table('gimnasios') \
                .select('cantidad_casilleros') \
                .eq('id_gimnasio', id_gimnasio) \
                .maybe_single() \
                .execute()
                
            cantidad_casilleros = 20
            if gimnasio.data:
                cantidad_casilleros = gimnasio.data.get('cantidad_casilleros') or 20

            # 2. Obtener llaves actualmente ocupadas en las asistencias activas
            res_ocupadas = supabase_cliente.table('asistencias') \
                .select('numero_llave') \
                .eq('id_gimnasio', id_gimnasio) \
                .is_('fecha_salida', 'null') \
                .execute()
                
            ocupadas = set()
            if res_ocupadas.data:
                for a in res_ocupadas.data:
                    if a.get('numero_llave') is not None:
                        ocupadas.add(int(a['numero_llave']))

            # 3. Calcular llaves libres
            libres = [i for i in range(1, cantidad_casilleros + 1) if i not in ocupadas]

            if not libres:
                return jsonify({"error": "No hay casilleros disponibles. Por favor, pase por recepción."}), 400

            # 4. Escoger una llave libre al azar
            numero_llave = random.choice(libres)

            # Registrar entrada
            res_asis = supabase_cliente.table('asistencias').insert({
                "id_gimnasio": id_gimnasio,
                "tipo_persona": "cliente",
                "id_referencia": id_cliente,
                "fecha_entrada": datetime.now().isoformat(),
                "numero_llave": numero_llave
            }).execute()

            # Asignar casillero en cliente
            supabase_cliente.table('clientes') \
                .update({"casillero_asignado": numero_llave}) \
                .eq('id_cliente', id_cliente) \
                .execute()

            return jsonify({
                "mensaje": f"Bienvenido, {cliente['nombre_completo']}. Se te ha asignado la llave {numero_llave} (casillero aleatorio).",
                "tipo": "cliente_entrada",
                "nombre": cliente['nombre_completo'],
                "foto": cliente.get('url_foto_perfil') or "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200",
                "numero_llave": numero_llave,
                "dias_restantes": dias_restantes
            }), 200

    # 2. Si no es cliente, buscar en la tabla usuarios_personal
    res_personal = supabase_cliente.table('usuarios_personal') \
        .select('*') \
        .eq('id_gimnasio', id_gimnasio) \
        .eq('pin_acceso', pin_ingresado) \
        .execute()

    if res_personal.data and len(res_personal.data) > 0:
        personal = res_personal.data[0]
        id_usuario = personal['id_usuario']

        # Buscar si ya tiene asistencia activa
        res_asis_activa = supabase_cliente.table('asistencias') \
            .select('*') \
            .eq('id_gimnasio', id_gimnasio) \
            .eq('tipo_persona', 'personal') \
            .eq('id_referencia', id_usuario) \
            .is_('fecha_salida', 'null') \
            .execute()

        if res_asis_activa.data and len(res_asis_activa.data) > 0:
            asis = res_asis_activa.data[0]
            supabase_cliente.table('asistencias') \
                .update({"fecha_salida": datetime.now().isoformat()}) \
                .eq('id_asistencia', asis['id_asistencia']) \
                .execute()

            return jsonify({
                "mensaje": f"Salida registrada: ¡Hasta luego, {personal['nombre_completo']}!",
                "tipo": "personal_salida",
                "nombre": personal['nombre_completo'],
                "foto": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"
            }), 200
        else:
            supabase_cliente.table('asistencias').insert({
                "id_gimnasio": id_gimnasio,
                "tipo_persona": "personal",
                "id_referencia": id_usuario,
                "fecha_entrada": datetime.now().isoformat()
            }).execute()

            return jsonify({
                "mensaje": f"Entrada registrada: ¡Bienvenido al trabajo, {personal['nombre_completo']}!",
                "tipo": "personal_entrada",
                "nombre": personal['nombre_completo'],
                "foto": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"
            }), 200

    return jsonify({"error": "PIN incorrecto o no encontrado"}), 404


@recepcion_bp.route('/clientes/buscar', methods=['GET'])
@requerir_autenticacion_y_suscripcion
def buscar_clientes():
    id_gimnasio = request.id_gimnasio_seguro
    query = request.args.get('q', '')
    
    res = supabase_cliente.table('clientes') \
        .select('*') \
        .eq('id_gimnasio', id_gimnasio) \
        .ilike('nombre_completo', f'%{query}%') \
        .execute()
        
    return jsonify(res.data or []), 200


@recepcion_bp.route('/clientes/crear', methods=['POST'])
@requerir_autenticacion_y_suscripcion
def crear_cliente():
    id_gimnasio = request.id_gimnasio_seguro
    datos = request.get_json()
    
    if not datos or 'nombre_completo' not in datos or 'documento_identidad' not in datos:
        return jsonify({"error": "Datos obligatorios faltantes"}), 400
        
    # El PIN son los primeros 6 dígitos del carnet de identidad
    documento = datos['documento_identidad']
    pin = datos.get('pin_acceso') or documento[:6]
    estado = datos.get('estado_membresia', 'vencida')
    
    # Calcular fecha de vencimiento a 30 días si está activa
    fecha_exp = (datetime.now() + timedelta(days=30)).isoformat() if estado == 'activa' else None

    try:
        res = supabase_cliente.table('clientes').insert({
            "id_gimnasio": id_gimnasio,
            "nombre_completo": datos['nombre_completo'],
            "documento_identidad": documento,
            "pin_acceso": pin,
            "estado_membresia": estado,
            "url_foto_perfil": datos.get('url_foto_perfil', ''),
            "fecha_vencimiento": fecha_exp
        }).execute()
        
        return jsonify(res.data[0] if res.data else {}), 201
    except Exception as e:
        mensaje_error = str(e)
        if "duplicate key" in mensaje_error or "23505" in mensaje_error:
            return jsonify({"error": "El documento de identidad o PIN ya está registrado para otro cliente en este gimnasio"}), 400
        return jsonify({"error": f"Error al crear cliente en la base de datos: {mensaje_error}"}), 400


@recepcion_bp.route('/clientes/registrar-pago', methods=['POST'])
@requerir_autenticacion_y_suscripcion
def registrar_pago():
    id_gimnasio = request.id_gimnasio_seguro
    datos = request.get_json()
    
    if not datos or 'id_cliente' not in datos or 'monto' not in datos:
        return jsonify({"error": "Datos de pago incompletos"}), 400
        
    id_cliente = datos['id_cliente']
    monto = float(datos['monto'])
    tipo_pago = datos.get('tipo_pago', 'efectivo')

    # 1. Registrar pago (con auditoría del recepcionista/operador)
    id_usuario_receptor = getattr(request, 'id_usuario_seguro', None)
    
    datos_insercion = {
        "id_gimnasio": id_gimnasio,
        "id_cliente": id_cliente,
        "monto": monto,
        "tipo_pago": tipo_pago
    }
    
    if id_usuario_receptor:
        datos_insercion["id_usuario"] = id_usuario_receptor
        
    try:
        supabase_cliente.table('pagos_registro').insert(datos_insercion).execute()
    except Exception as e:
        # Si falla por no existir la columna, intentamos insertar sin ella
        if id_usuario_receptor and "id_usuario" in datos_insercion:
            del datos_insercion["id_usuario"]
            supabase_cliente.table('pagos_registro').insert(datos_insercion).execute()
        else:
            raise e

    # 2. Activar membresía en clientes y establecer vencimiento a 30 días
    fecha_exp = (datetime.now() + timedelta(days=30)).isoformat()
    res = supabase_cliente.table('clientes') \
        .update({"estado_membresia": "activa", "fecha_vencimiento": fecha_exp}) \
        .eq('id_cliente', id_cliente) \
        .execute()
        
    return jsonify({"mensaje": "Pago registrado con éxito y membresía activada.", "cliente": res.data[0] if res.data else {}}), 200


@recepcion_bp.route('/casilleros/asignar', methods=['POST'])
@requerir_autenticacion_y_suscripcion
def asignar_casillero():
    id_gimnasio = request.id_gimnasio_seguro
    datos = request.get_json()
    
    if not datos or 'id_asistencia' not in datos or 'numero_llave' not in datos:
        return jsonify({"error": "Faltan parámetros"}), 400
        
    id_asistencia = datos['id_asistencia']
    numero_llave = int(datos['numero_llave'])

    # 1. Asignar llave en la tabla asistencias
    res_asis = supabase_cliente.table('asistencias') \
        .update({"numero_llave": numero_llave}) \
        .eq('id_asistencia', id_asistencia) \
        .eq('id_gimnasio', id_gimnasio) \
        .execute()

    if not res_asis.data:
        return jsonify({"error": "Asistencia no encontrada"}), 404

    # 2. Actualizar casillero en el cliente correspondiente
    id_cliente = res_asis.data[0]['id_referencia']
    supabase_cliente.table('clientes') \
        .update({"casillero_asignado": numero_llave}) \
        .eq('id_cliente', id_cliente) \
        .execute()

    return jsonify({"mensaje": "Casillero asignado correctamente."}), 200


@recepcion_bp.route('/casilleros/liberar', methods=['POST'])
@requerir_autenticacion_y_suscripcion
def liberar_casillero():
    id_gimnasio = request.id_gimnasio_seguro
    datos = request.get_json()
    
    if not datos or 'id_asistencia' not in datos:
        return jsonify({"error": "Falta id_asistencia"}), 400
        
    id_asistencia = datos['id_asistencia']

    # 1. Registrar salida en asistencias
    res_asis = supabase_cliente.table('asistencias') \
        .update({"fecha_salida": datetime.now().isoformat()}) \
        .eq('id_asistencia', id_asistencia) \
        .eq('id_gimnasio', id_gimnasio) \
        .execute()

    if not res_asis.data:
        return jsonify({"error": "Asistencia no encontrada"}), 404

    # 2. Liberar casillero en el cliente
    id_cliente = res_asis.data[0]['id_referencia']
    supabase_cliente.table('clientes') \
        .update({"casillero_asignado": None}) \
        .eq('id_cliente', id_cliente) \
        .execute()

    return jsonify({"mensaje": "Casillero liberado e ingreso cerrado."}), 200


@recepcion_bp.route('/dashboard/datos', methods=['GET'])
@requerir_autenticacion_y_suscripcion
def obtener_datos_dashboard():
    """
    Consolida toda la información de recepción en una sola llamada ejecutando consultas en paralelo:
    - Clientes del gimnasio.
    - Asistencias activas (adentro del gimnasio).
    - Historial de asistencias de hoy.
    - Empleados (personal) para marcar asistencia manual.
    - Cantidad total de casilleros configurados y contraseñas/promociones del portal.
    """
    id_gimnasio = request.id_gimnasio_seguro

    # Definir funciones de consulta para paralelizar con ThreadPool
    def get_clientes():
        return supabase_cliente.table('clientes').select('*').eq('id_gimnasio', id_gimnasio).execute().data or []
        
    def get_activas():
        return supabase_cliente.table('asistencias') \
            .select('*') \
            .eq('id_gimnasio', id_gimnasio) \
            .is_('fecha_salida', 'null') \
            .execute().data or []

    def get_personal():
        return supabase_cliente.table('usuarios_personal') \
            .select('id_usuario, nombre_completo, rol_usuario, pin_acceso') \
            .eq('id_gimnasio', id_gimnasio) \
            .execute().data or []

    def get_gimnasio():
        res = supabase_cliente.table('gimnasios') \
            .select('*') \
            .eq('id_gimnasio', id_gimnasio) \
            .maybe_single() \
            .execute()
        return res.data if res else None

    def get_recientes():
        return supabase_cliente.table('asistencias') \
            .select('*') \
            .eq('id_gimnasio', id_gimnasio) \
            .order('fecha_entrada', desc=True) \
            .limit(10) \
            .execute().data or []

    # Ejecutar consultas en hilos concurrentes
    with ThreadPoolExecutor(max_workers=5) as executor:
        f_clientes = executor.submit(get_clientes)
        f_activas = executor.submit(get_activas)
        f_personal = executor.submit(get_personal)
        f_gimnasio = executor.submit(get_gimnasio)
        f_recientes = executor.submit(get_recientes)
        
        clientes = f_clientes.result()
        asistencias_activas = f_activas.result()
        personal = f_personal.result()
        gimnasio_data = f_gimnasio.result()
        asistencias_db = f_recientes.result()
        
    nombre_gimnasio = 'GymPross'
    cantidad_casilleros = 20
    contrasena_dueno = 'password123'
    contrasena_recepcion = 'password123'
    promocion_nombre = ''
    promocion_descuento = 0
    precio_mensual = 30.0
    precio_ejecutivo = 20.0
    precio_anual = 250.0
    moneda = 'USD'
    
    if gimnasio_data:
        nombre_gimnasio = gimnasio_data.get('nombre_gimnasio') or 'GymPross'
        cantidad_casilleros = gimnasio_data.get('cantidad_casilleros') or 20
        contrasena_dueno = gimnasio_data.get('contrasena_dueno') or 'password123'
        contrasena_recepcion = gimnasio_data.get('contrasena_recepcion') or 'password123'
        promocion_nombre = gimnasio_data.get('promocion_nombre') or ''
        promocion_descuento = float(gimnasio_data.get('promocion_descuento') or 0.0)
        precio_mensual = float(gimnasio_data.get('precio_mensual') if gimnasio_data.get('precio_mensual') is not None else 30.0)
        precio_ejecutivo = float(gimnasio_data.get('precio_ejecutivo') if gimnasio_data.get('precio_ejecutivo') is not None else 20.0)
        precio_anual = float(gimnasio_data.get('precio_anual') if gimnasio_data.get('precio_anual') is not None else 250.0)
        moneda = gimnasio_data.get('moneda') or 'USD'

    asistencias_recientes = []
    for a in asistencias_db:
        nombre = 'Socio'
        foto = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200"
        estado_membresia = 'activa'
        dias_restantes = 30
        
        if a['tipo_persona'] == 'cliente':
            cl = next((c for c in clientes if c['id_cliente'] == a['id_referencia']), None)
            if cl:
                nombre = cl['nombre_completo']
                foto = cl.get('url_foto_perfil') or foto
                estado_membresia = cl.get('estado_membresia', 'activa')
                fv = cl.get('fecha_vencimiento')
                if fv:
                    if fv.endswith('Z'):
                        fv = fv[:-1] + '+00:00'
                    try:
                        fv_dt = datetime.fromisoformat(fv)
                        delta = fv_dt - datetime.now(fv_dt.tzinfo)
                        dias_restantes = max(0, delta.days)
                    except:
                        pass
        else:
            emp = next((p for p in personal if p['id_usuario'] == a['id_referencia']), None)
            if emp:
                nombre = emp['nombre_completo']
                foto = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"
                estado_membresia = 'activa'
                dias_restantes = 999
                
        asistencias_recientes.append({
            "id_asistencia": a['id_asistencia'],
            "tipo_persona": a['tipo_persona'],
            "id_referencia": a['id_referencia'],
            "fecha_entrada": a['fecha_entrada'],
            "fecha_salida": a.get('fecha_salida'),
            "numero_llave": a.get('numero_llave'),
            "nombre": nombre,
            "foto": foto,
            "estado_membresia": estado_membresia,
            "dias_restantes": dias_restantes
        })

    return jsonify({
        "nombre_gimnasio": nombre_gimnasio,
        "clientes": clientes,
        "asistencias_activas": asistencias_activas,
        "asistencias_recientes": asistencias_recientes,
        "personal": personal,
        "cantidad_casilleros": cantidad_casilleros,
        "contrasena_dueno": contrasena_dueno,
        "contrasena_recepcion": contrasena_recepcion,
        "promocion_nombre": promocion_nombre,
        "promocion_descuento": promocion_descuento,
        "precio_mensual": precio_mensual,
        "precio_ejecutivo": precio_ejecutivo,
        "precio_anual": precio_anual,
        "moneda": moneda
    }), 200


@recepcion_bp.route('/personal/marcar-asistencia', methods=['POST'])
@requerir_autenticacion_y_suscripcion
def marcar_asistencia_personal_manual():
    id_gimnasio = request.id_gimnasio_seguro
    datos = request.get_json()
    
    if not datos or 'id_usuario' not in datos or 'accion' not in datos:
        return jsonify({"error": "Parámetros incompletos"}), 400
        
    id_usuario = datos['id_usuario']
    accion = datos['accion'] # 'entrada' o 'salida'

    if accion == 'entrada':
        res = supabase_cliente.table('asistencias').insert({
            "id_gimnasio": id_gimnasio,
            "tipo_persona": "personal",
            "id_referencia": id_usuario,
            "fecha_entrada": datetime.now().isoformat()
        }).execute()
        return jsonify({"mensaje": "Entrada de personal registrada."}), 200
    else:
        # Buscar última asistencia abierta
        res_asis = supabase_cliente.table('asistencias') \
            .select('id_asistencia') \
            .eq('id_gimnasio', id_gimnasio) \
            .eq('id_referencia', id_usuario) \
            .is_('fecha_salida', 'null') \
            .order('fecha_entrada', desc=True) \
            .limit(1) \
            .execute()
            
        if not res_asis.data:
            return jsonify({"error": "No hay registro de entrada abierto para este empleado."}), 400
            
        id_asistencia = res_asis.data[0]['id_asistencia']
        supabase_cliente.table('asistencias') \
            .update({"fecha_salida": datetime.now().isoformat()}) \
            .eq('id_asistencia', id_asistencia) \
            .execute()
            
        return jsonify({"mensaje": "Salida de personal registrada."}), 200


@recepcion_bp.route('/gimnasio/actualizar-casilleros', methods=['POST'])
@requerir_autenticacion_y_suscripcion
def actualizar_cantidad_casilleros():
    id_gimnasio = request.id_gimnasio_seguro
    datos = request.get_json()
    
    if not datos or 'cantidad' not in datos:
        return jsonify({"error": "Cantidad requerida"}), 400
        
    cantidad = int(datos['cantidad'])
    if cantidad <= 0:
        return jsonify({"error": "La cantidad debe ser mayor a cero"}), 400
        
    res = supabase_cliente.table('gimnasios') \
        .update({"cantidad_casilleros": cantidad}) \
        .eq('id_gimnasio', id_gimnasio) \
        .execute()
        
    return jsonify({"mensaje": "Cantidad de casilleros actualizada con éxito.", "cantidad": cantidad}), 200


@recepcion_bp.route('/gimnasio/actualizar-promocion', methods=['POST'])
@requerir_autenticacion_y_suscripcion
def actualizar_promocion():
    id_gimnasio = request.id_gimnasio_seguro
    datos = request.get_json()
    
    if not datos or 'nombre' not in datos or 'descuento' not in datos:
        return jsonify({"error": "Parámetros incompletos"}), 400
        
    nombre = datos['nombre']
    descuento = float(datos['descuento'])
    
    res = supabase_cliente.table('gimnasios') \
        .update({
            "promocion_nombre": nombre,
            "promocion_descuento": descuento
        }) \
        .eq('id_gimnasio', id_gimnasio) \
        .execute()
        
    return jsonify({"mensaje": "Promoción del gimnasio actualizada con éxito."}), 200


@recepcion_bp.route('/gimnasio/actualizar-contrasenas', methods=['POST'])
@requerir_autenticacion_y_suscripcion
def actualizar_contrasenas():
    id_gimnasio = request.id_gimnasio_seguro
    datos = request.get_json()
    
    if not datos or 'contrasena_dueno' not in datos or 'contrasena_recepcion' not in datos:
        return jsonify({"error": "Parámetros incompletos"}), 400
        
    c_dueno = datos['contrasena_dueno']
    c_recepcion = datos['contrasena_recepcion']
    
    res = supabase_cliente.table('gimnasios') \
        .update({
            "contrasena_dueno": c_dueno,
            "contrasena_recepcion": c_recepcion
        }) \
        .eq('id_gimnasio', id_gimnasio) \
        .execute()
        
    return jsonify({"mensaje": "Contraseñas del portal actualizadas con éxito."}), 200


@recepcion_bp.route('/gimnasio/reporte-caja', methods=['GET'])
@requerir_autenticacion_y_suscripcion
def obtener_reporte_caja():
    id_gimnasio = request.id_gimnasio_seguro
    
    # 1. Obtener todos los pagos de este gimnasio
    res_pagos = supabase_cliente.table('pagos_registro') \
        .select('*') \
        .eq('id_gimnasio', id_gimnasio) \
        .order('fecha_pago', desc=True) \
        .execute()
        
    pagos = res_pagos.data or []
    
    # 2. Obtener clientes y personal para mapear nombres
    res_clientes = supabase_cliente.table('clientes').select('id_cliente, nombre_completo').eq('id_gimnasio', id_gimnasio).execute()
    clientes_map = {c['id_cliente']: c['nombre_completo'] for c in (res_clientes.data or [])}
    
    res_personal = supabase_cliente.table('usuarios_personal').select('id_usuario, nombre_completo').eq('id_gimnasio', id_gimnasio).execute()
    personal_map = {p['id_usuario']: p['nombre_completo'] for p in (res_personal.data or [])}
    
    # 3. Filtrar los del día de hoy y calcular totales
    hoy = datetime.now().date()
    
    total_efectivo = 0.0
    total_qr = 0.0
    pagos_hoy = []
    
    for p in pagos:
        fecha_str = p.get('fecha_pago')
        if not fecha_str:
            continue
        try:
            # Normalizar sufijo Z si existe
            if fecha_str.endswith('Z'):
                fecha_str = fecha_str[:-1] + '+00:00'
            dt_utc = datetime.fromisoformat(fecha_str)
            dt_local = dt_utc.astimezone()  # Convertir a zona horaria local del servidor
            p_fecha = dt_local.date()
        except Exception:
            continue
            
        if p_fecha == hoy:
            monto = float(p.get('monto') or 0.0)
            tipo = p.get('tipo_pago', 'efectivo')
            
            if tipo == 'efectivo':
                total_efectivo += monto
            else:
                total_qr += monto
                
            cliente_nombre = clientes_map.get(p.get('id_cliente'), 'Cliente Desconocido')
            # id_usuario representa al recepcionista que registró el cobro
            recepcionista_nombre = personal_map.get(p.get('id_usuario'), 'Operador / Recepción')
            
            pagos_hoy.append({
                "id_pago": p['id_pago'],
                "cliente": cliente_nombre,
                "monto": monto,
                "tipo_pago": tipo,
                "fecha_pago": fecha_str,
                "recepcionista": recepcionista_nombre
            })
            
    return jsonify({
        "total_efectivo": total_efectivo,
        "total_qr": total_qr,
        "total_caja": total_efectivo + total_qr,
        "pagos_hoy": pagos_hoy
    }), 200

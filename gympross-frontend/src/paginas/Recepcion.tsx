import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clienteSupabase } from '../supabaseClient';

interface Cliente {
  id_cliente: string;
  nombre_completo: string;
  documento_identidad: string;
  pin_acceso: string;
  estado_membresia: 'activa' | 'vencida';
  url_foto_perfil?: string;
  casillero_asignado?: number | null;
  fecha_vencimiento?: string | null;
}

interface Asistencia {
  id_asistencia: string;
  id_gimnasio: string;
  tipo_persona: 'cliente' | 'personal';
  id_referencia: string;
  fecha_entrada: string;
  fecha_salida?: string | null;
  numero_llave?: number | null;
}

interface Empleado {
  id_usuario: string;
  nombre_completo: string;
  rol_usuario: string;
  pin_acceso?: string;
  adentro?: boolean;
}

const Recepcion = () => {
  const navegar = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [nombreGimnasio, setNombreGimnasio] = useState('');
  
  // Datos de la base de datos
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [asistenciasActivas, setAsistenciasActivas] = useState<Asistencia[]>([]);
  const [asistenciasRecientes, setAsistenciasRecientes] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);

  // Estados de Configuración y Asistencia de Personal
  const [cantidadCasilleros, setCantidadCasilleros] = useState(20);
  const [mostrandoAsistenciaPersonal, setMostrandoAsistenciaPersonal] = useState(false);
  const [pinAsistenciaPersonal, setPinAsistenciaPersonal] = useState('');
  const [mensajeAsistenciaPersonal, setMensajeAsistenciaPersonal] = useState('');
  const [tipoMensajeAsistencia, setTipoMensajeAsistencia] = useState<'exito' | 'error' | ''>('');

  // Estados de Búsqueda y Creación
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [ciNuevo, setCiNuevo] = useState('');
  const [mostrandoCrearCliente, setMostrandoCrearCliente] = useState(false);
  const [mensajeOperacion, setMensajeOperacion] = useState('');
  const [tabActiva, setTabActiva] = useState<'casilleros' | 'clientes' | 'personal'>('casilleros');

  // Estados de Modals
  const [casilleroSeleccionado, setCasilleroSeleccionado] = useState<number | null>(null);
  const [clienteParaPago, setClienteParaPago] = useState<Cliente | null>(null);
  const [montoPago, setMontoPago] = useState('30');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'qr'>('efectivo');

  // Estados de Planes y Promociones
  const [planSeleccionado, setPlanSeleccionado] = useState<'mensual' | 'ejecutivo' | 'anual'>('mensual');
  const [promocionNombre, setPromocionNombre] = useState('');
  const [promocionDescuento, setPromocionDescuento] = useState(0);
  const [precioMensual, setPrecioMensual] = useState<number>(30);
  const [precioEjecutivo, setPrecioEjecutivo] = useState<number>(20);
  const [precioAnual, setPrecioAnual] = useState<number>(250);
  const [moneda, setMoneda] = useState<string>('USD');

  const PLANES_PRECIOS = {
    mensual: 30,
    ejecutivo: 20,
    anual: 250
  };

  const obtenerToken = async () => {
    const { data: { session } } = await clienteSupabase.auth.getSession();
    return session?.access_token || '';
  };

  const cargarDatos = async () => {
    try {
      if (clientes.length === 0) {
        setCargando(true);
      }
      const token = await obtenerToken();
      if (!token) {
        navegar('/login');
        return;
      }
      


      // Llamar al endpoint consolidado del backend
      const respuesta = await fetch('http://localhost:5000/api/recepcion/dashboard/datos', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!respuesta.ok) throw new Error("Error al obtener datos del servidor");

      const datos = await respuesta.json();
      setNombreGimnasio(datos.nombre_gimnasio || 'GymPross');
      setClientes(datos.clientes || []);
      setAsistenciasActivas(datos.asistencias_activas || []);
      setAsistenciasRecientes(datos.asistencias_recientes || []);
      setCantidadCasilleros(datos.cantidad_casilleros || 20);
      // Parsear y validar promoción activa y vigente
      const promoStr = datos.promocion_nombre || '';
      let promoNombreFinal = '';
      let promoDescuentoFinal = 0;

      const partes = promoStr.split('||');
      if (partes.length === 3) {
        const nombreBase = partes[0];
        const activa = partes[1] === 'true';
        const vencimiento = partes[2];

        let esValida = activa;
        if (activa && vencimiento) {
          const hoy = new Date();
          const anio = hoy.getFullYear();
          const mes = String(hoy.getMonth() + 1).padStart(2, '0');
          const dia = String(hoy.getDate()).padStart(2, '0');
          const hoyStr = `${anio}-${mes}-${dia}`;
          
          if (hoyStr > vencimiento) {
            esValida = false;
          }
        }

        if (esValida) {
          promoNombreFinal = nombreBase;
          promoDescuentoFinal = datos.promocion_descuento || 0;
        }
      } else {
        promoNombreFinal = promoStr;
        promoDescuentoFinal = datos.promocion_descuento || 0;
      }

      setPromocionNombre(promoNombreFinal);
      setPromocionDescuento(promoDescuentoFinal);

      // Usar localStorage fallback si existe para las tarifas
      const idGimnasioParaFallback = (datos.clientes && datos.clientes.length > 0) ? datos.clientes[0].id_gimnasio : '';
      const localTarifasStr = idGimnasioParaFallback ? localStorage.getItem(`gym_tarifas_${idGimnasioParaFallback}`) : null;
      
      if (localTarifasStr) {
        try {
          const localTarifas = JSON.parse(localTarifasStr);
          setPrecioMensual(localTarifas.precio_mensual !== undefined ? parseFloat(localTarifas.precio_mensual) : 30);
          setPrecioEjecutivo(localTarifas.precio_ejecutivo !== undefined ? parseFloat(localTarifas.precio_ejecutivo) : 20);
          setPrecioAnual(localTarifas.precio_anual !== undefined ? parseFloat(localTarifas.precio_anual) : 250);
          setMoneda(localTarifas.moneda || 'USD');
        } catch (e) {
          setPrecioMensual(datos.precio_mensual !== undefined && datos.precio_mensual !== null ? parseFloat(datos.precio_mensual) : 30);
          setPrecioEjecutivo(datos.precio_ejecutivo !== undefined && datos.precio_ejecutivo !== null ? parseFloat(datos.precio_ejecutivo) : 20);
          setPrecioAnual(datos.precio_anual !== undefined && datos.precio_anual !== null ? parseFloat(datos.precio_anual) : 250);
          setMoneda(datos.moneda || 'USD');
        }
      } else {
        setPrecioMensual(datos.precio_mensual !== undefined && datos.precio_mensual !== null ? parseFloat(datos.precio_mensual) : 30);
        setPrecioEjecutivo(datos.precio_ejecutivo !== undefined && datos.precio_ejecutivo !== null ? parseFloat(datos.precio_ejecutivo) : 20);
        setPrecioAnual(datos.precio_anual !== undefined && datos.precio_anual !== null ? parseFloat(datos.precio_anual) : 250);
        setMoneda(datos.moneda || 'USD');
      }
      
      // Unificar datos de empleados con asistencias abiertas para ver quién está adentro
      const listaEmpleados = (datos.personal || []).map((emp: any) => {
        const estaAdentro = (datos.asistencias_activas || []).some(
          (a: any) => a.id_referencia === emp.id_usuario && a.tipo_persona === 'personal'
        );
        return { ...emp, adentro: estaAdentro };
      });
      setEmpleados(listaEmpleados);

    } catch (err: any) {
      console.error(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem('rol_activo') !== 'recepcion') {
      navegar('/portal-seleccion');
      return;
    }
    cargarDatos();
  }, []);

  useEffect(() => {
    const precios = {
      mensual: precioMensual,
      ejecutivo: precioEjecutivo,
      anual: precioAnual
    };
    const precioBase = precios[planSeleccionado];
    const descuento = (precioBase * promocionDescuento) / 100;
    const final = precioBase - descuento;
    setMontoPago(final.toFixed(2));
  }, [planSeleccionado, promocionDescuento, clienteParaPago, precioMensual, precioEjecutivo, precioAnual]);

  const cerrarSesion = async () => {
    await clienteSupabase.auth.signOut();
    sessionStorage.removeItem('rol_activo');
    navegar('/');
  };

  // 1. Pizarra de Casilleros
  const totalCasilleros = Array.from({ length: cantidadCasilleros }, (_, i) => i + 1);

  const agregarCasillero = async () => {
    try {
      const token = await obtenerToken();
      const nuevaCantidad = cantidadCasilleros + 1;
      const res = await fetch('http://localhost:5000/api/recepcion/gimnasio/actualizar-casilleros', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cantidad: nuevaCantidad })
      });

      if (!res.ok) throw new Error("Error al agregar casillero");
      setCantidadCasilleros(nuevaCantidad);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const eliminarCasillero = async () => {
    if (cantidadCasilleros <= 1) {
      alert("Debe haber al menos 1 casillero.");
      return;
    }
    try {
      const token = await obtenerToken();
      const nuevaCantidad = cantidadCasilleros - 1;
      const res = await fetch('http://localhost:5000/api/recepcion/gimnasio/actualizar-casilleros', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cantidad: nuevaCantidad })
      });

      if (!res.ok) throw new Error("Error al eliminar casillero");
      setCantidadCasilleros(nuevaCantidad);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const registrarAsistenciaPersonalManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeAsistenciaPersonal('');
    setTipoMensajeAsistencia('');

    if (pinAsistenciaPersonal.length !== 6) {
      setMensajeAsistenciaPersonal('El PIN debe ser de 6 dígitos.');
      setTipoMensajeAsistencia('error');
      return;
    }

    try {
      const token = await obtenerToken();
      const res = await fetch('http://localhost:5000/api/recepcion/totem/marcar-asistencia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pin_acceso: pinAsistenciaPersonal })
      });

      const respuestaDatos = await res.json();

      if (!res.ok) {
        throw new Error(respuestaDatos.error || 'Error al procesar asistencia.');
      }

      setMensajeAsistenciaPersonal(respuestaDatos.mensaje);
      setTipoMensajeAsistencia('exito');
      setPinAsistenciaPersonal('');
      cargarDatos();

      // Cerrar modal automáticamente después de 2 segundos
      setTimeout(() => {
        setMostrandoAsistenciaPersonal(false);
        setMensajeAsistenciaPersonal('');
        setTipoMensajeAsistencia('');
      }, 2500);

    } catch (err: any) {
      setMensajeAsistenciaPersonal(err.message);
      setTipoMensajeAsistencia('error');
    }
  };

  const asignarCasillero = async (idAsistencia: string, numLlave: number) => {
    try {
      const token = await obtenerToken();
      const res = await fetch('http://localhost:5000/api/recepcion/casilleros/asignar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id_asistencia: idAsistencia, numero_llave: numLlave })
      });

      if (!res.ok) throw new Error("Error al asignar el casillero");
      
      setCasilleroSeleccionado(null);
      cargarDatos();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const liberarCasillero = async (idAsistencia: string) => {
    try {
      const token = await obtenerToken();
      const res = await fetch('http://localhost:5000/api/recepcion/casilleros/liberar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id_asistencia: idAsistencia })
      });

      if (!res.ok) throw new Error("Error al liberar el casillero");
      cargarDatos();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 2. Control de Clientes y Creación
  const crearCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeOperacion('');
    try {
      const token = await obtenerToken();
      const res = await fetch('http://localhost:5000/api/recepcion/clientes/crear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre_completo: nombreNuevo,
          documento_identidad: ciNuevo,
          url_foto_perfil: null,
          estado_membresia: 'vencida'
        })
      });

      if (!res.ok) throw new Error("Error al registrar cliente");
      
      setNombreNuevo('');
      setCiNuevo('');
      setMostrandoCrearCliente(false);
      setMensajeOperacion('Cliente creado con éxito.');
      cargarDatos();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const iniciarPagoCliente = async (cliente: Cliente) => {
    try {
      const token = await obtenerToken();
      if (token) {
        const respuesta = await fetch('http://localhost:5000/api/recepcion/dashboard/datos', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (respuesta.ok) {
          const datos = await respuesta.json();
          const promoStr = datos.promocion_nombre || '';
          let promoNombreFinal = '';
          let promoDescuentoFinal = 0;

          const partes = promoStr.split('||');
          if (partes.length === 3) {
            const nombreBase = partes[0];
            const activa = partes[1] === 'true';
            const vencimiento = partes[2];

            let esValida = activa;
            if (activa && vencimiento) {
              const hoy = new Date();
              const anio = hoy.getFullYear();
              const mes = String(hoy.getMonth() + 1).padStart(2, '0');
              const dia = String(hoy.getDate()).padStart(2, '0');
              const hoyStr = `${anio}-${mes}-${dia}`;
              
              if (hoyStr > vencimiento) {
                esValida = false;
              }
            }

            if (esValida) {
              promoNombreFinal = nombreBase;
              promoDescuentoFinal = datos.promocion_descuento || 0;
            }
          } else {
            promoNombreFinal = promoStr;
            promoDescuentoFinal = datos.promocion_descuento || 0;
          }

          setPromocionNombre(promoNombreFinal);
          setPromocionDescuento(promoDescuentoFinal);
          setPrecioMensual(datos.precio_mensual !== undefined && datos.precio_mensual !== null ? parseFloat(datos.precio_mensual) : 30);
          setPrecioEjecutivo(datos.precio_ejecutivo !== undefined && datos.precio_ejecutivo !== null ? parseFloat(datos.precio_ejecutivo) : 20);
          setPrecioAnual(datos.precio_anual !== undefined && datos.precio_anual !== null ? parseFloat(datos.precio_anual) : 250);
          setMoneda(datos.moneda || 'USD');
        }
      }
    } catch (err) {
      console.error("Error al refrescar promoción para pago:", err);
    }
    setClienteParaPago(cliente);
  };

  // 3. Registrar Pago
  const registrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteParaPago) return;

    try {
      const token = await obtenerToken();
      const res = await fetch('http://localhost:5000/api/recepcion/clientes/registrar-pago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_cliente: clienteParaPago.id_cliente,
          monto: montoPago,
          tipo_pago: metodoPago
        })
      });

      if (!res.ok) throw new Error("Error al registrar el pago");

      setClienteParaPago(null);
      setMensajeOperacion('Pago guardado y membresía renovada.');
      cargarDatos();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 4. Marcar Asistencia Empleados Manual
  const toggleAsistenciaEmpleado = async (idUsuario: string, adentro: boolean) => {
    try {
      const token = await obtenerToken();
      const accion = adentro ? 'salida' : 'entrada';
      const res = await fetch('http://localhost:5000/api/recepcion/personal/marcar-asistencia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id_usuario: idUsuario, accion: accion })
      });

      if (!res.ok) throw new Error("Error al marcar registro del empleado");
      cargarDatos();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtrar clientes
  const clientesFiltrados = clientes.filter(c => 
    c.nombre_completo.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
    c.documento_identidad.includes(terminoBusqueda)
  );

  // Lista de clientes dentro del gimnasio pero que no tienen casillero aún
  const clientesAdentroSinLocker = asistenciasActivas.filter(
    a => !a.numero_llave && a.tipo_persona === 'cliente'
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans p-6 md:p-12 relative">
      {/* Glows decorativos */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-red/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-red/5 blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Cabecera del Panel */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b border-white/10 pb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center font-black text-sm text-white">
                GP
              </div>
              <span className="text-sm font-bold uppercase tracking-wider text-brand-red">Recepción Operativa</span>
            </div>
            <h1 className="text-4xl font-black mt-2">{nombreGimnasio || 'Cargando sucursal...'}</h1>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setMostrandoAsistenciaPersonal(true)}
              className="border border-white/20 hover:border-brand-red hover:text-brand-red bg-transparent text-white px-6 py-2.5 rounded-full font-semibold transition-all duration-300 cursor-pointer animate-pulse"
            >
              Asistencia Empleados
            </button>
            <button
              onClick={() => navegar('/totem')}
              className="border border-white/20 hover:border-brand-red hover:text-brand-red bg-transparent text-white px-6 py-2.5 rounded-full font-semibold transition-all duration-300 cursor-pointer"
            >
              Abrir Tótem público
            </button>
            <button
              onClick={cerrarSesion}
              className="border border-brand-red bg-brand-red/10 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-brand-red transition-all duration-300 cursor-pointer shadow-[0_0_15px_rgba(229,57,53,0.3)]"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {cargando ? (
          <p className="text-gray-400 text-center py-12">Cargando panel de recepción...</p>
        ) : (
          <div className="space-y-12">
            
            {/* Mensajes de Alerta */}
            {mensajeOperacion && (
              <div className="p-4 bg-white/5 border border-white/10 text-brand-red text-center text-sm font-semibold rounded-2xl max-w-lg mx-auto">
                {mensajeOperacion}
              </div>
            )}

            {/* Tarjetas de Métricas en Tiempo Real */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl text-left">
                <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Socios Adentro</span>
                <h3 className="text-3xl font-black text-white mt-2">
                  {asistenciasActivas.filter(a => a.tipo_persona === 'cliente').length} Clientes
                </h3>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl text-left">
                <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Casilleros Ocupados</span>
                <h3 className="text-3xl font-black text-white mt-2">
                  {asistenciasActivas.filter(a => a.numero_llave !== null && a.numero_llave !== undefined).length} / {cantidadCasilleros}
                </h3>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl text-left">
                <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Empleados Trabajando</span>
                <h3 className="text-3xl font-black text-green-400 mt-2">
                  {empleados.filter(e => e.adentro).length} Activos
                </h3>
              </div>
            </div>

            {/* Barra de Pestañas (Tabs) */}
            <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1.5">
              <button
                onClick={() => setTabActiva('casilleros')}
                className={`px-6 py-3 rounded-t-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  tabActiva === 'casilleros'
                    ? 'bg-brand-red text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Casilleros y Llaves
              </button>
              <button
                onClick={() => setTabActiva('clientes')}
                className={`px-6 py-3 rounded-t-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  tabActiva === 'clientes'
                    ? 'bg-brand-red text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Control de Clientes
              </button>
              <button
                onClick={() => setTabActiva('personal')}
                className={`px-6 py-3 rounded-t-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  tabActiva === 'personal'
                    ? 'bg-brand-red text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Personal Activo
              </button>
            </div>

            {tabActiva === 'casilleros' && (
              /* SECCIÓN 1: LA PIZARRA DE CASILLEROS */
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
                  <h2 className="text-2xl font-bold">Pizarra de Casilleros y Llaves</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={eliminarCasillero}
                      className="border border-brand-red/50 hover:bg-brand-red/10 text-brand-red text-xs px-4 py-2 rounded-xl font-bold transition duration-300 cursor-pointer shadow-md"
                    >
                      - Eliminar Casillero
                    </button>
                    <button
                      onClick={agregarCasillero}
                      className="bg-brand-red hover:bg-brand-red/90 text-white text-xs px-4 py-2 rounded-xl font-bold transition duration-300 cursor-pointer shadow-md"
                    >
                      + Agregar Casillero
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-4">
                  {totalCasilleros.map((num) => {
                    const asisOcupado = asistenciasActivas.find(a => a.numero_llave === num && a.tipo_persona === 'cliente');
                    const clienteOcupante = asisOcupado 
                      ? clientes.find(c => c.id_cliente === asisOcupado.id_referencia)
                      : null;

                    return asisOcupado ? (
                      // Ocupado (Rojo)
                      <button
                        key={num}
                        onClick={() => {
                          if (confirm(`¿Registrar salida y liberar casillero de ${clienteOcupante?.nombre_completo}?`)) {
                            liberarCasillero(asisOcupado.id_asistencia);
                          }
                        }}
                        className="bg-brand-red border border-brand-red/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 shadow-[0_10px_20px_rgba(229,57,53,0.2)] hover:scale-105 transition duration-300 cursor-pointer w-full text-center"
                      >
                        <span className="text-2xl font-black text-white">{num}</span>
                        <span className="text-[10px] uppercase font-bold text-white/80">Ocupado</span>
                        <span className="text-[9px] font-semibold text-white truncate max-w-full">
                          {clienteOcupante ? clienteOcupante.nombre_completo.split(' ')[0] : 'Socio'}
                        </span>
                      </button>
                    ) : (
                      // Libre (Verde)
                      <button
                        key={num}
                        onClick={() => setCasilleroSeleccionado(num)}
                        className="bg-green-600/10 border border-green-500/20 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 hover:bg-green-500/20 hover:scale-105 transition duration-300 cursor-pointer w-full text-center"
                      >
                        <span className="text-2xl font-black text-green-400">{num}</span>
                        <span className="text-[10px] uppercase font-bold text-green-400">Libre</span>
                        <span className="text-[9px] text-gray-500">Asignar</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {tabActiva === 'clientes' && (
              /* SECCIÓN 2: CONTROL DE CLIENTES */
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h2 className="text-2xl font-bold text-left">Control de Clientes</h2>
                  <button 
                    onClick={() => setMostrandoCrearCliente(!mostrandoCrearCliente)}
                    className="bg-brand-red hover:bg-brand-red/90 text-white text-xs px-4 py-2 rounded-xl font-bold transition duration-300 cursor-pointer shadow-md"
                  >
                    {mostrandoCrearCliente ? 'Volver a Buscar' : 'Nuevo Cliente'}
                  </button>
                </div>

                {mostrandoCrearCliente ? (
                  /* Formulario de creación de cliente */
                  <form onSubmit={crearCliente} className="space-y-4 text-left max-w-md">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Nombre Completo</label>
                      <input
                        type="text"
                        value={nombreNuevo}
                        onChange={(e) => setNombreNuevo(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all duration-300"
                        placeholder="Ej. Juan Pérez"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Documento de Identidad (C.I.)</label>
                      <input
                        type="text"
                        value={ciNuevo}
                        onChange={(e) => setCiNuevo(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all duration-300"
                        placeholder="Ej. 7654321"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-brand-red hover:bg-brand-red/90 text-white py-2.5 px-6 rounded-xl font-bold text-xs cursor-pointer shadow-md"
                    >
                      Registrar y Activar Socio
                    </button>
                  </form>
                ) : (
                  /* Búsqueda y visualización de clientes */
                  <div className="space-y-6">
                    <input
                      type="text"
                      value={terminoBusqueda}
                      onChange={(e) => setTerminoBusqueda(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-2xl px-4 py-3 text-sm text-white focus:outline-none transition-all duration-300"
                      placeholder="Buscar cliente por nombre o número de C.I..."
                    />

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider text-xs">
                            <th className="pb-4">Cliente</th>
                            <th className="pb-4">C.I. / Carnet</th>
                            <th className="pb-4">Código PIN</th>
                            <th className="pb-4">Membresía</th>
                            <th className="pb-4">Vencimiento</th>
                            <th className="pb-4 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-gray-200">
                          {clientesFiltrados.map((cliente) => (
                            <tr key={cliente.id_cliente} className="hover:bg-white/5 transition-colors">
                              <td className="py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-red/40 to-brand-red/10 border border-brand-red/20 flex items-center justify-center font-bold text-brand-red text-xs">
                                    {cliente.nombre_completo.substring(0, 2).toUpperCase()}
                                  </div>
                                  <span className="font-bold text-white">{cliente.nombre_completo}</span>
                                </div>
                              </td>
                              <td className="py-4">{cliente.documento_identidad}</td>
                              <td className="py-4 font-mono font-bold text-brand-red">{cliente.pin_acceso}</td>
                              <td className="py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  cliente.estado_membresia === 'activa'
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-brand-red/10 text-brand-red border border-brand-red/20'
                                }`}>
                                  {cliente.estado_membresia}
                                </span>
                              </td>
                              <td className="py-4 font-mono text-xs text-gray-400">
                                {cliente.fecha_vencimiento ? (
                                  new Date(cliente.fecha_vencimiento).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  })
                                ) : (
                                  <span className="italic text-gray-600">Sin fecha</span>
                                )}
                              </td>
                              <td className="py-4 text-right">
                                <button
                                  onClick={() => iniciarPagoCliente(cliente)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 hover:border-brand-red hover:bg-brand-red/10 hover:text-white transition cursor-pointer"
                                >
                                  Renovar / Pagar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tabActiva === 'personal' && (
              /* SECCIÓN 3: CONTROL DE EMPLEADOS (PERSONAL ACTIVO) */
              <div className="max-w-3xl mx-auto bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
                <h2 className="text-2xl font-bold mb-6 text-left border-b border-white/5 pb-3">Personal Activo</h2>
                
                <div className="space-y-4">
                  {empleados.filter(e => e.rol_usuario !== 'dueno').map((emp) => (
                    <div 
                      key={emp.id_usuario} 
                      className="bg-white/5 border border-white/5 p-4 rounded-2xl flex justify-between items-center hover:border-white/15 transition-all"
                    >
                      <div className="text-left">
                        <h4 className="font-bold text-white">{emp.nombre_completo}</h4>
                        <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
                          {emp.rol_usuario} (PIN: {emp.pin_acceso || 'Sin PIN'})
                        </span>
                      </div>
                      
                      <button
                        onClick={() => toggleAsistenciaEmpleado(emp.id_usuario, emp.adentro || false)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition duration-300 cursor-pointer border ${
                          emp.adentro
                            ? 'border-brand-red/30 bg-brand-red/15 text-brand-red hover:bg-brand-red'
                            : 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-600'
                        }`}
                      >
                        {emp.adentro ? 'Marcar Salida' : 'Marcar Entrada'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* MODAL 1: ASIGNAR CASILLERO */}
      {casilleroSeleccionado !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-center items-center p-4">
          <div className="bg-white/5 border border-white/10 rounded-3xl max-w-md w-full p-6 md:p-8 relative shadow-2xl">
            <h3 className="text-2xl font-bold mb-4">Asignar Casillero {casilleroSeleccionado}</h3>
            <p className="text-sm text-gray-400 mb-6">
              Selecciona al socio que acaba de marcar su ingreso en el Tótem para otorgarle esta llave:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 mb-6">
              {clientesAdentroSinLocker.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No hay clientes esperando casillero.</p>
              ) : (
                clientesAdentroSinLocker.map((asis) => {
                  const cl = clientes.find(c => c.id_cliente === asis.id_referencia);
                  return (
                    <div 
                      key={asis.id_asistencia}
                      className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl hover:border-brand-red/40 transition"
                    >
                      <span className="text-xs font-bold text-white">{cl?.nombre_completo || 'Socio'}</span>
                      <button
                        onClick={() => asignarCasillero(asis.id_asistencia, casilleroSeleccionado)}
                        className="bg-brand-red hover:bg-brand-red/90 text-white text-xs px-3 py-1.5 rounded-lg font-bold cursor-pointer"
                      >
                        Asignar Llave
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setCasilleroSeleccionado(null)}
              className="w-full border border-white/20 hover:border-brand-red text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR PAGO (EFECTIVO / QR) */}
      {clienteParaPago !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-center items-center p-4">
          <div className="bg-white/5 border border-white/10 rounded-3xl max-w-md w-full p-6 md:p-8 relative shadow-2xl">
            <h3 className="text-2xl font-bold mb-2">Registrar Pago</h3>
            <p className="text-xs text-brand-red mb-6">
              Socio: {clienteParaPago.nombre_completo} (C.I. {clienteParaPago.documento_identidad})
            </p>

            <form onSubmit={registrarPago} className="space-y-6 text-left">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Seleccionar Plan de Suscripción
                </label>
                <select
                  value={planSeleccionado}
                  onChange={(e) => setPlanSeleccionado(e.target.value as any)}
                  className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all duration-300 cursor-pointer"
                >
                  <option value="mensual" className="bg-black">Plan Mensual ({precioMensual} {moneda})</option>
                  <option value="ejecutivo" className="bg-black">Plan Ejecutivo ({precioEjecutivo} {moneda})</option>
                  <option value="anual" className="bg-black">Plan Anual ({precioAnual} {moneda})</option>
                </select>
              </div>

              {promocionNombre && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-xs">
                  <span className="font-bold text-green-400 block uppercase tracking-wider mb-1">Promoción Aplicada: {promocionNombre}</span>
                  <span className="text-gray-300">Se aplica un descuento automático del {promocionDescuento}% al precio base.</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Monto Total a Cobrar ({moneda})
                </label>
                <input
                  type="number"
                  value={montoPago}
                  onChange={(e) => setMontoPago(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Forma de Pago
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setMetodoPago('efectivo')}
                    className={`py-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      metodoPago === 'efectivo'
                        ? 'border-brand-red bg-brand-red/10 text-brand-red'
                        : 'border-white/10 bg-transparent text-gray-400'
                    }`}
                  >
                    Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoPago('qr')}
                    className={`py-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      metodoPago === 'qr'
                        ? 'border-brand-red bg-brand-red/10 text-brand-red'
                        : 'border-white/10 bg-transparent text-gray-400'
                    }`}
                  >
                    Código QR
                  </button>
                </div>
              </div>

              {/* Si es QR, mostrar mockup de QR */}
              {metodoPago === 'qr' && (
                <div className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/5 rounded-2xl">
                  {/* Mock de un código QR simple con SVG */}
                  <svg className="w-32 h-32 text-white bg-white p-2 rounded-xl" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="2" y="2" width="6" height="6" strokeWidth="2" fill="black" />
                    <rect x="16" y="2" width="6" height="6" strokeWidth="2" fill="black" />
                    <rect x="2" y="16" width="6" height="6" strokeWidth="2" fill="black" />
                    <path d="M10 2h4M10 6h4M10 16h4M16 10h6M2 10h6M14 14h4" strokeWidth="2" />
                  </svg>
                  <span className="text-[10px] text-gray-400 mt-2">Escanea para pagar la mensualidad</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setClienteParaPago(null)}
                  className="border border-white/20 hover:border-brand-red text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-brand-red hover:bg-brand-red/90 text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-center"
                >
                  Confirmar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ASISTENCIA EMPLEADOS (CON PIN) */}
      {mostrandoAsistenciaPersonal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-center items-center p-4">
          <div className="bg-white/5 border border-white/10 rounded-3xl max-w-md w-full p-6 md:p-8 relative shadow-2xl">
            <h3 className="text-2xl font-bold mb-2">Asistencia de Personal</h3>
            <p className="text-xs text-gray-400 mb-6">
              Digita tu PIN de 6 dígitos para registrar tu entrada o salida del gimnasio.
            </p>

            {mensajeAsistenciaPersonal && (
              <div className={`p-4 rounded-xl text-xs mb-6 text-center border ${
                tipoMensajeAsistencia === 'exito'
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-brand-red/10 border-brand-red/20 text-brand-red'
              }`}>
                {mensajeAsistenciaPersonal}
              </div>
            )}

            <form onSubmit={registrarAsistenciaPersonalManual} className="space-y-6 text-left">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  PIN de Acceso (6 dígitos)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinAsistenciaPersonal}
                  onChange={(e) => setPinAsistenciaPersonal(e.target.value.replace(/\D/g, ''))}
                  required
                  className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2.5 text-center text-xl font-mono tracking-widest text-white focus:outline-none transition-all duration-300"
                  placeholder="••••••"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMostrandoAsistenciaPersonal(false);
                    setMensajeAsistenciaPersonal('');
                    setTipoMensajeAsistencia('');
                    setPinAsistenciaPersonal('');
                  }}
                  className="border border-white/20 hover:border-brand-red text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-brand-red hover:bg-brand-red/90 text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-center"
                >
                  Registrar Asistencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Recepcion;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clienteSupabase } from '../supabaseClient';
import { BACKEND_URL } from '../config';

const PortalSeleccion = () => {
  const navegar = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [contrasenas, setContrasenas] = useState({ dueno: 'password123', recepcion: 'password123' });
  
  // Estados de entrada
  const [seleccionado, setSeleccionado] = useState<'dueno' | 'recepcion' | null>(null);
  const [claveIngresada, setClaveIngresada] = useState('');
  const [errorClave, setErrorClave] = useState('');

  // Estados de suscripción y suspensión
  const [estaSuspendido, setEstaSuspendido] = useState(false);
  const [mostrarSuspensionModal, setMostrarSuspensionModal] = useState(false);
  const [gymNombre, setGymNombre] = useState('GymPross');
  const [duenoNombre, setDuenoNombre] = useState('Propietario');
  const [fechaVencimiento, setFechaVencimiento] = useState('');

  // Datos de contacto del Desarrollador (Developer)
  const [whatsappLink, setWhatsappLink] = useState('https://api.whatsapp.com/qr/JDXS7KRAPDO7D1?autoload=1&app_absent=0');
  const [whatsappNumber, setWhatsappNumber] = useState('73084452');
  const [whatsappQr, setWhatsappQr] = useState('');

  const cargarConfiguracion = async () => {
    try {
      setCargando(true);
      const { data: { session } } = await clienteSupabase.auth.getSession();
      const token = session?.access_token || '';
      if (!token) {
        navegar('/login');
        return;
      }

      const { data: { user } } = await clienteSupabase.auth.getUser();
      if (user) {
        // Verificar suscripción del gimnasio antes de cargar el portal
        const { data: usuarioInfo } = await clienteSupabase
          .from('usuarios_personal')
          .select('id_gimnasio, nombre_completo')
          .eq('id_usuario', user.id)
          .maybeSingle();

        if (usuarioInfo) {
          // Obtener el nombre del dueño del gimnasio
          const { data: duenoInfo } = await clienteSupabase
            .from('usuarios_personal')
            .select('nombre_completo')
            .eq('id_gimnasio', usuarioInfo.id_gimnasio)
            .eq('rol_usuario', 'dueno')
            .maybeSingle();

          if (duenoInfo) {
            setDuenoNombre(duenoInfo.nombre_completo);
          } else {
            setDuenoNombre(usuarioInfo.nombre_completo);
          }

          const { data: gimnasioInfo } = await clienteSupabase
            .from('gimnasios')
            .select('nombre_gimnasio, estado_suscripcion, fecha_vencimiento')
            .eq('id_gimnasio', usuarioInfo.id_gimnasio)
            .maybeSingle();

          if (gimnasioInfo) {
            setGymNombre(gimnasioInfo.nombre_gimnasio || 'GymPross');
            const vencimiento = gimnasioInfo.fecha_vencimiento;
            const expirado = vencimiento ? new Date() > new Date(vencimiento) : false;
            if (gimnasioInfo.estado_suscripcion === 'suspendido' || expirado) {
              setEstaSuspendido(true);
            }

            if (gimnasioInfo.fecha_vencimiento) {
              const f = new Date(gimnasioInfo.fecha_vencimiento);
              setFechaVencimiento(
                f.toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })
              );
            }
          }
        }
      }

      // Obtener configuraciones globales del desarrollador
      const { data: configs } = await clienteSupabase
        .from('configuraciones_globales')
        .select('clave, valor')
        .in('clave', ['dev_whatsapp_link', 'dev_whatsapp_number', 'dev_whatsapp_qr']);

      if (configs) {
        configs.forEach((c) => {
          if (c.clave === 'dev_whatsapp_link' && c.valor) setWhatsappLink(c.valor);
          if (c.clave === 'dev_whatsapp_number' && c.valor) setWhatsappNumber(c.valor);
          if (c.clave === 'dev_whatsapp_qr' && c.valor) setWhatsappQr(c.valor);
        });
      }

      // Obtener contraseñas del gimnasio desde el endpoint consolidado
      const res = await fetch(`${BACKEND_URL}/api/recepcion/dashboard/datos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Error al consultar credenciales del gimnasio.");
      const datos = await res.json();
      
      setContrasenas({
        dueno: datos.contrasena_dueno || 'password123',
        recepcion: datos.contrasena_recepcion || 'password123'
      });
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cerrarSesion = async () => {
    await clienteSupabase.auth.signOut();
    sessionStorage.removeItem('rol_activo');
    navegar('/');
  };

  const verificarClave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorClave('');

    if (!seleccionado) return;

    const claveCorrecta = seleccionado === 'dueno' ? contrasenas.dueno : contrasenas.recepcion;

    if (claveIngresada === claveCorrecta) {
      if (estaSuspendido) {
        setMostrarSuspensionModal(true);
        return;
      }

      sessionStorage.setItem('rol_activo', seleccionado);
      if (seleccionado === 'dueno') {
        navegar('/dueno');
      } else {
        navegar('/recepcion');
      }
    } else {
      setErrorClave('La contraseña de acceso ingresada es incorrecta.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      {/* Luces de fondo */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-red/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-red/10 blur-[150px] pointer-events-none"></div>

      {/* Cabecera */}
      <div className="flex justify-between items-center relative z-10 w-full max-w-5xl mx-auto py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center font-black text-sm text-white">
            GP
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-red">
            GymPross Central
          </span>
        </div>
        <button
          onClick={cerrarSesion}
          className="border border-white/20 hover:border-brand-red hover:bg-brand-red/10 text-white text-xs px-4 py-2 rounded-full font-semibold transition cursor-pointer"
        >
          Cerrar Sesión / Salir
        </button>
      </div>

      {/* Contenido Principal */}
      <div className="flex-grow flex items-center justify-center relative z-10 py-8">
        {cargando ? (
          <p className="text-gray-400 text-sm font-semibold tracking-wider uppercase animate-pulse">Cargando credenciales del portal...</p>
        ) : (
          <div className="max-w-4xl w-full space-y-12 text-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Portal de Selección</h1>
              <p className="text-gray-400 text-xs mt-2 uppercase tracking-wider font-semibold">Selecciona la terminal de trabajo para continuar</p>
            </div>

            {/* Grid de Selección */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
              
              {/* Tarjeta Dueño */}
              <div 
                onClick={() => {
                  setSeleccionado('dueno');
                  setClaveIngresada('');
                  setErrorClave('');
                }}
                className={`bg-white/5 backdrop-blur-md border rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 hover:scale-102 hover:border-brand-red/40 ${
                  seleccionado === 'dueno' ? 'border-brand-red shadow-[0_0_20px_rgba(229,57,53,0.2)]' : 'border-white/10'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight text-white">Dueño del Gimnasio</h3>
                <p className="text-xs text-gray-400 mt-2">
                  Acceso al panel de estadísticas, promociones, empleados y configuración global.
                </p>
              </div>

              {/* Tarjeta Recepción */}
              <div 
                onClick={() => {
                  setSeleccionado('recepcion');
                  setClaveIngresada('');
                  setErrorClave('');
                }}
                className={`bg-white/5 backdrop-blur-md border rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 hover:scale-102 hover:border-brand-red/40 ${
                  seleccionado === 'recepcion' ? 'border-brand-red shadow-[0_0_20px_rgba(229,57,53,0.2)]' : 'border-white/10'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight text-white">Terminal de Recepción</h3>
                <p className="text-xs text-gray-400 mt-2">
                  Registro de pagos de socios, asistencia manual, visualización de casilleros y control de ingreso.
                </p>
              </div>

            </div>

            {/* Formulario de Contraseña de Acceso */}
            {seleccionado && (
              <form onSubmit={verificarClave} className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 animate-fade-in text-left">
                <h4 className="text-sm font-bold uppercase tracking-wide text-brand-red">
                  Verificar acceso para {seleccionado === 'dueno' ? 'Dueño' : 'Recepción'}
                </h4>
                
                {errorClave && (
                  <p className="text-xs text-brand-red font-semibold bg-brand-red/10 border border-brand-red/20 px-3 py-2 rounded-lg text-center">
                    {errorClave}
                  </p>
                )}

                <div className="space-y-2">
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Contraseña del Terminal
                  </label>
                  <input
                    type="password"
                    value={claveIngresada}
                    onChange={(e) => setClaveIngresada(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all duration-300"
                    placeholder="Digita la contraseña"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-red hover:bg-brand-red/90 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer text-center uppercase tracking-wider"
                >
                  Entrar al Panel
                </button>
              </form>
            )}

          </div>
        )}
      </div>

      {/* Pie de página */}
      <div className="text-center text-[10px] text-gray-600 font-semibold uppercase tracking-wider py-2 relative z-10">
        GymPross Security Portal - Todos los derechos reservados
      </div>

      {/* Modal de Suspensión */}
      {mostrarSuspensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          {/* Card Glassmorphic */}
          <div className="relative max-w-xl w-full bg-zinc-950/90 border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl space-y-6 text-left transform scale-100 transition-all duration-300">
            {/* Cabecera del Modal */}
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-brand-red font-bold text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-brand-red animate-ping"></span>
                  Suscripción en pausa
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
                  Acceso en pausa: Tu gimnasio no puede detenerse
                </h1>
              </div>
              <button 
                onClick={() => setMostrarSuspensionModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mensaje de Suspensión */}
            <div className="space-y-4 text-gray-300 text-sm leading-relaxed border-t border-white/5 pt-4">
              <p>
                Hola <span className="font-bold text-white uppercase">{duenoNombre}</span>, el pago de tu plan mensual de <span className="font-bold text-white">{gymNombre}</span> no pudo procesarse {fechaVencimiento ? `el ${fechaVencimiento}` : 'a tiempo'}.
              </p>
              <p>
                Para evitar que tus entrenadores y alumnos se queden sin acceso a la app y al control de entrada, reactiva tu cuenta en menos de 2 minutos.
              </p>
            </div>

            {/* Acciones del Desarrollador */}
            <div className="space-y-4 pt-2">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-brand-red hover:bg-brand-red/90 text-white h-12 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-[0_0_15px_rgba(229,57,53,0.3)] hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-2"
              >
                Pagar y Activar Sistema
              </a>
              
              <div className="text-center">
                <a 
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-emerald-400 transition-all font-semibold underline cursor-pointer inline-flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.59 1.977 14.113.953 11.999.953c-5.45 0-9.877 4.373-9.88 9.8.001 1.745.485 3.326 1.42 4.91l-.995 3.636 3.737-.966zM17.13 15.3c-.278-.139-1.643-.81-1.897-.902-.255-.093-.44-.139-.626.139-.185.277-.718.902-.88 1.088-.163.186-.325.209-.603.07-2.072-1.033-3.4-1.808-4.756-4.135-.297-.506-.593-.68-.871-.692-.27-.013-.536-.015-.8-.015-.264 0-.695.1-1.057.502-.362.403-1.385 1.353-1.385 3.298 0 1.944 1.417 3.824 1.613 4.084.197.26 2.785 4.254 6.749 5.962.943.407 1.68.651 2.256.834.947.3 1.81.258 2.492.156.76-.113 2.33-.951 2.656-1.87.326-.918.326-1.707.228-1.87-.099-.163-.363-.255-.642-.395z" />
                  </svg>
                  ¿Tienes problemas? Hablar con soporte por WhatsApp
                </a>
              </div>
            </div>

            {/* Código QR Minimalista */}
            <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center gap-6 justify-between bg-white/[0.01] p-4 rounded-2xl">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-xs font-bold text-white">Escanea el código QR</div>
                <div className="text-[11px] text-gray-500">Para chatear directamente o pagar desde tu celular</div>
                <div className="text-[10px] text-gray-500 font-mono mt-2">Soporte Tel: {whatsappNumber}</div>
              </div>
              <div className="p-2 bg-white rounded-xl shadow-md flex-shrink-0">
                <img 
                  src={whatsappQr || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(whatsappLink)}`} 
                  alt="WhatsApp QR" 
                  className="w-28 h-28 object-contain"
                />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default PortalSeleccion;

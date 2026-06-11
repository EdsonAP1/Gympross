import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clienteSupabase } from '../supabaseClient';

const Suspendido = () => {
  const navegar = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [gymNombre, setGymNombre] = useState('GymPross');
  const [duenoNombre, setDuenoNombre] = useState('Propietario');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  
  // Datos de contacto del Desarrollador (Developer)
  const [whatsappLink, setWhatsappLink] = useState('https://api.whatsapp.com/qr/JDXS7KRAPDO7D1?autoload=1&app_absent=0');
  const [whatsappNumber, setWhatsappNumber] = useState('73084452');
  const [whatsappQr, setWhatsappQr] = useState('');

  const cargarDatos = async () => {
    try {
      setCargando(true);
      
      // 1. Obtener sesión de usuario
      const { data: { user } } = await clienteSupabase.auth.getUser();
      if (user) {
        // Obtener el perfil
        const { data: perfil } = await clienteSupabase
          .from('usuarios_personal')
          .select('id_gimnasio, nombre_completo')
          .eq('id_usuario', user.id)
          .maybeSingle();
        
        if (perfil) {
          // Obtener el nombre del dueño del gimnasio
          const { data: duenoInfo } = await clienteSupabase
            .from('usuarios_personal')
            .select('nombre_completo')
            .eq('id_gimnasio', perfil.id_gimnasio)
            .eq('rol_usuario', 'dueno')
            .maybeSingle();

          if (duenoInfo) {
            setDuenoNombre(duenoInfo.nombre_completo);
          } else {
            setDuenoNombre(perfil.nombre_completo);
          }

          // Obtener datos del gimnasio y vencimiento
          const { data: gim } = await clienteSupabase
            .from('gimnasios')
            .select('nombre_gimnasio, fecha_vencimiento')
            .eq('id_gimnasio', perfil.id_gimnasio)
            .maybeSingle();

          if (gim) {
            setGymNombre(gim.nombre_gimnasio);
            if (gim.fecha_vencimiento) {
              const f = new Date(gim.fecha_vencimiento);
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

      // 2. Obtener configuraciones globales del desarrollador
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

    } catch (err) {
      console.error("Error al cargar datos de suspension:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cerrarSesion = async () => {
    await clienteSupabase.auth.signOut();
    sessionStorage.removeItem('rol_activo');
    navegar('/login');
  };

  const qrUrlFinal = whatsappQr || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(whatsappLink)}`;

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      {/* Resplandor rojo de advertencia de fondo */}
      <div className="absolute top-[10%] left-[20%] w-[60%] h-[60%] rounded-full bg-brand-red/5 blur-[200px] pointer-events-none"></div>

      {/* Cabecera */}
      <div className="flex justify-between items-center relative z-10 w-full max-w-4xl mx-auto py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center font-black text-sm text-white shadow-[0_0_10px_rgba(229,57,53,0.4)]">
            GP
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-red">
            GymPross Portal
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
          <p className="text-gray-400 text-sm font-semibold tracking-wider uppercase animate-pulse">
            Verificando estado de la suscripción...
          </p>
        ) : (
          <div className="max-w-xl w-full bg-zinc-950/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 md:p-10 shadow-2xl text-left space-y-6">
            
            {/* Título principal de aviso de suspensión */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-brand-red font-bold text-xs uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-brand-red animate-ping"></span>
                Suscripción en pausa
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
                Acceso en pausa: Tu gimnasio no puede detenerse
              </h1>
            </div>

            {/* Cuerpo del Mensaje */}
            <div className="space-y-4 text-gray-300 text-sm leading-relaxed border-t border-white/5 pt-4">
              <p>
                Hola <span className="font-bold text-white uppercase">{duenoNombre}</span>, el pago de tu plan mensual de <span className="font-bold text-white">{gymNombre}</span> no pudo procesarse {fechaVencimiento ? `el ${fechaVencimiento}` : 'a tiempo'}.
              </p>
              <p>
                Para evitar que tus entrenadores y alumnos se queden sin acceso a la app y al control de entrada, reactiva tu cuenta en menos de 2 minutos.
              </p>
            </div>

            {/* Acciones de Pago y Soporte */}
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
                  src={qrUrlFinal} 
                  alt="WhatsApp QR" 
                  className="w-28 h-28 object-contain"
                />
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Pie de página */}
      <div className="text-center text-[10px] text-gray-600 font-semibold uppercase tracking-wider py-2 relative z-10">
        GymPross SAAS Portal - Todos los derechos reservados
      </div>
    </div>
  );
};

export default Suspendido;

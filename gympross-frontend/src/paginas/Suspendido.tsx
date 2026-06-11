import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clienteSupabase } from '../supabaseClient';

const Suspendido = () => {
  const navegar = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [gymNombre, setGymNombre] = useState('tu gimnasio');
  
  // Datos de contacto del Desarrollador (Developer)
  const [whatsappLink, setWhatsappLink] = useState('https://api.whatsapp.com/qr/JDXS7KRAPDO7D1?autoload=1&app_absent=0');
  const [whatsappNumber, setWhatsappNumber] = useState('73084452');
  const [whatsappQr, setWhatsappQr] = useState('');

  const cargarDatos = async () => {
    try {
      setCargando(true);
      // 1. Obtener información del gimnasio si es posible
      const { data: { user } } = await clienteSupabase.auth.getUser();
      if (user) {
        const { data: perfil } = await clienteSupabase
          .from('usuarios_personal')
          .select('id_gimnasio')
          .eq('id_usuario', user.id)
          .maybeSingle();
        
        if (perfil) {
          const { data: gim } = await clienteSupabase
            .from('gimnasios')
            .select('nombre_gimnasio')
            .eq('id_gimnasio', perfil.id_gimnasio)
            .maybeSingle();
          if (gim) {
            setGymNombre(gim.nombre_gimnasio);
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

  // Generar un código QR dinámico si no hay una imagen cargada
  const qrUrlFinal = whatsappQr || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(whatsappLink)}`;

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      {/* Resplandor rojo de advertencia (glow) */}
      <div className="absolute top-[10%] left-[20%] w-[60%] h-[60%] rounded-full bg-brand-red/10 blur-[180px] pointer-events-none"></div>

      {/* Cabecera */}
      <div className="flex justify-between items-center relative z-10 w-full max-w-5xl mx-auto py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center font-black text-sm text-white shadow-[0_0_10px_rgba(229,57,53,0.5)] animate-pulse">
            GP
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-red">
            GymPross Security Portal
          </span>
        </div>
        <button
          onClick={cerrarSesion}
          className="border border-white/20 hover:border-brand-red hover:bg-brand-red/10 text-white text-xs px-4 py-2 rounded-full font-semibold transition cursor-pointer"
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Contenido de Suspensión */}
      <div className="flex-grow flex items-center justify-center relative z-10 py-12">
        {cargando ? (
          <p className="text-gray-400 text-sm font-semibold tracking-wider uppercase animate-pulse">
            Verificando estado de la suscripción...
          </p>
        ) : (
          <div className="max-w-2xl w-full bg-white/5 backdrop-blur-xl border border-brand-red/30 rounded-3xl p-8 md:p-12 text-center shadow-[0_0_50px_rgba(229,57,53,0.15)] space-y-8 animate-fade-in">
            
            {/* Ícono de Advertencia */}
            <div className="w-20 h-20 rounded-full border-4 border-brand-red flex items-center justify-center bg-brand-red/10 shadow-[0_0_25px_rgba(229,57,53,0.4)] mx-auto animate-bounce">
              <svg className="w-10 h-10 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Mensajes Principales */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white leading-none">
                Suscripción Expirada
              </h1>
              <h2 className="text-xl md:text-2xl font-bold text-brand-red">
                El acceso para "{gymNombre}" ha sido suspendido temporalmente.
              </h2>
              <p className="text-gray-300 text-sm max-w-md mx-auto leading-relaxed">
                Para reestablecer el acceso y continuar utilizando la plataforma SaaS de GymPross, debes realizar el pago correspondiente a la suscripción.
              </p>
            </div>

            {/* Código QR y Enlace de WhatsApp */}
            <div className="bg-black/40 border border-white/5 rounded-2xl p-6 max-w-sm mx-auto space-y-6 shadow-inner">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">
                  Escanea para Pagar / Soporte
                </span>
                
                {/* QR de WhatsApp */}
                <div className="p-3 bg-white rounded-xl shadow-lg border border-gray-200">
                  <img 
                    src={qrUrlFinal} 
                    alt="WhatsApp QR Code" 
                    className="w-44 h-44 object-contain"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs text-gray-400">
                  ¿Deseas pagar o necesitas asistencia?
                </div>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white h-12 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.59 1.977 14.113.953 11.999.953c-5.45 0-9.877 4.373-9.88 9.8.001 1.745.485 3.326 1.42 4.91l-.995 3.636 3.737-.966zM17.13 15.3c-.278-.139-1.643-.81-1.897-.902-.255-.093-.44-.139-.626.139-.185.277-.718.902-.88 1.088-.163.186-.325.209-.603.07-2.072-1.033-3.4-1.808-4.756-4.135-.297-.506-.593-.68-.871-.692-.27-.013-.536-.015-.8-.015-.264 0-.695.1-1.057.502-.362.403-1.385 1.353-1.385 3.298 0 1.944 1.417 3.824 1.613 4.084.197.26 2.785 4.254 6.749 5.962.943.407 1.68.651 2.256.834.947.3 1.81.258 2.492.156.76-.113 2.33-.951 2.656-1.87.326-.918.326-1.707.228-1.87-.099-.163-.363-.255-.642-.395z" />
                  </svg>
                  Comuníquese con el Developer
                </a>
                
                <div className="text-[10px] text-gray-500 font-mono">
                  Teléfono de Soporte: {whatsappNumber}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Pie de página */}
      <div className="text-center text-[10px] text-gray-600 font-semibold uppercase tracking-wider py-2 relative z-10">
        GymPross SAAS Console - Todos los derechos reservados
      </div>
    </div>
  );
};

export default Suspendido;

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
          .select('id_gimnasio')
          .eq('id_usuario', user.id)
          .maybeSingle();

        if (usuarioInfo) {
          const { data: gimnasioInfo } = await clienteSupabase
            .from('gimnasios')
            .select('estado_suscripcion, fecha_vencimiento')
            .eq('id_gimnasio', usuarioInfo.id_gimnasio)
            .maybeSingle();

          if (gimnasioInfo) {
            const vencimiento = gimnasioInfo.fecha_vencimiento;
            const expirado = vencimiento ? new Date() > new Date(vencimiento) : false;
            if (gimnasioInfo.estado_suscripcion === 'suspendido' || expirado) {
              navegar('/suspendido');
              return;
            }
          }
        }
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
    </div>
  );
};

export default PortalSeleccion;

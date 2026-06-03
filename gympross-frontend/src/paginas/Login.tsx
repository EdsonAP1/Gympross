import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clienteSupabase } from '../supabaseClient';

const Login = () => {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState('');
  const navegar = useNavigate();

  const manejarEnvio = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setCargando(true);
    setErrorMensaje('');

    try {
      const { data, error } = await clienteSupabase.auth.signInWithPassword({
        email: correo,
        password: contrasena,
      });

      if (error) {
        setErrorMensaje(error.message);
        setCargando(false);
        return;
      }

      if (data?.user) {
        const idUsuario = data.user.id;
        const correoUsuario = data.user.email;

        // Comprobar si es SuperAdmin por correo
        if (correoUsuario === 'superadmin@gympross.com') {
          navegar('/superadmin');
          return;
        }

        // Obtener rol y gimnasio de usuarios_personal
        const { data: datosPersonal, error: errorPersonal } = await clienteSupabase
          .from('usuarios_personal')
          .select('rol_usuario, id_gimnasio')
          .eq('id_usuario', idUsuario)
          .maybeSingle();

        if (errorPersonal) {
          setErrorMensaje('Error al consultar los datos del usuario.');
          setCargando(false);
          return;
        }

        if (!datosPersonal) {
          setErrorMensaje('Usuario no registrado en el sistema del gimnasio.');
          setCargando(false);
          return;
        }

        // Redirigir según el rol del usuario al portal de selección (Solo se permite el rol del Dueño)
        const rol = datosPersonal.rol_usuario;
        if (rol === 'dueno') {
          navegar('/portal-seleccion');
        } else {
          setErrorMensaje('Acceso restringido. Los recepcionistas deben entrar a través del portal configurado por el dueño.');
          setCargando(false);
          await clienteSupabase.auth.signOut();
          return;
        }
      }
    } catch (err) {
      setErrorMensaje('Ocurrió un error inesperado al intentar iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col justify-center items-center relative overflow-hidden px-4">
      {/* Glow de fondo decorativo */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-red/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-red/10 blur-[150px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl relative z-10">
        {/* Título de Cabecera */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full border border-brand-red bg-brand-red/10 flex items-center justify-center font-black text-brand-red text-lg tracking-tighter mx-auto mb-4">
            GP
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">GymPross</h2>
          <p className="text-sm text-gray-400 mt-2">Ingresa tus credenciales para acceder al sistema</p>
        </div>

        {/* Alerta de Error */}
        {errorMensaje && (
          <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm px-4 py-3 rounded-2xl mb-6 text-center">
            {errorMensaje}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={manejarEnvio} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none transition-all duration-300 placeholder-gray-600"
              placeholder="nombre@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none transition-all duration-300 placeholder-gray-600"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-brand-red hover:bg-brand-red/90 disabled:bg-brand-red/50 text-white py-3.5 rounded-2xl font-bold transition-all duration-300 shadow-[0_0_15px_rgba(229,57,53,0.3)] hover:shadow-[0_0_20px_rgba(229,57,53,0.5)] cursor-pointer flex justify-center items-center"
          >
            {cargando ? 'Iniciando sesión...' : 'Ingresar'}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => navegar('/')}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors duration-300 underline cursor-pointer"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clienteSupabase } from '../supabaseClient';
import { BACKEND_URL } from '../config';

type EstadoTotem = 'esperando' | 'procesando' | 'exito' | 'error';

interface InfoIngreso {
  nombre: string;
  tipo: string;
  foto: string;
  mensaje: string;
  rawTipo: string;
  numeroLlave?: number | null;
}

const TotemPin = () => {
  const navegar = useNavigate();
  const [pin, setPin] = useState('');
  const [estado, setEstado] = useState<EstadoTotem>('esperando');
  const [mensajeError, setMensajeError] = useState('');
  const [datosIngreso, setDatosIngreso] = useState<InfoIngreso | null>(null);
  const [gimnasioNombre, setGimnasioNombre] = useState('Gimnasio');
  const [logoUrl, setLogoUrl] = useState('');

  // Estados para los Casilleros
  const [cantidadCasilleros, setCantidadCasilleros] = useState(20);
  const [llavesOcupadas, setLlavesOcupadas] = useState<number[]>([]);

  // Cargar datos consolidados
  const cargarDatos = async () => {
    try {
      const { data: { user } } = await clienteSupabase.auth.getUser();
      if (!user) return;

      // Cargar perfil para nombre del gimnasio
      const { data: perfil } = await clienteSupabase
        .from('usuarios_personal')
        .select('id_gimnasio')
        .eq('id_usuario', user.id)
        .maybeSingle();

      if (perfil) {
        const { data: gim } = await clienteSupabase
          .from('gimnasios')
          .select('nombre_gimnasio, cantidad_casilleros, logo_url')
          .eq('id_gimnasio', perfil.id_gimnasio)
          .maybeSingle();
        if (gim) {
          setGimnasioNombre(gim.nombre_gimnasio);
          setLogoUrl(gim.logo_url || '');
          setCantidadCasilleros(gim.cantidad_casilleros || 20);
        }
      }

      // Obtener asistencias activas para ver qué llaves están ocupadas
      const { data: { session } } = await clienteSupabase.auth.getSession();
      const token = session?.access_token || '';
      if (!token) return;

      const respuesta = await fetch(`${BACKEND_URL}/api/recepcion/dashboard/datos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (respuesta.status === 403) {
        const errorData = await respuesta.json().catch(() => ({}));
        if (errorData.error && errorData.error.toLowerCase().includes("suscripción")) {
          navegar('/suspendido');
          return;
        }
      }

      if (respuesta.ok) {
        const datos = await respuesta.json();
        
        // Extraer números de llaves ocupadas
        const ocupadas = (datos.asistencias_activas || [])
          .filter((a: any) => a.numero_llave !== null && a.numero_llave !== undefined)
          .map((a: any) => Number(a.numero_llave));
        setLlavesOcupadas(ocupadas);
      }
    } catch (err) {
      console.error("Error al cargar datos del Tótem:", err);
    }
  };

  useEffect(() => {
    cargarDatos();
    const intervalo = setInterval(cargarDatos, 5000);
    return () => clearInterval(intervalo);
  }, []);

  // Escuchar teclado físico
  useEffect(() => {
    const manejarTecla = (e: KeyboardEvent) => {
      if (estado !== 'esperando') return;

      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 6) {
          setPin(prev => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        if (pin.length === 6) {
          procesarIngreso(pin);
        }
      }
    };

    window.addEventListener('keydown', manejarTecla);
    return () => {
      window.removeEventListener('keydown', manejarTecla);
    };
  }, [pin, estado]);

  const procesarIngreso = async (pinAEnviar: string) => {
    if (pinAEnviar.length !== 6) return;

    try {
      setEstado('procesando');
      const { data: { session } } = await clienteSupabase.auth.getSession();
      const token = session?.access_token || '';

      const cuerpo = { pin_acceso: pinAEnviar };

      const respuesta = await fetch(`${BACKEND_URL}/api/recepcion/totem/marcar-asistencia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cuerpo)
      });

      if (respuesta.ok) {
        const datos = await respuesta.json();
        
        // Determinar mensaje y tipo
        let tipoDisplay = 'Socio';
        if (datos.tipo === 'cliente_entrada') {
          tipoDisplay = 'Acceso Autorizado (Entrada)';
        } else if (datos.tipo === 'cliente_salida') {
          tipoDisplay = 'Salida Registrada (Despedida)';
        } else if (datos.tipo === 'personal_entrada') {
          tipoDisplay = 'Personal (Entrada)';
        } else if (datos.tipo === 'personal_salida') {
          tipoDisplay = 'Personal (Salida)';
        }

        setDatosIngreso({
          nombre: datos.nombre,
          tipo: tipoDisplay,
          foto: datos.foto,
          mensaje: datos.mensaje,
          rawTipo: datos.tipo,
          numeroLlave: datos.numero_llave
        });
        
        setEstado('exito');
        cargarDatos();

        // Resetear después de 3 segundos
        setTimeout(() => {
          setPin('');
          setEstado('esperando');
          setDatosIngreso(null);
        }, 3000);
      } else {
        const errorDatos = await respuesta.json();
        setMensajeError(errorDatos.error || 'Error al validar el PIN de acceso.');
        setEstado('error');

        // Resetear después de 3 segundos
        setTimeout(() => {
          setPin('');
          setEstado('esperando');
          setMensajeError('');
        }, 3000);
      }
    } catch (err: any) {
      setMensajeError('Sin conexión con el servidor.');
      setEstado('error');

      setTimeout(() => {
        setPin('');
        setEstado('esperando');
        setMensajeError('');
      }, 3000);
    }
  };

  const presionarNumero = (num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
    }
  };

  const borrarUltimo = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const limpiarPin = () => {
    setPin('');
  };

  const enviarPinForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length === 6) {
      procesarIngreso(pin);
    }
  };

  const salirTotem = () => {
    navegar('/recepcion');
  };

  // Renderizar estados correspondientes
  if (estado === 'exito' && datosIngreso) {
    const esSalida = datosIngreso.rawTipo === 'cliente_salida' || datosIngreso.rawTipo === 'personal_salida';
    return (
      <div className={`min-h-screen ${
        esSalida ? 'bg-red-950/95' : 'bg-green-950/95'
      } flex flex-col items-center justify-center p-8 transition-all duration-500 relative overflow-hidden`}>
        <div className={`absolute w-[60%] h-[60%] rounded-full ${
          esSalida ? 'bg-brand-red/20' : 'bg-emerald-500/20'
        } blur-[150px] pointer-events-none`}></div>

        <div className="max-w-xl w-full text-center relative z-10 space-y-8">
          <div className="flex justify-center">
            <img 
              src={datosIngreso.foto} 
              alt={datosIngreso.nombre}
              className={`w-48 h-48 rounded-full object-cover border-8 ${
                esSalida 
                  ? 'border-brand-red shadow-[0_0_50px_rgba(229,57,53,0.5)]' 
                  : 'border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.5)]'
              }`}
            />
          </div>

          <div className="space-y-4">
            <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${
              esSalida 
                ? 'bg-brand-red/20 border border-brand-red/30 text-brand-red' 
                : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
            }`}>
              {datosIngreso.tipo}
            </span>
            <h1 className="text-5xl md:text-6xl font-black text-white leading-tight">
              {datosIngreso.nombre}
            </h1>
            <p className={`text-2xl font-medium ${
              esSalida ? 'text-red-300' : 'text-emerald-300'
            }`}>
              {datosIngreso.mensaje}
            </p>

            {datosIngreso.numeroLlave && (
              <div className="flex flex-col items-center justify-center mt-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-1">
                  {esSalida ? 'Casillero Devuelto' : 'Casillero Asignado'}
                </span>
                <div className={`w-28 h-28 rounded-2xl flex items-center justify-center text-7xl font-black border-4 shadow-2xl ${
                  esSalida 
                    ? 'bg-brand-red/20 border-brand-red text-brand-red shadow-[0_0_30px_rgba(229,57,53,0.4)]' 
                    : 'bg-green-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                }`}>
                  {datosIngreso.numeroLlave}
                </div>
              </div>
            )}
          </div>

          <div className="pt-6">
            <p className={`text-xs uppercase tracking-widest font-bold ${
              esSalida ? 'text-red-400/60' : 'text-emerald-400/60'
            }`}>
              Registro Procesado Correctamente
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (estado === 'error') {
    return (
      <div className="min-h-screen bg-red-950/95 flex flex-col items-center justify-center p-8 transition-all duration-500 relative overflow-hidden">
        <div className="absolute w-[60%] h-[60%] rounded-full bg-brand-red/20 blur-[150px] pointer-events-none"></div>

        <div className="max-w-xl w-full text-center relative z-10 space-y-8">
          <div className="flex justify-center">
            <div className="w-40 h-40 rounded-full border-8 border-brand-red flex items-center justify-center bg-brand-red/10 shadow-[0_0_50px_rgba(229,57,53,0.5)]">
              <svg className="w-20 h-20 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          <div className="space-y-4">
            <span className="inline-block px-4 py-1.5 bg-brand-red/20 border border-brand-red/30 text-brand-red rounded-full text-sm font-bold uppercase tracking-wider">
              Acceso Denegado
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
              Ingreso Denegado
            </h1>
            <p className="text-xl md:text-2xl text-red-300 font-semibold px-4">
              {mensajeError}
            </p>
          </div>

          <div className="pt-6">
            <p className="text-xs uppercase text-red-400/60 tracking-widest font-bold">
              Por favor, consulte en la recepción para solucionar su estado
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Lista de casilleros de 1 a cantidadCasilleros
  const casilleros = Array.from({ length: cantidadCasilleros }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-black text-white font-sans p-6 flex flex-col justify-between relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-red/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-red/5 blur-[150px] pointer-events-none"></div>

      {/* Cabecera */}
      <div className="flex justify-between items-center relative z-10 w-full max-w-7xl mx-auto py-2">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo Gimnasio" className="w-8 h-8 rounded-full object-cover border border-white/25 shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center font-black text-sm text-white">
              GP
            </div>
          )}
          <span className="text-xs font-bold uppercase tracking-wider text-brand-red">
            {gimnasioNombre} (Autoservicio)
          </span>
        </div>
        <button
          onClick={salirTotem}
          className="border border-white/20 hover:border-brand-red hover:bg-brand-red/10 text-white text-xs px-4 py-2 rounded-full font-semibold transition cursor-pointer"
        >
          Volver a Recepción
        </button>
      </div>

      {/* Contenido Principal con Layout de Dos Columnas */}
      <div className="flex-grow flex items-center justify-center relative z-10 py-6 max-w-7xl w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
          
          {/* Columna Izquierda: Teclado y Entrada PIN (ancho 5/12) */}
          <div className="lg:col-span-5 flex flex-col justify-center items-center">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl text-center shadow-2xl space-y-6 w-full max-w-md">
              <div>
                <h1 className="text-2xl font-black text-brand-red tracking-tight uppercase">
                  Tótem de Acceso
                </h1>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-bold">
                  Ingresa tu PIN de 6 dígitos
                </p>
              </div>

              <form onSubmit={enviarPinForm} className="space-y-6">
                {/* Visualizador de PIN */}
                <div className="flex justify-center gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-10 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-300 ${
                        i < pin.length
                          ? 'border-brand-red bg-brand-red/10 text-white shadow-[0_0_15px_rgba(229,57,53,0.3)]'
                          : 'border-white/10 bg-transparent text-gray-600'
                      }`}
                    >
                      {i < pin.length ? pin[i] : ''}
                    </div>
                  ))}
                </div>

                {/* Teclado Numérico */}
                <div className="grid grid-cols-3 gap-2.5">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => presionarNumero(num)}
                      disabled={estado === 'procesando'}
                      className="h-14 rounded-xl bg-white/5 border border-white/5 hover:border-brand-red hover:bg-brand-red/10 text-lg font-bold transition active:scale-95 cursor-pointer flex items-center justify-center text-white"
                    >
                      {num}
                    </button>
                  ))}
                  
                  <button
                    type="button"
                    onClick={limpiarPin}
                    disabled={estado === 'procesando'}
                    className="h-14 rounded-xl bg-white/5 border border-white/5 hover:border-brand-red/30 hover:bg-brand-red/5 text-[10px] uppercase tracking-wider font-bold transition active:scale-95 cursor-pointer flex items-center justify-center text-gray-400"
                  >
                    Limpiar
                  </button>

                  <button
                    type="button"
                    onClick={() => presionarNumero('0')}
                    disabled={estado === 'procesando'}
                    className="h-14 rounded-xl bg-white/5 border border-white/5 hover:border-brand-red hover:bg-brand-red/10 text-lg font-bold transition active:scale-95 cursor-pointer flex items-center justify-center text-white"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={borrarUltimo}
                    disabled={estado === 'procesando'}
                    className="h-14 rounded-xl bg-white/5 border border-white/5 hover:border-brand-red/30 hover:bg-brand-red/5 text-lg font-bold transition active:scale-95 cursor-pointer flex items-center justify-center text-gray-400"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414A2 2 0 0010.828 5H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z" />
                    </svg>
                  </button>
                </div>

                {/* Botón de Enviar */}
                <button
                  type="submit"
                  disabled={pin.length !== 6 || estado === 'procesando'}
                  className="w-full bg-brand-red hover:bg-brand-red/90 disabled:bg-brand-red/40 disabled:cursor-not-allowed text-white h-12 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-[0_0_20px_rgba(229,57,53,0.3)] cursor-pointer flex items-center justify-center"
                >
                  {estado === 'procesando' ? 'Procesando...' : 'Confirmar'}
                </button>
              </form>
            </div>
          </div>

          {/* Columna Derecha: Pizarra de Casilleros Disponibles (ancho 7/12) */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl h-full flex flex-col">
              <div className="mb-4 text-left">
                <h2 className="text-xl font-bold">Visualizador de Casilleros</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Pizarra informativa de casilleros del gimnasio en tiempo real. Los casilleros se asignan automáticamente de forma aleatoria al ingresar tu PIN.
                </p>
              </div>

              {/* Grid de casilleros */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 overflow-y-auto max-h-[380px] p-1 flex-grow">
                {casilleros.map((num) => {
                  const ocupada = llavesOcupadas.includes(num);

                  return (
                    <div
                      key={num}
                      className={`h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 transition duration-200 ${
                        ocupada
                          ? 'bg-brand-red/10 border border-brand-red/20 text-brand-red opacity-80'
                          : 'bg-green-600/10 border border-green-500/20 text-green-400'
                      }`}
                    >
                      <span className="text-lg font-black">{num}</span>
                      <span className="text-[8px] font-bold uppercase tracking-wider">
                        {ocupada ? 'Ocupado' : 'Libre'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Indicadores de Estado */}
              <div className="flex gap-4 justify-start mt-6 border-t border-white/5 pt-4 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-md bg-green-500/20 border border-green-500/30"></div>
                  <span className="text-gray-300">Disponible / Libre</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-md bg-brand-red/20 border border-brand-red/30"></div>
                  <span className="text-gray-300">Ocupado</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-gray-500 font-semibold uppercase tracking-wider relative z-10 py-2">
        GymPross Central Autoservicio - Sistema Protegido
      </div>
    </div>
  );
};

export default TotemPin;

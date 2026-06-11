import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clienteSupabase } from '../supabaseClient';
import { useToast } from '../contexto/ToastContext';
import { BACKEND_URL } from '../config';

interface Gimnasio {
  id_gimnasio: string;
  nombre_gimnasio: string;
  estado_suscripcion: 'activo' | 'suspendido';
  fecha_vencimiento: string;
  propietario_email?: string;
  propietario_nombre?: string;
  propietario_contrasena?: string;
}

const SuperAdmin = () => {
  const navegar = useNavigate();
  const { mostrarToast } = useToast();
  const [gimnasios, setGimnasios] = useState<Gimnasio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [serviceKeyOk, setServiceKeyOk] = useState<boolean | null>(null);

  // Estados del Formulario de Registro
  const [nombreGimnasio, setNombreGimnasio] = useState('');
  const [nombreDueno, setNombreDueno] = useState('');
  const [correoDueno, setCorreoDueno] = useState('');
  const [contrasenaDueno, setContrasenaDueno] = useState('');
  const [duracionMeses, setDuracionMeses] = useState('1');
  
  const [creando, setCreando] = useState(false);
  const [mensajeForm, setMensajeForm] = useState({ tipo: '', texto: '' });

  // Estados del PIN de Seguridad
  const [pinSeguridad, setPinSeguridad] = useState('1806406');
  const [nuevoPin, setNuevoPin] = useState('');
  const [mensajePin, setMensajePin] = useState('');

  // Estados de Configuración del Desarrollador (Soporte)
  const [devWhatsappLink, setDevWhatsappLink] = useState('https://api.whatsapp.com/qr/JDXS7KRAPDO7D1?autoload=1&app_absent=0');
  const [devWhatsappNumber, setDevWhatsappNumber] = useState('73084452');
  const [devWhatsappQr, setDevWhatsappQr] = useState('');
  const [subiendoQr, setSubiendoQr] = useState(false);
  const [mensajeDev, setMensajeDev] = useState('');

  const obtenerToken = async () => {
    const { data: { session } } = await clienteSupabase.auth.getSession();
    return session?.access_token || '';
  };

  const obtenerPin = async () => {
    try {
      const { data, error } = await clienteSupabase
        .from('configuraciones_globales')
        .select('valor')
        .eq('clave', 'pin_seguridad_borrado')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPinSeguridad(data.valor);
      }
    } catch (err: any) {
      console.error("Error al obtener PIN de seguridad:", err.message);
    }
  };

  const verificarServiceKey = async () => {
    try {
      const token = await obtenerToken();
      const resp = await fetch(`${BACKEND_URL}/api/superadmin/gimnasio/verificar-service-key`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setServiceKeyOk(data.service_key_configurada);
      }
    } catch {
      setServiceKeyOk(false);
    }
  };

  const obtenerGimnasios = async () => {
    try {
      setCargando(true);
      // Obtener todos los gimnasios
      const { data: datosGimnasios, error: errorGim } = await clienteSupabase
        .from('gimnasios')
        .select('*');

      if (errorGim) throw errorGim;

      // Obtener personal para buscar a los dueños
      const { data: datosPersonal, error: errorPers } = await clienteSupabase
        .from('usuarios_personal')
        .select('id_gimnasio, correo_electronico, nombre_completo, rol_usuario, contrasena_inicial')
        .eq('rol_usuario', 'dueno');

      if (errorPers) throw errorPers;

      // Unificar datos
      const listaUnificada = (datosGimnasios || []).map((gim: any) => {
        const duenoInfo = (datosPersonal || []).find((p: any) => p.id_gimnasio === gim.id_gimnasio);
        return {
          ...gim,
          propietario_email: duenoInfo ? duenoInfo.correo_electronico : 'No registrado',
          propietario_nombre: duenoInfo ? duenoInfo.nombre_completo : 'No registrado',
          propietario_contrasena: duenoInfo ? duenoInfo.contrasena_inicial : 'No disponible'
        };
      });

      setGimnasios(listaUnificada);
    } catch (err: any) {
      console.error("Error al obtener gimnasios:", err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerPin();
    obtenerGimnasios();
    verificarServiceKey();
    obtenerConfiguracionesDev();
  }, []);

  const cerrarSesion = async () => {
    await clienteSupabase.auth.signOut();
    navegar('/');
  };

  const registrarGimnasio = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreando(true);
    setMensajeForm({ tipo: '', texto: '' });

    try {
      // Usar el nuevo endpoint seguro del backend que confirma el email automáticamente
      const token = await obtenerToken();
      
      const resp = await fetch(`${BACKEND_URL}/api/superadmin/gimnasio/crear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre_gimnasio: nombreGimnasio,
          nombre_dueno: nombreDueno,
          correo_dueno: correoDueno,
          contrasena_dueno: contrasenaDueno,
          duracion_meses: parseInt(duracionMeses)
        })
      });

      const resultado = await resp.json();

      if (!resp.ok) {
        throw new Error(resultado.error || 'Error al crear el gimnasio');
      }

      const emailConfirmado = resultado.email_confirmado;
      const mensajeExito = emailConfirmado
        ? `Gimnasio "${nombreGimnasio}" y dueño registrados. El dueño puede iniciar sesion inmediatamente.`
        : `Gimnasio creado. AVISO: El email "${correoDueno}" requiere confirmacion manual en Supabase Dashboard > Authentication > Users.`;

      setMensajeForm({ 
        tipo: emailConfirmado ? 'exito' : 'advertencia', 
        texto: mensajeExito 
      });
      
      // Limpiar formulario
      setNombreGimnasio('');
      setNombreDueno('');
      setCorreoDueno('');
      setContrasenaDueno('');
      
      // Refrescar lista
      obtenerGimnasios();
    } catch (err: any) {
      const msg = err.message || 'Error al procesar el registro.';
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('exceeded')) {
        setMensajeForm({
          tipo: 'error_explicado',
          texto: msg
        });
      } else {
        setMensajeForm({ tipo: 'error', texto: msg });
      }
    } finally {
      setCreando(false);
    }
  };

  const cambiarEstadoSuscripcion = async (id: string, estadoActual: 'activo' | 'suspendido') => {
    const nuevoEstado = estadoActual === 'activo' ? 'suspendido' : 'activo';
    try {
      const { error } = await clienteSupabase
        .from('gimnasios')
        .update({ estado_suscripcion: nuevoEstado })
        .eq('id_gimnasio', id);

      if (error) throw error;
      mostrarToast("Estado de suscripción actualizado con éxito.", "exito");
      obtenerGimnasios();
    } catch (err: any) {
      mostrarToast("Error al cambiar estado: " + err.message, "error");
    }
  };

  const renovarSuscripcion = async (id: string, fechaActualStr: string) => {
    const fechaActual = new Date(fechaActualStr);
    // Extender 30 días
    fechaActual.setDate(fechaActual.getDate() + 30);
    try {
      const { error } = await clienteSupabase
        .from('gimnasios')
        .update({ fecha_vencimiento: fechaActual.toISOString() })
        .eq('id_gimnasio', id);

      if (error) throw error;
      mostrarToast("Suscripción renovada por 30 días.", "exito");
      obtenerGimnasios();
    } catch (err: any) {
      mostrarToast("Error al renovar: " + err.message, "error");
    }
  };

  const eliminarGimnasio = async (idGimnasio: string, nombreGim: string) => {
    const pinIngresado = prompt(`ADVERTENCIA: Estás por eliminar el gimnasio "${nombreGim}" y toda su información de acceso de manera irreversible.\n\nPor favor, introduce tu contraseña de seguridad de SuperAdmin para continuar:`);
    
    if (pinIngresado === null) return; // Operación cancelada por el usuario

    if (pinIngresado === pinSeguridad) {
      try {
        const { error } = await clienteSupabase
          .from('gimnasios')
          .delete()
          .eq('id_gimnasio', idGimnasio);

        if (error) throw error;
        mostrarToast("Gimnasio eliminado con éxito.", "exito");
        obtenerGimnasios();
      } catch (err: any) {
        mostrarToast("Error al eliminar: " + err.message, "error");
      }
    } else {
      mostrarToast("La contraseña de seguridad ingresada es incorrecta. Operación denegada.", "error");
    }
  };

  const actualizarPinSeguridad = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajePin('');

    if (nuevoPin.length < 4) {
      setMensajePin('El PIN debe tener al menos 4 caracteres.');
      return;
    }

    try {
      const { error } = await clienteSupabase
        .from('configuraciones_globales')
        .upsert({
          clave: 'pin_seguridad_borrado',
          valor: nuevoPin
        });

      if (error) throw error;

      setPinSeguridad(nuevoPin);
      setNuevoPin('');
      setMensajePin('Contraseña de seguridad actualizada correctamente.');
    } catch (err: any) {
      setMensajePin('Error al actualizar: ' + err.message);
    }
  };

  const obtenerConfiguracionesDev = async () => {
    try {
      const { data, error } = await clienteSupabase
        .from('configuraciones_globales')
        .select('clave, valor')
        .in('clave', ['dev_whatsapp_link', 'dev_whatsapp_number', 'dev_whatsapp_qr']);

      if (error) throw error;
      if (data) {
        data.forEach((c) => {
          if (c.clave === 'dev_whatsapp_link' && c.valor) setDevWhatsappLink(c.valor);
          if (c.clave === 'dev_whatsapp_number' && c.valor) setDevWhatsappNumber(c.valor);
          if (c.clave === 'dev_whatsapp_qr' && c.valor) setDevWhatsappQr(c.valor);
        });
      }
    } catch (err: any) {
      console.error("Error al obtener config dev:", err.message);
    }
  };

  const actualizarConfiguracionesDev = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeDev('');
    try {
      const { error: errLink } = await clienteSupabase
        .from('configuraciones_globales')
        .upsert({ clave: 'dev_whatsapp_link', valor: devWhatsappLink });

      const { error: errNumber } = await clienteSupabase
        .from('configuraciones_globales')
        .upsert({ clave: 'dev_whatsapp_number', valor: devWhatsappNumber });

      if (errLink || errNumber) throw errLink || errNumber;
      setMensajeDev('Configuración de soporte guardada con éxito.');
    } catch (err: any) {
      setMensajeDev('Error al guardar: ' + err.message);
    }
  };

  const subirQrDesarrollador = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const formatosValidos = ['png', 'jpg', 'jpeg'];
    if (!formatosValidos.includes(extension) || !file.type.startsWith('image/')) {
      mostrarToast("Selecciona una imagen en formato PNG o JPG.", "error");
      return;
    }

    setSubiendoQr(true);
    try {
      const filePath = `global/whatsapp_qr.${extension}`;
      
      const { error: uploadError } = await clienteSupabase.storage
        .from('gimnasios-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = clienteSupabase.storage
        .from('gimnasios-logos')
        .getPublicUrl(filePath);

      const finalUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: dbError } = await clienteSupabase
        .from('configuraciones_globales')
        .upsert({ clave: 'dev_whatsapp_qr', valor: finalUrl });

      if (dbError) throw dbError;

      setDevWhatsappQr(finalUrl);
      mostrarToast("Código QR de soporte actualizado.", "exito");
    } catch (err: any) {
      mostrarToast("Error al subir QR: " + err.message, "error");
    } finally {
      setSubiendoQr(false);
    }
  };

  const actualizarFechaVencimiento = async (idGimnasio: string, fechaIso: string) => {
    try {
      const { error } = await clienteSupabase
        .from('gimnasios')
        .update({ fecha_vencimiento: fechaIso })
        .eq('id_gimnasio', idGimnasio);

      if (error) throw error;
      mostrarToast("Fecha de vencimiento actualizada correctamente.", "exito");
      obtenerGimnasios();
    } catch (err: any) {
      mostrarToast("Error al actualizar vencimiento: " + err.message, "error");
    }
  };

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
              <span className="text-sm font-bold uppercase tracking-wider text-brand-red">SuperAdmin Console</span>
            </div>
            <h1 className="text-4xl font-black mt-2">Panel Administrativo Global</h1>
          </div>
          <button
            onClick={cerrarSesion}
            className="border border-white/20 hover:border-brand-red hover:text-brand-red bg-transparent text-white px-6 py-2.5 rounded-full font-semibold transition-all duration-300 cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Columna Izquierda - Formularios */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Formulario de Registro */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl h-fit">
              <h2 className="text-2xl font-bold mb-4 text-left border-b border-white/5 pb-3">Registrar Gimnasio</h2>

              {/* Indicador de Service Key */}
              {serviceKeyOk !== null && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold mb-4 ${
                  serviceKeyOk
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                    : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
                }`}>
                  <span>{serviceKeyOk ? '✓' : '⚠'}</span>
                  {serviceKeyOk
                    ? 'Email auto-confirmado al crear dueños'
                    : 'SERVICE_KEY no config — requiere confirmar email manualmente'}
                </div>
              )}
              
              {mensajeForm.texto && (
                mensajeForm.tipo === 'error_explicado' ? (
                  <div className="p-5 rounded-2xl text-sm mb-6 border bg-yellow-500/10 border-yellow-500/30 text-yellow-400 space-y-3">
                    <div className="font-bold text-base flex items-center gap-2">
                      <span>⚠️</span> Límite de Registro de Supabase Detectado
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      El servidor de Supabase ha rechazado el registro debido a las políticas de Rate Limit por IP del plan gratuito.
                    </p>
                    <div className="border-t border-white/10 pt-3 space-y-2">
                      <div className="font-semibold text-xs text-white">CÓMO SOLUCIONARLO:</div>
                      <ol className="list-decimal pl-4 text-xs text-gray-300 space-y-1.5 text-left">
                        <li>
                          <strong>Recomendado (Sin límites y auto-confirmación):</strong> Ve a tu <strong>Supabase Dashboard &gt; Project Settings &gt; API</strong>, copia la clave <code>service_role</code> y pégala en <code>SUPABASE_SERVICE_KEY</code> dentro de <code>gympross-backend/.env</code>.
                        </li>
                        <li>
                          <strong>Desactivar Rate Limits:</strong> Ve a tu <strong>Supabase Dashboard &gt; Project Settings &gt; Auth</strong>, busca <strong>Rate Limits</strong> y aumenta o desactiva el límite de registros.
                        </li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <div className={`p-4 rounded-2xl text-sm mb-6 text-center border ${
                    mensajeForm.tipo === 'exito'
                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : mensajeForm.tipo === 'advertencia'
                      ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                      : 'bg-brand-red/10 border-brand-red/20 text-brand-red'
                  }`}>
                    {mensajeForm.texto}
                  </div>
                )
              )}

              <form onSubmit={registrarGimnasio} className="space-y-5 text-left">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nombre del Gimnasio</label>
                  <input
                    type="text"
                    value={nombreGimnasio}
                    onChange={(e) => setNombreGimnasio(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all duration-300"
                    placeholder="Ej. Megatlon Sucursal Central"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nombre del Propietario</label>
                  <input
                    type="text"
                    value={nombreDueno}
                    onChange={(e) => setNombreDueno(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all duration-300"
                    placeholder="Ej. Carlos Gomez"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Correo del Propietario</label>
                  <input
                    type="email"
                    value={correoDueno}
                    onChange={(e) => setCorreoDueno(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all duration-300"
                    placeholder="dueno@gympross.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contraseña Inicial</label>
                  <input
                    type="password"
                    value={contrasenaDueno}
                    onChange={(e) => setContrasenaDueno(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all duration-300"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Suscripción Inicial</label>
                  <select
                    value={duracionMeses}
                    onChange={(e) => setDuracionMeses(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all duration-300 cursor-pointer"
                  >
                    <option value="1" className="bg-black">1 Mes (Desarrollo)</option>
                    <option value="3" className="bg-black">3 Meses (Trimestral)</option>
                    <option value="6" className="bg-black">6 Meses (Semestral)</option>
                    <option value="12" className="bg-black">12 Meses (Anual)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={creando}
                  className="w-full bg-brand-red hover:bg-brand-red/90 disabled:bg-brand-red/50 text-white py-3.5 rounded-xl font-bold transition-all duration-300 shadow-[0_0_15px_rgba(229,57,53,0.3)] cursor-pointer text-center"
                >
                  {creando ? 'Registrando...' : 'Crear Cuenta y Gimnasio'}
                </button>
              </form>
            </div>

            {/* Configuración del PIN de Seguridad */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl h-fit">
              <h2 className="text-xl font-bold mb-4 text-left border-b border-white/5 pb-2">Clave de Seguridad</h2>
              
              {mensajePin && (
                <div className="p-3 bg-white/5 border border-white/10 text-xs rounded-xl mb-4 text-center">
                  {mensajePin}
                </div>
              )}

              <form onSubmit={actualizarPinSeguridad} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Nueva Clave de Confirmación
                  </label>
                  <input
                    type="password"
                    value={nuevoPin}
                    onChange={(e) => setNuevoPin(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all duration-300"
                    placeholder="Ej. 1806406"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full border border-white/20 hover:border-brand-red hover:text-brand-red bg-transparent text-white py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer"
                >
                  Actualizar Clave
                </button>
              </form>
            </div>

            {/* Configuración de Soporte del Desarrollador */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl h-fit text-left space-y-4">
              <h2 className="text-xl font-bold mb-2 border-b border-white/5 pb-2">Soporte del Desarrollador</h2>
              
              {mensajeDev && (
                <div className="p-3 bg-white/5 border border-white/10 text-xs rounded-xl mb-4 text-center">
                  {mensajeDev}
                </div>
              )}

              <form onSubmit={actualizarConfiguracionesDev} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Número de WhatsApp
                  </label>
                  <input
                    type="text"
                    value={devWhatsappNumber}
                    onChange={(e) => setDevWhatsappNumber(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all duration-300 font-mono"
                    placeholder="Ej. 73084452"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Enlace de WhatsApp
                  </label>
                  <input
                    type="text"
                    value={devWhatsappLink}
                    onChange={(e) => setDevWhatsappLink(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all duration-300 font-mono"
                    placeholder="Ej. https://api.whatsapp.com/qr/..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-red hover:bg-brand-red/90 text-white py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer text-center"
                >
                  Guardar Datos de Soporte
                </button>
              </form>

              <div className="border-t border-white/10 pt-4 space-y-3">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Código QR de WhatsApp
                </label>
                
                {devWhatsappQr ? (
                  <div className="flex items-center gap-3">
                    <img src={devWhatsappQr} alt="QR Soporte" className="w-14 h-14 object-contain rounded-lg bg-white p-1" />
                    <span className="text-[10px] text-green-400 font-semibold">✓ QR Cargado</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-500 italic">No se ha subido un código QR personalizado. (Se autogenerará usando el enlace de arriba).</div>
                )}

                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={subirQrDesarrollador}
                    disabled={subiendoQr}
                    className="hidden"
                    id="dev-qr-uploader"
                  />
                  <label
                    htmlFor="dev-qr-uploader"
                    className="w-full block border border-dashed border-white/20 hover:border-brand-red text-center py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition duration-300 bg-white/[0.02] hover:bg-brand-red/5"
                  >
                    {subiendoQr ? 'Subiendo imagen...' : 'Subir Imagen de Código QR'}
                  </label>
                </div>
              </div>
            </div>

          </div>

          {/* Columna Derecha - Listado de Gimnasios */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-left border-b border-white/5 pb-3">Gimnasios Suscritos</h2>
            
            {cargando ? (
              <p className="text-gray-400 text-center py-12">Cargando gimnasios registrados...</p>
            ) : gimnasios.length === 0 ? (
              <p className="text-gray-400 text-center py-12">No hay gimnasios registrados en la plataforma.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider text-xs">
                      <th className="pb-4">Gimnasio</th>
                      <th className="pb-4">Propietario / Dueño</th>
                      <th className="pb-4">Estado</th>
                      <th className="pb-4">Vencimiento</th>
                      <th className="pb-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-200">
                    {gimnasios.map((gim) => {
                      const fechaObj = new Date(gim.fecha_vencimiento);
                      const expirado = new Date() > fechaObj;

                      return (
                        <tr key={gim.id_gimnasio} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 font-bold text-white">{gim.nombre_gimnasio}</td>
                          <td className="py-4">
                            <div className="font-semibold text-white">{gim.propietario_nombre}</div>
                            <div className="text-xs text-gray-400">{gim.propietario_email}</div>
                            <div className="text-xs text-brand-red font-mono mt-1 font-semibold">
                              Clave: {gim.propietario_contrasena}
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              gim.estado_suscripcion === 'activo' && !expirado
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                : 'bg-brand-red/10 text-brand-red border border-brand-red/20'
                            }`}>
                              {expirado ? 'vencido' : gim.estado_suscripcion}
                            </span>
                          </td>
                          <td className="py-4 space-y-1">
                            <div className="font-mono text-xs font-semibold">
                              {fechaObj.toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <input
                              type="datetime-local"
                              value={gim.fecha_vencimiento ? new Date(new Date(gim.fecha_vencimiento).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                              onChange={async (e) => {
                                const val = e.target.value;
                                if (val) {
                                  await actualizarFechaVencimiento(gim.id_gimnasio, new Date(val).toISOString());
                                }
                              }}
                              className="bg-white/5 border border-white/10 rounded-lg p-1 text-[10px] text-white focus:outline-none focus:border-brand-red font-mono cursor-pointer w-full max-w-[140px]"
                            />
                          </td>
                          <td className="py-4 text-right space-y-2 md:space-y-0 md:space-x-2">
                            <button
                              onClick={() => cambiarEstadoSuscripcion(gim.id_gimnasio, gim.estado_suscripcion)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                gim.estado_suscripcion === 'activo'
                                  ? 'border-white/20 hover:bg-white/5 text-gray-300'
                                  : 'border-green-500/30 hover:bg-green-500/10 text-green-400'
                              }`}
                            >
                              {gim.estado_suscripcion === 'activo' ? 'Suspender' : 'Activar'}
                            </button>
                            <button
                              onClick={() => renovarSuscripcion(gim.id_gimnasio, gim.fecha_vencimiento)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 hover:border-brand-red hover:bg-brand-red/10 hover:text-white transition cursor-pointer"
                            >
                              +30 Días
                            </button>
                            <button
                              onClick={() => eliminarGimnasio(gim.id_gimnasio, gim.nombre_gimnasio)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-red hover:bg-brand-red/90 text-white transition cursor-pointer shadow-lg"
                            >
                              Borrar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SuperAdmin;

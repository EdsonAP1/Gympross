import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clienteSupabase } from '../supabaseClient';
import { useToast } from '../contexto/ToastContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BACKEND_URL } from '../config';

interface Personal {
  id_usuario: string;
  id_gimnasio: string;
  nombre_completo: string;
  correo_electronico: string;
  rol_usuario: 'dueno' | 'recepcionista' | 'entrenador' | 'limpieza';
  contrasena_inicial?: string;
  pin_acceso?: string;
}

interface Cliente {
  id_cliente: string;
  id_gimnasio: string;
  nombre_completo: string;
  documento_identidad: string;
  pin_acceso: string;
  estado_membresia: 'activa' | 'vencida';
  url_foto_perfil?: string;
  casillero_asignado?: number | null;
  fecha_vencimiento?: string | null;
}

const Dueno = () => {
  const navegar = useNavigate();
  const { mostrarToast } = useToast();
  const [cargando, setCargando] = useState(true);
  const [primeraCarga, setPrimeraCarga] = useState(true);
  const [gimnasioId, setGimnasioId] = useState('');
  const [nombreGimnasio, setNombreGimnasio] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [listaClientes, setListaClientes] = useState<Cliente[]>([]);
  
  // Estadísticas
  const [totalSocios, setTotalSocios] = useState(0);
  const [totalRecaudado, setTotalRecaudado] = useState(0);

  // Cierre de caja
  const [totalEfectivo, setTotalEfectivo] = useState(0);
  const [totalQR, setTotalQR] = useState(0);
  const [pagosHoy, setPagosHoy] = useState<any[]>([]);

  // Filtros de Ganancias e Ingresos Históricos
  const [fechaInicioFiltro, setFechaInicioFiltro] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('sv-SE');
  });
  const [fechaFinFiltro, setFechaFinFiltro] = useState<string>(() => {
    return new Date().toLocaleDateString('sv-SE');
  });
  const [cargandoReporte, setCargandoReporte] = useState(false);
  const [datosReporteFinanciero, setDatosReporteFinanciero] = useState<{
    total_efectivo: number;
    total_qr: number;
    total_periodo: number;
    pagos: any[];
  }>({
    total_efectivo: 0,
    total_qr: 0,
    total_periodo: 0,
    pagos: []
  });

  // Estadísticas avanzadas
  const [visitasPorDia, setVisitasPorDia] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [recaudacionHoy, setRecaudacionHoy] = useState(0);
  const [recaudacionSemana, setRecaudacionSemana] = useState(0);
  const [recaudacionMes, setRecaudacionMes] = useState(0);

  // Estados del Formulario de Registro de Personal
  const [nombrePersonal, setNombrePersonal] = useState('');
  const [pinPersonal, setPinPersonal] = useState('');
  const [rolPersonal, setRolPersonal] = useState<'recepcionista' | 'entrenador' | 'limpieza'>('recepcionista');
  
  const [creandoPersonal, setCreandoPersonal] = useState(false);
  const [mensajeForm, setMensajeForm] = useState({ tipo: '', texto: '' });
  const [guardandoGimnasio, setGuardandoGimnasio] = useState(false);

  // Estados del Formulario de Registro/Edición de Socios (Clientes)
  const [nombreSocio, setNombreSocio] = useState('');
  const [ciSocio, setCiSocio] = useState('');
  const [estadoMembresiaSocio, setEstadoMembresiaSocio] = useState<'activa' | 'vencida'>('vencida');
  const [fechaVencimientoSocio, setFechaVencimientoSocio] = useState('');
  const [editandoSocioId, setEditandoSocioId] = useState<string | null>(null);
  const [guardandoSocio, setGuardandoSocio] = useState(false);
  const [mensajeSocioForm, setMensajeSocioForm] = useState({ tipo: '', texto: '' });
  const [filtroSocios, setFiltroSocios] = useState('');

  // Estados de Configuración de Portal, Promociones, Tarifas y Moneda
  const [contrasenaDueno, setContrasenaDueno] = useState('password123');
  const [contrasenaRecepcion, setContrasenaRecepcion] = useState('password123');
  const [_promocionNombre, setPromocionNombre] = useState('');
  const [promocionDescuento, setPromocionDescuento] = useState<number>(0);
  const [promoNombreBase, setPromoNombreBase] = useState('');
  const [promoActiva, setPromoActiva] = useState(false);
  const [promoVencimiento, setPromoVencimiento] = useState('');
  const [precioMensual, setPrecioMensual] = useState<number | string>(30);
  const [precioEjecutivo, setPrecioEjecutivo] = useState<number | string>(20);
  const [precioAnual, setPrecioAnual] = useState<number | string>(250);
  const [moneda, setMoneda] = useState<string>('USD');
  const [guardandoContrasenas, setGuardandoContrasenas] = useState(false);
  const [guardandoPromocion, setGuardandoPromocion] = useState(false);
  const [guardandoTarifas, setGuardandoTarifas] = useState(false);

  // Estados para reporte de asistencias de personal
  const [asistenciasPersonal, setAsistenciasPersonal] = useState<any[]>([]);
  const [filtroEmpleadoAsistencia, setFiltroEmpleadoAsistencia] = useState<string>('todos');
  const [fechaInicioAsistencia, setFechaInicioAsistencia] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // hace 30 días
    return d.toISOString().split('T')[0];
  });
  const [fechaFinAsistencia, setFechaFinAsistencia] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [tabActiva, setTabActiva] = useState<'estadisticas' | 'personal' | 'socios' | 'configuracion' | 'asistencias'>('estadisticas');
  const [editandoPersonalId, setEditandoPersonalId] = useState<string | null>(null);
  const [mostrandoModalSocio, setMostrandoModalSocio] = useState(false);

  const cargarDatos = async () => {
    try {
      if (primeraCarga) {
        setCargando(true);
      }
      const { data: { user } } = await clienteSupabase.auth.getUser();
      
      if (!user) {
        navegar('/login');
        return;
      }

      let idGimnasio = gimnasioId;

      // 1. Obtener el gimnasio y datos del dueño solo si no están cargados
      if (!idGimnasio) {
        const { data: usuarioInfo, error: errorUsuario } = await clienteSupabase
          .from('usuarios_personal')
          .select('id_gimnasio')
          .eq('id_usuario', user.id)
          .maybeSingle();

        if (errorUsuario) throw errorUsuario;
        if (!usuarioInfo) {
          mostrarToast("Perfil de dueño no encontrado.", "error");
          navegar('/login');
          return;
        }

        idGimnasio = usuarioInfo.id_gimnasio;
        setGimnasioId(idGimnasio);
      }

      // 2. Obtener datos del gimnasio
      const { data: gimnasioInfo, error: errorGim } = await clienteSupabase
        .from('gimnasios')
        .select('*')
        .eq('id_gimnasio', idGimnasio)
        .maybeSingle();

      if (errorGim) throw errorGim;
      if (gimnasioInfo) {
        const expirado = gimnasioInfo.fecha_vencimiento
          ? new Date() > new Date(gimnasioInfo.fecha_vencimiento)
          : false;
        if (gimnasioInfo.estado_suscripcion === 'suspendido' || expirado) {
          navegar('/suspendido');
          return;
        }

        setNombreGimnasio(gimnasioInfo.nombre_gimnasio);
        setLogoUrl(gimnasioInfo.logo_url || '');
        setContrasenaDueno(gimnasioInfo.contrasena_dueno || 'password123');
        setContrasenaRecepcion(gimnasioInfo.contrasena_recepcion || 'password123');
        const promoStr = gimnasioInfo.promocion_nombre || '';
        setPromocionNombre(promoStr);
        setPromocionDescuento(gimnasioInfo.promocion_descuento || 0);
        
        const partes = promoStr.split('||');
        if (partes.length === 3) {
          setPromoNombreBase(partes[0]);
          setPromoActiva(partes[1] === 'true');
          setPromoVencimiento(partes[2] || '');
        } else {
          setPromoNombreBase(promoStr);
          setPromoActiva(promoStr !== '');
          setPromoVencimiento('');
        }
        // Cargar precios con fallbacks y usar localStorage si existe
        const localTarifasStr = localStorage.getItem(`gym_tarifas_${idGimnasio}`);
        if (localTarifasStr) {
          try {
            const localTarifas = JSON.parse(localTarifasStr);
            setPrecioMensual(localTarifas.precio_mensual !== undefined ? localTarifas.precio_mensual : 30);
            setPrecioEjecutivo(localTarifas.precio_ejecutivo !== undefined ? localTarifas.precio_ejecutivo : 20);
            setPrecioAnual(localTarifas.precio_anual !== undefined ? localTarifas.precio_anual : 250);
            setMoneda(localTarifas.moneda || 'USD');
          } catch (e) {
            setPrecioMensual(gimnasioInfo.precio_mensual !== undefined && gimnasioInfo.precio_mensual !== null ? parseFloat(gimnasioInfo.precio_mensual) : 30);
            setPrecioEjecutivo(gimnasioInfo.precio_ejecutivo !== undefined && gimnasioInfo.precio_ejecutivo !== null ? parseFloat(gimnasioInfo.precio_ejecutivo) : 20);
            setPrecioAnual(gimnasioInfo.precio_anual !== undefined && gimnasioInfo.precio_anual !== null ? parseFloat(gimnasioInfo.precio_anual) : 250);
            setMoneda(gimnasioInfo.moneda || 'USD');
          }
        } else {
          setPrecioMensual(gimnasioInfo.precio_mensual !== undefined && gimnasioInfo.precio_mensual !== null ? parseFloat(gimnasioInfo.precio_mensual) : 30);
          setPrecioEjecutivo(gimnasioInfo.precio_ejecutivo !== undefined && gimnasioInfo.precio_ejecutivo !== null ? parseFloat(gimnasioInfo.precio_ejecutivo) : 20);
          setPrecioAnual(gimnasioInfo.precio_anual !== undefined && gimnasioInfo.precio_anual !== null ? parseFloat(gimnasioInfo.precio_anual) : 250);
          setMoneda(gimnasioInfo.moneda || 'USD');
        }
      }

      // 3. Obtener personal del gimnasio
      const { data: datosPersonal, error: errorPers } = await clienteSupabase
        .from('usuarios_personal')
        .select('*')
        .eq('id_gimnasio', idGimnasio);

      if (errorPers) throw errorPers;
      setPersonal(datosPersonal || []);

      // 3.5. Obtener asistencias del personal
      const { data: asistenciasPers, error: errorAsisPers } = await clienteSupabase
        .from('asistencias')
        .select('*')
        .eq('id_gimnasio', idGimnasio)
        .eq('tipo_persona', 'personal')
        .order('fecha_entrada', { ascending: false });

      if (!errorAsisPers && asistenciasPers) {
        setAsistenciasPersonal(asistenciasPers);
      }

      // 4. Obtener socios del gimnasio (lista y conteo)
      const { data: todosSocios, count: conteoClientes, error: errorClientes } = await clienteSupabase
        .from('clientes')
        .select('*', { count: 'exact' })
        .eq('id_gimnasio', idGimnasio)
        .order('nombre_completo', { ascending: true });
      
      if (!errorClientes) {
        if (conteoClientes !== null) setTotalSocios(conteoClientes);
        if (todosSocios) setListaClientes(todosSocios);
      }

      // 5. Obtener total recaudado de pagos
      let pagos: any[] = [];
      const { data: pagosData, error: errorPagos } = await clienteSupabase
        .from('pagos_registro')
        .select('monto, id_usuario, fecha_pago')
        .eq('id_gimnasio', idGimnasio);
      
      if (errorPagos) {
        // Fallback si la columna id_usuario no existe (ej. la migración SQL no se ejecutó)
        const { data: fallbackData, error: fallbackError } = await clienteSupabase
          .from('pagos_registro')
          .select('monto, fecha_pago')
          .eq('id_gimnasio', idGimnasio);
        
        if (!fallbackError && fallbackData) {
          pagos = fallbackData;
        }
      } else if (pagosData) {
        pagos = pagosData;
      }
      
      if (pagos) {
        const suma = pagos.reduce((acc, curr) => acc + parseFloat(curr.monto), 0);
        setTotalRecaudado(suma);

        // Lógica de cálculo acumulado por períodos (Día, Semana, Mes)
        const hoy = new Date();
        const hoyStr = hoy.toLocaleDateString('sv-SE');
        
        const inicioSemana = new Date(hoy);
        const diaSemana = hoy.getDay();
        const dif = hoy.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
        inicioSemana.setDate(dif);
        inicioSemana.setHours(0, 0, 0, 0);
        
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0, 0);

        let recHoy = 0;
        let recSemana = 0;
        let recMes = 0;

        pagos.forEach((pago: any) => {
          const monto = parseFloat(pago.monto) || 0;
          if (!pago.fecha_pago) return;

          const fechaPagoLocal = new Date(pago.fecha_pago);
          
          const pagoStr = fechaPagoLocal.toLocaleDateString('sv-SE');
          if (pagoStr === hoyStr) {
            recHoy += monto;
          }

          if (fechaPagoLocal >= inicioSemana) {
            recSemana += monto;
          }

          if (fechaPagoLocal >= inicioMes) {
            recMes += monto;
          }
        });

        setRecaudacionHoy(recHoy);
        setRecaudacionSemana(recSemana);
        setRecaudacionMes(recMes);
      }
      
      // 6. Obtener reporte de caja del día y reporte financiero por rango
      const token = (await clienteSupabase.auth.getSession()).data.session?.access_token || '';
      if (token) {
        const resReporte = await fetch(`${BACKEND_URL}/api/recepcion/gimnasio/reporte-caja`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (resReporte.ok) {
          const datosReporte = await resReporte.json();
          setTotalEfectivo(datosReporte.total_efectivo || 0);
          setTotalQR(datosReporte.total_qr || 0);
          setPagosHoy(datosReporte.pagos_hoy || []);
        }

        // 6.5. Obtener reporte financiero del rango inicial
        const queryParams = new URLSearchParams({
          fecha_inicio: fechaInicioFiltro,
          fecha_fin: fechaFinFiltro
        });
        const resFinanciero = await fetch(`${BACKEND_URL}/api/recepcion/gimnasio/reporte-financiero?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (resFinanciero.ok) {
          const datosFinanciero = await resFinanciero.json();
          setDatosReporteFinanciero(datosFinanciero);
        }
      }

      // 7. Obtener visitas (asistencias) para estadísticas de la semana
      const { data: asistencias, error: errorAsist } = await clienteSupabase
        .from('asistencias')
        .select('fecha_entrada')
        .eq('id_gimnasio', idGimnasio)
        .limit(200);

      if (!errorAsist && asistencias) {
        const conteo = [0, 0, 0, 0, 0, 0, 0];
        asistencias.forEach((a: any) => {
          const fecha = new Date(a.fecha_entrada);
          const dia = fecha.getDay(); // 0 (Dom) a 6 (Sab)
          conteo[dia]++;
        });
        setVisitasPorDia(conteo);
      }
    } catch (err: any) {
      console.error("Error al cargar datos del dueño:", err.message);
    } finally {
      setPrimeraCarga(false);
      setCargando(false);
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem('rol_activo') !== 'dueno') {
      navegar('/portal-seleccion');
      return;
    }
    cargarDatos();
  }, []);

  const cargarReporteFinanciero = async () => {
    setCargandoReporte(true);
    try {
      const token = (await clienteSupabase.auth.getSession()).data.session?.access_token || '';
      if (token) {
        const queryParams = new URLSearchParams({
          fecha_inicio: fechaInicioFiltro,
          fecha_fin: fechaFinFiltro
        });
        const res = await fetch(`${BACKEND_URL}/api/recepcion/gimnasio/reporte-financiero?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setDatosReporteFinanciero(data);
          mostrarToast("Reporte financiero actualizado.", "exito");
        } else {
          mostrarToast("Error al cargar el reporte financiero.", "error");
        }
      }
    } catch (err: any) {
      console.error("Error al cargar reporte financiero:", err.message);
      mostrarToast("Error de conexión al obtener reporte.", "error");
    } finally {
      setCargandoReporte(false);
    }
  };

  const obtenerImagenBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error("No se pudo obtener contexto 2D"));
        }
      };
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  };

  const exportarGananciasPDF = async () => {
    const doc = new jsPDF();
    
    // Intentar cargar el logo
    let base64Logo: string | null = null;
    if (logoUrl) {
      try {
        base64Logo = await obtenerImagenBase64(logoUrl);
      } catch (e) {
        console.error("Error cargando logo en Base64 para el PDF:", e);
      }
    }

    // Cabecera / Diseño Premium
    if (base64Logo) {
      doc.addImage(base64Logo, 'PNG', 15, 12, 18, 18);
    } else {
      doc.setFillColor(220, 38, 38); // Rojo
      doc.roundedRect(15, 12, 18, 18, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("GP", 21, 23);
    }

    doc.setTextColor(18, 18, 18);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(nombreGimnasio.toUpperCase() || "GYMPROSS CENTRAL", 38, 19);
    
    doc.setFontSize(9.5);
    doc.setTextColor(220, 38, 38);
    doc.text("REPORTE FINANCIERO Y CONTROL DE GANANCIAS", 38, 26);
    
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.6);
    doc.line(15, 36, 195, 36);
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Rango de Fechas: ${fechaInicioFiltro} al ${fechaFinFiltro}`, 15, 43);
    doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`, 115, 43);
    doc.text(`ID Gimnasio: ${gimnasioId}`, 15, 48);

    const drawCard = (x: number, y: number, w: number, h: number, label: string, val: string, color: [number, number, number]) => {
      doc.setFillColor(248, 249, 250);
      doc.setDrawColor(233, 236, 239);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, w, h, 3, 3, 'FD');
      
      doc.setTextColor(108, 117, 125);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(label, x + 4, y + 7);
      
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(val, x + 4, y + 16);
    };

    const totalStr = datosReporteFinanciero.total_periodo.toLocaleString('es-ES', { style: 'currency', currency: moneda });
    const efectivoStr = datosReporteFinanciero.total_efectivo.toLocaleString('es-ES', { style: 'currency', currency: moneda });
    const qrStr = datosReporteFinanciero.total_qr.toLocaleString('es-ES', { style: 'currency', currency: moneda });

    drawCard(15, 54, 55, 22, "TOTAL RECAUDADO", totalStr, [46, 125, 50]);
    drawCard(75, 54, 55, 22, "RECAUDACIÓN EFECTIVO", efectivoStr, [18, 18, 18]);
    drawCard(135, 54, 60, 22, "RECAUDACIÓN QR / BANCO", qrStr, [25, 118, 210]);

    let currentY = 84;

    if (datosReporteFinanciero.pagos.length === 0) {
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("No se encontraron registros de cobros en este rango.", 15, currentY);
    } else {
      const cabeceras = [["Fecha y Hora", "Cliente / Socio", "Monto", "Forma de Pago", "Operador"]];
      const filas = datosReporteFinanciero.pagos.map(p => {
        const fecha = new Date(p.fecha_pago).toLocaleDateString('es-ES') + ' ' + new Date(p.fecha_pago).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const cliente = p.cliente;
        const monto = parseFloat(p.monto).toLocaleString('es-ES', { style: 'currency', currency: moneda });
        const metodo = p.tipo_pago === 'efectivo' ? 'Efectivo' : 'QR / Banco';
        const recepcionista = p.recepcionista;
        return [fecha, cliente, monto, metodo, recepcionista];
      });

      autoTable(doc, {
        startY: currentY,
        head: cabeceras,
        body: filas,
        headStyles: {
          fillColor: [220, 38, 38],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'left'
        },
        columnStyles: {
          0: { cellWidth: 38 },
          1: { cellWidth: 50 },
          2: { cellWidth: 30, fontStyle: 'bold', halign: 'right' },
          3: { cellWidth: 32, halign: 'center' },
          4: { cellWidth: 40 }
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250]
        },
        didParseCell: (data) => {
          if (data.column.index === 3 && data.cell.section === 'body') {
            const text = data.cell.text[0];
            if (text === 'Efectivo') {
              data.cell.styles.textColor = [46, 125, 50];
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [25, 118, 210];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;

      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(243, 244, 246);
      doc.roundedRect(15, currentY, 180, 24, 2, 2, 'F');
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Resumen de Auditoría Financiera:", 20, currentY + 7);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Cantidad de Cobros Procesados: ${datosReporteFinanciero.pagos.length} transacciones`, 20, currentY + 14);
      doc.text(`Promedio por Cobro: ${(datosReporteFinanciero.total_periodo / datosReporteFinanciero.pagos.length).toLocaleString('es-ES', { style: 'currency', currency: moneda })}`, 20, currentY + 19);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(`Corte de Caja Total: ${totalStr}`, 125, currentY + 14);
    }

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };


  const subirLogoGimnasio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo (solo png, jpg, jpeg)
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const formatosValidos = ['png', 'jpg', 'jpeg'];
    if (!formatosValidos.includes(extension) || !file.type.startsWith('image/')) {
      mostrarToast("Por favor, selecciona una imagen en formato PNG o JPG.", "error");
      return;
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      mostrarToast("La imagen del logo no debe superar los 2MB.", "error");
      return;
    }

    setSubiendoLogo(true);
    try {
      // 1. Listar y eliminar cualquier archivo anterior en la carpeta del gimnasio
      const { data: listaArchivos, error: errorList } = await clienteSupabase.storage
        .from('gimnasios-logos')
        .list(gimnasioId);

      if (!errorList && listaArchivos && listaArchivos.length > 0) {
        const archivosAEliminar = listaArchivos.map(f => `${gimnasioId}/${f.name}`);
        await clienteSupabase.storage
          .from('gimnasios-logos')
          .remove(archivosAEliminar);
      }

      // 2. Subir el nuevo archivo
      const filePath = `${gimnasioId}/logo.${extension}`;
      const { error: uploadError } = await clienteSupabase.storage
        .from('gimnasios-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 3. Obtener la URL pública
      const { data: { publicUrl } } = clienteSupabase.storage
        .from('gimnasios-logos')
        .getPublicUrl(filePath);

      // Añadir timestamp para romper la caché del navegador al cargar la imagen
      const finalUrl = `${publicUrl}?t=${Date.now()}`;

      // 4. Actualizar la URL del logo en la base de datos
      const { error: dbError } = await clienteSupabase
        .from('gimnasios')
        .update({ logo_url: finalUrl })
        .eq('id_gimnasio', gimnasioId);

      if (dbError) throw dbError;

      setLogoUrl(finalUrl);
      mostrarToast("Logo del gimnasio actualizado correctamente.", "exito");
    } catch (err: any) {
      mostrarToast("Error al subir el logo: " + err.message, "error");
    } finally {
      setSubiendoLogo(false);
    }
  };

  const eliminarLogoGimnasio = async () => {
    if (!confirm("¿Estás seguro de que deseas eliminar el logo de tu gimnasio?")) return;

    setSubiendoLogo(true);
    try {
      // 1. Listar y borrar archivos de la carpeta del gimnasio en Storage
      const { data: listaArchivos, error: errorList } = await clienteSupabase.storage
        .from('gimnasios-logos')
        .list(gimnasioId);

      if (!errorList && listaArchivos && listaArchivos.length > 0) {
        const archivosAEliminar = listaArchivos.map(f => `${gimnasioId}/${f.name}`);
        await clienteSupabase.storage
          .from('gimnasios-logos')
          .remove(archivosAEliminar);
      }

      // 2. Actualizar campo en BD a NULL
      const { error: dbError } = await clienteSupabase
        .from('gimnasios')
        .update({ logo_url: null })
        .eq('id_gimnasio', gimnasioId);

      if (dbError) throw dbError;

      setLogoUrl('');
      mostrarToast("Logo del gimnasio eliminado correctamente.", "exito");
    } catch (err: any) {
      mostrarToast("Error al eliminar el logo: " + err.message, "error");
    } finally {
      setSubiendoLogo(false);
    }
  };

  const cerrarSesion = async () => {
    await clienteSupabase.auth.signOut();
    sessionStorage.removeItem('rol_activo');
    navegar('/');
  };

  const actualizarNombreGimnasio = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoGimnasio(true);
    try {
      const { error } = await clienteSupabase
        .from('gimnasios')
        .update({ nombre_gimnasio: nombreGimnasio })
        .eq('id_gimnasio', gimnasioId);

      if (error) throw error;
      mostrarToast("Nombre del gimnasio actualizado con éxito.", "exito");
    } catch (err: any) {
      mostrarToast("Error al actualizar: " + err.message, "error");
    } finally {
      setGuardandoGimnasio(false);
    }
  };

  const actualizarContrasenasPortal = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoContrasenas(true);
    try {
      const { error } = await clienteSupabase
        .from('gimnasios')
        .update({
          contrasena_dueno: contrasenaDueno,
          contrasena_recepcion: contrasenaRecepcion
        })
        .eq('id_gimnasio', gimnasioId);

      if (error) throw error;
      mostrarToast("Contraseñas del portal actualizadas con éxito.", "exito");
    } catch (err: any) {
      mostrarToast("Error al actualizar contraseñas: " + err.message, "error");
    } finally {
      setGuardandoContrasenas(false);
    }
  };

  const actualizarTarifasMoneda = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoTarifas(true);
    try {
      const { error } = await clienteSupabase
        .from('gimnasios')
        .update({
          precio_mensual: precioMensual,
          precio_ejecutivo: precioEjecutivo,
          precio_anual: precioAnual,
          moneda: moneda
        })
        .eq('id_gimnasio', gimnasioId);

      if (error) {
        // Si falla por no existir las columnas (falta de migración), guardamos en localStorage como fallback automático e informamos
        if (error.message.includes("column") || error.code === "P0002" || error.code === "42703" || error.message.includes("schema cache")) {
          localStorage.setItem(`gym_tarifas_${gimnasioId}`, JSON.stringify({
            precio_mensual: precioMensual,
            precio_ejecutivo: precioEjecutivo,
            precio_anual: precioAnual,
            moneda: moneda
          }));
          alert("Aviso: Las columnas de tarifas no existen en tu base de datos de Supabase. Se han guardado automáticamente en el almacenamiento local del navegador para que el sistema funcione de inmediato de forma transparente.");
        } else {
          throw error;
        }
      } else {
        // Eliminar fallback de localStorage si la base de datos ya fue actualizada
        localStorage.removeItem(`gym_tarifas_${gimnasioId}`);
        mostrarToast("Tarifas y moneda actualizadas en la base de datos con éxito.", "exito");
      }
    } catch (err: any) {
      mostrarToast("Error al actualizar tarifas: " + err.message, "error");
    } finally {
      setGuardandoTarifas(false);
    }
  };

  const actualizarPromocionGimnasio = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoPromocion(true);
    try {
      const finalPromoNombre = `${promoNombreBase}||${promoActiva}||${promoVencimiento}`;
      
      const { error } = await clienteSupabase
        .from('gimnasios')
        .update({
          promocion_nombre: finalPromoNombre,
          promocion_descuento: promocionDescuento
        })
        .eq('id_gimnasio', gimnasioId);

      if (error) throw error;
      setPromocionNombre(finalPromoNombre);
      mostrarToast("Promoción del gimnasio actualizada con éxito.", "exito");
    } catch (err: any) {
      mostrarToast("Error al actualizar promoción: " + err.message, "error");
    } finally {
      setGuardandoPromocion(false);
    }
  };

  const registrarPersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreandoPersonal(true);
    setMensajeForm({ tipo: '', texto: '' });

    if (pinPersonal.length !== 6 || isNaN(Number(pinPersonal))) {
      setMensajeForm({ tipo: 'error', texto: 'El PIN de marcado debe tener exactamente 6 dígitos numéricos.' });
      setCreandoPersonal(false);
      return;
    }

    try {
      if (editandoPersonalId) {
        // Modo Edición
        const { error: errorUpdate } = await clienteSupabase
          .from('usuarios_personal')
          .update({
            nombre_completo: nombrePersonal.toUpperCase(),
            rol_usuario: rolPersonal,
            pin_acceso: pinPersonal
          })
          .eq('id_usuario', editandoPersonalId);

        if (errorUpdate) throw errorUpdate;
        setMensajeForm({ tipo: 'exito', texto: 'Datos de personal actualizados correctamente.' });
        setEditandoPersonalId(null);
      } else {
        // Modo Registro
        const nuevoId = crypto.randomUUID();
        const correoGenerado = `personal_${nuevoId.substring(0, 8)}@gympross.com`;
        
        const { error: errorPerfil } = await clienteSupabase
          .from('usuarios_personal')
          .insert({
            id_usuario: nuevoId,
            id_gimnasio: gimnasioId,
            nombre_completo: nombrePersonal.toUpperCase(),
            correo_electronico: correoGenerado,
            rol_usuario: rolPersonal,
            pin_acceso: pinPersonal
          });

        if (errorPerfil) throw errorPerfil;
        setMensajeForm({ tipo: 'exito', texto: 'Personal registrado correctamente.' });
      }

      setNombrePersonal('');
      setPinPersonal('');
      
      cargarDatos();
    } catch (err: any) {
      setMensajeForm({ tipo: 'error', texto: err.message || 'Error al procesar la operación.' });
    } finally {
      setCreandoPersonal(false);
    }
  };

  const eliminarPersonal = async (idUsuario: string, nombre: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar a "${nombre}" del personal? Esto también borrará todos sus registros de asistencia de manera permanente.`)) {
      try {
        // Eliminar registros de asistencia del empleado primero
        const { error: errorAsistencias } = await clienteSupabase
          .from('asistencias')
          .delete()
          .eq('id_referencia', idUsuario);

        if (errorAsistencias) throw errorAsistencias;

        const { error } = await clienteSupabase
          .from('usuarios_personal')
          .delete()
          .eq('id_usuario', idUsuario);

        if (error) throw error;
        mostrarToast("Personal eliminado con éxito.", "exito");
        cargarDatos();
      } catch (err: any) {
        mostrarToast("Error al eliminar personal: " + err.message, "error");
      }
    }
  };

  const registrarSocio = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoSocio(true);
    setMensajeSocioForm({ tipo: '', texto: '' });

    if (ciSocio.length < 5 || isNaN(Number(ciSocio))) {
      setMensajeSocioForm({ tipo: 'error', texto: 'El Documento de Identidad (C.I.) debe ser numérico y tener al menos 5 dígitos.' });
      setGuardandoSocio(false);
      return;
    }

    // El pin de acceso son los 6 primeros dígitos del C.I.
    const pinCalculado = ciSocio.substring(0, 6);

    try {
      if (editandoSocioId) {
        // Modo Edición
        const { error: errorUpdate } = await clienteSupabase
          .from('clientes')
          .update({
            nombre_completo: nombreSocio.toUpperCase(),
            documento_identidad: ciSocio,
            pin_acceso: pinCalculado,
            estado_membresia: estadoMembresiaSocio,
            url_foto_perfil: null,
            fecha_vencimiento: fechaVencimientoSocio !== '' ? new Date(fechaVencimientoSocio).toISOString() : null
          })
          .eq('id_cliente', editandoSocioId);

        if (errorUpdate) throw errorUpdate;
        setMensajeSocioForm({ tipo: 'exito', texto: 'Datos del socio actualizados correctamente.' });
        setEditandoSocioId(null);
      } else {
        // Modo Registro
        const nuevoId = crypto.randomUUID();
        
        const { error: errorSocio } = await clienteSupabase
          .from('clientes')
          .insert({
            id_cliente: nuevoId,
            id_gimnasio: gimnasioId,
            nombre_completo: nombreSocio.toUpperCase(),
            documento_identidad: ciSocio,
            pin_acceso: pinCalculado,
            estado_membresia: estadoMembresiaSocio,
            url_foto_perfil: null,
            fecha_vencimiento: fechaVencimientoSocio !== '' ? new Date(fechaVencimientoSocio).toISOString() : null
          });

        if (errorSocio) throw errorSocio;
      }

      const mensajeExito = editandoSocioId ? 'Datos del socio actualizados correctamente.' : 'Socio registrado correctamente.';
      mostrarToast(mensajeExito, 'exito');

      setNombreSocio('');
      setCiSocio('');
      setEstadoMembresiaSocio('vencida');
      setFechaVencimientoSocio('');
      setEditandoSocioId(null);
      setMostrandoModalSocio(false);
      
      cargarDatos();
    } catch (err: any) {
      setMensajeSocioForm({ tipo: 'error', texto: err.message || 'Error al procesar la operación.' });
    } finally {
      setGuardandoSocio(false);
    }
  };

  const eliminarSocio = async (idCliente: string, nombre: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar al socio "${nombre}" permanentemente de la base de datos?`)) {
      try {
        const { error } = await clienteSupabase
          .from('clientes')
          .delete()
          .eq('id_cliente', idCliente);

        if (error) throw error;
        mostrarToast("Socio eliminado con éxito.", "exito");
        cargarDatos();
      } catch (err: any) {
        mostrarToast("Error al eliminar socio: " + err.message, "error");
      }
    }
  };

  const seleccionarSocioEdicion = (socio: Cliente) => {
    setEditandoSocioId(socio.id_cliente);
    setNombreSocio(socio.nombre_completo);
    setCiSocio(socio.documento_identidad);
    setEstadoMembresiaSocio(socio.estado_membresia);
    if (socio.fecha_vencimiento) {
      setFechaVencimientoSocio(socio.fecha_vencimiento.substring(0, 10));
    } else {
      setFechaVencimientoSocio('');
    }
    setMensajeSocioForm({ tipo: '', texto: '' });
    setMostrandoModalSocio(true);
  };

  const cancelarEdicionSocio = () => {
    setEditandoSocioId(null);
    setNombreSocio('');
    setCiSocio('');
    setEstadoMembresiaSocio('vencida');
    setFechaVencimientoSocio('');
    setMensajeSocioForm({ tipo: '', texto: '' });
    setMostrandoModalSocio(false);
  };

  const calcularDuracion = (entrada: string, salida: string | null) => {
    if (!salida) return 'Activo (En turno)';
    const ms = new Date(salida).getTime() - new Date(entrada).getTime();
    if (ms < 0) return '-';
    const totalMinutos = Math.floor(ms / 60000);
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    return `${horas}h ${minutos}m`;
  };

  const asistenciasFiltradas = asistenciasPersonal.filter(asis => {
    const fechaAsis = asis.fecha_entrada.split('T')[0];
    const cumpleFecha = fechaAsis >= fechaInicioAsistencia && fechaAsis <= fechaFinAsistencia;
    const cumpleEmpleado = filtroEmpleadoAsistencia === 'todos' || asis.id_referencia === filtroEmpleadoAsistencia;
    return cumpleFecha && cumpleEmpleado;
  });

  const exportarAPDF = () => {
    const doc = new jsPDF();
    
    // Header styling
    doc.setTextColor(18, 18, 18);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("GYMPROSS CENTRAL", 15, 23);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38); // Brand Red
    doc.text("REPORTE DE ASISTENCIA DE PERSONAL", 15, 30);
    
    // Line separator
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.5);
    doc.line(15, 33, 195, 33);
    
    // Metadata columns
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    
    // Column 1
    doc.text(`Gimnasio: ${nombreGimnasio.toUpperCase()}`, 15, 40);
    const empFiltrado = personal.find(p => p.id_usuario === filtroEmpleadoAsistencia);
    doc.text(`Filtro Empleado: ${empFiltrado ? empFiltrado.nombre_completo : 'Todos los empleados'}`, 15, 45);
    
    // Column 2
    doc.text(`Rango de Fechas: ${fechaInicioAsistencia} al ${fechaFinAsistencia}`, 115, 40);
    doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()}`, 115, 45);
    
    // Calculations for KPI Cards
    const totalHoras = asistenciasFiltradas.reduce((sum, asis) => {
      if (!asis.fecha_salida) return sum;
      const ms = new Date(asis.fecha_salida).getTime() - new Date(asis.fecha_entrada).getTime();
      return sum + (ms > 0 ? ms / 3600000 : 0);
    }, 0);
    
    const turnosCompletados = asistenciasFiltradas.filter(a => a.fecha_salida).length;
    const empleadosUnicos = new Set(asistenciasFiltradas.map(a => a.id_referencia)).size;
    const promedioHoras = turnosCompletados > 0 ? totalHoras / turnosCompletados : 0;
    
    // KPI Cards rendering function
    const drawCard = (x: number, y: number, w: number, h: number, label: string, val: string) => {
      doc.setFillColor(248, 249, 250); // #F8F9FA
      doc.setDrawColor(233, 236, 239); // #E9ECEF
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, w, h, 3, 3, 'FD');
      
      doc.setTextColor(108, 117, 125);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(label, x + 4, y + 7);
      
      doc.setTextColor(18, 18, 18);
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.text(val, x + 4, y + 16);
    };

    // Draw 4 cards
    drawCard(15, 52, 41, 22, "Horas Totales", `${totalHoras.toFixed(1)} hrs`);
    drawCard(60, 52, 41, 22, "Jornadas", `${asistenciasFiltradas.length}`);
    drawCard(105, 52, 41, 22, "Promedio/Turno", `${promedioHoras.toFixed(1)} hrs`);
    drawCard(150, 52, 45, 22, "Personal Activo", `${empleadosUnicos}`);
    
    let currentY = 82;
    
    // Group records by employee
    const asistenciasPorEmpleado: { [id_usuario: string]: any[] } = {};
    asistenciasFiltradas.forEach(asis => {
      if (!asistenciasPorEmpleado[asis.id_referencia]) {
        asistenciasPorEmpleado[asis.id_referencia] = [];
      }
      asistenciasPorEmpleado[asis.id_referencia].push(asis);
    });
    
    const keys = Object.keys(asistenciasPorEmpleado);
    
    if (keys.length === 0) {
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("No se encontraron registros de asistencia.", 15, currentY);
    } else {
      keys.forEach((idUsuario, index) => {
        const emp = personal.find(p => p.id_usuario === idUsuario);
        const nombre = emp ? emp.nombre_completo : 'Empleado Eliminado';
        const rol = emp ? emp.rol_usuario.toUpperCase() : '-';
        
        const logs = asistenciasPorEmpleado[idUsuario];
        const subtotal = logs.reduce((sum, asis) => {
          if (!asis.fecha_salida) return sum;
          const ms = new Date(asis.fecha_salida).getTime() - new Date(asis.fecha_entrada).getTime();
          return sum + (ms > 0 ? ms / 3600000 : 0);
        }, 0);
        
        // Page break safety check
        if (currentY > 230) {
          doc.addPage();
          currentY = 20;
        } else if (index > 0) {
          currentY += 10;
        }
        
        // Employee ribbon banner
        doc.setFillColor(243, 244, 246); // gray-100
        doc.rect(15, currentY, 180, 8, 'F');
        
        doc.setTextColor(17, 24, 39); // gray-900
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`${nombre} (${rol})`, 18, currentY + 5.5);
        
        doc.setTextColor(220, 38, 38); // brand-red
        doc.text(`Total: ${subtotal.toFixed(1)} hrs`, 160, currentY + 5.5);
        
        currentY += 11;
        
        const cabeceras = [["Fecha", "Hora Entrada", "Hora Salida", "Duración", "Estado"]];
        const filas = logs.map(asis => {
          const fecha = new Date(asis.fecha_entrada).toLocaleDateString();
          const entrada = new Date(asis.fecha_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const salida = asis.fecha_salida 
            ? new Date(asis.fecha_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '-';
          const duracion = calcularDuracion(asis.fecha_entrada, asis.fecha_salida);
          const estado = !asis.fecha_salida ? 'En Turno' : 'Completado';
          
          return [fecha, entrada, salida, duracion, estado];
        });
        
        autoTable(doc, {
          startY: currentY,
          head: cabeceras,
          body: filas,
          headStyles: {
            fillColor: [17, 24, 39], // gray-900
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
          },
          columnStyles: {
            0: { halign: 'center' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38] },
            4: { halign: 'center' }
          },
          styles: {
            fontSize: 8.5,
            cellPadding: 2.5
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251] // gray-50
          },
          didParseCell: (data) => {
            if (data.column.index === 4 && data.cell.section === 'body') {
              const text = data.cell.text[0];
              if (text === 'En Turno') {
                data.cell.styles.textColor = [46, 125, 50]; // Green
                data.cell.styles.fillColor = [232, 245, 233]; // Light Green
                data.cell.styles.fontStyle = 'bold';
              } else {
                data.cell.styles.textColor = [107, 114, 128]; // gray-500
                data.cell.styles.fillColor = [243, 244, 246]; // gray-100
              }
            }
          }
        });
        
        currentY = (doc as any).lastAutoTable.finalY;
      });
    }
    
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
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
              {logoUrl ? (
                <img src={logoUrl} alt="Logo Gimnasio" className="w-8 h-8 rounded-full object-cover border border-white/25 shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center font-black text-sm text-white">
                  GP
                </div>
              )}
              <span className="text-sm font-bold uppercase tracking-wider text-brand-red">Owner Dashboard</span>
            </div>
            <h1 className="text-4xl font-black mt-2">{nombreGimnasio || 'Cargando gimnasio...'}</h1>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setPrimeraCarga(true); // Forzar pantalla de carga completa al refrescar manualmente
                cargarDatos();
              }}
              className="border border-white/20 hover:border-green-500 hover:text-green-500 bg-transparent text-white px-6 py-2.5 rounded-full font-semibold transition-all duration-300 cursor-pointer"
            >
              Refrescar Datos
            </button>
            <button
              onClick={cerrarSesion}
              className="border border-white/20 hover:border-brand-red hover:text-brand-red bg-transparent text-white px-6 py-2.5 rounded-full font-semibold transition-all duration-300 cursor-pointer"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {cargando ? (
          <p className="text-gray-400 text-center py-12">Cargando panel de administración...</p>
        ) : (
          <div className="space-y-12">
            
            {/* Barra de Pestañas (Tabs) */}
            <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1.5">
              <button
                onClick={() => setTabActiva('estadisticas')}
                className={`px-6 py-3 rounded-t-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  tabActiva === 'estadisticas'
                    ? 'bg-brand-red text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Estadísticas y Caja
              </button>
              <button
                onClick={() => setTabActiva('personal')}
                className={`px-6 py-3 rounded-t-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  tabActiva === 'personal'
                    ? 'bg-brand-red text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Gestionar Personal
              </button>
              <button
                onClick={() => setTabActiva('socios')}
                className={`px-6 py-3 rounded-t-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  tabActiva === 'socios'
                    ? 'bg-brand-red text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Gestionar Socios
              </button>
              <button
                onClick={() => setTabActiva('configuracion')}
                className={`px-6 py-3 rounded-t-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  tabActiva === 'configuracion'
                    ? 'bg-brand-red text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Tarifas y Ajustes
              </button>
              <button
                onClick={() => setTabActiva('asistencias')}
                className={`px-6 py-3 rounded-t-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  tabActiva === 'asistencias'
                    ? 'bg-brand-red text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Reportes Asistencia
              </button>
            </div>
            
            {tabActiva === 'estadisticas' && (
              <>
                {/* Fila de Estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl text-left">
                    <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Total Socios</span>
                    <h3 className="text-4xl font-black text-white mt-2">{totalSocios} Clientes</h3>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl text-left">
                    <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Equipo de Trabajo</span>
                    <h3 className="text-4xl font-black text-white mt-2">
                      {personal.filter(p => p.rol_usuario !== 'dueno').length} Empleados
                    </h3>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl text-left">
                    <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Ingresos Totales</span>
                    <h3 className="text-4xl font-black text-green-400 mt-2">
                      {totalRecaudado.toLocaleString('es-ES', { style: 'currency', currency: moneda })}
                    </h3>
                  </div>
                </div>

                {/* Fila de Recaudación Financiera (Día, Semana, Mes) */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider text-left">Acumulado de Recaudación</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl text-left relative overflow-hidden group hover:border-brand-red/30 transition-all duration-300">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl pointer-events-none"></div>
                      <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Diario (Hoy)</span>
                      <h3 className="text-3xl font-black text-green-400 mt-2">
                        {recaudacionHoy.toLocaleString('es-ES', { style: 'currency', currency: moneda })}
                      </h3>
                      <span className="text-[9px] text-gray-500 mt-1 block">Ingresos registrados el día de hoy</span>
                    </div>
                    
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl text-left relative overflow-hidden group hover:border-brand-red/30 transition-all duration-300">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
                      <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Semanal</span>
                      <h3 className="text-3xl font-black text-blue-400 mt-2">
                        {recaudacionSemana.toLocaleString('es-ES', { style: 'currency', currency: moneda })}
                      </h3>
                      <span className="text-[9px] text-gray-500 mt-1 block">Ingresos acumulados desde el lunes</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl text-left relative overflow-hidden group hover:border-brand-red/30 transition-all duration-300">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>
                      <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Mensual</span>
                      <h3 className="text-3xl font-black text-orange-400 mt-2">
                        {recaudacionMes.toLocaleString('es-ES', { style: 'currency', currency: moneda })}
                      </h3>
                      <span className="text-[9px] text-gray-500 mt-1 block">Ingresos acumulados del mes en curso</span>
                    </div>
                  </div>
                </div>

                {/* CIERRE DE CAJA Y REPORTES DIARIOS */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-3 text-left">
                    <div>
                      <h2 className="text-2xl font-bold">Cierre de Caja Diario (Hoy)</h2>
                      <p className="text-xs text-gray-400 mt-1">Supervisa los cobros del día para evitar descuadres entre efectivo y transferencias/QR.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl text-left">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Total en Efectivo (Caja)</span>
                        <span className="block text-lg font-black text-green-400">
                          {totalEfectivo.toLocaleString('es-ES', { style: 'currency', currency: moneda })}
                        </span>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl text-left">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Total en QR / Banco</span>
                        <span className="block text-lg font-black text-blue-400">
                          {totalQR.toLocaleString('es-ES', { style: 'currency', currency: moneda })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {pagosHoy.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No se han registrado cobros el día de hoy.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider text-xs">
                            <th className="pb-4">Hora</th>
                            <th className="pb-4">Cliente</th>
                            <th className="pb-4">Monto</th>
                            <th className="pb-4">Forma de Pago</th>
                            <th className="pb-4">Recepcionista (Auditor)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-gray-200">
                          {pagosHoy.map((pago) => (
                            <tr key={pago.id_pago} className="hover:bg-white/5 transition-colors">
                              <td className="py-4 font-mono text-xs text-gray-400">
                                {new Date(pago.fecha_pago).toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </td>
                              <td className="py-4 font-bold text-white">{pago.cliente}</td>
                              <td className="py-4 font-mono font-bold text-green-400">
                                {parseFloat(pago.monto).toLocaleString('es-ES', { style: 'currency', currency: moneda })}
                              </td>
                              <td className="py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                                  pago.tipo_pago === 'efectivo'
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}>
                                  {pago.tipo_pago === 'efectivo' ? 'Físico (Efectivo)' : 'Banco (QR)'}
                                </span>
                              </td>
                              <td className="py-4 text-brand-red font-semibold">{pago.recepcionista}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* REPORTE DE INGRESOS POR RANGO DE FECHAS */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4 text-left">
                    <div>
                      <h2 className="text-2xl font-bold">Auditoría y Reporte Financiero</h2>
                      <p className="text-xs text-gray-400 mt-1">Filtra la recaudación por rangos de fechas personalizados y genera reportes de ganancias en PDF de calidad premium.</p>
                    </div>
                    <div>
                      <button
                        onClick={exportarGananciasPDF}
                        disabled={datosReporteFinanciero.pagos.length === 0}
                        className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-400 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all duration-300 shadow-[0_0_15px_rgba(34,197,94,0.2)] cursor-pointer text-center uppercase tracking-wider flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Descargar Reporte PDF
                      </button>
                    </div>
                  </div>

                  {/* Formulario de Filtros de Fechas */}
                  <div className="flex flex-col md:flex-row items-end gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 text-left">
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Fecha de Inicio</label>
                      <input
                        type="date"
                        value={fechaInicioFiltro}
                        onChange={(e) => setFechaInicioFiltro(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all duration-300"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Fecha de Finalización</label>
                      <input
                        type="date"
                        value={fechaFinFiltro}
                        onChange={(e) => setFechaFinFiltro(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all duration-300"
                      />
                    </div>
                    <div className="w-full md:w-auto">
                      <button
                        onClick={cargarReporteFinanciero}
                        disabled={cargandoReporte}
                        className="w-full bg-brand-red hover:bg-brand-red/90 disabled:bg-brand-red/50 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all duration-300 shadow-[0_0_15px_rgba(229,57,53,0.3)] cursor-pointer text-center uppercase tracking-wider"
                      >
                        {cargandoReporte ? 'Buscando...' : 'Filtrar Rango'}
                      </button>
                    </div>
                  </div>

                  {/* Resultados y KPI del Rango */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-left">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Recaudado en Período</span>
                      <h4 className="text-2xl font-black text-green-400 mt-1">
                        {datosReporteFinanciero.total_periodo.toLocaleString('es-ES', { style: 'currency', currency: moneda })}
                      </h4>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Monto en Efectivo</span>
                      <h4 className="text-2xl font-black text-white mt-1">
                        {datosReporteFinanciero.total_efectivo.toLocaleString('es-ES', { style: 'currency', currency: moneda })}
                      </h4>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-left">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Monto por Transferencia / QR</span>
                      <h4 className="text-2xl font-black text-blue-400 mt-1">
                        {datosReporteFinanciero.total_qr.toLocaleString('es-ES', { style: 'currency', currency: moneda })}
                      </h4>
                    </div>
                  </div>

                  {/* Tabla de cobros del rango */}
                  {datosReporteFinanciero.pagos.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No se encontraron transacciones registradas en este período.</p>
                  ) : (
                    <div className="overflow-x-auto border border-white/5 rounded-2xl">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="bg-white/5 border-b border-white/10 text-gray-400 uppercase tracking-wider text-xs">
                            <th className="p-4">Fecha y Hora</th>
                            <th className="p-4">Socio / Cliente</th>
                            <th className="p-4">Monto</th>
                            <th className="p-4">Forma de Pago</th>
                            <th className="p-4">Operador que Cobró</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-gray-200">
                          {datosReporteFinanciero.pagos.map((pago) => (
                            <tr key={pago.id_pago} className="hover:bg-white/5 transition-colors">
                              <td className="p-4 font-mono text-xs text-gray-400">
                                {new Date(pago.fecha_pago).toLocaleDateString('es-ES')} {new Date(pago.fecha_pago).toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="p-4 font-bold text-white">{pago.cliente}</td>
                              <td className="p-4 font-mono font-bold text-green-400">
                                {parseFloat(pago.monto).toLocaleString('es-ES', { style: 'currency', currency: moneda })}
                              </td>
                              <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                                  pago.tipo_pago === 'efectivo'
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}>
                                  {pago.tipo_pago === 'efectivo' ? 'Efectivo' : 'QR / Banco'}
                                </span>
                              </td>
                              <td className="p-4 text-brand-red font-semibold">{pago.recepcionista}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Bloque: Días de Mayor Asistencia */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-left">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-wide text-brand-red text-sm">Flujo de Asistencias por Día</h2>
                    <p className="text-xs text-gray-400 mt-1">Análisis de visitas en la semana para identificar los días de mayor concurrencia.</p>
                  </div>
                  
                  <div className="flex justify-between items-end h-56 pt-8 pb-2 px-2 border-b border-white/10">
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((diaNombre) => {
                      const diaIndex = diaNombre === 'Domingo' ? 0 : ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].indexOf(diaNombre) + 1;
                      const visitas = visitasPorDia[diaIndex] || 0;
                      const maxVisitas = Math.max(...visitasPorDia, 1);
                      const porcentaje = Math.round((visitas / maxVisitas) * 100);

                      return (
                        <div key={diaNombre} className="flex flex-col items-center flex-1 group h-full justify-end relative">
                          {/* Tooltip / Valor sobre la barra */}
                          <div className="absolute top-[-5px] bg-brand-red text-white text-[10px] font-black py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-md whitespace-nowrap z-20">
                            {visitas} visitas
                          </div>
                          
                          {/* Valor estático si tiene visitas */}
                          {visitas > 0 && (
                            <span className="text-[10px] font-bold text-gray-300 mb-1 font-mono transition group-hover:opacity-0">
                              {visitas}
                            </span>
                          )}
                          
                          {/* Barra vertical */}
                          <div 
                            className="w-8 sm:w-10 bg-gradient-to-t from-brand-red/30 to-brand-red rounded-t-lg transition-all duration-500 hover:from-brand-red hover:to-brand-red/80 cursor-pointer shadow-[0_0_10px_rgba(229,57,53,0.1)] border border-brand-red/20 border-b-0"
                            style={{ height: visitas > 0 ? `calc(${porcentaje}% - 20px)` : '4px', minHeight: '4px' }}
                          ></div>

                          {/* Etiqueta del día */}
                          <span className="text-[10px] font-black text-gray-400 mt-2 tracking-wider group-hover:text-brand-red transition-colors">
                            {diaNombre.substring(0, 3).toUpperCase()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {tabActiva === 'personal' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Columna Izquierda - Registro/Edición de Personal */}
                <div className="lg:col-span-1 space-y-8">
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                    <h2 className="text-xl font-bold mb-4 text-left border-b border-white/5 pb-2 uppercase tracking-wide text-brand-red text-sm">
                      {editandoPersonalId ? 'Editar Empleado' : 'Registrar Personal'}
                    </h2>
                    
                    {mensajeForm.texto && (
                      <div className={`p-3 rounded-xl text-xs mb-4 text-center border ${
                        mensajeForm.tipo === 'exito' 
                          ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                          : 'bg-brand-red/10 border-brand-red/20 text-brand-red'
                      }`}>
                        {mensajeForm.texto}
                      </div>
                    )}

                    <form onSubmit={registrarPersonal} className="space-y-4 text-left">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Nombre Completo</label>
                        <input
                          type="text"
                          value={nombrePersonal}
                          onChange={(e) => setNombrePersonal(e.target.value)}
                          required
                          className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all duration-300"
                          placeholder="Ej. Ana Lopez"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">PIN de Asistencia (6 dígitos)</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={pinPersonal}
                          onChange={(e) => setPinPersonal(e.target.value.replace(/\D/g, ''))}
                          required
                          className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all duration-300"
                          placeholder="Ej. 123456"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Rol / Cargo</label>
                        <select
                          value={rolPersonal}
                          onChange={(e) => setRolPersonal(e.target.value as any)}
                          className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all duration-300 cursor-pointer"
                        >
                          <option value="recepcionista" className="bg-black">Recepcionista</option>
                          <option value="entrenador" className="bg-black">Entrenador</option>
                          <option value="limpieza" className="bg-black">Personal de Limpieza</option>
                        </select>
                      </div>

                      <div className="flex gap-3">
                        {editandoPersonalId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditandoPersonalId(null);
                              setNombrePersonal('');
                              setPinPersonal('');
                              setRolPersonal('recepcionista');
                              setMensajeForm({ tipo: '', texto: '' });
                            }}
                            className="flex-1 border border-white/20 hover:border-brand-red text-white py-2.5 rounded-xl text-xs font-bold transition duration-300 cursor-pointer text-center"
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={creandoPersonal}
                          className="flex-grow bg-brand-red hover:bg-brand-red/90 disabled:bg-brand-red/50 text-white py-2.5 rounded-xl font-bold transition-all duration-300 shadow-[0_0_15px_rgba(229,57,53,0.3)] cursor-pointer text-center text-xs uppercase tracking-wider"
                        >
                          {creandoPersonal ? 'Procesando...' : editandoPersonalId ? 'Guardar Cambios' : 'Registrar Empleado'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Columna Derecha - Listado de Personal */}
                <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
                  <h2 className="text-2xl font-bold mb-6 text-left border-b border-white/5 pb-3">Personal del Gimnasio</h2>
                  
                  {personal.length === 0 ? (
                    <p className="text-gray-400 text-center py-12 font-semibold">No hay personal registrado.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider text-xs">
                            <th className="pb-4">Nombre</th>
                            <th className="pb-4">Rol / Cargo</th>
                            <th className="pb-4">PIN</th>
                            <th className="pb-4 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-gray-200">
                          {personal.map((p) => (
                            <tr key={p.id_usuario} className="hover:bg-white/5 transition-colors">
                              <td className="py-4 font-bold text-white">
                                <span className="block truncate max-w-[200px]" title={p.nombre_completo}>
                                  {p.nombre_completo}
                                </span>
                              </td>
                              <td className="py-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                                  p.rol_usuario === 'dueno'
                                    ? 'bg-brand-red/10 text-brand-red border border-brand-red/20'
                                    : p.rol_usuario === 'recepcionista'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : p.rol_usuario === 'entrenador'
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                }`}>
                                  {p.rol_usuario === 'dueno' ? 'Dueño' : p.rol_usuario}
                                </span>
                              </td>
                              <td className="py-4 font-mono text-xs text-brand-red font-semibold">
                                {p.pin_acceso || 'Sin PIN'}
                              </td>
                              <td className="py-4 text-right space-x-2">
                                {p.rol_usuario !== 'dueno' ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditandoPersonalId(p.id_usuario);
                                        setNombrePersonal(p.nombre_completo);
                                        setPinPersonal(p.pin_acceso || '');
                                        setRolPersonal(p.rol_usuario as any);
                                      }}
                                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/20 hover:border-brand-red hover:text-white bg-transparent transition cursor-pointer"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => eliminarPersonal(p.id_usuario, p.nombre_completo)}
                                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-red hover:bg-brand-red/90 text-white transition cursor-pointer shadow-lg"
                                    >
                                      Borrar
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-500 font-semibold italic">Administrador</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tabActiva === 'socios' && (
              <div className="w-full text-left">
                {/* Listado y Búsqueda de Socios */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-4">
                      <h2 className="text-2xl font-bold">Listado de Socios</h2>
                      <button
                        onClick={() => {
                          setEditandoSocioId(null);
                          setNombreSocio('');
                          setCiSocio('');
                          setEstadoMembresiaSocio('vencida');
                          setFechaVencimientoSocio('');
                          setMensajeSocioForm({ tipo: '', texto: '' });
                          setMostrandoModalSocio(true);
                        }}
                        className="bg-brand-red hover:bg-brand-red/90 text-white font-bold px-4 py-2 rounded-xl text-xs transition duration-300 cursor-pointer text-center uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(229,57,53,0.2)]"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                        Registrar Socio
                      </button>
                    </div>
                    {/* Barra de Búsqueda */}
                    <div className="relative w-full md:w-72">
                      <input
                        type="text"
                        placeholder="Buscar por nombre o C.I..."
                        value={filtroSocios}
                        onChange={(e) => setFiltroSocios(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl pl-4 pr-4 py-2 text-xs text-white focus:outline-none transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Filtrar Socios */}
                  {(() => {
                    const sociosFiltrados = listaClientes.filter(socio => {
                      const query = filtroSocios.toLowerCase().trim();
                      if (!query) return true;
                      return (
                        socio.nombre_completo.toLowerCase().includes(query) ||
                        socio.documento_identidad.includes(query)
                      );
                    });

                    if (sociosFiltrados.length === 0) {
                      return (
                        <p className="text-gray-400 text-center py-12 font-semibold">
                          {listaClientes.length === 0 ? 'No hay socios registrados.' : 'No se encontraron socios que coincidan con la búsqueda.'}
                        </p>
                      );
                    }

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider text-xs">
                              <th className="pb-4">Socio</th>
                              <th className="pb-4">C.I.</th>
                              <th className="pb-4">PIN Acceso</th>
                              <th className="pb-4">Membresía</th>
                              <th className="pb-4">Vence</th>
                              <th className="pb-4 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-gray-200">
                            {sociosFiltrados.map((socio) => (
                              <tr key={socio.id_cliente} className="hover:bg-white/5 transition-colors">
                                <td className="py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-red/40 to-brand-red/10 border border-brand-red/20 flex items-center justify-center font-bold text-brand-red text-xs">
                                      {socio.nombre_completo.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="font-bold text-white block truncate max-w-[150px] lg:max-w-[220px]" title={socio.nombre_completo}>{socio.nombre_completo}</span>
                                  </div>
                                </td>
                                <td className="py-4 font-mono text-xs text-gray-300">{socio.documento_identidad}</td>
                                <td className="py-4 font-mono text-xs text-brand-red font-semibold">{socio.pin_acceso}</td>
                                <td className="py-4">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    socio.estado_membresia === 'activa'
                                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                      : 'bg-brand-red/10 text-brand-red border border-brand-red/20'
                                  }`}>
                                    {socio.estado_membresia === 'activa' ? 'Activa' : 'Vencida'}
                                  </span>
                                </td>
                                <td className="py-4 font-mono text-xs text-gray-300">
                                  {socio.fecha_vencimiento ? (
                                    new Date(socio.fecha_vencimiento).toLocaleDateString('es-ES', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit'
                                    })
                                  ) : (
                                    <span className="text-gray-500 italic">Sin fecha</span>
                                  )}
                                </td>
                                <td className="py-4 text-right space-x-2">
                                  <button
                                    onClick={() => seleccionarSocioEdicion(socio)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/20 hover:border-brand-red hover:text-white bg-transparent transition cursor-pointer"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => eliminarSocio(socio.id_cliente, socio.nombre_completo)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-red hover:bg-brand-red/90 text-white transition cursor-pointer shadow-lg"
                                  >
                                    Borrar
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>

                {/* MODAL PARA REGISTRO/EDICIÓN DE SOCIO */}
                {mostrandoModalSocio && (
                  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-center items-center p-4">
                    <div className="bg-[#121212] border border-white/10 rounded-3xl max-w-md w-full p-6 md:p-8 relative shadow-2xl animate-fadeIn">
                      <button
                        onClick={cancelarEdicionSocio}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition duration-200 cursor-pointer"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      <h2 className="text-xl font-bold mb-4 text-left border-b border-white/5 pb-2 uppercase tracking-wide text-brand-red text-sm">
                        {editandoSocioId ? 'Editar Socio' : 'Registrar Socio'}
                      </h2>
                      
                      {mensajeSocioForm.texto && (
                        <div className={`p-3 rounded-xl text-xs mb-4 text-center border ${
                          mensajeSocioForm.tipo === 'exito' 
                            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                            : 'bg-brand-red/10 border-brand-red/20 text-brand-red'
                        }`}>
                          {mensajeSocioForm.texto}
                        </div>
                      )}

                      <form onSubmit={registrarSocio} className="space-y-4 text-left">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Nombre Completo</label>
                          <input
                            type="text"
                            value={nombreSocio}
                            onChange={(e) => setNombreSocio(e.target.value)}
                            required
                            className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all duration-300"
                            placeholder="Ej. Mario Gomez"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Documento de Identidad (C.I.)</label>
                          <input
                            type="text"
                            value={ciSocio}
                            onChange={(e) => setCiSocio(e.target.value.replace(/\D/g, ''))}
                            required
                            className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all duration-300"
                            placeholder="Ej. 1029384"
                          />
                          {ciSocio.length >= 6 && (
                            <span className="text-[10px] text-gray-400 mt-1 block">
                              PIN de Acceso Sugerido: <strong className="text-brand-red">{ciSocio.substring(0, 6)}</strong>
                            </span>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Estado de Membresía</label>
                          <select
                            value={estadoMembresiaSocio}
                            onChange={(e) => setEstadoMembresiaSocio(e.target.value as 'activa' | 'vencida')}
                            className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all duration-300 cursor-pointer"
                          >
                            <option value="vencida" className="bg-black">Vencida</option>
                            <option value="activa" className="bg-black">Activa</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Fecha de Vencimiento (Opcional)</label>
                          <input
                            type="date"
                            value={fechaVencimientoSocio}
                            onChange={(e) => setFechaVencimientoSocio(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all duration-300 cursor-pointer [color-scheme:dark]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <button
                            type="button"
                            onClick={cancelarEdicionSocio}
                            className="border border-white/20 hover:border-brand-red text-white py-2.5 rounded-xl text-xs font-bold transition duration-300 cursor-pointer text-center"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={guardandoSocio}
                            className="bg-brand-red hover:bg-brand-red/90 disabled:bg-brand-red/50 text-white py-2.5 rounded-xl font-bold transition-all duration-300 shadow-[0_0_15px_rgba(229,57,53,0.3)] cursor-pointer text-center text-xs uppercase tracking-wider"
                          >
                            {guardandoSocio ? 'Guardando...' : editandoSocioId ? 'Guardar' : 'Registrar'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tabActiva === 'configuracion' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 text-left">
                {/* Ajustes Básicos */}
                <div className="space-y-8 lg:col-span-1">
                  {/* Formulario Editar Nombre Gimnasio */}
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                    <h2 className="text-xl font-bold mb-4 text-left border-b border-white/5 pb-2 uppercase tracking-wide text-brand-red text-sm">Configuración del Gimnasio</h2>
                    <form onSubmit={actualizarNombreGimnasio} className="space-y-4 text-left">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Nombre Comercial</label>
                        <input
                          type="text"
                          value={nombreGimnasio}
                          onChange={(e) => setNombreGimnasio(e.target.value)}
                          required
                          className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all duration-300"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={guardandoGimnasio}
                        className="w-full bg-brand-red hover:bg-brand-red/90 disabled:bg-brand-red/50 text-white py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer text-center uppercase tracking-wider"
                      >
                        {guardandoGimnasio ? 'Guardando...' : 'Guardar Nombre'}
                      </button>
                    </form>
                  </div>

                  {/* Formulario Logo del Gimnasio */}
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
                    <h2 className="text-xl font-bold border-b border-white/5 pb-2 uppercase tracking-wide text-brand-red text-sm">Logo del Gimnasio</h2>
                    
                    {/* Visualización del Logo actual */}
                    <div className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/5 rounded-2xl">
                      {logoUrl ? (
                        <div className="relative group">
                          <img 
                            src={logoUrl} 
                            alt="Logo Vista Previa" 
                            className="w-24 h-24 rounded-full object-cover border-4 border-white/10 shadow-lg"
                          />
                          <button
                            type="button"
                            onClick={eliminarLogoGimnasio}
                            disabled={subiendoLogo}
                            className="absolute -top-1 -right-1 bg-brand-red hover:bg-brand-red/90 text-white rounded-full p-1.5 shadow-md transition duration-200 cursor-pointer"
                            title="Eliminar Logo"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-brand-red/10 border border-brand-red/20 flex flex-col items-center justify-center text-center p-3 text-gray-400">
                          <svg className="w-8 h-8 text-brand-red/60 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-[9px] uppercase font-bold tracking-wider">Sin Logo</span>
                        </div>
                      )}
                      <span className="text-[9px] text-gray-500 mt-2">Formato PNG/JPG. Máx 2MB.</span>
                    </div>

                    {/* Selector y Botón de subida */}
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        {subiendoLogo ? 'Actualizando logo...' : 'Seleccionar nueva imagen'}
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                          onChange={subirLogoGimnasio}
                          disabled={subiendoLogo}
                          className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2 text-xs text-white focus:outline-none transition-all duration-300 cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-white/10 file:text-white file:cursor-pointer hover:file:bg-white/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Formulario Configurar Tarifas y Moneda */}
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                    <h2 className="text-xl font-bold mb-4 text-left border-b border-white/5 pb-2 uppercase tracking-wide text-brand-red text-sm">Tarifas y Moneda</h2>
                    <form onSubmit={actualizarTarifasMoneda} className="space-y-4 text-left">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Moneda del Sistema</label>
                        <select
                          value={moneda}
                          onChange={(e) => setMoneda(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all duration-300 cursor-pointer"
                        >
                          <option value="USD" className="bg-black">USD (Dólares)</option>
                          <option value="BOB" className="bg-black">BOB (Bolivianos)</option>
                          <option value="EUR" className="bg-black">EUR (Euros)</option>
                          <option value="MXN" className="bg-black">MXN (Pesos Mexicanos)</option>
                          <option value="CLP" className="bg-black">CLP (Pesos Chilenos)</option>
                          <option value="PEN" className="bg-black">PEN (Soles Peruanos)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Precio Plan Mensual</label>
                        <input
                          type="number"
                          min="0"
                          value={precioMensual}
                          onChange={(e) => setPrecioMensual(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                          required
                          className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all duration-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Precio Plan Ejecutivo</label>
                        <input
                          type="number"
                          min="0"
                          value={precioEjecutivo}
                          onChange={(e) => setPrecioEjecutivo(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                          required
                          className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all duration-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Precio Plan Anual</label>
                        <input
                          type="number"
                          min="0"
                          value={precioAnual}
                          onChange={(e) => setPrecioAnual(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                          required
                          className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all duration-300"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={guardandoTarifas}
                        className="w-full bg-brand-red hover:bg-brand-red/90 disabled:bg-brand-red/50 text-white py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer text-center uppercase tracking-wider"
                      >
                        {guardandoTarifas ? 'Guardando...' : 'Guardar Tarifas'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Promoción y Seguridad */}
                <div className="space-y-8 lg:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Formulario Promoción Activa */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                      <h2 className="text-xl font-bold mb-4 text-left border-b border-white/5 pb-2 uppercase tracking-wide text-brand-red text-sm">Promoción y Descuentos</h2>
                      <form onSubmit={actualizarPromocionGimnasio} className="space-y-4 text-left">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Nombre Promoción</label>
                          <input
                            type="text"
                            value={promoNombreBase}
                            onChange={(e) => setPromoNombreBase(e.target.value)}
                            placeholder="Ej. Descuento de Apertura"
                            required
                            className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all duration-300"
                          />
                        </div>
                        
                        {/* Toggle Habilitar/Desactivar */}
                        <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                          <div>
                            <span className="block text-xs font-bold text-white uppercase tracking-wider">Estado de Promoción</span>
                            <span className="text-[10px] text-gray-400">Habilitar o desactivar el descuento</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPromoActiva(!promoActiva)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none cursor-pointer ${
                              promoActiva ? 'bg-brand-red' : 'bg-white/15'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                                promoActiva ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Programar Fecha de Vencimiento */}
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            Programar Vencimiento (Opcional)
                          </label>
                          <input
                            type="date"
                            value={promoVencimiento}
                            onChange={(e) => setPromoVencimiento(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all duration-300 cursor-pointer [color-scheme:dark]"
                          />
                          <span className="text-[9px] text-gray-400 mt-1 block">
                            La promoción se desactivará automáticamente al finalizar este día.
                          </span>
                        </div>

                        {/* Rueda / Slider de Porcentaje */}
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                              Porcentaje de Descuento
                            </label>
                            <span className="text-sm font-bold text-brand-red bg-brand-red/10 border border-brand-red/20 px-2.5 py-0.5 rounded-full">{promocionDescuento}%</span>
                          </div>
                          <div className="relative pt-1 flex items-center">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={promocionDescuento}
                              onChange={(e) => setPromocionDescuento(parseInt(e.target.value) || 0)}
                              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-red focus:outline-none transition-all duration-300"
                              style={{
                                background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${promocionDescuento}%, rgba(255,255,255,0.1) ${promocionDescuento}%, rgba(255,255,255,0.1) 100%)`
                              }}
                            />
                          </div>
                          {/* Botones de Selección Rápida */}
                          <div className="flex justify-between gap-1.5 mt-2">
                            {[5, 10, 15, 20, 25, 50].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setPromocionDescuento(val)}
                                className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold border transition duration-300 cursor-pointer ${
                                  promocionDescuento === val
                                    ? 'bg-brand-red/20 border-brand-red text-brand-red'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                {val}%
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={guardandoPromocion}
                          className="w-full bg-brand-red hover:bg-brand-red/90 disabled:bg-brand-red/50 text-white py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer text-center uppercase tracking-wider"
                        >
                          {guardandoPromocion ? 'Actualizando...' : 'Actualizar Promoción'}
                        </button>
                      </form>
                    </div>

                    {/* Formulario Contraseñas del Portal */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl h-fit">
                      <h2 className="text-xl font-bold mb-4 text-left border-b border-white/5 pb-2 uppercase tracking-wide text-brand-red text-sm">Claves de Acceso Portal</h2>
                      <form onSubmit={actualizarContrasenasPortal} className="space-y-4 text-left">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Clave Dueño</label>
                          <input
                            type="password"
                            value={contrasenaDueno}
                            onChange={(e) => setContrasenaDueno(e.target.value)}
                            required
                            className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all duration-300"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Clave Recepcionista</label>
                          <input
                            type="password"
                            value={contrasenaRecepcion}
                            onChange={(e) => setContrasenaRecepcion(e.target.value)}
                            required
                            className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-all duration-300"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={guardandoContrasenas}
                          className="w-full bg-brand-red hover:bg-brand-red/90 disabled:bg-brand-red/50 text-white py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer text-center uppercase tracking-wider"
                        >
                          {guardandoContrasenas ? 'Actualizando...' : 'Actualizar Claves'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tabActiva === 'asistencias' && (
              <div className="space-y-6 text-left animate-fadeIn">
                {/* Panel de Filtros */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
                  <h2 className="text-xl font-bold mb-4 border-b border-white/5 pb-2 uppercase tracking-wide text-brand-red text-sm">Filtros de Reporte de Asistencia</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Empleado</label>
                      <select
                        value={filtroEmpleadoAsistencia}
                        onChange={(e) => setFiltroEmpleadoAsistencia(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all duration-300"
                      >
                        <option value="todos" className="bg-black text-white">Todos los empleados</option>
                        {personal.map(p => (
                          <option key={p.id_usuario} value={p.id_usuario} className="bg-black text-white">
                            {p.nombre_completo} ({p.rol_usuario})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Fecha Inicio</label>
                      <input
                        type="date"
                        value={fechaInicioAsistencia}
                        onChange={(e) => setFechaInicioAsistencia(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all duration-300"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Fecha Fin</label>
                      <input
                        type="date"
                        value={fechaFinAsistencia}
                        onChange={(e) => setFechaFinAsistencia(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 focus:border-brand-red rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all duration-300"
                      />
                    </div>

                    <div>
                      <button
                        onClick={exportarAPDF}
                        disabled={asistenciasFiltradas.length === 0}
                        className="w-full bg-brand-red hover:bg-brand-red/90 disabled:bg-brand-red/20 disabled:text-gray-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer text-center uppercase tracking-wider flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Exportar Reporte a PDF
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabla de Resultados */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold border-b border-white/5 pb-2 uppercase tracking-wide text-brand-red text-sm">Registros de Asistencia ({asistenciasFiltradas.length})</h2>
                    <span className="text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                      Total Horas Estimadas: {asistenciasFiltradas.reduce((sum, asis) => {
                        if (!asis.fecha_salida) return sum;
                        const ms = new Date(asis.fecha_salida).getTime() - new Date(asis.fecha_entrada).getTime();
                        return sum + (ms > 0 ? ms / 3600000 : 0);
                      }, 0).toFixed(1)} hrs
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                          <th className="py-3 px-4">Empleado</th>
                          <th className="py-3 px-4">Rol</th>
                          <th className="py-3 px-4">Fecha</th>
                          <th className="py-3 px-4">Entrada</th>
                          <th className="py-3 px-4">Salida</th>
                          <th className="py-3 px-4">Duración</th>
                          <th className="py-3 px-4">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                        {asistenciasFiltradas.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-gray-500 font-semibold">
                              No se encontraron registros de asistencia para los filtros seleccionados.
                            </td>
                          </tr>
                        ) : (
                          asistenciasFiltradas.map((asis) => {
                            const emp = personal.find(p => p.id_usuario === asis.id_referencia);
                            const nombre = emp ? emp.nombre_completo : 'Empleado Eliminado';
                            const rol = emp ? emp.rol_usuario : '-';
                            const fecha = new Date(asis.fecha_entrada).toLocaleDateString();
                            const entrada = new Date(asis.fecha_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const salida = asis.fecha_salida 
                              ? new Date(asis.fecha_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '-';
                            const duracion = calcularDuracion(asis.fecha_entrada, asis.fecha_salida);
                            const estaAdentro = !asis.fecha_salida;

                            return (
                              <tr key={asis.id_asistencia} className="hover:bg-white/5 transition-all">
                                <td className="py-3.5 px-4 font-bold text-white">{nombre}</td>
                                <td className="py-3.5 px-4 capitalize font-semibold text-gray-400">{rol}</td>
                                <td className="py-3.5 px-4">{fecha}</td>
                                <td className="py-3.5 px-4">{entrada}</td>
                                <td className="py-3.5 px-4">{salida}</td>
                                <td className="py-3.5 px-4 font-mono font-bold text-brand-red">{duracion}</td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    estaAdentro 
                                      ? 'bg-green-500/15 border-green-500/30 text-green-400' 
                                      : 'bg-white/5 border-white/10 text-gray-400'
                                  }`}>
                                    {estaAdentro ? 'En Turno' : 'Completado'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default Dueno;

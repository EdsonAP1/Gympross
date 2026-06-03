const Servicios = () => {
  const listaServicios = [
    {
      titulo: "Tótem de Acceso",
      descripcion: "Pantalla optimizada para autoservicio donde tus clientes marcan su asistencia ingresando su código PIN de 6 dígitos.",
      icono: (
        <svg className="w-8 h-8 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      titulo: "Panel del Dueño",
      descripcion: "Dashboard gerencial completo para visualizar reportes de ingresos, estadísticas de asistencia y administración de personal.",
      icono: (
        <svg className="w-8 h-8 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      )
    },
    {
      titulo: "Panel de Recepción",
      descripcion: "Módulo ágil para registrar pagos en efectivo/QR, verificar vigencia de membresías y administrar llaves de casilleros.",
      icono: (
        <svg className="w-8 h-8 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      )
    },
    {
      titulo: "Pagos y Registro de Caja",
      descripcion: "Visualiza cobros del día, exporta históricos e imprime o genera códigos QR estáticos en la pantalla de cobro.",
      icono: (
        <svg className="w-8 h-8 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  return (
    <section id="servicios" className="py-24 px-4 md:px-12 bg-black relative">
      {/* Luces decorativas */}
      <div className="absolute top-[30%] left-[5%] w-[30%] h-[30%] rounded-full bg-brand-red/5 blur-[120px] pointer-events-none"></div>

      <div className="max-w-[1400px] mx-auto text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-red">Servicios y Funciones</span>
        <h2 className="text-4xl md:text-5xl font-black text-white mt-3 mb-16">
          Todo lo que tu Gimnasio necesita en un solo lugar
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {listaServicios.map((servicio, indice) => (
            <div 
              key={indice} 
              className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl text-left hover:border-brand-red/40 hover:bg-white/10 transition-all duration-300 shadow-xl group flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-red/10 group-hover:border-brand-red/30 transition-all duration-300">
                  {servicio.icono}
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-brand-red transition-colors duration-300">
                  {servicio.titulo}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {servicio.descripcion}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Servicios;

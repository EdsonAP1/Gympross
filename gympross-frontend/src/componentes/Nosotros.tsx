const Nosotros = () => {
  return (
    <section id="nosotros" className="py-24 px-4 md:px-12 bg-black relative">
      {/* Luces decorativas */}
      <div className="absolute top-[10%] right-[10%] w-[30%] h-[30%] rounded-full bg-brand-red/5 blur-[120px] pointer-events-none"></div>

      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-16">
        {/* Imagen / Detalle Decorativo del Panel */}
        <div className="w-full md:w-1/2 flex justify-center order-2 md:order-1">
          <div className="relative w-full max-w-md aspect-square bg-gradient-to-tr from-brand-red/20 to-white/5 border border-white/10 rounded-3xl p-8 flex flex-col justify-between shadow-2xl overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand-red/10 blur-2xl group-hover:bg-brand-red/20 transition-all duration-700"></div>
            
            <div className="flex justify-between items-start">
              <span className="text-sm font-semibold uppercase tracking-widest text-brand-red">Visión 360</span>
              <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-4xl font-extrabold text-white mb-2">Seguridad e Integración</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Tecnología modular diseñada para centralizar operaciones, mitigar accesos no autorizados y proveer control total al propietario en tiempo real.
              </p>
            </div>
          </div>
        </div>

        {/* Textos del Nosotros */}
        <div className="w-full md:w-1/2 order-1 md:order-2 text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-red">¿Quiénes Somos?</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-3 mb-6">
            Llevando la Gestión de Gimnasios al Siguiente Nivel
          </h2>
          <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-6">
            GymPross nace de la necesidad de automatizar y proteger los accesos, membresías y finanzas en gimnasios modernos. Nuestra misión es brindar una plataforma en la nube (SaaS) multi-tenant extremadamente intuitiva, rápida y sobre todo segura.
          </p>
          <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-8">
            Diseñado para dueños de gimnasios que buscan el control total de sus sucursales sin depender de hojas de cálculo o software de escritorio lentos y vulnerables.
          </p>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="border-l-2 border-brand-red pl-4">
              <h4 className="text-3xl font-black text-white">100%</h4>
              <p className="text-xs text-gray-500 font-semibold uppercase mt-1">Multi-tenant Seguro</p>
            </div>
            <div className="border-l-2 border-brand-red pl-4">
              <h4 className="text-3xl font-black text-white">Nube</h4>
              <p className="text-xs text-gray-500 font-semibold uppercase mt-1">Acceso en Tiempo Real</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Nosotros;

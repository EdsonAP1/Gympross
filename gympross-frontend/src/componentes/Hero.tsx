const Hero = () => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between mt-12 px-4 md:px-12 flex-grow">
      
      {/* Columna Izquierda - Textos */}
      <div className="w-full md:w-1/2 pt-10 md:pt-0 relative z-10 flex flex-col justify-center">
        <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6 text-white text-left animate-fade-in">
          <span className="text-brand-red">Más Fuerte</span><br/>
          Cada Día<br/>
          Comienza Aquí
        </h1>
        
        <p className="text-gray-400 max-w-lg mb-10 text-sm md:text-base leading-relaxed text-left">
          Nuestro espacio está diseñado para potenciarte física, mental y emocionalmente, ayudándote a conectar con tu propósito mientras transformas tu cuerpo. Ya seas un atleta experimentado o estés comenzando tu camino.
        </p>

        <div className="flex flex-wrap items-center gap-6 mb-12">
          {/* Enlace de WhatsApp para Adquirir Software */}
          <a 
            href="https://wa.me/59173084452?text=Hola%20GymPross%2C%20estoy%20interesado%20en%20adquirir%20el%20software%20de%20gesti%C3%B3n%20para%20mi%20gimnasio."
            target="_blank" 
            rel="noopener noreferrer"
            className="border border-white/30 bg-transparent hover:bg-white/5 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 hover:border-brand-red hover:text-brand-red cursor-pointer text-center"
          >
            Adquirir Software
          </a>
          
          <button className="flex items-center gap-3 group cursor-pointer">
            <div className="w-12 h-12 bg-brand-red rounded-full flex items-center justify-center group-hover:scale-110 transition duration-300 shadow-[0_0_15px_rgba(229,57,53,0.4)]">
              <svg className="w-4 h-4 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="font-semibold text-lg text-white group-hover:text-brand-red transition-colors duration-300">Ver Video</span>
          </button>
        </div>

        {/* Componentes de Estadísticas y Confianza */}
        <div className="flex flex-col sm:flex-row gap-6 mt-10 w-full max-w-xl relative z-20">
          
          {/* Tarjeta de Reseñas */}
          <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex items-center gap-4 shadow-2xl transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
            <div className="flex -space-x-3 flex-shrink-0">
              <img src="/profile_1.png" alt="Perfil Usuario" className="w-9 h-9 rounded-full border-2 border-zinc-950 object-cover" />
              <img src="/profile_2.png" alt="Perfil Usuario" className="w-9 h-9 rounded-full border-2 border-zinc-950 object-cover" />
              <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-extrabold border-2 border-zinc-950 text-[10px] z-10">+4</div>
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-white">20k+ Reseñas</p>
              <div className="flex text-yellow-500 gap-0.5 mt-1">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>

          {/* Tarjeta de Clientes Registrados */}
          <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex flex-col justify-between shadow-2xl transition-all duration-500 hover:-translate-y-1 hover:border-brand-red/30 hover:bg-white/10 relative overflow-hidden group">
            {/* Resplandor rojo sutil al hacer hover */}
            <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-brand-red/5 rounded-full blur-2xl group-hover:bg-brand-red/15 transition-all duration-500 pointer-events-none"></div>
            
            <div className="flex justify-between items-start w-full">
              <div className="text-left">
                <h2 className="text-2xl font-black text-brand-red tracking-tight">25K+</h2>
                <p className="text-xs text-gray-400 font-medium mt-1 leading-snug">Accesos de Clientes<br/>Registrados</p>
              </div>
              <div className="border border-white/10 p-2 rounded-xl bg-white/[0.02] group-hover:border-brand-red/30 group-hover:bg-brand-red/5 transition-all duration-500 flex-shrink-0">
                <svg className="w-4 h-4 text-gray-400 group-hover:text-brand-red transform -rotate-45 transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Columna Derecha - Imagen */}
      <div className="w-full md:w-1/2 absolute md:relative right-0 bottom-0 opacity-20 md:opacity-100 flex justify-end h-full md:h-auto pointer-events-none md:pointer-events-auto">
        <div className="relative w-full max-w-lg lg:max-w-xl h-full md:h-[750px] flex items-end justify-end">
          {/* Gradientes para fundir la imagen con el fondo oscuro */}
          <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none"></div>
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-red/10 to-transparent blur-3xl -z-10 pointer-events-none"></div>
          
          <img 
            src="/hero_athlete.png" 
            alt="Atleta de Fitness" 
            className="w-full h-auto max-h-[700px] object-contain relative z-0"
            style={{ 
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)', 
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)' 
            }}
          />
        </div>
      </div>

    </div>
  );
};

export default Hero;

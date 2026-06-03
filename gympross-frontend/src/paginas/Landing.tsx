import Navbar from '../componentes/Navbar';
import Hero from '../componentes/Hero';
import Nosotros from '../componentes/Nosotros';
import Servicios from '../componentes/Servicios';
import PreguntasFrecuentes from '../componentes/PreguntasFrecuentes';

const Landing = () => {
  return (
    <div className="min-h-screen bg-black text-white font-sans relative overflow-hidden flex flex-col">
      {/* Luces decorativas de fondo similares al diseño */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-red/10 blur-[150px]"></div>
        <div className="absolute top-[30%] right-[-10%] w-[50%] h-[60%] rounded-full bg-brand-red/5 blur-[150px]"></div>
      </div>
      
      {/* Contenido Principal */}
      <div className="max-w-[1400px] w-full mx-auto relative z-10 flex-grow flex flex-col">
        <Navbar />
        <Hero />
        <Nosotros />
        <Servicios />
        <PreguntasFrecuentes />
      </div>
    </div>
  );
};

export default Landing;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const navegar = useNavigate();

  const alternarMenu = () => {
    setMenuAbierto(!menuAbierto);
  };

  const irASeccion = (idSeccion: string) => {
    if (window.location.pathname !== '/') {
      navegar('/');
      setTimeout(() => {
        const elemento = document.getElementById(idSeccion);
        if (elemento) {
          elemento.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } else {
      const elemento = document.getElementById(idSeccion);
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setMenuAbierto(false);
  };

  return (
    <header className="relative z-50 mt-6 mx-4 md:mx-12" id="inicio">
      <nav className="py-4 px-8 bg-white/5 backdrop-blur-lg border border-white/10 rounded-full flex justify-between items-center shadow-lg">
        {/* Logotipo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => irASeccion('inicio')}>
          <div className="w-9 h-9 rounded-full border border-brand-red bg-brand-red/10 flex items-center justify-center font-black text-brand-red text-sm tracking-tighter">
            GP
          </div>
          <span className="text-xl font-bold tracking-wider text-white">GymPross</span>
        </div>

        {/* Enlaces de Navegación - Escritorio */}
        <ul className="hidden md:flex gap-8 text-sm font-medium text-gray-300">
          <li 
            onClick={() => irASeccion('inicio')}
            className="text-white hover:text-brand-red transition-colors duration-300 cursor-pointer"
          >
            Inicio
          </li>
          <li 
            onClick={() => irASeccion('nosotros')}
            className="hover:text-brand-red hover:text-white transition-colors duration-300 cursor-pointer"
          >
            Nosotros
          </li>
          <li 
            onClick={() => irASeccion('servicios')}
            className="hover:text-brand-red hover:text-white transition-colors duration-300 cursor-pointer"
          >
            Servicios
          </li>
          <li 
            onClick={() => irASeccion('preguntas')}
            className="hover:text-brand-red hover:text-white transition-colors duration-300 cursor-pointer"
          >
            Preguntas Frecuentes
          </li>
        </ul>

        {/* Botón de Ingreso - Escritorio */}
        <div className="hidden md:block">
          <button 
            onClick={() => navegar('/login')}
            className="bg-brand-red hover:bg-brand-red/90 text-white px-6 py-2.5 rounded-full font-semibold transition-all duration-300 shadow-[0_0_15px_rgba(229,57,53,0.4)] hover:shadow-[0_0_20px_rgba(229,57,53,0.6)] cursor-pointer"
          >
            Ingresar al Sistema
          </button>
        </div>

        {/* Botón de Menú Móvil (Hamburguesa) */}
        <button
          onClick={alternarMenu}
          className="md:hidden text-white hover:text-brand-red transition-colors duration-300 focus:outline-none cursor-pointer"
          aria-label="Alternar menú"
        >
          {menuAbierto ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Menú Desplegable Móvil */}
      {menuAbierto && (
        <div className="absolute top-16 left-0 right-0 mt-2 p-6 bg-black/95 backdrop-blur-xl border border-white/10 rounded-3xl md:hidden flex flex-col gap-6 shadow-2xl animate-fade-in">
          <ul className="flex flex-col gap-4 text-base font-medium text-gray-300">
            <li 
              className="text-white hover:text-brand-red transition-colors duration-300 py-2 border-b border-white/5 cursor-pointer"
              onClick={() => irASeccion('inicio')}
            >
              Inicio
            </li>
            <li 
              className="hover:text-white hover:text-brand-red transition-colors duration-300 py-2 border-b border-white/5 cursor-pointer"
              onClick={() => irASeccion('nosotros')}
            >
              Nosotros
            </li>
            <li 
              className="hover:text-white hover:text-brand-red transition-colors duration-300 py-2 border-b border-white/5 cursor-pointer"
              onClick={() => irASeccion('servicios')}
            >
              Servicios
            </li>
            <li 
              className="hover:text-white hover:text-brand-red transition-colors duration-300 py-2 cursor-pointer"
              onClick={() => irASeccion('preguntas')}
            >
              Preguntas Frecuentes
            </li>
          </ul>

          <button 
            className="w-full bg-brand-red hover:bg-brand-red/90 text-white py-3 rounded-full font-semibold transition-all duration-300 shadow-[0_0_15px_rgba(229,57,53,0.4)] cursor-pointer"
            onClick={() => { setMenuAbierto(false); navegar('/login'); }}
          >
            Ingresar al Sistema
          </button>
        </div>
      )}
    </header>
  );
};

export default Navbar;

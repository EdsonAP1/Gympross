import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './paginas/Landing';
import Login from './paginas/Login';
import SuperAdmin from './paginas/SuperAdmin';
import Dueno from './paginas/Dueno';
import Recepcion from './paginas/Recepcion';
import TotemPin from './paginas/TotemPin';
import PortalSeleccion from './paginas/PortalSeleccion';
import Suspendido from './paginas/Suspendido';
import Footer from './componentes/Footer';
import { ToastProvider } from './contexto/ToastContext';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-black text-white font-sans flex flex-col">
          <div className="flex-grow flex flex-col justify-center">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/portal-seleccion" element={<PortalSeleccion />} />
              <Route path="/superadmin" element={<SuperAdmin />} />
              <Route path="/dueno" element={<Dueno />} />
              <Route path="/recepcion" element={<Recepcion />} />
              <Route path="/totem" element={<TotemPin />} />
              <Route path="/suspendido" element={<Suspendido />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;

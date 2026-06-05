import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type TipoToast = 'exito' | 'error' | 'advertencia' | 'info';

interface Toast {
  id: string;
  mensaje: string;
  tipo: TipoToast;
  duracion?: number;
}

interface ToastContextType {
  mostrarToast: (mensaje: string, tipo?: TipoToast, duracion?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const mostrarToast = useCallback((mensaje: string, tipo: TipoToast = 'info', duracion: number = 4000) => {
    const id = crypto.randomUUID();
    setToasts((prevToasts) => [...prevToasts, { id, mensaje, tipo, duracion }]);

    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
    }, duracion);
  }, []);

  const eliminarToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
  };

  // Definir colores y brillos según el tipo
  const obtenerEstilosToast = (tipo: TipoToast) => {
    switch (tipo) {
      case 'exito':
        return {
          bg: 'bg-zinc-950/80 border-green-500/30 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.15)]',
          iconBg: 'bg-green-500/20 text-green-400',
          icon: '✓',
          barColor: 'bg-green-500'
        };
      case 'error':
        return {
          bg: 'bg-zinc-950/80 border-red-500/30 text-red-400 shadow-[0_0_20px_rgba(229,57,53,0.15)]',
          iconBg: 'bg-red-500/20 text-red-400',
          icon: '✗',
          barColor: 'bg-red-500'
        };
      case 'advertencia':
        return {
          bg: 'bg-zinc-950/80 border-yellow-500/30 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.15)]',
          iconBg: 'bg-yellow-500/20 text-yellow-400',
          icon: '⚠',
          barColor: 'bg-yellow-500'
        };
      case 'info':
      default:
        return {
          bg: 'bg-zinc-950/80 border-blue-500/30 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]',
          iconBg: 'bg-blue-500/20 text-blue-400',
          icon: 'ℹ',
          barColor: 'bg-blue-500'
        };
    }
  };

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      
      {/* Contenedor flotante de notificaciones en la esquina superior derecha */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const estilos = obtenerEstilosToast(toast.tipo);
          
          return (
            <div
              key={toast.id}
              className={`flex flex-col rounded-2xl border backdrop-blur-md p-4 pointer-events-auto transition-all duration-300 transform translate-y-0 scale-100 opacity-100 animate-slide-in relative overflow-hidden ${estilos.bg}`}
            >
              <div className="flex items-center gap-3">
                {/* Icono de estado */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${estilos.iconBg}`}>
                  {estilos.icon}
                </div>
                
                {/* Mensaje */}
                <div className="flex-grow text-xs font-semibold text-white leading-relaxed">
                  {toast.mensaje}
                </div>
                
                {/* Botón cerrar */}
                <button
                  onClick={() => eliminarToast(toast.id)}
                  className="text-gray-500 hover:text-gray-300 text-sm font-bold ml-2 cursor-pointer transition-colors duration-200"
                >
                  ×
                </button>
              </div>
              
              {/* Barra de progreso de tiempo restante */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
                <div 
                  className={`h-full ${estilos.barColor} animate-toast-progress`}
                  style={{ animationDuration: `${toast.duracion || 4000}ms` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

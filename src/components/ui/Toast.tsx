import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type TipoToast = 'normal' | 'error' | 'exito';
interface ToastValor { mostrar: (mensaje: string, tipo?: TipoToast) => void; }

const ToastContext = createContext<ToastValor | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ mensaje: string; tipo: TipoToast } | null>(null);

  const mostrar = useCallback((mensaje: string, tipo: TipoToast = 'normal') => {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      {toast && (
        <div className={`toast ${toast.tipo === 'error' ? 'error' : toast.tipo === 'exito' ? 'exito' : ''}`}>
          {toast.mensaje}
        </div>
      )}
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

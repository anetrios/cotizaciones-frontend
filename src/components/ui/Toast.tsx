import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
type Tipo = 'normal' | 'error' | 'exito';
const Ctx = createContext<{ mostrar: (m: string, t?: Tipo) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ m: string; t: Tipo } | null>(null);
  const mostrar = useCallback((m: string, t: Tipo = 'normal') => {
    setToast({ m, t }); setTimeout(() => setToast(null), 3500);
  }, []);
  return (
    <Ctx.Provider value={{ mostrar }}>
      {children}
      {toast && <div className={`toast ${toast.t === 'error' ? 'error' : toast.t === 'exito' ? 'exito' : ''}`}>{toast.m}</div>}
    </Ctx.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast fuera de ToastProvider');
  return c;
}

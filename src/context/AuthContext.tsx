import { createContext, useContext, useState, type ReactNode } from 'react';
import type { UsuarioSesion, Rol } from '../types';
import { authApi } from '../api/auth';

interface Valor {
  usuario: UsuarioSesion | null;
  autenticado: boolean;
  esAdmin: boolean;
  puedeEscribir: boolean;
  tieneRol: (...roles: Rol[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
const Ctx = createContext<Valor | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() => {
    const g = localStorage.getItem('usuario'); return g ? JSON.parse(g) : null;
  });
  const login = async (email: string, password: string) => {
    const { token, usuario } = await authApi.login(email, password);
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    setUsuario(usuario);
  };
  const logout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('usuario'); setUsuario(null);
  };
  const tieneRol = (...roles: Rol[]) => !!usuario && roles.includes(usuario.Rol);
  return (
    <Ctx.Provider value={{
      usuario, autenticado: !!usuario, esAdmin: usuario?.Rol === 'ADMIN',
      puedeEscribir: usuario?.Rol === 'ADMIN' || usuario?.Rol === 'VENDEDOR',
      tieneRol, login, logout,
    }}>{children}</Ctx.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fuera de AuthProvider');
  return c;
}

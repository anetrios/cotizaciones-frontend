import { createContext, useContext, useState, type ReactNode } from 'react';
import type { UsuarioSesion } from '../types';
import { authApi } from '../api/auth';

interface AuthContextValor {
  usuario: UsuarioSesion | null;
  autenticado: boolean;
  login: (usuario: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValor | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() => {
    const guardado = localStorage.getItem('usuario');
    return guardado ? JSON.parse(guardado) : null;
  });

  const login = async (clave: string, password: string) => {
    const { token, usuario } = await authApi.login(clave, password);
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    setUsuario(usuario);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, autenticado: !!usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

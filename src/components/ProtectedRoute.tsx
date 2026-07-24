import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Rol } from '../types';

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Rol[] }) {
  const { autenticado, usuario } = useAuth();
  if (!autenticado) return <Navigate to="/login" replace />;
  if (roles && usuario && !roles.includes(usuario.Rol)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

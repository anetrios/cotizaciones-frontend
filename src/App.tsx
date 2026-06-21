import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Cotizaciones } from './pages/Cotizaciones';
import { NuevaCotizacion } from './pages/NuevaCotizacion';
import { CotizacionDetalle } from './pages/CotizacionDetalle';
import { Clientes } from './pages/Clientes';
import { Articulos } from './pages/Articulos';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/cotizaciones" element={<ProtectedRoute><Cotizaciones /></ProtectedRoute>} />
            <Route path="/cotizaciones/nueva" element={<ProtectedRoute><NuevaCotizacion /></ProtectedRoute>} />
            <Route path="/cotizaciones/:id" element={<ProtectedRoute><CotizacionDetalle /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/articulos" element={<ProtectedRoute><Articulos /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

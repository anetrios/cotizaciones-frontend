import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminCRUD } from './components/AdminCRUD';
import {
  CFG_CLIENTES, CFG_ART_RENTA, CFG_ART_VENTA, CFG_SERVICIOS, CFG_UNIDADES, CFG_USUARIOS,
} from './config/recursos';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cotizaciones from './pages/Cotizaciones';
import MisCotizaciones from './pages/MisCotizaciones';
import NuevaCotizacion from './pages/NuevaCotizacion';
import CotizacionDetalle from './pages/CotizacionDetalle';
import Existencias from './pages/Existencias';
import Sucursales from './pages/Sucursales';
import ClienteDetalle from './pages/ClienteDetalle';
import Incidencias from './pages/Incidencias';
import RevisionClientes from './pages/RevisionClientes';
import Configuracion from './pages/Configuracion';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            {/* Cotizaciones */}
            <Route path="/cotizaciones" element={<ProtectedRoute><Cotizaciones /></ProtectedRoute>} />
            <Route path="/mis-cotizaciones" element={<ProtectedRoute><MisCotizaciones /></ProtectedRoute>} />
            <Route path="/cotizaciones/nueva" element={
              <ProtectedRoute roles={['ADMIN', 'VENDEDOR']}><NuevaCotizacion /></ProtectedRoute>
            } />
            <Route path="/cotizaciones/:id/editar" element={
              <ProtectedRoute roles={['ADMIN', 'VENDEDOR']}><NuevaCotizacion /></ProtectedRoute>
            } />
            <Route path="/cotizaciones/:id" element={<ProtectedRoute><CotizacionDetalle /></ProtectedRoute>} />

            {/* Catálogos */}
            <Route path="/clientes" element={<ProtectedRoute><AdminCRUD config={CFG_CLIENTES} /></ProtectedRoute>} />
            <Route path="/clientes/:id" element={<ProtectedRoute><ClienteDetalle /></ProtectedRoute>} />
            <Route path="/incidencias" element={<ProtectedRoute><Incidencias /></ProtectedRoute>} />
            <Route path="/articulos-renta" element={<ProtectedRoute><AdminCRUD config={CFG_ART_RENTA} /></ProtectedRoute>} />
            <Route path="/articulos-venta" element={<ProtectedRoute><AdminCRUD config={CFG_ART_VENTA} /></ProtectedRoute>} />
            <Route path="/servicios" element={<ProtectedRoute><AdminCRUD config={CFG_SERVICIOS} /></ProtectedRoute>} />

            {/* Inventario */}
            <Route path="/unidades" element={<ProtectedRoute><AdminCRUD config={CFG_UNIDADES} /></ProtectedRoute>} />
            <Route path="/existencias" element={<ProtectedRoute><Existencias /></ProtectedRoute>} />

            {/* Administración (solo ADMIN) */}
            <Route path="/usuarios" element={
              <ProtectedRoute roles={['ADMIN']}><AdminCRUD config={CFG_USUARIOS} /></ProtectedRoute>
            } />
            <Route path="/sucursales" element={
              <ProtectedRoute roles={['ADMIN']}><Sucursales /></ProtectedRoute>
            } />
            <Route path="/revision" element={
              <ProtectedRoute roles={['ADMIN']}><RevisionClientes /></ProtectedRoute>
            } />
            <Route path="/configuracion" element={
              <ProtectedRoute roles={['ADMIN']}><Configuracion /></ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Spinner, Vacio, BadgeEstatus, BadgeTipo, moneda, fecha } from '../components/ui/UI';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { cotizacionesApi } from '../api/cotizaciones';
import { mensajeError } from '../api/client';
import type { CotizacionResumen } from '../types';

export default function Cotizaciones() {
  const [filas, setFilas] = useState<CotizacionResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [folio, setFolio] = useState('');
  const [estatus, setEstatus] = useState('');
  const [tipo, setTipo] = useState('');
  const { mostrar } = useToast();
  const { puedeEscribir } = useAuth();
  const navigate = useNavigate();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { datos } = await cotizacionesApi.listar({ folio, estatus, tipo });
      setFilas(datos);
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setCargando(false); }
  }, [folio, estatus, tipo, mostrar]);

  useEffect(() => { const t = setTimeout(cargar, 300); return () => clearTimeout(t); }, [cargar]);

  return (
    <Layout titulo="Cotizaciones" acciones={
      puedeEscribir && <button className="btn btn-primario" onClick={() => navigate('/cotizaciones/nueva')}>+ Nueva cotización</button>
    }>
      <div className="flex gap-12 wrap" style={{ marginBottom: 16 }}>
        <input className="input" style={{ maxWidth: 220 }} placeholder="Buscar folio…" value={folio} onChange={(e) => setFolio(e.target.value)} />
        <select className="select" style={{ maxWidth: 180 }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="RENTA">Renta</option>
          <option value="VENTA">Venta</option>
        </select>
        <select className="select" style={{ maxWidth: 180 }} value={estatus} onChange={(e) => setEstatus(e.target.value)}>
          <option value="">Todos los estatus</option>
          <option value="BORRADOR">Borrador</option>
          <option value="ENVIADA">Enviada</option>
          <option value="APROBADA">Aprobada</option>
          <option value="RECHAZADA">Rechazada</option>
          <option value="VENCIDA">Vencida</option>
        </select>
      </div>

      <div className="card">
        {cargando ? <Spinner /> : filas.length === 0 ? (
          <Vacio titulo="Sin cotizaciones">Crea la primera con “+ Nueva cotización”.</Vacio>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Folio</th><th>Tipo</th><th>Cliente</th><th>Fecha</th>
                  <th>Estatus</th><th className="der">Total</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((c) => (
                  <tr key={c.IdCotizacion} className="clic" onClick={() => navigate(`/cotizaciones/${c.IdCotizacion}`)}>
                    <td style={{ fontFamily: 'var(--display)', fontWeight: 700 }}>{c.Folio}</td>
                    <td><BadgeTipo t={c.Tipo} /></td>
                    <td>{c.Cliente}</td>
                    <td>{fecha(c.Fecha)}</td>
                    <td><BadgeEstatus e={c.Estatus} /></td>
                    <td className="der num" style={{ fontWeight: 600 }}>{moneda(c.Total, c.Moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

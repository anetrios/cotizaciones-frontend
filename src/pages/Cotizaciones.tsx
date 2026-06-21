import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Spinner, Vacio, BadgeEstatus, BadgeTipo, moneda, fecha } from '../components/ui/UI';
import { cotizacionesApi, type FiltrosCotizacion } from '../api/cotizaciones';
import { mensajeError } from '../api/client';
import type { CotizacionResumen, EstatusCotizacion } from '../types';
import './paginas.css';

const POR_PAGINA = 20;

export function Cotizaciones() {
  const navigate = useNavigate();
  const [lista, setLista] = useState<CotizacionResumen[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [folio, setFolio] = useState('');
  const [estatus, setEstatus] = useState<EstatusCotizacion | ''>('');
  const [tipo, setTipo] = useState<'R' | 'V' | ''>('');

  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try {
      const filtros: FiltrosCotizacion = {
        pagina, porPagina: POR_PAGINA,
        Folio: folio || undefined, Estatus: estatus || undefined, Tipo: tipo || undefined,
      };
      const res = await cotizacionesApi.listar(filtros);
      setLista(res.datos); setTotal(res.total);
    } catch (e) { setError(mensajeError(e)); }
    finally { setCargando(false); }
  }, [pagina, folio, estatus, tipo]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const acciones = (
    <button className="btn btn-primario" onClick={() => navigate('/cotizaciones/nueva')}>+ Nueva cotización</button>
  );

  return (
    <Layout titulo="Cotizaciones" acciones={acciones}>
      <div className="card mt-8">
        <div className="card-cuerpo">
          <div className="filtros">
            <input className="input" placeholder="Buscar por folio…" value={folio}
              onChange={(e) => { setPagina(1); setFolio(e.target.value); }} />
            <select className="select" value={estatus} onChange={(e) => { setPagina(1); setEstatus(e.target.value as EstatusCotizacion | ''); }}>
              <option value="">Todos los estatus</option>
              <option value="P">Pendiente</option><option value="A">Aprobada</option>
              <option value="R">Rechazada</option><option value="V">Vencida</option>
            </select>
            <select className="select" value={tipo} onChange={(e) => { setPagina(1); setTipo(e.target.value as 'R' | 'V' | ''); }}>
              <option value="">Renta y venta</option>
              <option value="R">Solo renta</option><option value="V">Solo venta</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card mt-16">
        {cargando ? <Spinner /> : error ? (
          <div className="login-error" style={{ margin: 20 }}>{error}</div>
        ) : lista.length === 0 ? (
          <Vacio titulo="No hay cotizaciones">Crea la primera con «Nueva cotización».</Vacio>
        ) : (
          <table className="tabla">
            <thead><tr>
              <th>Folio</th><th>Tipo</th><th>Cliente</th><th>Fecha</th><th>Vigencia</th><th>Estatus</th><th className="der">Total</th>
            </tr></thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.IdCotizacion} onClick={() => navigate(`/cotizaciones/${c.IdCotizacion}`)}>
                  <td><strong>{c.Folio}</strong></td>
                  <td><BadgeTipo tipo={c.Tipo} /></td>
                  <td>{c.Cliente || '—'}</td>
                  <td className="num">{fecha(c.FechaHora)}</td>
                  <td className="num">{fecha(c.FechaVigencia)}</td>
                  <td><BadgeEstatus estatus={c.Estatus} /></td>
                  <td className="der num"><strong>{moneda(c.Total)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!cargando && lista.length > 0 && (
        <div className="paginacion">
          <span className="texto-suave">{total} cotización(es)</span>
          <div className="flex gap-8 items-center">
            <button className="btn btn-secundario btn-sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
            <span className="texto-medio">Página {pagina} de {totalPaginas}</span>
            <button className="btn btn-secundario btn-sm" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Siguiente</button>
          </div>
        </div>
      )}
    </Layout>
  );
}

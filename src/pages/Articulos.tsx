import { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Spinner, Vacio, moneda } from '../components/ui/UI';
import { articulosApi } from '../api/articulos';
import { mensajeError } from '../api/client';
import type { Articulo } from '../types';
import './paginas.css';

export function Articulos() {
  const [lista, setLista] = useState<Articulo[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setLista(await articulosApi.listar(busqueda || undefined)); }
    catch (e) { setError(mensajeError(e)); }
    finally { setCargando(false); }
  }, [busqueda]);

  useEffect(() => { const t = setTimeout(cargar, 300); return () => clearTimeout(t); }, [cargar]);

  return (
    <Layout titulo="Catálogo de equipo">
      <div className="card mt-8"><div className="card-cuerpo">
        <input className="input" placeholder="Buscar equipo por descripción o código…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div></div>
      <div className="card mt-16">
        {cargando ? <Spinner /> : error ? (<div className="login-error" style={{ margin: 20 }}>{error}</div>
        ) : lista.length === 0 ? (<Vacio titulo="Sin resultados">Ajusta la búsqueda.</Vacio>
        ) : (
          <table className="tabla">
            <thead><tr><th>Código</th><th>Descripción</th><th className="der">Venta</th><th className="der">T. Diaria</th><th className="der">T. Semanal</th><th className="der">T. Mensual</th></tr></thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.IdArticulo} className="no-hover" style={{ cursor: 'default' }}>
                  <td>{a.Codigo || '—'}</td>
                  <td><strong>{a.Descripcion}</strong></td>
                  <td className="der num">{moneda(a.PrecioDeVenta)}</td>
                  <td className="der num">{moneda(a.TarifaDiaria)}</td>
                  <td className="der num">{moneda(a.TarifaSemanal)}</td>
                  <td className="der num">{moneda(a.TarifaMensual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

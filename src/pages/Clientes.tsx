import { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Spinner, Vacio } from '../components/ui/UI';
import { clientesApi } from '../api/clientes';
import { mensajeError } from '../api/client';
import type { Cliente } from '../types';
import './paginas.css';

export function Clientes() {
  const [lista, setLista] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setLista(await clientesApi.listar(busqueda || undefined)); }
    catch (e) { setError(mensajeError(e)); }
    finally { setCargando(false); }
  }, [busqueda]);

  useEffect(() => { const t = setTimeout(cargar, 300); return () => clearTimeout(t); }, [cargar]);

  return (
    <Layout titulo="Clientes">
      <div className="card mt-8"><div className="card-cuerpo">
        <input className="input" placeholder="Buscar cliente por nombre o clave…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div></div>
      <div className="card mt-16">
        {cargando ? <Spinner /> : error ? (<div className="login-error" style={{ margin: 20 }}>{error}</div>
        ) : lista.length === 0 ? (<Vacio titulo="Sin resultados">Ajusta la búsqueda.</Vacio>
        ) : (
          <table className="tabla">
            <thead><tr><th>Clave</th><th>Nombre comercial</th><th>Contacto</th><th>Teléfono</th><th>Permisos</th></tr></thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.IdCliente} className="no-hover" style={{ cursor: 'default' }}>
                  <td className="num">{c.ClaveCliente ?? '—'}</td>
                  <td><strong>{c.NombreComercial}</strong></td>
                  <td>{c.Contacto || '—'}</td>
                  <td className="num">{c.Telefono || '—'}</td>
                  <td><div className="flex gap-8">
                    {c.PermisoRentas && <span className="badge-tipo R">Renta</span>}
                    {c.PermisoVentas && <span className="badge-tipo V">Venta</span>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

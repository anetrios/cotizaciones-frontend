import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Spinner, Vacio, BadgeEstatus, BadgeTipo, moneda, fecha } from '../components/ui/UI';
import { Paginador } from '../components/ui/Paginador';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { cotizacionesApi } from '../api/cotizaciones';
import { metaApi } from '../api/meta';
import { mensajeError } from '../api/client';
import { ETIQUETA_ESTATUS } from '../types';
import type { CotizacionResumen } from '../types';

const POR_PAGINA = 20;

export default function Cotizaciones() {
  const [filas, setFilas] = useState<CotizacionResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [folio, setFolio] = useState('');
  const [estatus, setEstatus] = useState('');
  const [tipo, setTipo] = useState('');
  const [idUsuario, setIdUsuario] = useState('');
  const [usuarios, setUsuarios] = useState<Array<{ IdUsuario: number; Nombre: string }>>([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [exportando, setExportando] = useState(false);
  const { mostrar } = useToast();
  const { puedeEscribir } = useAuth();
  const navigate = useNavigate();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { datos, total } = await cotizacionesApi.listar({ folio, estatus, tipo, usuario: idUsuario, pagina, porPagina: POR_PAGINA });
      setFilas(datos); setTotal(total);
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setCargando(false); }
  }, [folio, estatus, tipo, idUsuario, pagina, mostrar]);

  useEffect(() => { metaApi.usuarios().then(setUsuarios).catch((e) => mostrar(mensajeError(e), 'error')); }, [mostrar]);
  useEffect(() => { setPagina(1); }, [folio, estatus, tipo, idUsuario]);
  useEffect(() => { const t = setTimeout(cargar, 300); return () => clearTimeout(t); }, [cargar]);

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const { datos } = await cotizacionesApi.listar({ folio, estatus, tipo, usuario: idUsuario, pagina: 1, porPagina: 100000 });
      const XLSX = await import('xlsx');
      const filas = datos.map((c) => ({
        Folio: c.Folio,
        Tipo: c.Tipo === 'RENTA' ? 'Renta' : 'Venta',
        Cliente: c.Cliente,
        'Hecha por': c.Usuario,
        Sucursal: c.Sucursal,
        Fecha: fecha(c.Fecha),
        Estatus: ETIQUETA_ESTATUS[c.Estatus],
        Moneda: c.Moneda,
        Total: c.Total,
      }));
      const hoja = XLSX.utils.json_to_sheet(filas);
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, 'Cotizaciones');
      const hoy = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(libro, `cotizaciones_${hoy}.xlsx`);
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setExportando(false); }
  };

  return (
    <Layout titulo="Cotizaciones" acciones={
      <div className="flex gap-8 wrap">
        <button className="btn btn-secundario" onClick={exportarExcel} disabled={exportando}>
          {exportando ? 'Exportando…' : 'Exportar a Excel'}
        </button>
        {puedeEscribir && <button className="btn btn-primario" onClick={() => navigate('/cotizaciones/nueva')}>+ Nueva cotización</button>}
      </div>
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
          <option value="PENDIENTE">Pendiente de respuesta</option>
          <option value="CONCRETADA">Concretada</option>
          <option value="NO_CONCRETADA">No concretada</option>
        </select>
        <select className="select" style={{ maxWidth: 200 }} value={idUsuario} onChange={(e) => setIdUsuario(e.target.value)}>
          <option value="">Todas las personas</option>
          {usuarios.map((u) => <option key={u.IdUsuario} value={u.IdUsuario}>{u.Nombre}</option>)}
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
                  <th>Folio</th><th>Tipo</th><th>Cliente</th><th>Hecha por</th><th>Fecha</th>
                  <th>Estatus</th><th className="der">Total</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((c) => (
                  <tr key={c.IdCotizacion} className="clic"
                    onClick={() => navigate(`/cotizaciones/${c.IdCotizacion}`, { state: { from: '/cotizaciones' } })}
                  >
                    <td style={{ fontFamily: 'var(--display)', fontWeight: 700 }}>{c.Folio}</td>
                    <td><BadgeTipo t={c.Tipo} /></td>
                    <td>{c.Cliente}</td>
                    <td>
                      <div>{c.Usuario}</div>
                      {c.UsuarioEmail && <div className="texto-suave" style={{ fontSize: 12 }}>{c.UsuarioEmail}</div>}
                    </td>
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
      <Paginador pagina={pagina} total={total} porPagina={POR_PAGINA} onCambiar={setPagina} />
    </Layout>
  );
}

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Spinner, Vacio, BadgeEstatus, BadgeTipo, moneda, fecha, hoyISO } from '../components/ui/UI';
import { Paginador } from '../components/ui/Paginador';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { cotizacionesApi } from '../api/cotizaciones';
import { metaApi } from '../api/meta';
import { mensajeError } from '../api/client';
import { ETIQUETA_ESTATUS } from '../types';
import type { CotizacionResumen } from '../types';

const POR_PAGINA = 20;

type CampoOrden = 'Folio' | 'Tipo' | 'Cliente' | 'Usuario' | 'Fecha' | 'Estatus' | 'Total';
type Orden = { campo: CampoOrden; dir: 'asc' | 'desc' };

/**
 * El orden lo aplica el servidor: la tabla va paginada y ordenar aquí solo
 * acomodaría las 20 filas visibles. Al elegir una columna nueva, los textos
 * empiezan de la A a la Z y el folio, la fecha y el total del mayor al menor.
 */
const COLUMNAS: Array<{ campo: CampoOrden; etiqueta: string; dirInicial: Orden['dir']; der?: boolean }> = [
  { campo: 'Folio', etiqueta: 'Folio', dirInicial: 'desc' },
  { campo: 'Tipo', etiqueta: 'Tipo', dirInicial: 'asc' },
  { campo: 'Cliente', etiqueta: 'Cliente', dirInicial: 'asc' },
  { campo: 'Usuario', etiqueta: 'Hecha por', dirInicial: 'asc' },
  { campo: 'Fecha', etiqueta: 'Fecha', dirInicial: 'desc' },
  { campo: 'Estatus', etiqueta: 'Estatus', dirInicial: 'asc' },
  { campo: 'Total', etiqueta: 'Total', dirInicial: 'desc', der: true },
];

export default function Cotizaciones() {
  const [filas, setFilas] = useState<CotizacionResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [folio, setFolio] = useState('');
  const [estatus, setEstatus] = useState('');
  const [tipo, setTipo] = useState('');
  const [idUsuario, setIdUsuario] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [orden, setOrden] = useState<Orden>({ campo: 'Folio', dir: 'desc' });
  const [usuarios, setUsuarios] = useState<Array<{ IdUsuario: number; Nombre: string }>>([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [exportando, setExportando] = useState(false);
  const { mostrar } = useToast();
  const { puedeEscribir } = useAuth();
  const navigate = useNavigate();

  // Los mismos filtros para la tabla y para el Excel: lo exportado es lo que se ve.
  const filtros = useMemo(() => ({
    folio, estatus, tipo, usuario: idUsuario, fechaDesde, fechaHasta, orden: orden.campo, dir: orden.dir,
  }), [folio, estatus, tipo, idUsuario, fechaDesde, fechaHasta, orden]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { datos, total } = await cotizacionesApi.listar({ ...filtros, pagina, porPagina: POR_PAGINA });
      setFilas(datos); setTotal(total);
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setCargando(false); }
  }, [filtros, pagina, mostrar]);

  useEffect(() => { metaApi.usuarios().then(setUsuarios).catch((e) => mostrar(mensajeError(e), 'error')); }, [mostrar]);
  useEffect(() => { setPagina(1); }, [filtros]);
  useEffect(() => { const t = setTimeout(cargar, 300); return () => clearTimeout(t); }, [cargar]);

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const { datos } = await cotizacionesApi.listar({ ...filtros, pagina: 1, porPagina: 100000 });
      const XLSX = await import('xlsx');
      const filas = datos.map((c) => ({
        Folio: c.Folio,
        Tipo: c.Tipo === 'RENTA' ? 'Renta' : 'Venta',
        Cliente: c.Cliente,
        'Hecha por': c.Usuario,
        Sucursal: c.Sucursal,
        Fecha: fecha(c.Fecha),
        Estatus: ETIQUETA_ESTATUS[c.Estatus],
        'Concretada por': c.ConcretadaPor ?? '',
        Moneda: c.Moneda,
        Total: c.Total,
      }));
      const hoja = XLSX.utils.json_to_sheet(filas);
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, 'Cotizaciones');
      const hoy = hoyISO();
      XLSX.writeFile(libro, `cotizaciones_${hoy}.xlsx`);
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setExportando(false); }
  };

  const cambiarOrden = (campo: CampoOrden, dirInicial: Orden['dir']) => {
    setOrden((o) => (o.campo === campo ? { campo, dir: o.dir === 'desc' ? 'asc' : 'desc' } : { campo, dir: dirInicial }));
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
        {/* Desde y Hasta van juntos: si la fila se parte, se van los dos al siguiente renglón. */}
        <div className="flex gap-12 wrap items-center">
          <label className="flex items-center gap-8 texto-suave" style={{ fontSize: 13 }}>
            Desde
            <input className="input" type="date" aria-label="Fecha desde" style={{ maxWidth: 160 }}
              value={fechaDesde} max={fechaHasta || undefined} onChange={(e) => setFechaDesde(e.target.value)} />
          </label>
          <label className="flex items-center gap-8 texto-suave" style={{ fontSize: 13 }}>
            Hasta
            <input className="input" type="date" aria-label="Fecha hasta" style={{ maxWidth: 160 }}
              value={fechaHasta} min={fechaDesde || undefined} onChange={(e) => setFechaHasta(e.target.value)} />
          </label>
          {(fechaDesde || fechaHasta) && (
            <button className="btn btn-fantasma btn-sm" onClick={() => { setFechaDesde(''); setFechaHasta(''); }}>
              Quitar fechas
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {cargando ? <Spinner /> : filas.length === 0 ? (
          <Vacio titulo="Sin cotizaciones">Crea la primera con “+ Nueva cotización”.</Vacio>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tabla">
              <thead>
                <tr>
                  {COLUMNAS.map((c) => (
                    <th key={c.campo} className={c.der ? 'orden der' : 'orden'}
                      aria-sort={orden.campo === c.campo ? (orden.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      onClick={() => cambiarOrden(c.campo, c.dirInicial)}>
                      {c.etiqueta} {orden.campo === c.campo ? (orden.dir === 'desc' ? '▼' : '▲') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((c) => (
                  <tr key={c.IdCotizacion} className="clic"
                    onClick={() => navigate(`/cotizaciones/${c.IdCotizacion}`, { state: { from: '/cotizaciones' } })}
                  >
                    <td style={{ fontFamily: 'var(--display)', fontWeight: 700, whiteSpace: 'nowrap' }}>{c.Folio}</td>
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

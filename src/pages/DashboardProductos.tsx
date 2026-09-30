import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { Spinner, Vacio, BadgeTipo, moneda } from '../components/ui/UI';
import { Paginador } from '../components/ui/Paginador';
import { useToast } from '../components/ui/Toast';
import { cotizacionesApi } from '../api/cotizaciones';
import { mensajeError } from '../api/client';
import { calcularRango, type ModoFecha } from './Dashboard';
import type { FamiliaDashboard, ProductoDashboard, TipoCotizacion } from '../types';
import './DashboardProductos.css';

const TOP = 10;
const POR_PAGINA = 25;

type Vista = 'familia' | 'producto';
type CampoOrden = 'Cotizaciones' | 'Concretadas' | 'PctConversion' | 'Cantidad' | 'CantidadConcretada' | 'Importe' | 'ImporteConcretado';

/** Una fila de rankings y tabla: un producto o una familia, con la misma forma. */
interface Fila {
  clave: string;
  Tipo: TipoCotizacion;
  Nombre: string;
  Codigo: string | null;
  /** Chip junto al nombre: "Servicio", "Manual" o cuántos productos junta la familia. */
  Etiqueta: string | null;
  EsServicio: boolean;
  Familia: string;
  Cotizaciones: number; Concretadas: number; PctConversion: number;
  Cantidad: number; CantidadConcretada: number;
  Importe: number; ImporteConcretado: number;
}

const COLUMNAS: Array<{ campo: CampoOrden; etiqueta: string; formato: 'num' | 'moneda' | 'porcentaje' }> = [
  { campo: 'Cotizaciones', etiqueta: 'Cotizado en', formato: 'num' },
  { campo: 'Concretadas', etiqueta: 'Concretado en', formato: 'num' },
  { campo: 'PctConversion', etiqueta: '% conversión', formato: 'porcentaje' },
  { campo: 'Cantidad', etiqueta: 'Piezas cotizadas', formato: 'num' },
  { campo: 'CantidadConcretada', etiqueta: 'Piezas concretadas', formato: 'num' },
  { campo: 'Importe', etiqueta: 'Importe cotizado', formato: 'moneda' },
  { campo: 'ImporteConcretado', etiqueta: 'Importe concretado', formato: 'moneda' },
];

const ETIQUETA_ORIGEN: Record<ProductoDashboard['Origen'], string | null> = {
  RENTA: null, VENTA: null, SERVICIO: 'Servicio', MANUAL: 'Manual',
};

/** "MUELLE" → "Muelle". La familia llega en mayúsculas porque así se agrupó. */
export function nombreFamilia(f: string) {
  return f.charAt(0) + f.slice(1).toLowerCase();
}

function conversion(concretadas: number, cotizaciones: number) {
  return cotizaciones > 0 ? (concretadas / cotizaciones) * 100 : 0;
}

function desdeProducto(p: ProductoDashboard): Fila {
  return {
    // La misma llave con la que agrupó el servidor: normalizar aquí otra vez podría no coincidir.
    clave: `${p.Tipo}|${p.Origen}|${p.IdCatalogo ?? p.ClaveManual}`,
    Tipo: p.Tipo, Nombre: p.Descripcion, Codigo: p.Codigo, Etiqueta: ETIQUETA_ORIGEN[p.Origen],
    EsServicio: p.Origen === 'SERVICIO', Familia: p.Familia,
    Cotizaciones: p.Cotizaciones, Concretadas: p.Concretadas, PctConversion: conversion(p.Concretadas, p.Cotizaciones),
    Cantidad: p.Cantidad, CantidadConcretada: p.CantidadConcretada, Importe: p.Importe, ImporteConcretado: p.ImporteConcretado,
  };
}

function desdeFamilia(f: FamiliaDashboard): Fila {
  return {
    clave: `${f.Tipo}|${f.Familia}`,
    Tipo: f.Tipo, Nombre: nombreFamilia(f.Familia), Codigo: null,
    Etiqueta: `${f.Variantes} ${f.Variantes === 1 ? 'producto' : 'productos'}`,
    EsServicio: f.TieneServicio === 1, Familia: f.Familia,
    Cotizaciones: f.Cotizaciones, Concretadas: f.Concretadas, PctConversion: conversion(f.Concretadas, f.Cotizaciones),
    Cantidad: f.Cantidad, CantidadConcretada: f.CantidadConcretada, Importe: f.Importe, ImporteConcretado: f.ImporteConcretado,
  };
}

function formatear(v: number, formato: 'num' | 'moneda' | 'porcentaje') {
  if (formato === 'moneda') return moneda(v);
  if (formato === 'porcentaje') return `${v.toFixed(0)}%`;
  return v.toLocaleString('es-MX');
}

function Nombre({ f }: { f: Fila }) {
  return (
    <span className="dp-nombre">
      <span className="dp-nombre-texto" title={f.Nombre}>{f.Nombre}</span>
      {f.Codigo && <span className="texto-suave dp-codigo">{f.Codigo}</span>}
      {f.Etiqueta && <span className="chip">{f.Etiqueta}</span>}
    </span>
  );
}

/**
 * Un top como lista con barra proporcional, no como gráfica: los nombres miden
 * hasta 200 caracteres y en un eje se recortarían. El número va escrito junto a
 * la barra, así que la barra solo ayuda a comparar de un vistazo.
 */
function Ranking({ titulo, subtitulo, filas, valor, detalle, onElegir }: {
  titulo: string; subtitulo: string; filas: Fila[];
  valor: (f: Fila) => number; detalle: (f: Fila) => string;
  onElegir?: (f: Fila) => void;
}) {
  const maximo = Math.max(1, ...filas.map(valor));
  return (
    <section className="card card-cuerpo" aria-label={titulo}>
      <h3 className="dp-titulo">{titulo}</h3>
      <p className="texto-suave dp-subtitulo">{subtitulo}</p>
      {filas.length ? (
        <ol className="dp-rank">
          {filas.map((f, i) => (
            <li key={f.clave} className={onElegir ? 'dp-rank-item clic' : 'dp-rank-item'}
              onClick={onElegir ? () => onElegir(f) : undefined}
              title={`${f.Nombre}\nCotizado en ${f.Cotizaciones} · concretado en ${f.Concretadas} · ${f.Cantidad.toLocaleString('es-MX')} piezas · ${moneda(f.Importe)}`}>
              <span className="dp-rank-pos">{i + 1}</span>
              <div className="dp-rank-cuerpo">
                <div className="flex items-center justify-between gap-12">
                  <Nombre f={f} />
                  <span className="dp-rank-valor num">{valor(f).toLocaleString('es-MX')}</span>
                </div>
                <div className="dp-barra"><div className="dp-barra-relleno" style={{ width: `${(valor(f) / maximo) * 100}%` }} /></div>
                <div className="texto-suave dp-rank-detalle">{detalle(f)}</div>
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="texto-suave">Sin datos en el periodo.</p>}
    </section>
  );
}

export default function DashboardProductos() {
  const [productos, setProductos] = useState<ProductoDashboard[] | null>(null);
  const [familias, setFamilias] = useState<FamiliaDashboard[] | null>(null);
  const [modo, setModo] = useState<ModoFecha>('mes');
  const [rangoInicio, setRangoInicio] = useState('');
  const [rangoFin, setRangoFin] = useState('');
  const [tipo, setTipo] = useState<TipoCotizacion | ''>('');
  // Entra por familia (en pantalla, "Grupo"): la vista para saber qué se mueve sin entrar al detalle de cada variante.
  const [vista, setVista] = useState<Vista>('familia');
  const [familiaElegida, setFamiliaElegida] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<{ campo: CampoOrden; dir: 'asc' | 'desc' }>({ campo: 'Cotizaciones', dir: 'desc' });
  const [pagina, setPagina] = useState(1);
  const { mostrar } = useToast();

  useEffect(() => {
    setProductos(null); setFamilias(null);
    const rango = calcularRango(modo, rangoInicio, rangoFin);
    Promise.all([cotizacionesApi.dashboardProductos(rango), cotizacionesApi.dashboardFamilias(rango)])
      .then(([p, f]) => { setProductos(p); setFamilias(f); })
      .catch((e) => { mostrar(mensajeError(e), 'error'); setProductos([]); setFamilias([]); });
  }, [modo, rangoInicio, rangoFin, mostrar]);

  useEffect(() => { setPagina(1); }, [modo, rangoInicio, rangoFin, tipo, vista, familiaElegida, busqueda, orden]);

  const filas: Fila[] = useMemo(() => {
    const base = vista === 'familia'
      ? (familias ?? []).map(desdeFamilia)
      : (productos ?? []).filter((p) => !familiaElegida || p.Familia === familiaElegida).map(desdeProducto);
    return base.filter((f) => !tipo || f.Tipo === tipo);
  }, [vista, familias, productos, familiaElegida, tipo]);

  const tops = useMemo(() => {
    const ordenarPor = (lista: Fila[], campo: CampoOrden, desempate: CampoOrden) =>
      [...lista].sort((a, b) => b[campo] - a[campo] || b[desempate] - a[desempate]).slice(0, TOP);
    const concretados = filas.filter((f) => f.Concretadas > 0);
    return {
      cotizados: ordenarPor(filas, 'Cotizaciones', 'Importe'),
      concretados: ordenarPor(concretados, 'Concretadas', 'ImporteConcretado'),
      // Los servicios (flete, montaje…) viajan en cotizaciones de renta, pero no son algo que se rente.
      rentados: ordenarPor(concretados.filter((f) => f.Tipo === 'RENTA' && !f.EsServicio), 'Concretadas', 'CantidadConcretada'),
      vendidos: ordenarPor(concretados.filter((f) => f.Tipo === 'VENTA'), 'Concretadas', 'CantidadConcretada'),
    };
  }, [filas]);

  const tabla = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    return filas
      .filter((f) => !b || f.Nombre.toLowerCase().includes(b) || (f.Codigo ?? '').toLowerCase().includes(b))
      .sort((a, c) => (orden.dir === 'desc' ? 1 : -1) * (c[orden.campo] - a[orden.campo]));
  }, [filas, busqueda, orden]);

  const cambiarOrden = (campo: CampoOrden) => {
    setOrden((o) => (o.campo === campo ? { campo, dir: o.dir === 'desc' ? 'asc' : 'desc' } : { campo, dir: 'desc' }));
  };
  const cambiarVista = (v: Vista) => { setVista(v); setFamiliaElegida(null); setBusqueda(''); };
  /** Clic en una familia: sus productos, con los mismos tops y tabla. */
  const verFamilia = (f: Fila) => { setVista('producto'); setFamiliaElegida(f.Familia); setBusqueda(''); };
  const elegirFamilia = vista === 'familia' ? verFamilia : undefined;

  const porFamilia = vista === 'familia';
  const kpis = [
    { etq: porFamilia ? 'Grupos cotizados' : 'Productos cotizados', val: filas.length.toLocaleString('es-MX') },
    { etq: porFamilia ? 'Grupos concretados' : 'Productos concretados', val: filas.filter((f) => f.Concretadas > 0).length.toLocaleString('es-MX') },
    { etq: 'Importe cotizado (sin IVA)', val: moneda(filas.reduce((a, f) => a + f.Importe, 0)) },
    { etq: 'Importe concretado (sin IVA)', val: moneda(filas.reduce((a, f) => a + f.ImporteConcretado, 0)) },
  ];

  const detalleConcretado = (f: Fila) =>
    `${f.CantidadConcretada.toLocaleString('es-MX')} piezas · ${moneda(f.ImporteConcretado)}`;

  return (
    <Layout titulo="Dashboard de productos">
      <div className="flex gap-8 wrap items-center" style={{ marginBottom: 12 }}>
        <button className={`btn btn-sm ${modo === 'semana' ? 'btn-primario' : 'btn-secundario'}`} onClick={() => setModo('semana')}>Esta semana</button>
        <button className={`btn btn-sm ${modo === 'mes' ? 'btn-primario' : 'btn-secundario'}`} onClick={() => setModo('mes')}>Este mes</button>
        <button className={`btn btn-sm ${modo === 'rango' ? 'btn-primario' : 'btn-secundario'}`} onClick={() => setModo('rango')}>Rango personalizado</button>
        {modo === 'rango' && (
          <>
            <input className="input" type="date" aria-label="Fecha desde" style={{ maxWidth: 160 }}
              value={rangoInicio} max={rangoFin || undefined} onChange={(e) => setRangoInicio(e.target.value)} />
            <input className="input" type="date" aria-label="Fecha hasta" style={{ maxWidth: 160 }}
              value={rangoFin} min={rangoInicio || undefined} onChange={(e) => setRangoFin(e.target.value)} />
          </>
        )}
        <select className="select" style={{ maxWidth: 180, marginLeft: 'auto' }} aria-label="Tipo"
          value={tipo} onChange={(e) => setTipo(e.target.value as TipoCotizacion | '')}>
          <option value="">Renta y venta</option>
          <option value="RENTA">Solo renta</option>
          <option value="VENTA">Solo venta</option>
        </select>
      </div>

      <div className="flex gap-8 wrap items-center" style={{ marginBottom: 16 }}>
        <span className="texto-suave" style={{ fontSize: 13 }}>Ver por:</span>
        <button className={`btn btn-sm ${vista === 'familia' ? 'btn-primario' : 'btn-secundario'}`}
          aria-pressed={vista === 'familia'} onClick={() => cambiarVista('familia')}>Grupo</button>
        <button className={`btn btn-sm ${vista === 'producto' && !familiaElegida ? 'btn-primario' : 'btn-secundario'}`}
          aria-pressed={vista === 'producto' && !familiaElegida} onClick={() => cambiarVista('producto')}>Producto</button>
        {familiaElegida && (
          <span className="chip dp-filtro">
            Grupo: {nombreFamilia(familiaElegida)}
            <button className="dp-filtro-quitar" aria-label="Quitar grupo" onClick={() => cambiarVista('familia')}>✕</button>
          </span>
        )}
        {vista === 'familia' && (
          <span className="texto-suave" style={{ fontSize: 12 }}>Da clic en un grupo para ver sus productos.</span>
        )}
      </div>

      {!productos || !familias ? <Spinner /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
            {kpis.map((k) => (
              <div key={k.etq} className="card card-cuerpo">
                <div className="texto-suave" style={{ fontSize: 13, marginBottom: 6 }}>{k.etq}</div>
                <div style={{ fontSize: 26, fontFamily: 'var(--display)', fontWeight: 800 }}>{k.val}</div>
              </div>
            ))}
          </div>

          <div className="dp-grid">
            <Ranking titulo="Más cotizados" subtitulo="En cuántas cotizaciones aparece, sin importar el estatus"
              filas={tops.cotizados} valor={(f) => f.Cotizaciones} onElegir={elegirFamilia}
              detalle={(f) => `Concretado en ${f.Concretadas} · ${f.PctConversion.toFixed(0)}% conversión`} />
            <Ranking titulo="Más concretados" subtitulo="En cuántas cotizaciones concretadas aparece"
              filas={tops.concretados} valor={(f) => f.Concretadas} detalle={detalleConcretado} onElegir={elegirFamilia} />
            {tipo !== 'VENTA' && (
              <Ranking titulo="Más rentados" subtitulo="Renta en cotizaciones concretadas (sin servicios)"
                filas={tops.rentados} valor={(f) => f.Concretadas} detalle={detalleConcretado} onElegir={elegirFamilia} />
            )}
            {tipo !== 'RENTA' && (
              <Ranking titulo="Más vendidos" subtitulo="Venta en cotizaciones concretadas"
                filas={tops.vendidos} valor={(f) => f.Concretadas} detalle={detalleConcretado} onElegir={elegirFamilia} />
            )}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-cuerpo flex items-center justify-between gap-12 wrap">
              <h3 className="dp-titulo" style={{ margin: 0 }}>
                {vista === 'familia' ? 'Todos los grupos'
                  : familiaElegida ? `Productos de ${nombreFamilia(familiaElegida)}` : 'Todos los productos'}
              </h3>
              <input className="input" style={{ maxWidth: 260 }} aria-label="Buscar"
                placeholder={vista === 'familia' ? 'Buscar grupo…' : 'Buscar producto o código…'}
                value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            {tabla.length === 0 ? (
              <Vacio titulo="Sin datos">No hay renglones cotizados con estos filtros.</Vacio>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tabla dp-tabla">
                  <thead>
                    <tr>
                      <th>{vista === 'familia' ? 'Grupo' : 'Producto'}</th><th>Tipo</th>
                      {COLUMNAS.map((c) => (
                        <th key={c.campo} className="der orden"
                          aria-sort={orden.campo === c.campo ? (orden.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                          onClick={() => cambiarOrden(c.campo)}>
                          {c.etiqueta} {orden.campo === c.campo ? (orden.dir === 'desc' ? '▼' : '▲') : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tabla.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map((f) => (
                      <tr key={f.clave} className={elegirFamilia ? 'clic' : undefined}
                        onClick={elegirFamilia ? () => elegirFamilia(f) : undefined}>
                        <td className="dp-celda-producto"><Nombre f={f} /></td>
                        <td><BadgeTipo t={f.Tipo} /></td>
                        {COLUMNAS.map((c) => (
                          <td key={c.campo} className="der num">{formatear(f[c.campo], c.formato)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <Paginador pagina={pagina} total={tabla.length} porPagina={POR_PAGINA} onCambiar={setPagina} />
          <p className="texto-suave" style={{ fontSize: 12, marginTop: 12 }}>
            El grupo es la primera palabra del nombre ("Muelle 4 hojas" y "Muelle 6 hojas" van en Muelle). Una
            cotización con dos productos del mismo grupo cuenta una vez. Importes de los renglones: ya traen el
            descuento del renglón, pero no el descuento general ni el IVA.
          </p>
        </>
      )}
    </Layout>
  );
}

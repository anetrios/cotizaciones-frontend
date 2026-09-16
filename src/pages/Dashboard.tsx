import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Layout } from '../components/Layout';
import { Spinner, moneda } from '../components/ui/UI';
import { useToast } from '../components/ui/Toast';
import { cotizacionesApi } from '../api/cotizaciones';
import { mensajeError } from '../api/client';
import { ETIQUETA_MOTIVO_NO_CONCRECION } from '../types';
import type { DashboardData, EstatusCotizacion, MotivoNoConcrecion } from '../types';

const COLORES = ['#6B7280', '#D97706', '#2563EB', '#16A34A', '#DC2626', '#7C3AED'];
const MEDALLAS = ['🥇', '🥈', '🥉'];

type ModoFecha = 'semana' | 'mes' | 'rango';
type CampoOrdenUsuario = 'Concretadas' | 'PctConcretadas' | 'MontoConcretado' | 'Monto' | 'Total';

const COLUMNAS_USUARIO: Array<{ campo: CampoOrdenUsuario; etiqueta: string; formato: 'num' | 'moneda' | 'porcentaje' }> = [
  { campo: 'Concretadas', etiqueta: 'Cotizaciones concretadas', formato: 'num' },
  { campo: 'PctConcretadas', etiqueta: '% concretadas', formato: 'porcentaje' },
  { campo: 'MontoConcretado', etiqueta: 'Monto concretado', formato: 'moneda' },
  { campo: 'Monto', etiqueta: 'Monto cotizado', formato: 'moneda' },
  { campo: 'Total', etiqueta: 'Número de cotizaciones', formato: 'num' },
];

function formatearFecha(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

function calcularRango(modo: ModoFecha, rangoInicio: string, rangoFin: string): { fechaDesde?: string; fechaHasta?: string } {
  const hoy = new Date();
  if (modo === 'semana') {
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - 6);
    return { fechaDesde: formatearFecha(inicio), fechaHasta: formatearFecha(hoy) };
  }
  if (modo === 'mes') {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    return { fechaDesde: formatearFecha(inicio), fechaHasta: formatearFecha(hoy) };
  }
  if (rangoInicio && rangoFin) return { fechaDesde: rangoInicio, fechaHasta: rangoFin };
  return {};
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [modo, setModo] = useState<ModoFecha>('mes');
  const [rangoInicio, setRangoInicio] = useState('');
  const [rangoFin, setRangoFin] = useState('');
  // Entra ordenada por monto concretado: lo que importa es cuánto se cerró, no
  // cuántas cotizaciones se hicieron. Las columnas siguen siendo ordenables.
  const [orden, setOrden] = useState<{ campo: CampoOrdenUsuario; dir: 'asc' | 'desc' }>(
    { campo: 'MontoConcretado', dir: 'desc' });
  const [drill, setDrill] = useState<{ estatus: EstatusCotizacion; nombre: string } | null>(null);
  const [detalleDrill, setDetalleDrill] = useState<Array<{ name: string; value: number }> | null>(null);
  const [cargandoDrill, setCargandoDrill] = useState(false);
  const { mostrar } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    cotizacionesApi.dashboard(calcularRango(modo, rangoInicio, rangoFin))
      .then(setData).catch((e) => mostrar(mensajeError(e), 'error'));
  }, [modo, rangoInicio, rangoFin, mostrar]);

  useEffect(() => { setDrill(null); setDetalleDrill(null); }, [modo, rangoInicio, rangoFin]);

  useEffect(() => {
    if (!drill) return;
    setCargandoDrill(true);
    cotizacionesApi.dashboardDetalle(drill.estatus, calcularRango(modo, rangoInicio, rangoFin))
      .then((res) => {
        const filas = res.tipo === 'motivo'
          ? (res.filas as Array<{ Motivo: string; Total: number }>).map((f) => ({
              name: ETIQUETA_MOTIVO_NO_CONCRECION[f.Motivo as MotivoNoConcrecion] || f.Motivo, value: f.Total,
            }))
          : (res.filas as Array<{ Usuario: string; Total: number }>).map((f) => ({ name: f.Usuario, value: f.Total }));
        setDetalleDrill(filas);
      })
      .catch((e) => { mostrar(mensajeError(e), 'error'); setDrill(null); })
      .finally(() => setCargandoDrill(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill]);

  if (!data) return <Layout titulo="Dashboard"><Spinner /></Layout>;
  const r = data.resumen;
  const etiquetaPeriodo = modo === 'semana' ? 'Cotizaciones (7 días)' : modo === 'mes' ? 'Cotizaciones (mes)' : 'Cotizaciones (rango)';
  const kpis = [
    { etq: etiquetaPeriodo, val: r.Total ?? 0 },
    { etq: 'Concretadas', val: r.Concretadas ?? 0 },
    { etq: 'Monto cotizado', val: moneda(r.TotalCotizado) },
    { etq: 'Monto concretado', val: moneda(r.TotalConcretado) },
  ];
  const pastelCompleto: Array<{ name: string; value: number; estatus: EstatusCotizacion }> = [
    { name: 'Borrador', value: r.Borradores ?? 0, estatus: 'BORRADOR' },
    { name: 'Enviada', value: r.Enviadas ?? 0, estatus: 'ENVIADA' },
    { name: 'Pendiente', value: r.Pendientes ?? 0, estatus: 'PENDIENTE' },
    { name: 'Concretada', value: r.Concretadas ?? 0, estatus: 'CONCRETADA' },
    { name: 'No concretada', value: r.NoConcretadas ?? 0, estatus: 'NO_CONCRETADA' },
  ];
  const pastel = pastelCompleto.filter((x) => x.value > 0);
  const barras = data.porMes.map((m) => ({ mes: m.Mes.slice(5), Cotizaciones: m.Total }));

  const cambiarOrden = (campo: CampoOrdenUsuario) => {
    setOrden((o) => (o.campo === campo ? { campo, dir: o.dir === 'desc' ? 'asc' : 'desc' } : { campo, dir: 'desc' }));
  };
  const porUsuarioConPct = data.porUsuario.map((u) => ({
    ...u, PctConcretadas: u.Total > 0 ? (u.Concretadas / u.Total) * 100 : 0,
  }));
  const porUsuarioOrdenado = [...porUsuarioConPct].sort((a, b) =>
    (orden.dir === 'desc' ? 1 : -1) * (b[orden.campo] - a[orden.campo]));

  /** Las 3 personas con mayor monto concretado en el periodo; se descarta a quien no concretó nada. */
  const topCotizadoras = [...data.porUsuario]
    .filter((u) => u.MontoConcretado > 0)
    .sort((a, b) => b.MontoConcretado - a.MontoConcretado)
    .slice(0, 3);

  return (
    <Layout titulo="Dashboard" acciones={
      <button className="btn btn-primario" onClick={() => navigate('/cotizaciones/nueva')}>+ Nueva cotización</button>
    }>
      <div className="flex gap-8 wrap items-center" style={{ marginBottom: 16 }}>
        <button className={`btn btn-sm ${modo === 'semana' ? 'btn-primario' : 'btn-secundario'}`} onClick={() => setModo('semana')}>Esta semana</button>
        <button className={`btn btn-sm ${modo === 'mes' ? 'btn-primario' : 'btn-secundario'}`} onClick={() => setModo('mes')}>Este mes</button>
        <button className={`btn btn-sm ${modo === 'rango' ? 'btn-primario' : 'btn-secundario'}`} onClick={() => setModo('rango')}>Rango personalizado</button>
        {modo === 'rango' && (
          <>
            <input className="input" type="date" style={{ maxWidth: 160 }} value={rangoInicio} onChange={(e) => setRangoInicio(e.target.value)} />
            <input className="input" type="date" style={{ maxWidth: 160 }} value={rangoFin} onChange={(e) => setRangoFin(e.target.value)} />
          </>
        )}
      </div>

      <div className="card card-cuerpo" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 14, fontSize: 16 }}>🏆 Top de cotizadores</h3>
        {topCotizadoras.length ? (
          <div className="flex-col gap-8">
            {topCotizadoras.map((u, i) => (
              <div
                key={u.IdUsuario} className="flex items-center justify-between gap-12"
                style={{ padding: '10px 14px', background: 'var(--superficie-2)', border: '1px solid var(--borde)', borderRadius: 8 }}
              >
                <span className="flex items-center gap-12">
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{MEDALLAS[i]}</span>
                  <span style={{ fontWeight: 600 }}>{u.Usuario}</span>
                </span>
                <span className="num" style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18 }}>
                  {moneda(u.MontoConcretado)}
                </span>
              </div>
            ))}
          </div>
        ) : <p className="texto-suave">Sin cotizaciones concretadas en el periodo.</p>}
      </div>

      <div className="grid-4-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
        {kpis.map((k) => (
          <div key={k.etq} className="card card-cuerpo">
            <div className="texto-suave" style={{ fontSize: 13, marginBottom: 6 }}>{k.etq}</div>
            <div style={{ fontSize: 26, fontFamily: 'var(--display)', fontWeight: 800 }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }} className="dash-grid">
        <div className="card card-cuerpo">
          <h3 style={{ marginBottom: 14, fontSize: 16 }}>Cotizaciones por mes</h3>
          {barras.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barras}>
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="Cotizaciones" fill="#F5B301" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="texto-suave">Sin datos todavía.</p>}
        </div>
        <div className="card card-cuerpo">
          {drill ? (
            <>
              <div className="flex items-center gap-8" style={{ marginBottom: 14 }}>
                <button className="btn btn-secundario btn-sm" onClick={() => setDrill(null)}>← Regresar</button>
                <h3 style={{ fontSize: 16 }}>
                  {drill.nombre} {drill.estatus === 'NO_CONCRETADA' ? 'por motivo' : 'por persona'}
                </h3>
              </div>
              {cargandoDrill ? <Spinner /> : detalleDrill && detalleDrill.length ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={detalleDrill} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                        {detalleDrill.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-12 wrap mt-8" style={{ justifyContent: 'center' }}>
                    {detalleDrill.map((p, i) => (
                      <span key={p.name} className="flex items-center gap-6" style={{ fontSize: 12 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORES[i % COLORES.length] }} />
                        {p.name} ({p.value})
                      </span>
                    ))}
                  </div>
                </>
              ) : <p className="texto-suave">Sin datos para este estatus.</p>}
            </>
          ) : (
            <>
              <h3 style={{ marginBottom: 14, fontSize: 16 }}>Por estatus</h3>
              {pastel.length ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={pastel} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                        {pastel.map((p, i) => (
                          <Cell
                            key={i} fill={COLORES[i % COLORES.length]} style={{ cursor: 'pointer' }}
                            onClick={() => setDrill({ estatus: p.estatus, nombre: p.name })}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-12 wrap mt-8" style={{ justifyContent: 'center' }}>
                    {pastel.map((p, i) => (
                      <span
                        key={p.name} className="flex items-center gap-6" style={{ fontSize: 12, cursor: 'pointer' }}
                        onClick={() => setDrill({ estatus: p.estatus, nombre: p.name })}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORES[i % COLORES.length] }} />
                        {p.name}
                      </span>
                    ))}
                  </div>
                </>
              ) : <p className="texto-suave">Sin datos todavía.</p>}
            </>
          )}
        </div>
      </div>

      <div className="card card-cuerpo" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 14, fontSize: 16 }}>Cotizaciones por usuario</h3>
        {data.porUsuario.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Persona</th>
                  {COLUMNAS_USUARIO.map((c) => (
                    <th key={c.campo} className="der orden" onClick={() => cambiarOrden(c.campo)}>
                      {c.etiqueta} {orden.campo === c.campo ? (orden.dir === 'desc' ? '▼' : '▲') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {porUsuarioOrdenado.map((u) => (
                  <tr key={u.IdUsuario}>
                    <td>{u.Usuario}</td>
                    {COLUMNAS_USUARIO.map((c) => (
                      <td key={c.campo} className="der num" style={{ fontWeight: c.campo === 'MontoConcretado' || c.campo === 'Monto' ? 600 : undefined }}>
                        {c.formato === 'moneda' ? moneda(u[c.campo])
                          : c.formato === 'porcentaje' ? `${u[c.campo].toFixed(0)}%`
                          : u[c.campo]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="texto-suave">Sin datos todavía.</p>}
      </div>
    </Layout>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Layout } from '../components/Layout';
import { Spinner, moneda } from '../components/ui/UI';
import { useToast } from '../components/ui/Toast';
import { cotizacionesApi } from '../api/cotizaciones';
import { mensajeError } from '../api/client';
import type { DashboardData } from '../types';

const COLORES = ['#6B7280', '#D97706', '#2563EB', '#16A34A', '#DC2626'];

type ModoFecha = 'semana' | 'mes' | 'rango';

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
  const { mostrar } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    cotizacionesApi.dashboard(calcularRango(modo, rangoInicio, rangoFin))
      .then(setData).catch((e) => mostrar(mensajeError(e), 'error'));
  }, [modo, rangoInicio, rangoFin, mostrar]);

  if (!data) return <Layout titulo="Dashboard"><Spinner /></Layout>;
  const r = data.resumen;
  const etiquetaPeriodo = modo === 'semana' ? 'Cotizaciones (7 días)' : modo === 'mes' ? 'Cotizaciones (mes)' : 'Cotizaciones (rango)';
  const kpis = [
    { etq: etiquetaPeriodo, val: r.Total ?? 0 },
    { etq: 'Concretadas', val: r.Concretadas ?? 0 },
    { etq: 'Monto cotizado', val: moneda(r.TotalCotizado) },
    { etq: 'Monto concretado', val: moneda(r.TotalConcretado) },
  ];
  const pastel = [
    { name: 'Borrador', value: r.Borradores ?? 0 },
    { name: 'Enviada', value: r.Enviadas ?? 0 },
    { name: 'Pendiente', value: r.Pendientes ?? 0 },
    { name: 'Concretada', value: r.Concretadas ?? 0 },
    { name: 'No concretada', value: r.NoConcretadas ?? 0 },
  ].filter((x) => x.value > 0);
  const barras = data.porMes.map((m) => ({ mes: m.Mes.slice(5), Cotizaciones: m.Total }));

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
          <h3 style={{ marginBottom: 14, fontSize: 16 }}>Por estatus</h3>
          {pastel.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pastel} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {pastel.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="texto-suave">Sin datos todavía.</p>}
          <div className="flex gap-12 wrap mt-8" style={{ justifyContent: 'center' }}>
            {pastel.map((p, i) => (
              <span key={p.name} className="flex items-center gap-6" style={{ fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORES[i % COLORES.length] }} />
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card card-cuerpo" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 14, fontSize: 16 }}>Cotizaciones por usuario</h3>
        {data.porUsuario.length ? (
          <ResponsiveContainer width="100%" height={Math.max(120, data.porUsuario.length * 42)}>
            <BarChart data={data.porUsuario} layout="vertical" margin={{ left: 24 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="Usuario" width={120} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="Total" name="Cotizaciones" fill="#F5B301" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="texto-suave">Sin datos todavía.</p>}
      </div>
    </Layout>
  );
}

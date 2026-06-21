import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import { Layout } from '../components/Layout';
import { Spinner, moneda } from '../components/ui/UI';
import { cotizacionesApi } from '../api/cotizaciones';
import { mensajeError } from '../api/client';
import type { DashboardData } from '../types';
import './Dashboard.css';

const COLOR_ESTATUS = { Pendientes: '#F59E0B', Aprobadas: '#16A34A', Rechazadas: '#DC2626', Vencidas: '#6B7280' };

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { cotizacionesApi.dashboard().then(setData).catch((e) => setError(mensajeError(e))); }, []);

  if (error) return <Layout titulo="Dashboard"><div className="login-error">{error}</div></Layout>;
  if (!data) return <Layout titulo="Dashboard"><Spinner /></Layout>;

  const { resumen, porMes } = data;
  const tarjetas = [
    { etiqueta: 'Cotizaciones del mes', valor: resumen.Total, acento: false },
    { etiqueta: 'Total cotizado', valor: moneda(resumen.TotalCotizado), acento: true },
    { etiqueta: 'Total aprobado', valor: moneda(resumen.TotalAprobado), acento: false },
    { etiqueta: 'Pendientes', valor: resumen.Pendientes, acento: false },
  ];
  const datosEstatus = [
    { nombre: 'Pendientes', valor: resumen.Pendientes },
    { nombre: 'Aprobadas', valor: resumen.Aprobadas },
    { nombre: 'Rechazadas', valor: resumen.Rechazadas },
    { nombre: 'Vencidas', valor: resumen.Vencidas },
  ].filter((d) => d.valor > 0);
  const datosMes = porMes.map((m) => ({ mes: m.Mes, Cotizaciones: m.Total, Monto: Number(m.Monto) }));

  return (
    <Layout titulo="Dashboard">
      <div className="kpis">
        {tarjetas.map((t) => (
          <div key={t.etiqueta} className={`kpi ${t.acento ? 'kpi-acento' : ''}`}>
            <span className="kpi-etiqueta">{t.etiqueta}</span>
            <span className="kpi-valor num">{t.valor}</span>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="card"><div className="card-cuerpo">
          <h3 className="dash-titulo">Actividad por mes</h3>
          {datosMes.length === 0 ? <p className="texto-suave mt-16">Sin datos en el período.</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={datosMes} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F2" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#8A94A1' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#8A94A1' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(245,130,32,0.06)' }} />
                <Bar dataKey="Cotizaciones" fill="#F58220" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div></div>

        <div className="card"><div className="card-cuerpo">
          <h3 className="dash-titulo">Por estatus</h3>
          {datosEstatus.length === 0 ? <p className="texto-suave mt-16">Sin cotizaciones aún.</p> : (
            <>
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={datosEstatus} dataKey="valor" nameKey="nombre" innerRadius={56} outerRadius={88} paddingAngle={2}>
                    {datosEstatus.map((d) => <Cell key={d.nombre} fill={COLOR_ESTATUS[d.nombre as keyof typeof COLOR_ESTATUS]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="leyenda">
                {datosEstatus.map((d) => (
                  <div key={d.nombre} className="leyenda-item">
                    <span className="leyenda-punto" style={{ background: COLOR_ESTATUS[d.nombre as keyof typeof COLOR_ESTATUS] }} />
                    {d.nombre} <strong className="num">{d.valor}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div></div>
      </div>

      <div className="reparto">
        <div className="reparto-item"><span className="badge-tipo R">Renta</span><span className="num reparto-num">{resumen.TipoRenta}</span></div>
        <div className="reparto-sep" />
        <div className="reparto-item"><span className="badge-tipo V">Venta</span><span className="num reparto-num">{resumen.TipoVenta}</span></div>
      </div>
    </Layout>
  );
}

import type { ReactNode } from 'react';
import type { EstatusCotizacion, TipoCotizacion } from '../../types';
import { ETIQUETA_ESTATUS } from '../../types';

export function Spinner() { return <div className="spinner-centro"><div className="spinner" /></div>; }
export function BadgeEstatus({ e }: { e: EstatusCotizacion }) {
  return <span className={`badge badge-${e}`}>{ETIQUETA_ESTATUS[e]}</span>;
}
/** Vencida se calcula en el frontend: ENVIADA/PENDIENTE cuya vigencia ya pasó se ve como VENCIDA, sin depender del backend. */
export function estatusVisible(estatus: EstatusCotizacion, fecha: string, vigenciaDias: number): EstatusCotizacion {
  if (estatus !== 'ENVIADA' && estatus !== 'PENDIENTE') return estatus;
  const vence = new Date(new Date(fecha).getTime() + vigenciaDias * 86400000);
  return vence < new Date() ? 'VENCIDA' : estatus;
}
export function BadgeTipo({ t }: { t: TipoCotizacion }) {
  return <span className={`badge-tipo ${t}`}>{t === 'RENTA' ? 'Renta' : 'Venta'}</span>;
}
export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return <div className="vacio"><h3>{titulo}</h3>{children && <p>{children}</p>}</div>;
}
export function moneda(v: number | null | undefined, m = 'MXN') {
  return Number(v || 0).toLocaleString('es-MX', { style: 'currency', currency: m });
}
export function fecha(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

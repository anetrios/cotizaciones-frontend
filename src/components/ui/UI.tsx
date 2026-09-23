import type { ReactNode } from 'react';
import type { EstatusCotizacion, TipoCotizacion } from '../../types';
import { ETIQUETA_ESTATUS } from '../../types';

export function Spinner() { return <div className="spinner-centro"><div className="spinner" /></div>; }
export function BadgeEstatus({ e }: { e: EstatusCotizacion }) {
  return <span className={`badge badge-${e}`}>{ETIQUETA_ESTATUS[e]}</span>;
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
/**
 * La fecha de una cotización o de una incidencia es una fecha civil (columna DATE):
 * no tiene hora ni zona. Se formatea con los dígitos del propio texto y nunca con
 * new Date(iso), porque convertirla a instante la recorre un día completo en
 * cualquier zona al oeste de Greenwich — México incluido.
 */
export function fecha(iso: string | null | undefined) {
  if (!iso) return '—';
  const p = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!p) return '—';
  return `${p[3]}/${p[2]}/${p[1]}`;
}

/** Hoy como 'YYYY-MM-DD' en la zona del navegador. No uses toISOString() para esto:
 *  después de las 6 de la tarde hora de México ya devuelve la fecha de mañana. */
export function hoyISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

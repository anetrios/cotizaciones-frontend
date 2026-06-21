import type { ReactNode } from 'react';
import type { EstatusCotizacion, TipoCotizacion } from '../../types';
import { ETIQUETA_ESTATUS } from '../../types';

export function Spinner() {
  return <div className="spinner-centro"><div className="spinner" /></div>;
}

export function BadgeEstatus({ estatus }: { estatus: EstatusCotizacion }) {
  return <span className={`badge badge-${estatus}`}>{ETIQUETA_ESTATUS[estatus]}</span>;
}

export function BadgeTipo({ tipo }: { tipo: TipoCotizacion }) {
  return <span className={`badge-tipo ${tipo}`}>{tipo === 'R' ? 'Renta' : 'Venta'}</span>;
}

export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="vacio">
      <h3>{titulo}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

export function moneda(valor: number | null | undefined): string {
  const n = Number(valor || 0);
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export function fecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

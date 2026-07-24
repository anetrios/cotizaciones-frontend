import type { CotizacionCompleta, SucursalConContactos } from '../types';

/** Genera y descarga el PDF. Importa @react-pdf dinámicamente (code-splitting). */
export async function descargarPDF(cot: CotizacionCompleta, sucursales: SucursalConContactos[]) {
  const [{ pdf }, { CotizacionPDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./CotizacionPDF'),
  ]);
  const blob = await pdf(<CotizacionPDF cot={cot} sucursales={sucursales} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `Cotizacion_${cot.Folio}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

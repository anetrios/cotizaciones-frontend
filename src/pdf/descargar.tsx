import type { CotizacionCompleta } from '../types';

/**
 * Genera el PDF y dispara la descarga. Tanto @react-pdf como el documento
 * se importan de forma dinámica: la librería pesada queda fuera del bundle
 * inicial y solo se descarga cuando el usuario genera un PDF.
 */
export async function descargarCotizacionPDF(cot: CotizacionCompleta): Promise<void> {
  const [{ pdf }, { CotizacionPDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./CotizacionPDF'),
  ]);

  const blob = await pdf(<CotizacionPDF cot={cot} />).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Cotizacion-${cot.Folio}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

import { useEffect, useState } from 'react';
import type { CotizacionCompleta, SucursalConContactos } from '../types';

/** Vista previa embebida del PDF. Carga @react-pdf de forma diferida y genera un blob URL. */
export function VisorPDF({ cot, sucursales }: { cot: CotizacionCompleta; sucursales: SucursalConContactos[] }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true; let urlActual: string | null = null;
    (async () => {
      try {
        const [{ pdf }, { CotizacionPDF }] = await Promise.all([
          import('@react-pdf/renderer'), import('./CotizacionPDF'),
        ]);
        const blob = await pdf(<CotizacionPDF cot={cot} sucursales={sucursales} />).toBlob();
        if (!vivo) return;
        urlActual = URL.createObjectURL(blob); setUrl(urlActual);
      } catch { if (vivo) setError(true); }
    })();
    return () => { vivo = false; if (urlActual) URL.revokeObjectURL(urlActual); };
  }, [cot, sucursales]);

  if (error) return <div className="aviso error">No se pudo generar la vista previa del PDF.</div>;
  if (!url) return <div className="spinner-centro"><div className="spinner" /></div>;
  return <iframe title="Vista previa PDF" src={url} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }} />;
}

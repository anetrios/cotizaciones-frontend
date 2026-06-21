import { PDFViewer } from '@react-pdf/renderer';
import { CotizacionPDF } from './CotizacionPDF';
import type { CotizacionCompleta } from '../types';

/** Visor embebido del PDF. Se carga de forma diferida (lazy). */
export default function VisorPDF({ cot }: { cot: CotizacionCompleta }) {
  return (
    <PDFViewer width="100%" height="100%" showToolbar>
      <CotizacionPDF cot={cot} />
    </PDFViewer>
  );
}

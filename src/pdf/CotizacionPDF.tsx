import {
  Document, Page, View, Text, StyleSheet, Font,
} from '@react-pdf/renderer';
import type { CotizacionCompleta } from '../types';
import { ETIQUETA_TARIFA, ETIQUETA_ESTATUS } from '../types';

/**
 * Documento PDF de la cotización (vectorial, listo para enviar al cliente).
 *
 * Diseño ad-hoc con la paleta de Mercado de Andamios:
 *   - Banda superior carbón con wordmark + folio
 *   - Cinta de precaución dibujada con cuadros alternados (firma de marca)
 *   - Tabla de partidas y caja de totales en naranja
 *
 * NOTA SOBRE EL LOGO:
 * Las imágenes remotas en @react-pdf suelen fallar por CORS, por eso el
 * membrete es vectorial. Si quieres el logo real, convierte el PNG a base64
 * (p.ej. base64-image.de) y descomenta el bloque <Image> marcado abajo.
 */

// Helvetica es la fuente integrada de @react-pdf: nítida y siempre disponible.
// (El carácter de marca viene del color y el layout, no de la tipografía.)
Font.registerHyphenationCallback((w) => [w]); // evita cortes raros de palabra

const NARANJA = '#F58220';
const CARBON = '#16191D';
const HAZARD = '#F5C518';
const GRIS = '#6B7280';
const GRIS_CLARO = '#8A94A1';
const BORDE = '#E4E7EB';
const FILA = '#FAFBFC';

const ESTATUS_COLOR: Record<string, string> = {
  P: '#B7791F', A: '#15803D', R: '#B91C1C', V: '#6B7280',
};

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: CARBON, paddingBottom: 64 },

  // Banda superior
  header: {
    backgroundColor: CARBON,
    paddingHorizontal: 32,
    paddingVertical: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  marca: { flexDirection: 'column' },
  marcaLinea1: { fontFamily: 'Helvetica-Bold', fontSize: 17, color: '#fff', letterSpacing: 1 },
  marcaNaranja: { color: NARANJA },
  marcaTag: { fontSize: 7.5, color: GRIS_CLARO, marginTop: 3, letterSpacing: 0.5 },
  cajaFolio: { alignItems: 'flex-end' },
  folioLbl: { fontSize: 7.5, color: GRIS_CLARO, letterSpacing: 1.5, textTransform: 'uppercase' },
  folioNum: { fontFamily: 'Helvetica-Bold', fontSize: 18, color: NARANJA, marginTop: 2 },
  tipoPill: {
    marginTop: 6, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 3, fontSize: 7.5, fontFamily: 'Helvetica-Bold',
    color: CARBON, backgroundColor: HAZARD, textTransform: 'uppercase', letterSpacing: 0.5,
  },

  // Cinta de precaución
  hazard: { flexDirection: 'row', height: 6 },
  hazardSq: { width: 12, height: 6 },

  cuerpo: { paddingHorizontal: 32, paddingTop: 20 },

  // Datos cliente / meta
  datos: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  bloque: { flexDirection: 'column', maxWidth: 280 },
  lbl: { fontSize: 7, color: GRIS_CLARO, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 },
  clienteNom: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginBottom: 2 },
  clienteDato: { fontSize: 9, color: GRIS, marginBottom: 1 },
  metaFila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, minWidth: 170 },
  metaLbl: { fontSize: 8, color: GRIS },
  metaVal: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },

  // Tabla
  thead: { flexDirection: 'row', backgroundColor: CARBON, borderRadius: 3, paddingVertical: 7, paddingHorizontal: 8 },
  th: { color: '#fff', fontSize: 7.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  tr: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: BORDE },
  trAlt: { backgroundColor: FILA },
  td: { fontSize: 9, color: CARBON },
  tdSuave: { fontSize: 8.5, color: GRIS },

  // columnas (ancho en %)
  cCodigo: { width: '14%' },
  cDesc: { width: '38%' },
  cTarifa: { width: '12%' },
  cPrecio: { width: '14%', textAlign: 'right' },
  cCant: { width: '10%', textAlign: 'right' },
  cImporte: { width: '16%', textAlign: 'right' },
  cDescNoRenta: { width: '46%' },

  // Totales
  totalesWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  totales: { width: 220 },
  totFila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totLbl: { fontSize: 9, color: GRIS },
  totVal: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  totalCaja: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: NARANJA, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 9, marginTop: 6,
  },
  totalCajaLbl: { color: '#fff', fontSize: 10, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  totalCajaVal: { color: '#fff', fontSize: 15, fontFamily: 'Helvetica-Bold' },

  // Notas
  notas: { marginTop: 18, padding: 12, backgroundColor: FILA, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: NARANJA },
  notasTxt: { fontSize: 8.5, color: GRIS, lineHeight: 1.4 },

  // Pie fijo
  pie: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopWidth: 1, borderTopColor: BORDE,
    paddingHorizontal: 32, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  pieTxt: { fontSize: 7.5, color: GRIS_CLARO },
  pieFuerte: { fontSize: 7.5, color: GRIS, fontFamily: 'Helvetica-Bold' },
});

const mxn = (n: number | null | undefined) =>
  Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const dia = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

// Cinta de precaución: cuadros alternados amber / carbón
function Hazard() {
  const cuadros = Array.from({ length: 48 });
  return (
    <View style={s.hazard}>
      {cuadros.map((_, i) => (
        <View key={i} style={[s.hazardSq, { backgroundColor: i % 2 === 0 ? HAZARD : CARBON }]} />
      ))}
    </View>
  );
}

export function CotizacionPDF({ cot }: { cot: CotizacionCompleta }) {
  const esRenta = cot.Tipo === 'R';

  return (
    <Document
      title={`Cotización ${cot.Folio}`}
      author="Mercado de Andamios SA de CV"
      subject={`Cotización para ${cot.Cliente ?? ''}`}
    >
      <Page size="A4" style={s.page}>
        {/* Banda superior */}
        <View style={s.header}>
          <View style={s.marca}>
            {/* ── Logo real (opcional): convierte el PNG a base64 y usa:
            <Image src="data:image/png;base64,XXXX" style={{ height: 34 }} />
            ── */}
            <Text style={s.marcaLinea1}>
              MERCADO DE <Text style={s.marcaNaranja}>ANDAMIOS</Text>
            </Text>
            <Text style={s.marcaTag}>RENTA Y VENTA DE MAQUINARIA · LA LAGUNA</Text>
          </View>
          <View style={s.cajaFolio}>
            <Text style={s.folioLbl}>Cotización</Text>
            <Text style={s.folioNum}>{cot.Folio}</Text>
            <Text style={s.tipoPill}>{esRenta ? 'RENTA' : 'VENTA'}</Text>
          </View>
        </View>

        <Hazard />

        <View style={s.cuerpo}>
          {/* Cliente + meta */}
          <View style={s.datos}>
            <View style={s.bloque}>
              <Text style={s.lbl}>Cliente</Text>
              <Text style={s.clienteNom}>{cot.Cliente || '—'}</Text>
              {cot.ClienteContacto ? <Text style={s.clienteDato}>Att: {cot.ClienteContacto}</Text> : null}
              {cot.ClienteTelefono ? <Text style={s.clienteDato}>Tel: {cot.ClienteTelefono}</Text> : null}
            </View>
            <View>
              <View style={s.metaFila}>
                <Text style={s.metaLbl}>Fecha</Text>
                <Text style={s.metaVal}>{dia(cot.FechaHora)}</Text>
              </View>
              <View style={s.metaFila}>
                <Text style={s.metaLbl}>Vigencia</Text>
                <Text style={s.metaVal}>{dia(cot.FechaVigencia)}</Text>
              </View>
              <View style={s.metaFila}>
                <Text style={s.metaLbl}>Estatus</Text>
                <Text style={[s.metaVal, { color: ESTATUS_COLOR[cot.Estatus] }]}>
                  {ETIQUETA_ESTATUS[cot.Estatus]}
                </Text>
              </View>
              <View style={s.metaFila}>
                <Text style={s.metaLbl}>Elaboró</Text>
                <Text style={s.metaVal}>{cot.Usuario || '—'}</Text>
              </View>
            </View>
          </View>

          {/* Tabla de partidas */}
          <View style={s.thead}>
            <Text style={[s.th, s.cCodigo]}>Código</Text>
            <Text style={[s.th, esRenta ? s.cDesc : s.cDescNoRenta]}>Descripción</Text>
            {esRenta ? <Text style={[s.th, s.cTarifa]}>Tarifa</Text> : null}
            <Text style={[s.th, s.cPrecio]}>P. Unitario</Text>
            <Text style={[s.th, s.cCant]}>Cant.</Text>
            <Text style={[s.th, s.cImporte]}>Importe</Text>
          </View>

          {cot.detalles.map((d, i) => (
            <View key={d.IdCotizacionDetalle} style={[s.tr, ...(i % 2 === 1 ? [s.trAlt] : [])]} wrap={false}>
              <Text style={[s.tdSuave, s.cCodigo]}>{d.Codigo || '—'}</Text>
              <Text style={[s.td, esRenta ? s.cDesc : s.cDescNoRenta]}>{d.Descripcion}</Text>
              {esRenta ? (
                <Text style={[s.tdSuave, s.cTarifa]}>{d.TipoTarifa ? ETIQUETA_TARIFA[d.TipoTarifa] : '—'}</Text>
              ) : null}
              <Text style={[s.td, s.cPrecio]}>{mxn(d.PrecioUnitario)}</Text>
              <Text style={[s.td, s.cCant]}>{d.Cantidad}</Text>
              <Text style={[s.td, s.cImporte, { fontFamily: 'Helvetica-Bold' }]}>{mxn(d.Importe)}</Text>
            </View>
          ))}

          {/* Totales */}
          <View style={s.totalesWrap}>
            <View style={s.totales}>
              <View style={s.totFila}>
                <Text style={s.totLbl}>Subtotal</Text>
                <Text style={s.totVal}>{mxn(cot.SubTotal)}</Text>
              </View>
              {cot.Descuento > 0 ? (
                <View style={s.totFila}>
                  <Text style={s.totLbl}>Descuento ({cot.Descuento}%)</Text>
                  <Text style={s.totVal}>incluido</Text>
                </View>
              ) : null}
              <View style={s.totFila}>
                <Text style={s.totLbl}>IVA</Text>
                <Text style={s.totVal}>{mxn(cot.IVA)}</Text>
              </View>
              <View style={s.totalCaja}>
                <Text style={s.totalCajaLbl}>TOTAL</Text>
                <Text style={s.totalCajaVal}>{mxn(cot.Total)}</Text>
              </View>
            </View>
          </View>

          {/* Notas */}
          {cot.Notas ? (
            <View style={s.notas}>
              <Text style={s.lbl}>Notas</Text>
              <Text style={s.notasTxt}>{cot.Notas}</Text>
            </View>
          ) : null}
        </View>

        {/* Pie fijo */}
        <View style={s.pie} fixed>
          <View>
            <Text style={s.pieFuerte}>Mercado de Andamios SA de CV</Text>
            <Text style={s.pieTxt}>Av. Victoria #2298 Ote., Col. Centro, Torreón, Coah. · Tel. 871 722 0515</Text>
          </View>
          <Text style={s.pieTxt}>
            Precios en {cot.Moneda || 'MXN'}. Válida hasta {dia(cot.FechaVigencia)}.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

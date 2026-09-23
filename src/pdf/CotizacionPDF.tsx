import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { LOGO_BASE64 } from './logoBase64';
import type { CotizacionCompleta, SucursalConContactos } from '../types';

const AMARILLO = '#F5B301';
const NEGRO = '#12141A';
const GRIS = '#5B6470';
const GRIS_CLARO = '#E7EAEE';
const FONDO_SUAVE = '#F7F8FA';

const s = StyleSheet.create({
  pagina: { paddingTop: 28, paddingBottom: 64, paddingHorizontal: 34, fontSize: 8.5, fontFamily: 'Helvetica', color: NEGRO },
  // Encabezado
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  logo: { width: 150, height: 63, objectFit: 'contain' },
  cajaFolio: { alignItems: 'flex-end' },
  folioTitulo: { fontSize: 9, color: GRIS, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  folioNum: { fontSize: 19, fontFamily: 'Helvetica-Bold', color: NEGRO },
  chipTipo: { marginTop: 3, backgroundColor: NEGRO, color: '#fff', fontSize: 8, fontFamily: 'Helvetica-Bold', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 3 },
  hazard: { height: 5, flexDirection: 'row', marginBottom: 8, overflow: 'hidden', borderRadius: 1 },
  hazardCelda: { width: 14, height: 5 },
  // Sucursales
  sucursalesFila: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: FONDO_SUAVE, borderRadius: 4, padding: 6, marginBottom: 10 },
  sucursal: { width: '25%', paddingHorizontal: 4, marginBottom: 2 },
  sucursalNombre: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: NEGRO },
  sucursalDato: { fontSize: 6.8, color: GRIS, lineHeight: 1.3 },
  // Bloques cliente / condiciones
  fila2: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  bloque: { flex: 1, borderWidth: 1, borderColor: GRIS_CLARO, borderRadius: 4, padding: 8 },
  bloqueTitulo: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: AMARILLO, marginBottom: 4, letterSpacing: .5, textTransform: 'uppercase' },
  parLinea: { flexDirection: 'row', marginBottom: 1.5 },
  parEtq: { width: 66, color: GRIS, fontSize: 7.8 },
  parVal: { flex: 1, fontSize: 7.8, fontFamily: 'Helvetica-Bold' },
  // Tabla
  th: { flexDirection: 'row', backgroundColor: NEGRO, color: '#fff', paddingVertical: 4, paddingHorizontal: 4, fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
  tr: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: GRIS_CLARO, fontSize: 7.8 },
  trZebra: { backgroundColor: FONDO_SUAVE },
  cCant: { width: '7%', textAlign: 'center' },
  cCodigo: { width: '12%' },
  cDesc: { width: '31%', paddingRight: 4 },
  cPeriodo: { width: '13%', textAlign: 'center' },
  cPrecio: { width: '14%', textAlign: 'right' },
  cDescLinea: { width: '8%', textAlign: 'right' },
  cImporte: { width: '15%', textAlign: 'right' },
  // Totales
  totalesEnvoltura: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  totales: { width: '42%' },
  totalLinea: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, paddingHorizontal: 6 },
  totalEtq: { color: GRIS, fontSize: 8.5 },
  totalVal: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  granTotal: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: AMARILLO, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 3, marginTop: 2 },
  granTotalEtq: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: NEGRO },
  granTotalVal: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: NEGRO },
  anticipoCaja: { marginTop: 4, padding: 6, backgroundColor: FONDO_SUAVE, borderRadius: 3 },
  // Notas
  notas: { marginTop: 12, borderTopWidth: 2, borderTopColor: AMARILLO, paddingTop: 6 },
  notaCat: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: NEGRO, marginTop: 3 },
  notaTexto: { fontSize: 7.8, color: GRIS, marginBottom: 1, lineHeight: 1.3 },
  // Pie
  pie: { position: 'absolute', bottom: 22, left: 34, right: 34, borderTopWidth: 1, borderTopColor: GRIS_CLARO, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  pieTexto: { fontSize: 7, color: GRIS },
});

const ETQ_UNIDAD: Record<string, string> = { DIA: 'día(s)', MES: 'mes(es)', EVENTO: 'evento', SECCION: 'sección', PIEZA: 'pieza' };
const fmt = (v: number | null | undefined, m = 'MXN') =>
  Number(v || 0).toLocaleString('es-MX', { style: 'currency', currency: m, minimumFractionDigits: 2 });
/**
 * cot.Fecha es una fecha civil ('YYYY-MM-DD'): sin hora y sin zona. Se arma un
 * Date con sus componentes en hora local en vez de dejar que new Date(iso) lo
 * interprete como medianoche UTC, que en México imprimiría el día anterior.
 */
const aFechaLocal = (iso: string) => {
  const p = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return p ? new Date(Number(p[1]), Number(p[2]) - 1, Number(p[3])) : new Date(iso);
};
const fmtFechaLarga = (d: Date) => d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
const fmtFecha = (iso: string) => fmtFechaLarga(aFechaLocal(iso));

function Hazard() {
  return (
    <View style={s.hazard}>
      {Array.from({ length: 40 }).map((_, i) => (
        <View key={i} style={[s.hazardCelda, { backgroundColor: i % 2 ? NEGRO : AMARILLO }]} />
      ))}
    </View>
  );
}

function Par({ e, v }: { e: string; v: string | null | undefined }) {
  if (!v) return null;
  return <View style={s.parLinea}><Text style={s.parEtq}>{e}</Text><Text style={s.parVal}>{v}</Text></View>;
}

export function CotizacionPDF({ cot, sucursales }: { cot: CotizacionCompleta; sucursales: SucursalConContactos[] }) {
  const esRenta = cot.Tipo === 'RENTA';
  const m = cot.Moneda;
  const notasPorCat = cot.notas.reduce<Record<string, string[]>>((acc, n) => {
    (acc[n.Categoria] ??= []).push(n.Texto); return acc;
  }, {});
  // Sumar días sobre el Date local (y no milisegundos sobre el instante) mantiene
  // el vencimiento en la misma fecha civil en que lo contaría quien lee la hoja.
  const vence = aFechaLocal(cot.Fecha);
  vence.setDate(vence.getDate() + cot.VigenciaDias);

  return (
    <Document title={`Cotización ${cot.Folio}`} author="Mercado de Andamios">
      <Page size="A4" style={s.pagina}>
        {/* Encabezado */}
        <View style={s.cabecera}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={LOGO_BASE64} style={s.logo} />
          <View style={s.cajaFolio}>
            <Text style={s.folioTitulo}>COTIZACIÓN</Text>
            <Text style={s.folioNum}>{cot.Folio}</Text>
            <Text style={s.chipTipo}>{esRenta ? 'RENTA' : 'VENTA'}</Text>
          </View>
        </View>
        <Hazard />

        {/* Sucursales */}
        <View style={s.sucursalesFila}>
          {sucursales.map((suc) => (
            <View key={suc.IdSucursal} style={s.sucursal}>
              <Text style={s.sucursalNombre}>{suc.Nombre}</Text>
              {suc.Direccion && <Text style={s.sucursalDato}>{suc.Direccion}</Text>}
              <Text style={s.sucursalDato}>
                {suc.contactos.filter((c) => c.Tipo === 'TELEFONO').map((c) => c.Valor).join(' · ')}
              </Text>
              {suc.contactos.filter((c) => c.Tipo === 'WHATSAPP').map((c, i) => (
                <Text key={i} style={s.sucursalDato}>WhatsApp: {c.Valor}</Text>
              ))}
            </View>
          ))}
        </View>

        {/* Cliente + Condiciones */}
        <View style={s.fila2}>
          <View style={s.bloque}>
            <Text style={s.bloqueTitulo}>Cliente</Text>
            <Par e="Razón social" v={cot.Cliente} />
            <Par e="Nombre com." v={cot.ClienteComercial} />
            <Par e="RFC" v={cot.ClienteRFC} />
            <Par e="Contacto" v={cot.ClienteContacto} />
            <Par e="Teléfono" v={cot.ClienteTelefono} />
            <Par e="Dirección" v={cot.ClienteDireccion} />
          </View>
          <View style={s.bloque}>
            <Text style={s.bloqueTitulo}>Datos de la cotización</Text>
            <Par e="Fecha" v={fmtFecha(cot.Fecha)} />
            <Par e="Vigencia" v={`${cot.VigenciaDias} días (al ${fmtFechaLarga(vence)})`} />
            <Par e="Sucursal" v={cot.Sucursal} />
            <Par e="Elaboró" v={cot.Usuario} />
            <Par e="Moneda" v={m === 'USD' ? `USD (T.C. ${fmt(cot.TipoCambio, 'MXN')})` : 'Pesos MXN'} />
            <Par e="Pago" v={cot.CondicionPago === 'CREDITO' ? `Crédito ${cot.DiasCredito} días` : 'Contado'} />
            {esRenta && <Par e="T. entrega" v={cot.TiempoEntrega} />}
          </View>
        </View>

        {/* Tabla de renglones */}
        <View style={s.th}>
          <Text style={s.cCant}>Cant.</Text>
          <Text style={s.cCodigo}>Código</Text>
          <Text style={s.cDesc}>Descripción</Text>
          {esRenta && <Text style={s.cPeriodo}>Periodo</Text>}
          <Text style={s.cPrecio}>P. Unit.</Text>
          <Text style={s.cDescLinea}>Desc.</Text>
          <Text style={s.cImporte}>Importe</Text>
        </View>
        {cot.renglones.map((r, i) => (
          <View key={r.IdRenglon ?? i} style={[s.tr, ...(i % 2 ? [s.trZebra] : [])]}>
            <Text style={s.cCant}>{r.Cantidad}</Text>
            <Text style={s.cCodigo}>{r.CodigoSnapshot || '—'}</Text>
            <Text style={s.cDesc}>{r.Descripcion}</Text>
            {esRenta && (
              <Text style={s.cPeriodo}>
                {r.UnidadCobro ? `${r.NumeroPeriodos} ${ETQ_UNIDAD[r.UnidadCobro] || r.UnidadCobro}` : '—'}
              </Text>
            )}
            <Text style={s.cPrecio}>{fmt(r.PrecioUnitario, m)}</Text>
            <Text style={s.cDescLinea}>{Number(r.DescuentoPorcentaje) > 0 ? `${Number(r.DescuentoPorcentaje)}%` : '—'}</Text>
            <Text style={s.cImporte}>{fmt(r.Importe, m)}</Text>
          </View>
        ))}

        {/* Totales */}
        <View style={s.totalesEnvoltura}>
          <View style={s.totales}>
            <View style={s.totalLinea}><Text style={s.totalEtq}>Subtotal</Text><Text style={s.totalVal}>{fmt(cot.Subtotal, m)}</Text></View>
            {cot.DescuentoMonto > 0 && (
              <View style={s.totalLinea}>
                <Text style={s.totalEtq}>Descuento ({cot.DescuentoPorcentaje}%)</Text>
                <Text style={[s.totalVal, { color: '#C0392B' }]}>- {fmt(cot.DescuentoMonto, m)}</Text>
              </View>
            )}
            <View style={s.totalLinea}><Text style={s.totalEtq}>IVA (16%)</Text><Text style={s.totalVal}>{fmt(cot.IVA, m)}</Text></View>
            <View style={s.granTotal}>
              <Text style={s.granTotalEtq}>TOTAL</Text>
              <Text style={s.granTotalVal}>{fmt(cot.Total, m)} {m}</Text>
            </View>
            {cot.AnticipoMonto != null && cot.AnticipoMonto > 0 && (
              <View style={s.anticipoCaja}>
                <View style={s.totalLinea}><Text style={s.totalEtq}>Anticipo ({cot.AnticipoPorcentaje}%)</Text><Text style={s.totalVal}>{fmt(cot.AnticipoMonto, m)}</Text></View>
                <View style={s.totalLinea}><Text style={s.totalEtq}>Saldo</Text><Text style={s.totalVal}>{fmt(cot.Total - cot.AnticipoMonto, m)}</Text></View>
              </View>
            )}
          </View>
        </View>

        {/* Notas y condiciones */}
        <View style={s.notas}>
          {cot.Garantia && (<><Text style={s.notaCat}>Garantía</Text><Text style={s.notaTexto}>{cot.Garantia}</Text></>)}
          {cot.CondicionesEntrega && (<><Text style={s.notaCat}>Entrega</Text><Text style={s.notaTexto}>{cot.CondicionesEntrega}</Text></>)}
          {Object.entries(notasPorCat).map(([cat, textos]) => (
            <View key={cat}>
              <Text style={s.notaCat}>{cat.charAt(0) + cat.slice(1).toLowerCase().replace('_', ' ')}</Text>
              {textos.map((t, i) => <Text key={i} style={s.notaTexto}>• {t}</Text>)}
            </View>
          ))}
          {cot.Observaciones && (
            <View>
              <Text style={s.notaCat}>Observaciones</Text>
              <Text style={s.notaTexto}>{cot.Observaciones}</Text>
            </View>
          )}
          <Text style={[s.notaTexto, { marginTop: 4 }]}>Los precios mostrados incluyen IVA. Precios sujetos a cambio sin previo aviso.</Text>
        </View>

        {/* Pie */}
        <View style={s.pie} fixed>
          <Text style={s.pieTexto}>Mercado de Andamios · Cotización {cot.Folio}</Text>
          <Text style={s.pieTexto} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

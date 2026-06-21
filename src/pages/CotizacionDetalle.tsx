import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Spinner, BadgeEstatus, BadgeTipo, moneda, fecha } from '../components/ui/UI';
import { useToast } from '../components/ui/Toast';
import { cotizacionesApi } from '../api/cotizaciones';
import { mensajeError } from '../api/client';
import { descargarCotizacionPDF } from '../pdf/descargar';
import type { CotizacionCompleta, EstatusCotizacion } from '../types';
import { ETIQUETA_TARIFA } from '../types';
import './CotizacionDetalle.css';

// El visor PDF (y con él toda la librería @react-pdf) se carga solo al usarlo.
const VisorPDF = lazy(() => import('../pdf/VisorPDF'));

export function CotizacionDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const [cot, setCot] = useState<CotizacionCompleta | null>(null);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [verPDF, setVerPDF] = useState(false);

  const cargar = async () => {
    try { setCot(await cotizacionesApi.obtener(Number(id))); }
    catch (e) { setError(mensajeError(e)); }
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [id]);

  const cambiarEstatus = async (estatus: EstatusCotizacion) => {
    if (!cot) return;
    setProcesando(true);
    try {
      const actualizada = await cotizacionesApi.cambiarEstatus(cot.IdCotizacion, estatus);
      setCot(actualizada);
      mostrar(`Cotización ${estatus === 'A' ? 'aprobada' : 'rechazada'}`, 'exito');
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setProcesando(false); }
  };

  const descargar = async () => {
    if (!cot) return;
    setDescargando(true);
    try { await descargarCotizacionPDF(cot); }
    catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setDescargando(false); }
  };

  if (error) return <Layout titulo="Cotización"><div className="login-error">{error}</div></Layout>;
  if (!cot) return <Layout titulo="Cotización"><Spinner /></Layout>;

  const puedeAprobar = cot.Estatus === 'P';
  const puedeRechazar = cot.Estatus === 'P' || cot.Estatus === 'A';

  const acciones = (
    <>
      <button className="btn btn-secundario" onClick={() => navigate('/cotizaciones')}>← Volver</button>
      <button className="btn btn-secundario" onClick={() => setVerPDF((v) => !v)}>
        {verPDF ? 'Ver detalle' : 'Vista previa PDF'}
      </button>
      <button className="btn btn-carbon" disabled={descargando} onClick={descargar}>
        {descargando ? 'Generando…' : '⬇ Descargar PDF'}
      </button>
      {puedeAprobar && <button className="btn btn-exito" disabled={procesando} onClick={() => cambiarEstatus('A')}>Aprobar</button>}
      {puedeRechazar && <button className="btn btn-peligro" disabled={procesando} onClick={() => cambiarEstatus('R')}>Rechazar</button>}
    </>
  );

  // Vista previa del PDF real embebido
  if (verPDF) {
    return (
      <Layout titulo={`Cotización ${cot.Folio}`} acciones={acciones}>
        <div className="pdf-visor">
          <Suspense fallback={<Spinner />}>
            <VisorPDF cot={cot} />
          </Suspense>
        </div>
      </Layout>
    );
  }

  return (
    <Layout titulo={`Cotización ${cot.Folio}`} acciones={acciones}>
      <div className="documento card">
        <div className="doc-membrete">
          <div className="doc-marca">
            <span className="doc-marca-nom">MERCADO DE <span className="naranja">ANDAMIOS</span></span>
            <span className="doc-marca-tag">Renta y venta de maquinaria · La Laguna</span>
          </div>
          <div className="doc-folio">
            <span className="doc-folio-lbl">Cotización</span>
            <span className="doc-folio-num">{cot.Folio}</span>
            <BadgeTipo tipo={cot.Tipo} />
          </div>
        </div>

        <div className="hazard-strip" />

        <div className="doc-datos">
          <div className="doc-bloque">
            <span className="doc-lbl">Cliente</span>
            <strong>{cot.Cliente || '—'}</strong>
            {cot.ClienteContacto && <span>Att: {cot.ClienteContacto}</span>}
            {cot.ClienteTelefono && <span>Tel: {cot.ClienteTelefono}</span>}
          </div>
          <div className="doc-bloque der">
            <div className="doc-meta"><span className="doc-lbl">Fecha</span><strong className="num">{fecha(cot.FechaHora)}</strong></div>
            <div className="doc-meta"><span className="doc-lbl">Vigencia</span><strong className="num">{fecha(cot.FechaVigencia)}</strong></div>
            <div className="doc-meta"><span className="doc-lbl">Estatus</span><BadgeEstatus estatus={cot.Estatus} /></div>
            <div className="doc-meta"><span className="doc-lbl">Elaboró</span><strong>{cot.Usuario}</strong></div>
          </div>
        </div>

        <table className="tabla doc-tabla">
          <thead>
            <tr>
              <th>Código</th><th>Descripción</th>
              {cot.Tipo === 'R' && <th>Tarifa</th>}
              <th className="der">P. Unitario</th><th className="der">Cant.</th><th className="der">Importe</th>
            </tr>
          </thead>
          <tbody>
            {cot.detalles.map((d) => (
              <tr key={d.IdCotizacionDetalle} className="no-hover">
                <td>{d.Codigo || '—'}</td>
                <td>{d.Descripcion}</td>
                {cot.Tipo === 'R' && <td>{d.TipoTarifa ? ETIQUETA_TARIFA[d.TipoTarifa] : '—'}</td>}
                <td className="der num">{moneda(d.PrecioUnitario)}</td>
                <td className="der num">{d.Cantidad}</td>
                <td className="der num"><strong>{moneda(d.Importe)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="doc-totales">
          <div className="doc-tot-fila"><span>Subtotal</span><span className="num">{moneda(cot.SubTotal)}</span></div>
          {cot.Descuento > 0 && <div className="doc-tot-fila"><span>Descuento ({cot.Descuento}%)</span><span className="num">incluido</span></div>}
          <div className="doc-tot-fila"><span>IVA</span><span className="num">{moneda(cot.IVA)}</span></div>
          <div className="doc-tot-fila doc-tot-total"><span>Total</span><span className="num">{moneda(cot.Total)}</span></div>
        </div>

        {cot.Notas && (
          <div className="doc-notas"><span className="doc-lbl">Notas</span><p>{cot.Notas}</p></div>
        )}

        <div className="doc-pie">
          <span>Precios en {cot.Moneda || 'MXN'}. Cotización válida hasta el {fecha(cot.FechaVigencia)}.</span>
        </div>
      </div>
    </Layout>
  );
}

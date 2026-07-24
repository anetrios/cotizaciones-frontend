import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Spinner, BadgeEstatus, BadgeTipo, moneda, fecha } from '../components/ui/UI';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { cotizacionesApi } from '../api/cotizaciones';
import { metaApi } from '../api/meta';
import { mensajeError } from '../api/client';
import { descargarPDF } from '../pdf/descargar';
import { ETIQUETA_UNIDAD } from '../types';
import type { CotizacionCompleta, SucursalConContactos, EstatusCotizacion } from '../types';

const VisorPDF = lazy(() => import('../pdf/VisorPDF').then((m) => ({ default: m.VisorPDF })));

const ETIQUETA_SALDO: Record<string, string> = {
  CONTRA_AVISO_EMBARQUE: 'Contra aviso de embarque',
  CONTRA_EMBARQUE: 'Contra embarque',
  CONTRA_ENTREGA: 'Contra entrega',
};

/** Transiciones permitidas de estatus (misma regla que valida el backend). */
const SIGUIENTES: Record<EstatusCotizacion, EstatusCotizacion[]> = {
  BORRADOR: ['ENVIADA'],
  ENVIADA: ['APROBADA', 'RECHAZADA', 'VENCIDA'],
  APROBADA: [],
  RECHAZADA: ['ENVIADA'],
  VENCIDA: ['ENVIADA'],
};

export default function CotizacionDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { puedeEscribir } = useAuth();

  const [cot, setCot] = useState<CotizacionCompleta | null>(null);
  const [sucursales, setSucursales] = useState<SucursalConContactos[]>([]);
  const [cargando, setCargando] = useState(true);
  const [verPDF, setVerPDF] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) return;
    setCargando(true);
    try {
      const [c, s] = await Promise.all([cotizacionesApi.obtener(+id), metaApi.sucursales()]);
      setCot(c);
      setSucursales(s);
    } catch (e) {
      mostrar(mensajeError(e), 'error');
      navigate('/cotizaciones');
    } finally {
      setCargando(false);
    }
  }, [id, mostrar, navigate]);

  useEffect(() => { cargar(); }, [cargar]);

  const bajarPDF = async () => {
    if (!cot) return;
    setDescargando(true);
    try {
      await descargarPDF(cot, sucursales);
    } catch (e) {
      mostrar(mensajeError(e), 'error');
    } finally {
      setDescargando(false);
    }
  };

  const eliminar = async () => {
    if (!cot) return;
    if (!confirm(`¿Seguro que deseas eliminar la cotización ${cot.Folio}? Esta acción no se puede deshacer.`)) return;
    setEliminando(true);
    try {
      await cotizacionesApi.eliminar(cot.IdCotizacion);
      mostrar('Cotización eliminada', 'exito');
      navigate('/cotizaciones');
    } catch (e) {
      mostrar(mensajeError(e), 'error');
      setEliminando(false);
    }
  };

  const cambiarEstatus = async (nuevo: EstatusCotizacion) => {
    if (!cot) return;
    setCambiando(true);
    try {
      const actualizada = await cotizacionesApi.cambiarEstatus(cot.IdCotizacion, nuevo);
      setCot({ ...cot, ...actualizada });
      mostrar('Estatus actualizado', 'exito');
    } catch (e) {
      mostrar(mensajeError(e), 'error');
    } finally {
      setCambiando(false);
    }
  };

  if (cargando) return <Layout titulo="Cotización"><Spinner /></Layout>;
  if (!cot) return null;

  const m = cot.Moneda;
  const esRenta = cot.Tipo === 'RENTA';
  const siguientes = SIGUIENTES[cot.Estatus] ?? [];
  const notasPorCategoria = cot.notas.reduce<Record<string, string[]>>((acc, n) => {
    (acc[n.Categoria] ??= []).push(n.Texto);
    return acc;
  }, {});

  return (
    <Layout
      titulo={`Cotización ${cot.Folio}`}
      acciones={
        <div className="flex gap-8 wrap">
          <button className="btn btn-secundario" onClick={() => navigate('/cotizaciones')}>← Volver</button>
          <button className="btn btn-secundario" onClick={() => setVerPDF(true)}>Vista previa</button>
          {puedeEscribir && (
            <button className="btn btn-secundario" onClick={() => navigate(`/cotizaciones/${cot.IdCotizacion}/editar`)}>
              Editar
            </button>
          )}
          <button className="btn btn-primario" onClick={bajarPDF} disabled={descargando}>
            {descargando ? 'Generando…' : 'Descargar PDF'}
          </button>
          {puedeEscribir && (
            <button className="btn btn-fantasma" style={{ color: 'var(--error)' }} onClick={eliminar} disabled={eliminando}>
              {eliminando ? 'Eliminando…' : 'Eliminar'}
            </button>
          )}
        </div>
      }
    >
      {/* Barra de estatus */}
      <div className="card doc-barra">
        <div className="flex gap-12 items-center wrap">
          <BadgeTipo t={cot.Tipo} />
          <BadgeEstatus e={cot.Estatus} />
          <span className="texto-suave">
            Elaborada por {cot.Usuario} · Sucursal {cot.Sucursal} · Vigencia {cot.VigenciaDias} días
          </span>
        </div>
        {puedeEscribir && siguientes.length > 0 && (
          <div className="flex gap-8 wrap">
            {siguientes.map((s) => (
              <button
                key={s}
                className={`btn btn-sm ${s === 'APROBADA' ? 'btn-exito' : s === 'RECHAZADA' ? 'btn-peligro' : 'btn-carbon'}`}
                disabled={cambiando}
                onClick={() => cambiarEstatus(s)}
              >
                {s === 'ENVIADA' ? 'Marcar enviada'
                  : s === 'APROBADA' ? 'Aprobar'
                  : s === 'RECHAZADA' ? 'Rechazar' : 'Marcar vencida'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Documento */}
      <div className="card doc">
        <div className="hazard-strip" />

        <div className="doc-encabezado">
          <div>
            <img src="/logo.png" alt="Mercado de Andamios" className="doc-logo" />
            <p className="doc-lema">Renta y Venta de Maquinaria</p>
          </div>
          <div className="doc-folio">
            <span className="doc-folio-lbl">Cotización</span>
            <strong>{cot.Folio}</strong>
            <span className="texto-suave">{fecha(cot.Fecha)}</span>
            {m === 'USD' && (
              <span className="chip warn">USD · T.C. {Number(cot.TipoCambio).toFixed(4)}</span>
            )}
          </div>
        </div>

        {/* Cliente */}
        <div className="doc-seccion">
          <h4 className="doc-titulo">Cliente</h4>
          <div className="grid-2">
            <Dato etiqueta="Razón social" valor={cot.Cliente} />
            <Dato etiqueta="Nombre comercial" valor={cot.ClienteComercial} />
            <Dato etiqueta="RFC" valor={cot.ClienteRFC} />
            <Dato etiqueta="Contacto" valor={cot.ClienteContacto} />
            <Dato etiqueta="Teléfono" valor={cot.ClienteTelefono} />
            <Dato etiqueta="Email" valor={cot.ClienteEmail} />
            <Dato etiqueta="Dirección" valor={cot.ClienteDireccion} ancho />
          </div>
        </div>

        {/* Renglones */}
        <div className="doc-seccion">
          <h4 className="doc-titulo">Conceptos</h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="tabla tabla-doc">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th className="der">Cant.</th>
                  {esRenta && <th className="der">Periodo</th>}
                  <th className="der">P. unitario</th>
                  <th className="der">Importe</th>
                </tr>
              </thead>
              <tbody>
                {cot.renglones.map((r, i) => (
                  <tr key={r.IdRenglon ?? i}>
                    <td className="texto-suave">{i + 1}</td>
                    <td className="num">{r.CodigoSnapshot || '—'}</td>
                    <td>{r.Descripcion}</td>
                    <td className="der num">{r.Cantidad}</td>
                    {esRenta && (
                      <td className="der num">
                        {r.NumeroPeriodos} {ETIQUETA_UNIDAD[r.UnidadCobro || ''] || r.UnidadCobro || ''}
                      </td>
                    )}
                    <td className="der num">{moneda(r.PrecioUnitario, m)}</td>
                    <td className="der num" style={{ fontWeight: 600 }}>{moneda(r.Importe, m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Condiciones + Totales */}
        <div className="doc-pie">
          <div className="doc-condiciones">
            <h4 className="doc-titulo">Condiciones</h4>
            <Dato etiqueta="Tiempo de entrega" valor={cot.TiempoEntrega} />
            <Dato etiqueta="Entrega" valor={cot.CondicionesEntrega} />
            <Dato etiqueta="Garantía" valor={cot.Garantia} />
            <Dato
              etiqueta="Condiciones de pago"
              valor={cot.CondicionPago === 'CREDITO' ? `Crédito a ${cot.DiasCredito} días` : 'Contado'}
            />
            {cot.AnticipoPorcentaje != null && (
              <Dato
                etiqueta="Anticipo"
                valor={`${Number(cot.AnticipoPorcentaje).toFixed(0)}% · ${moneda(cot.AnticipoMonto, m)}`}
              />
            )}
            {cot.FormaLiquidacionSaldo && (
              <Dato etiqueta="Liquidación del saldo" valor={ETIQUETA_SALDO[cot.FormaLiquidacionSaldo] || cot.FormaLiquidacionSaldo} />
            )}
            <Dato etiqueta="Moneda" valor={m === 'USD' ? 'Dólares (USD)' : 'Moneda Nacional (MXN)'} />
          </div>

          <div className="doc-totales">
            <Renglon etiqueta="Subtotal" valor={moneda(cot.Subtotal, m)} />
            {Number(cot.DescuentoMonto) > 0 && (
              <Renglon
                etiqueta={`Descuento (${Number(cot.DescuentoPorcentaje).toFixed(2)}%)`}
                valor={`− ${moneda(cot.DescuentoMonto, m)}`}
                acento
              />
            )}
            <Renglon etiqueta="IVA" valor={moneda(cot.IVA, m)} />
            <div className="doc-total">
              <span>Total</span>
              <strong>{moneda(cot.Total, m)}</strong>
            </div>
            {cot.AnticipoMonto != null && Number(cot.AnticipoMonto) > 0 && (
              <>
                <Renglon etiqueta="Anticipo" valor={moneda(cot.AnticipoMonto, m)} />
                <Renglon etiqueta="Saldo" valor={moneda(Number(cot.Total) - Number(cot.AnticipoMonto), m)} />
              </>
            )}
          </div>
        </div>

        {/* Notas */}
        {Object.keys(notasPorCategoria).length > 0 && (
          <div className="doc-seccion doc-notas">
            <h4 className="doc-titulo">Notas y condiciones</h4>
            {Object.entries(notasPorCategoria).map(([cat, textos]) => (
              <div key={cat} className="doc-nota-grupo">
                <span className="doc-nota-cat">{cat.replace(/_/g, ' ')}</span>
                <ul>{textos.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vista previa PDF */}
      {verPDF && (
        <div className="modal-fondo" onClick={() => setVerPDF(false)}>
          <div className="modal modal-pdf" onClick={(e) => e.stopPropagation()}>
            <div className="modal-cabeza">
              <h3>Vista previa · {cot.Folio}</h3>
              <button className="modal-cerrar" onClick={() => setVerPDF(false)} aria-label="Cerrar">×</button>
            </div>
            <div className="modal-cuerpo" style={{ padding: 0, height: '75vh' }}>
              <Suspense fallback={<Spinner />}>
                <VisorPDF cot={cot} sucursales={sucursales} />
              </Suspense>
            </div>
            <div className="modal-pie">
              <button className="btn btn-secundario" onClick={() => setVerPDF(false)}>Cerrar</button>
              <button className="btn btn-primario" onClick={bajarPDF} disabled={descargando}>
                {descargando ? 'Generando…' : 'Descargar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function Dato({ etiqueta, valor, ancho }: { etiqueta: string; valor?: string | null; ancho?: boolean }) {
  return (
    <div className="doc-dato" style={ancho ? { gridColumn: '1 / -1' } : undefined}>
      <span className="doc-dato-lbl">{etiqueta}</span>
      <span className="doc-dato-val">{valor || '—'}</span>
    </div>
  );
}

function Renglon({ etiqueta, valor, acento }: { etiqueta: string; valor: string; acento?: boolean }) {
  return (
    <div className="doc-total-fila">
      <span>{etiqueta}</span>
      <span className="num" style={acento ? { color: 'var(--error)' } : undefined}>{valor}</span>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Modal } from '../components/ui/Modal';
import { Spinner, Vacio, BadgeEstatus, BadgeTipo, moneda, fecha } from '../components/ui/UI';
import { Paginador } from '../components/ui/Paginador';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { cotizacionesApi } from '../api/cotizaciones';
import { mensajeError } from '../api/client';
import { ETIQUETA_ESTATUS, ETIQUETA_MOTIVO_NO_CONCRECION } from '../types';
import type { CotizacionResumen, EstatusCotizacion, MotivoNoConcrecion } from '../types';

const OPCIONES_POR_PAGINA = [20, 50];

const OPCIONES_ESTATUS_LOTE: Array<{ valor: EstatusCotizacion; etiqueta: string }> = [
  { valor: 'BORRADOR', etiqueta: 'Borrador' },
  { valor: 'ENVIADA', etiqueta: 'Enviada' },
  { valor: 'PENDIENTE', etiqueta: 'Pendiente de respuesta' },
  { valor: 'CONCRETADA', etiqueta: 'Concretada' },
  { valor: 'NO_CONCRETADA', etiqueta: 'No concretada' },
];

const OPCIONES_MOTIVO = Object.entries(ETIQUETA_MOTIVO_NO_CONCRECION) as Array<[MotivoNoConcrecion, string]>;

interface ResultadoLote {
  actualizadas: number[];
  fallidas: Array<{ IdCotizacion: number; error: string }>;
  folios: Record<number, string>;
}

export default function MisCotizaciones() {
  const [filas, setFilas] = useState<CotizacionResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [folio, setFolio] = useState('');
  const [tipo, setTipo] = useState('');
  const [estatus, setEstatus] = useState('');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(20);
  const [total, setTotal] = useState(0);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [estatusLote, setEstatusLote] = useState<EstatusCotizacion | ''>('');
  const [aplicando, setAplicando] = useState(false);
  const [modalMotivo, setModalMotivo] = useState(false);
  const [motivo, setMotivo] = useState<MotivoNoConcrecion | ''>('');
  const [detalleMotivo, setDetalleMotivo] = useState('');
  const [modalConcretar, setModalConcretar] = useState(false);
  const [pasoConcretar, setPasoConcretar] = useState(0);
  const [facturasLote, setFacturasLote] = useState<Record<number, string>>({});
  const [resultado, setResultado] = useState<ResultadoLote | null>(null);
  const { mostrar } = useToast();
  const { usuario, puedeEscribir } = useAuth();
  const navigate = useNavigate();

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    try {
      const { datos, total } = await cotizacionesApi.listar({
        usuario: usuario.IdUsuario, folio, tipo, estatus, pagina, porPagina,
      });
      setFilas(datos); setTotal(total);
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setCargando(false); }
  }, [usuario, folio, tipo, estatus, pagina, porPagina, mostrar]);

  useEffect(() => { setPagina(1); }, [folio, tipo, estatus, porPagina]);
  useEffect(() => { const t = setTimeout(cargar, 300); return () => clearTimeout(t); }, [cargar]);
  useEffect(() => { setSeleccionados(new Set()); }, [filas]);

  const todosSeleccionados = filas.length > 0 && filas.every((f) => seleccionados.has(f.IdCotizacion));
  const toggleTodos = () => setSeleccionados(todosSeleccionados ? new Set() : new Set(filas.map((f) => f.IdCotizacion)));
  const toggleUno = (id: number) => setSeleccionados((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const seleccionArray = filas.filter((f) => seleccionados.has(f.IdCotizacion));

  const ejecutarCambioLote = async (motivoSel?: MotivoNoConcrecion, detalleSel?: string, facturasSel?: Record<number, string>) => {
    if (!estatusLote) return;
    const folios = Object.fromEntries(
      filas.filter((f) => seleccionados.has(f.IdCotizacion)).map((f) => [f.IdCotizacion, f.Folio]));
    setAplicando(true);
    try {
      const res = await cotizacionesApi.cambiarEstatusLote(Array.from(seleccionados), estatusLote, motivoSel, detalleSel, facturasSel);
      setResultado({ ...res, folios });
      if (res.fallidas.length === 0) {
        mostrar(`${res.actualizadas.length} cotización(es) actualizada(s) a ${ETIQUETA_ESTATUS[estatusLote]}`, 'exito');
      } else {
        mostrar(`${res.actualizadas.length} actualizada(s), ${res.fallidas.length} con error`, res.actualizadas.length ? 'normal' : 'error');
      }
      setEstatusLote('');
      setModalMotivo(false);
      setModalConcretar(false);
      cargar();
    } catch (e) {
      mostrar(mensajeError(e), 'error');
    } finally {
      setAplicando(false);
    }
  };

  const iniciarCambioLote = () => {
    if (!estatusLote) return;
    if (estatusLote === 'NO_CONCRETADA') {
      setMotivo(''); setDetalleMotivo(''); setModalMotivo(true);
      return;
    }
    if (estatusLote === 'CONCRETADA') {
      setFacturasLote({}); setPasoConcretar(0); setModalConcretar(true);
      return;
    }
    const etiqueta = ETIQUETA_ESTATUS[estatusLote];
    if (!confirm(`¿Deseas cambiar el estatus de ${seleccionados.size} cotización(es) a "${etiqueta}"?`)) return;
    ejecutarCambioLote();
  };

  const confirmarMotivoLote = () => {
    if (!motivo) return;
    ejecutarCambioLote(motivo, detalleMotivo);
  };

  const confirmarConcretarLote = () => {
    const facturas = Object.fromEntries(
      Object.entries(facturasLote).filter(([, v]) => v.trim()));
    ejecutarCambioLote(undefined, undefined, facturas);
  };

  return (
    <Layout titulo="Mis cotizaciones">
      <div className="flex gap-12 wrap" style={{ marginBottom: 16 }}>
        <input className="input" style={{ maxWidth: 220 }} placeholder="Buscar folio…" value={folio} onChange={(e) => setFolio(e.target.value)} />
        <select className="select" style={{ maxWidth: 180 }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="RENTA">Renta</option>
          <option value="VENTA">Venta</option>
        </select>
        <select className="select" style={{ maxWidth: 220 }} value={estatus} onChange={(e) => setEstatus(e.target.value)}>
          <option value="">Todos los estatus</option>
          <option value="BORRADOR">Borrador</option>
          <option value="ENVIADA">Enviada</option>
          <option value="PENDIENTE">Pendiente de respuesta</option>
          <option value="CONCRETADA">Concretada</option>
          <option value="NO_CONCRETADA">No concretada</option>
        </select>
      </div>

      {puedeEscribir && seleccionados.size > 0 && (
        <div className="card card-cuerpo flex items-center gap-12 wrap" style={{ marginBottom: 16 }}>
          <strong>{seleccionados.size} seleccionada(s)</strong>
          <select
            className="select" style={{ maxWidth: 220 }} value={estatusLote}
            onChange={(e) => setEstatusLote(e.target.value as EstatusCotizacion | '')}
          >
            <option value="">Cambiar estatus a…</option>
            {OPCIONES_ESTATUS_LOTE.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
          </select>
          <button className="btn btn-primario btn-sm" disabled={!estatusLote || aplicando} onClick={iniciarCambioLote}>
            {aplicando ? 'Aplicando…' : 'Aplicar'}
          </button>
        </div>
      )}

      <div className="card">
        {cargando ? <Spinner /> : filas.length === 0 ? (
          <Vacio titulo="Sin cotizaciones">No tienes cotizaciones con este filtro.</Vacio>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tabla">
              <thead>
                <tr>
                  {puedeEscribir && (
                    <th style={{ width: 36 }}>
                      <input type="checkbox" checked={todosSeleccionados} onChange={toggleTodos} disabled={aplicando} />
                    </th>
                  )}
                  <th>Folio</th><th>Tipo</th><th>Cliente</th><th>Fecha</th>
                  <th>Estatus</th><th className="der">Total</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((c) => (
                  <tr key={c.IdCotizacion} className="clic"
                    onClick={() => navigate(`/cotizaciones/${c.IdCotizacion}`, { state: { from: '/mis-cotizaciones' } })}
                  >
                    {puedeEscribir && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox" checked={seleccionados.has(c.IdCotizacion)} disabled={aplicando}
                          onChange={() => toggleUno(c.IdCotizacion)}
                        />
                      </td>
                    )}
                    <td style={{ fontFamily: 'var(--display)', fontWeight: 700 }}>{c.Folio}</td>
                    <td><BadgeTipo t={c.Tipo} /></td>
                    <td>{c.Cliente}</td>
                    <td>{fecha(c.Fecha)}</td>
                    <td><BadgeEstatus e={c.Estatus} /></td>
                    <td className="der num" style={{ fontWeight: 600 }}>{moneda(c.Total, c.Moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Paginador
        pagina={pagina} total={total} porPagina={porPagina} onCambiar={setPagina}
        opcionesPorPagina={OPCIONES_POR_PAGINA} onCambiarPorPagina={setPorPagina}
      />

      {modalMotivo && (
        <Modal
          titulo={`Marcar ${seleccionados.size} cotización(es) como no concretada`}
          onCerrar={() => setModalMotivo(false)}
          pie={<>
            <button className="btn btn-secundario" onClick={() => setModalMotivo(false)}>Cancelar</button>
            <button
              className="btn btn-peligro"
              disabled={aplicando || !motivo || (motivo === 'OTRO' && !detalleMotivo.trim())}
              onClick={confirmarMotivoLote}
            >
              {aplicando ? 'Guardando…' : 'Confirmar'}
            </button>
          </>}
        >
          <div className="campo">
            <label htmlFor="motivo-lote">Motivo</label>
            <select id="motivo-lote" className="select" value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoNoConcrecion)}>
              <option value="">— Selecciona —</option>
              {OPCIONES_MOTIVO.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
            </select>
          </div>
          {motivo === 'OTRO' && (
            <div className="campo" style={{ marginTop: 14 }}>
              <label htmlFor="detalle-lote">Especifica el motivo<span className="req"> *</span></label>
              <textarea id="detalle-lote" className="textarea" value={detalleMotivo}
                onChange={(e) => setDetalleMotivo(e.target.value)} />
            </div>
          )}
        </Modal>
      )}

      {modalConcretar && (() => {
        const faltantes = seleccionArray.filter((c) => !facturasLote[c.IdCotizacion]?.trim());
        const facturaActual = pasoConcretar < seleccionArray.length
          ? facturasLote[seleccionArray[pasoConcretar].IdCotizacion] || '' : '';
        return (
        <Modal
          titulo={
            pasoConcretar < seleccionArray.length
              ? `Factura o contrato (${pasoConcretar + 1} de ${seleccionArray.length})`
              : 'Revisión antes de confirmar'
          }
          onCerrar={() => setModalConcretar(false)}
          pie={
            pasoConcretar < seleccionArray.length ? (
              <>
                <button className="btn btn-secundario" onClick={() => setModalConcretar(false)}>Cancelar</button>
                {pasoConcretar > 0 && (
                  <button className="btn btn-secundario" onClick={() => setPasoConcretar((p) => p - 1)}>← Anterior</button>
                )}
                <button className="btn btn-primario" disabled={!facturaActual.trim()} onClick={() => setPasoConcretar((p) => p + 1)}>
                  {pasoConcretar === seleccionArray.length - 1 ? 'Revisar →' : 'Siguiente →'}
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-secundario" onClick={() => setModalConcretar(false)}>Cancelar</button>
                <button className="btn btn-secundario" onClick={() => setPasoConcretar((p) => p - 1)}>← Anterior</button>
                <button className="btn btn-exito" disabled={aplicando || faltantes.length > 0} onClick={confirmarConcretarLote}>
                  {aplicando ? 'Guardando…' : 'Confirmar'}
                </button>
              </>
            )
          }
        >
          {pasoConcretar < seleccionArray.length ? (
            <div className="campo">
              <div style={{ padding: 12, marginBottom: 4, background: 'var(--fondo)', borderRadius: 'var(--radio-sm)' }}>
                <div className="flex items-center gap-8" style={{ marginBottom: 4 }}>
                  <strong style={{ fontFamily: 'var(--display)', fontSize: 15 }}>{seleccionArray[pasoConcretar].Folio}</strong>
                  <BadgeTipo t={seleccionArray[pasoConcretar].Tipo} />
                </div>
                <div style={{ fontSize: 13, marginBottom: 2 }}>{seleccionArray[pasoConcretar].Cliente}</div>
                <div className="texto-suave" style={{ fontSize: 12 }}>
                  {fecha(seleccionArray[pasoConcretar].Fecha)} · Total {moneda(seleccionArray[pasoConcretar].Total, seleccionArray[pasoConcretar].Moneda)}
                  {' '}· Sucursal {seleccionArray[pasoConcretar].Sucursal}
                </div>
              </div>
              <label htmlFor="factura-lote">Número de factura o contrato<span className="req"> *</span></label>
              <input
                id="factura-lote" className="input" autoFocus
                value={facturaActual}
                onChange={(e) => setFacturasLote((prev) => ({
                  ...prev, [seleccionArray[pasoConcretar].IdCotizacion]: e.target.value,
                }))}
                placeholder="Ej. F-2026-0134"
              />
            </div>
          ) : (
            <ul style={{ paddingLeft: 18, maxHeight: 360, overflowY: 'auto' }}>
              {seleccionArray.map((c) => (
                <li key={c.IdCotizacion} style={{ marginBottom: 6 }}>
                  <strong>{c.Folio}</strong> · {c.Cliente} · {fecha(c.Fecha)} · {moneda(c.Total, c.Moneda)}
                  {' '}— {facturasLote[c.IdCotizacion]?.trim() || 'falta capturar'}
                </li>
              ))}
            </ul>
          )}
        </Modal>
        );
      })()}

      {resultado && resultado.fallidas.length > 0 && (
        <Modal titulo="Resultado del cambio de estatus" onCerrar={() => setResultado(null)} pie={
          <button className="btn btn-secundario" onClick={() => setResultado(null)}>Cerrar</button>
        }>
          <p style={{ marginBottom: 10 }}>
            {resultado.actualizadas.length} actualizada(s), {resultado.fallidas.length} con error:
          </p>
          <ul style={{ paddingLeft: 18 }}>
            {resultado.fallidas.map((f) => (
              <li key={f.IdCotizacion}>
                <strong>{resultado.folios[f.IdCotizacion] ?? `#${f.IdCotizacion}`}</strong>: {f.error}
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </Layout>
  );
}

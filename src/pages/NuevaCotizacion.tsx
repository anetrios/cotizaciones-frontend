import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Modal } from '../components/ui/Modal';
import { Spinner, moneda } from '../components/ui/UI';
import { useToast } from '../components/ui/Toast';
import { crearRecursoApi } from '../api/recurso';
import { metaApi } from '../api/meta';
import { cotizacionesApi } from '../api/cotizaciones';
import { mensajeError, codigoError } from '../api/client';
import { clientesApi } from '../api/clientes';
import { ModalCliente } from '../components/ModalCliente';
import type { Cliente, ContactoCliente, Nota, TipoCotizacion } from '../types';
import './NuevaCotizacion.css';

interface RenglonForm {
  key: string;
  IdArticuloRenta?: number | null; IdArticuloVenta?: number | null; IdServicio?: number | null;
  CodigoSnapshot: string | null; Descripcion: string;
  PrecioUnitario: number; Cantidad: number;
  UnidadCobro: string | null; NumeroPeriodos: number;
  DescuentoPorcentaje: number;
}
const ETQ_UNIDAD: Record<string, string> = { DIA: 'día(s)', MES: 'mes(es)', EVENTO: 'evento', SECCION: 'sección', PIEZA: 'pieza' };
const uid = () => Math.random().toString(36).slice(2, 9);
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export default function NuevaCotizacion() {
  const { id } = useParams<{ id: string }>();
  const editando = !!id;
  const navigate = useNavigate();
  const { mostrar } = useToast();

  const [tipo, setTipo] = useState<TipoCotizacion>('RENTA');
  const [folio, setFolio] = useState('');
  const [sucursales, setSucursales] = useState<{ IdSucursal: number; Nombre: string }[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [umbralPin, setUmbralPin] = useState(15);
  const [cargandoCot, setCargandoCot] = useState(editando);

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [contactos, setContactos] = useState<ContactoCliente[]>([]);
  const [idContacto, setIdContacto] = useState<number | ''>('');
  const [idSucursal, setIdSucursal] = useState<number | ''>('');
  const [moneda_, setMoneda] = useState<'MXN' | 'USD'>('MXN');
  const [tipoCambio, setTipoCambio] = useState<number | ''>('');
  const [vigencia, setVigencia] = useState(15);
  const [condPago, setCondPago] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [diasCredito, setDiasCredito] = useState<number | ''>('');
  const [tiempoEntrega, setTiempoEntrega] = useState('');
  const [garantia, setGarantia] = useState('');
  const [condEntrega, setCondEntrega] = useState('');
  const [anticipoPct, setAnticipoPct] = useState<number | ''>('');
  const [formaSaldo, setFormaSaldo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [ivaPct, setIvaPct] = useState(16);
  const [pin, setPin] = useState('');
  const [bloqueoSegunServidor, setBloqueoSegunServidor] = useState(false);

  const [renglones, setRenglones] = useState<RenglonForm[]>([]);
  const [modalCliente, setModalCliente] = useState(false);
  const [modalConcepto, setModalConcepto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    crearRecursoApi('admin/sucursales').listar().then(setSucursales).catch(() => {
      // vendedores no acceden a /admin/sucursales; usar meta
      metaApi.sucursales().then((s) => setSucursales(s.map((x) => ({ IdSucursal: x.IdSucursal, Nombre: x.Nombre }))));
    });
    cotizacionesApi.parametros().then((p) => setUmbralPin(p.umbralDescuentoPin)).catch(() => {});
  }, []);

  // Contactos del cliente elegido. Con uno solo se toma automáticamente y no
  // estorba; con varios aparece el selector. Sin contactos no pasa nada: la
  // cotización sale con los datos del cliente, como siempre.
  useEffect(() => {
    if (!cliente) { setContactos([]); return; }
    let vigente = true;
    clientesApi.contactos(cliente.IdCliente)
      .then((lista) => {
        if (!vigente) return;
        setContactos(lista);
        const principal = lista.find((c) => c.EsPrincipal);
        // `prev ||` respeta lo que ya venía elegido al editar una cotización.
        setIdContacto((prev) => prev || principal?.IdContacto || (lista.length === 1 ? lista[0].IdContacto : ''));
      })
      .catch(() => { if (vigente) setContactos([]); });
    return () => { vigente = false; };
  }, [cliente]);

  // Cargar cotización existente en modo edición
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const cot = await cotizacionesApi.obtener(+id);
        const cli = await crearRecursoApi('clientes').obtener(cot.IdCliente) as Cliente;
        setTipo(cot.Tipo);
        setFolio(cot.Folio);
        setIdContacto(cot.IdContactoCliente ?? '');
        setCliente(cli);
        setIdSucursal(cot.IdSucursal);
        setMoneda(cot.Moneda as 'MXN' | 'USD');
        setTipoCambio(cot.TipoCambio ?? '');
        setVigencia(cot.VigenciaDias);
        setCondPago(cot.CondicionPago);
        setDiasCredito(cot.DiasCredito ?? '');
        setTiempoEntrega(cot.TiempoEntrega ?? '');
        setGarantia(cot.Garantia ?? '');
        setCondEntrega(cot.CondicionesEntrega ?? '');
        setAnticipoPct(cot.AnticipoPorcentaje ?? '');
        setFormaSaldo(cot.FormaLiquidacionSaldo ?? '');
        setObservaciones(cot.Observaciones ?? '');
        setDescuento(Number(cot.DescuentoPorcentaje));
        const baseGravable = Number(cot.Subtotal) - Number(cot.DescuentoMonto);
        setIvaPct(baseGravable > 0 ? Math.round((Number(cot.IVA) / baseGravable) * 100) : 16);
        setRenglones(cot.renglones.map((r) => ({
          key: uid(), IdArticuloRenta: r.IdArticuloRenta, IdArticuloVenta: r.IdArticuloVenta, IdServicio: r.IdServicio,
          CodigoSnapshot: r.CodigoSnapshot, Descripcion: r.Descripcion, PrecioUnitario: Number(r.PrecioUnitario),
          Cantidad: Number(r.Cantidad), UnidadCobro: r.UnidadCobro, NumeroPeriodos: Number(r.NumeroPeriodos) || 1,
          DescuentoPorcentaje: Number(r.DescuentoPorcentaje) || 0,
        })));
      } catch (e) {
        mostrar(mensajeError(e), 'error');
        navigate('/cotizaciones');
      } finally {
        setCargandoCot(false);
      }
    })();
  }, [id, mostrar, navigate]);

  useEffect(() => {
    metaApi.notas(tipo).then((ns) => {
      setNotas(ns);
      if (editando) return; // no pisar los datos ya cargados de la cotización
      // precargar defaults
      const def = (cat: string) => ns.find((n) => n.Categoria === cat && n.EsDefault)?.Texto || '';
      setTiempoEntrega(def('TIEMPO_ENTREGA'));
      setCondEntrega(def('ENTREGA'));
      setGarantia(tipo === 'VENTA' ? def('GARANTIA') : '');
    });
    if (editando) return;
    // limpiar renglones al cambiar de tipo (cambian los conceptos válidos)
    setRenglones([]);
  }, [tipo, editando]);

  const notasDe = (cat: string) => notas.filter((n) => n.Categoria === cat);

  const totales = useMemo(() => {
    const conImporte = renglones.map((r) => {
      const per = tipo === 'RENTA' ? (r.NumeroPeriodos || 1) : 1;
      const bruto = r2(r.Cantidad * per * r.PrecioUnitario);
      const descLinea = r2(bruto * ((r.DescuentoPorcentaje || 0) / 100));
      return { ...r, Importe: r2(bruto - descLinea) };
    });
    const subtotal = r2(conImporte.reduce((a, r) => a + r.Importe, 0));
    const descMonto = r2(subtotal * (descuento / 100));
    const base = r2(subtotal - descMonto);
    const iva = r2(base * (ivaPct / 100));
    const total = r2(base + iva);
    const anticipo = tipo === 'VENTA' && anticipoPct !== '' ? r2(total * (Number(anticipoPct) / 100)) : null;
    return { conImporte, subtotal, descMonto, iva, total, anticipo };
  }, [renglones, tipo, descuento, ivaPct, anticipoPct]);

  // El PIN lo pide el servidor en dos casos: descuento sobre el umbral, o cliente
  // bloqueado. Aquí solo se anticipa para no hacer capturar la cotización completa
  // y toparse con el rechazo hasta el final.
  //
  // `bloqueoSegunServidor` cubre el hueco: si alguien bloqueó al cliente después de
  // que se cargó esta pantalla, el rechazo llega al guardar y sin esto no habría
  // dónde escribir el PIN — habría que recargar y capturar todo de nuevo.
  const clienteBloqueado = cliente?.Restriccion === 'BLOQUEO' || bloqueoSegunServidor;
  const requierePin = clienteBloqueado
    || descuento > umbralPin
    || renglones.some((r) => (r.DescuentoPorcentaje || 0) > umbralPin);

  const actualizarRenglon = (key: string, campo: keyof RenglonForm, valor: unknown) =>
    setRenglones((prev) => prev.map((r) => (r.key === key ? { ...r, [campo]: valor } : r)));
  const quitarRenglon = (key: string) => setRenglones((prev) => prev.filter((r) => r.key !== key));

  const validar = (): string | null => {
    if (!cliente) return 'Selecciona un cliente';
    if (!idSucursal) return 'Selecciona una sucursal';
    if (!renglones.length) return 'Agrega al menos un concepto';
    if (moneda_ === 'USD' && !tipoCambio) return 'Indica el tipo de cambio para USD';
    if (condPago === 'CREDITO' && !diasCredito) return 'Indica los días de crédito';
    if (requierePin && !pin) {
      return clienteBloqueado
        ? 'El cliente está BLOQUEADO: cotizarle requiere PIN de supervisor'
        : `El descuento de ${descuento}% requiere PIN de supervisor`;
    }
    return null;
  };

  const guardar = async () => {
    const err = validar();
    if (err) { mostrar(err, 'error'); return; }
    setGuardando(true);
    try {
      const payload = {
        Tipo: tipo, IdCliente: cliente!.IdCliente,
        IdContactoCliente: idContacto === '' ? null : Number(idContacto),
        IdSucursal: Number(idSucursal),
        Moneda: moneda_, TipoCambio: moneda_ === 'USD' ? Number(tipoCambio) : null,
        VigenciaDias: vigencia,
        TiempoEntrega: tiempoEntrega || null, Garantia: garantia || null, CondicionesEntrega: condEntrega || null,
        CondicionPago: condPago, DiasCredito: condPago === 'CREDITO' ? Number(diasCredito) : null,
        AnticipoPorcentaje: tipo === 'VENTA' && anticipoPct !== '' ? Number(anticipoPct) : null,
        FormaLiquidacionSaldo: tipo === 'VENTA' ? (formaSaldo || null) : null,
        Observaciones: observaciones || null,
        DescuentoPorcentaje: descuento, IVAPorcentaje: ivaPct,
        PinSupervisor: requierePin ? pin : null,
        renglones: renglones.map((r, i) => ({
          Orden: i + 1, IdArticuloRenta: r.IdArticuloRenta ?? null, IdArticuloVenta: r.IdArticuloVenta ?? null,
          IdServicio: r.IdServicio ?? null, CodigoSnapshot: r.CodigoSnapshot, Descripcion: r.Descripcion,
          PrecioUnitario: r.PrecioUnitario, Cantidad: r.Cantidad,
          UnidadCobro: r.UnidadCobro, NumeroPeriodos: tipo === 'RENTA' ? r.NumeroPeriodos : 1,
          DescuentoPorcentaje: r.DescuentoPorcentaje || 0,
        })),
      };
      if (editando) {
        const actualizada = await cotizacionesApi.actualizar(+id!, payload);
        mostrar(`Cotización ${actualizada.Folio} actualizada`, 'exito');
        navigate(`/cotizaciones/${actualizada.IdCotizacion}`);
      } else {
        const creada = await cotizacionesApi.crear(payload);
        mostrar(`Cotización ${creada.Folio} creada`, 'exito');
        navigate(`/cotizaciones/${creada.IdCotizacion}`);
      }
    } catch (e) {
      // Si el rechazo es por bloqueo, se abre el campo del PIN en vez de dejar
      // al vendedor con la cotización capturada y sin salida.
      if (codigoError(e) === 'CLIENTE_BLOQUEADO') setBloqueoSegunServidor(true);
      mostrar(mensajeError(e), 'error');
    }
    finally { setGuardando(false); }
  };

  if (cargandoCot) return <Layout titulo="Editar cotización"><Spinner /></Layout>;

  return (
    <Layout titulo={editando ? `Editar cotización ${folio}` : 'Nueva cotización'} acciones={
      <button className="btn btn-secundario" onClick={() => navigate(editando ? `/cotizaciones/${id}` : '/cotizaciones')}>Cancelar</button>
    }>
      <div className="nc-layout">
        <div className="nc-form">
          {/* Tipo */}
          <section className="card card-cuerpo">
            <h3 className="nc-seccion">1 · Tipo de cotización</h3>
            <div className="nc-tipo-selector">
              {(['RENTA', 'VENTA'] as TipoCotizacion[]).map((t) => (
                <button key={t} className={`nc-tipo-btn ${tipo === t ? 'activo' : ''}`} onClick={() => setTipo(t)}>
                  <span className="nc-tipo-titulo">{t === 'RENTA' ? 'Renta' : 'Venta'}</span>
                  <span className="nc-tipo-desc">{t === 'RENTA' ? 'Por días o meses' : 'Equipo / productos'}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Cliente + sucursal */}
          <section className="card card-cuerpo">
            <h3 className="nc-seccion">2 · Cliente y sucursal</h3>
            {cliente ? (
              <div className={`nc-cliente ${cliente.Restriccion !== 'NINGUNA' ? 'restringido' : ''}`}>
                <div>
                  <strong>{cliente.RazonSocial}</strong>
                  {cliente.RFC && <span className="texto-suave"> · {cliente.RFC}</span>}
                  {cliente.Restriccion !== 'NINGUNA' && (
                    <div className={`aviso ${cliente.Restriccion === 'BLOQUEO' ? 'error' : 'warn'} mt-8`}>
                      {cliente.Restriccion === 'BLOQUEO' ? '⛔ Cliente BLOQUEADO' : '⚠ Cliente con advertencia'}
                      {cliente.MotivoRestriccion ? `: ${cliente.MotivoRestriccion}` : ''}
                      {cliente.Restriccion === 'BLOQUEO' && (
                        <div style={{ marginTop: 4, fontWeight: 400 }}>
                          Se puede cotizar con PIN de supervisor. Queda registrado quién autorizó.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button className="btn btn-secundario btn-sm" onClick={() => setModalCliente(true)}>Cambiar</button>
              </div>
            ) : (
              <button className="btn btn-secundario" onClick={() => setModalCliente(true)}>Seleccionar cliente…</button>
            )}

            {/* Con un solo contacto se toma solo; el selector aparece cuando hay a quién elegir. */}
            {cliente && contactos.length > 1 && (
              <div className="campo mt-16">
                <label htmlFor="nc-contacto">Se le cotiza a</label>
                <select id="nc-contacto" className="select" value={idContacto}
                  onChange={(e) => setIdContacto(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">— Sin contacto específico —</option>
                  {contactos.map((c) => (
                    <option key={c.IdContacto} value={c.IdContacto}>
                      {[c.Nombre, c.Puesto].filter(Boolean).join(' · ') || c.Telefono || c.Email}
                      {c.EsPrincipal ? ' (principal)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {cliente && contactos.length === 1 && contactos[0].Nombre && (
              <p className="nc-mini mt-8">Se le cotiza a {contactos[0].Nombre}.</p>
            )}
            <div className="campo mt-16">
              <label>Sucursal <span className="req">*</span></label>
              <select className="select" value={idSucursal} onChange={(e) => setIdSucursal(e.target.value ? Number(e.target.value) : '')}>
                <option value="">— Selecciona —</option>
                {sucursales.map((s) => <option key={s.IdSucursal} value={s.IdSucursal}>{s.Nombre}</option>)}
              </select>
            </div>
          </section>

          {/* Conceptos */}
          <section className="card card-cuerpo">
            <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
              <h3 className="nc-seccion" style={{ margin: 0 }}>3 · Conceptos</h3>
              <button className="btn btn-primario btn-sm" onClick={() => setModalConcepto(true)}>+ Agregar</button>
            </div>
            {renglones.length === 0 ? (
              <p className="texto-suave">Aún no hay conceptos. Agrega artículos{tipo === 'RENTA' ? ' o servicios' : ''}.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tabla nc-tabla">
                  <thead>
                    <tr>
                      <th>Descripción</th><th style={{ width: 70 }}>Cant.</th>
                      {tipo === 'RENTA' && <th style={{ width: 130 }}>Periodo</th>}
                      <th style={{ width: 110 }}>P. Unit.</th>
                      <th style={{ width: 90 }}>Desc. %</th>
                      <th className="der" style={{ width: 110 }}>Importe</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {totales.conImporte.map((r) => (
                      <tr key={r.key}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.Descripcion}</div>
                          {r.CodigoSnapshot && <div className="texto-suave" style={{ fontSize: 12 }}>{r.CodigoSnapshot}</div>}
                        </td>
                        <td><input className="input nc-mini" type="number" min={1} value={r.Cantidad}
                          onChange={(e) => actualizarRenglon(r.key, 'Cantidad', Math.max(1, Number(e.target.value)))} /></td>
                        {tipo === 'RENTA' && (
                          <td>
                            {r.IdServicio ? <span className="texto-suave">—</span> : (
                              <div className="flex items-center gap-6">
                                <input className="input nc-mini" type="number" min={1} value={r.NumeroPeriodos}
                                  onChange={(e) => actualizarRenglon(r.key, 'NumeroPeriodos', Math.max(1, Number(e.target.value)))} />
                                <span className="texto-suave" style={{ fontSize: 12 }}>{ETQ_UNIDAD[r.UnidadCobro || ''] || ''}</span>
                              </div>
                            )}
                          </td>
                        )}
                        <td><input className="input nc-mini" style={{ width: 96 }} type="number" min={0} step="any" value={r.PrecioUnitario}
                          onChange={(e) => actualizarRenglon(r.key, 'PrecioUnitario', Number(e.target.value))} /></td>
                        <td><input className="input nc-mini" type="number" min={0} max={100} step="any" value={r.DescuentoPorcentaje}
                          onChange={(e) => actualizarRenglon(r.key, 'DescuentoPorcentaje', Math.min(100, Math.max(0, Number(e.target.value))))} /></td>
                        <td className="der num" style={{ fontWeight: 600 }}>{moneda(r.Importe, moneda_)}</td>
                        <td><button className="btn btn-fantasma btn-sm" style={{ color: 'var(--error)' }} onClick={() => quitarRenglon(r.key)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Condiciones */}
          <section className="card card-cuerpo">
            <h3 className="nc-seccion">4 · Condiciones</h3>
            <div className="grid-2">
              <div className="campo">
                <label>Moneda</label>
                <select className="select" value={moneda_} onChange={(e) => setMoneda(e.target.value as 'MXN' | 'USD')}>
                  <option value="MXN">Pesos (MXN)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </div>
              {moneda_ === 'USD' && (
                <div className="campo">
                  <label>Tipo de cambio <span className="req">*</span></label>
                  <input className="input" type="number" step="any" value={tipoCambio}
                    onChange={(e) => setTipoCambio(e.target.value ? Number(e.target.value) : '')} placeholder="Ej. 18.50" />
                </div>
              )}
              <div className="campo">
                <label>Condición de pago</label>
                <select className="select" value={condPago} onChange={(e) => setCondPago(e.target.value as 'CONTADO' | 'CREDITO')}>
                  <option value="CONTADO">Contado</option>
                  <option value="CREDITO">Crédito</option>
                </select>
              </div>
              {condPago === 'CREDITO' && (
                <div className="campo">
                  <label>Días de crédito <span className="req">*</span></label>
                  <select className="select" value={diasCredito} onChange={(e) => setDiasCredito(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">—</option>{[15, 30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} días</option>)}
                  </select>
                </div>
              )}
              <div className="campo">
                <label>Tiempo de entrega</label>
                <select className="select" value={tiempoEntrega} onChange={(e) => setTiempoEntrega(e.target.value)}>
                  <option value="">—</option>
                  {notasDe('TIEMPO_ENTREGA').map((n) => <option key={n.IdNota} value={n.Texto}>{n.Texto}</option>)}
                </select>
              </div>
              <div className="campo">
                <label>Condiciones de entrega</label>
                <select className="select" value={condEntrega} onChange={(e) => setCondEntrega(e.target.value)}>
                  <option value="">—</option>
                  {notasDe('ENTREGA').map((n) => <option key={n.IdNota} value={n.Texto}>{n.Texto}</option>)}
                </select>
              </div>
              {tipo === 'VENTA' && (
                <div className="campo">
                  <label>Garantía</label>
                  <select className="select" value={garantia} onChange={(e) => setGarantia(e.target.value)}>
                    <option value="">—</option>
                    {notasDe('GARANTIA').map((n) => <option key={n.IdNota} value={n.Texto}>{n.Texto}</option>)}
                  </select>
                </div>
              )}
              <div className="campo">
                <label>Vigencia (días)</label>
                <input className="input" type="number" min={1} value={vigencia} onChange={(e) => setVigencia(Number(e.target.value))} />
              </div>
              {tipo === 'VENTA' && (
                <>
                  <div className="campo">
                    <label>Anticipo (%)</label>
                    <input className="input" type="number" min={0} max={100} value={anticipoPct}
                      onChange={(e) => setAnticipoPct(e.target.value ? Number(e.target.value) : '')} placeholder="Ej. 50" />
                  </div>
                  <div className="campo">
                    <label>Liquidación del saldo</label>
                    <select className="select" value={formaSaldo} onChange={(e) => setFormaSaldo(e.target.value)}>
                      <option value="">—</option>
                      <option value="CONTRA_AVISO_EMBARQUE">Contra aviso de embarque</option>
                      <option value="CONTRA_EMBARQUE">Contra embarque</option>
                      <option value="CONTRA_ENTREGA">Contra entrega</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Observaciones */}
          <section className="card card-cuerpo">
            <h3 className="nc-seccion">5 · Observaciones</h3>
            <div className="campo">
              <label>Notas u observaciones adicionales</label>
              <textarea className="textarea" rows={4} maxLength={1000} value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Cualquier indicación adicional para esta cotización…" />
            </div>
          </section>
        </div>

        {/* Resumen sticky */}
        <aside className="nc-resumen">
          <div className="card card-cuerpo">
            <h3 className="nc-seccion">Resumen</h3>
            <div className="nc-total-linea"><span>Subtotal</span><span className="num">{moneda(totales.subtotal, moneda_)}</span></div>
            <div className="campo mt-8">
              <label>Descuento (%)</label>
              <input className="input" type="number" min={0} max={100} value={descuento}
                onChange={(e) => setDescuento(Math.min(100, Math.max(0, Number(e.target.value))))} />
            </div>
            {totales.descMonto > 0 && (
              <div className="nc-total-linea"><span>Descuento</span><span className="num" style={{ color: 'var(--error)' }}>- {moneda(totales.descMonto, moneda_)}</span></div>
            )}
            {requierePin && (
              <div className="campo mt-8">
                <label style={{ color: 'var(--alerta)' }}>PIN de supervisor <span className="req">*</span></label>
                <input className="input" type="password" value={pin} onChange={(e) => setPin(e.target.value)}
                  placeholder={clienteBloqueado ? 'Cliente bloqueado' : `Descuento > ${umbralPin}%`} />
                <span className="texto-suave" style={{ fontSize: 12 }}>
                  {clienteBloqueado
                    ? 'Requerido porque el cliente está bloqueado. Queda registrado quién autorizó.'
                    : `Requerido por superar el ${umbralPin}%.`}
                </span>
              </div>
            )}
            <div className="campo mt-8">
              <label>IVA (%)</label>
              <input className="input" type="number" min={0} max={100} value={ivaPct} onChange={(e) => setIvaPct(Number(e.target.value))} />
            </div>
            <div className="nc-total-linea"><span>IVA</span><span className="num">{moneda(totales.iva, moneda_)}</span></div>
            <div className="nc-gran-total"><span>TOTAL</span><span className="num">{moneda(totales.total, moneda_)}</span></div>
            {totales.anticipo != null && totales.anticipo > 0 && (
              <div className="nc-anticipo">
                <div className="nc-total-linea"><span>Anticipo</span><span className="num">{moneda(totales.anticipo, moneda_)}</span></div>
                <div className="nc-total-linea"><span>Saldo</span><span className="num">{moneda(totales.total - totales.anticipo, moneda_)}</span></div>
              </div>
            )}
            <button className="btn btn-primario btn-block mt-16" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear cotización'}
            </button>
          </div>
        </aside>
      </div>

      {modalCliente && <ModalCliente onCerrar={() => setModalCliente(false)}
        onElegir={(c) => { setCliente(c); setIdContacto(''); setBloqueoSegunServidor(false); setModalCliente(false); }} />}
      {modalConcepto && (
        <ModalConcepto tipo={tipo} onCerrar={() => setModalConcepto(false)}
          onElegir={(r) => { setRenglones((prev) => [...prev, r]); setModalConcepto(false); }} />
      )}
    </Layout>
  );
}


/* ---------- Modal: agregar concepto ---------- */
function ModalConcepto({ tipo, onCerrar, onElegir }: {
  tipo: TipoCotizacion; onCerrar: () => void; onElegir: (r: RenglonForm) => void;
}) {
  const [fuente, setFuente] = useState<'articulo' | 'servicio' | 'manual'>('articulo');
  const [busqueda, setBusqueda] = useState('');
  const [filas, setFilas] = useState<Record<string, unknown>[]>([]);
  const [manual, setManual] = useState({ Descripcion: '', PrecioUnitario: 0 });

  const rutaArticulo = tipo === 'RENTA' ? 'articulos-renta' : 'articulos-venta';
  useEffect(() => {
    if (fuente === 'manual') return;
    const ruta = fuente === 'servicio' ? 'servicios' : rutaArticulo;
    const t = setTimeout(() => { crearRecursoApi(ruta).listar({ busqueda }).then(setFilas); }, 250);
    return () => clearTimeout(t);
  }, [fuente, busqueda, rutaArticulo]);

  const elegirArticulo = (a: Record<string, unknown>) => {
    if (tipo === 'RENTA') onElegir({
      key: uid(), IdArticuloRenta: a.IdArticuloRenta as number, CodigoSnapshot: a.Codigo as string,
      Descripcion: a.Descripcion as string, PrecioUnitario: a.Precio as number, Cantidad: 1,
      UnidadCobro: a.UnidadCobro as string, NumeroPeriodos: 1, DescuentoPorcentaje: 0,
    });
    else onElegir({
      key: uid(), IdArticuloVenta: a.IdArticuloVenta as number, CodigoSnapshot: a.Codigo as string,
      Descripcion: a.Descripcion as string, PrecioUnitario: a.Precio as number, Cantidad: 1,
      UnidadCobro: null, NumeroPeriodos: 1, DescuentoPorcentaje: 0,
    });
  };
  const elegirServicio = (sv: Record<string, unknown>) => onElegir({
    key: uid(), IdServicio: sv.IdServicio as number, CodigoSnapshot: sv.Codigo as string,
    Descripcion: sv.Descripcion as string, PrecioUnitario: sv.Precio as number, Cantidad: 1,
    UnidadCobro: sv.UnidadCobro as string, NumeroPeriodos: 1, DescuentoPorcentaje: 0,
  });

  return (
    <Modal titulo="Agregar concepto" onCerrar={onCerrar} ancho={640}>
      <div className="nc-fuente-tabs">
        <button className={fuente === 'articulo' ? 'activo' : ''} onClick={() => setFuente('articulo')}>Artículo</button>
        {tipo === 'RENTA' && <button className={fuente === 'servicio' ? 'activo' : ''} onClick={() => setFuente('servicio')}>Servicio</button>}
        <button className={fuente === 'manual' ? 'activo' : ''} onClick={() => setFuente('manual')}>Línea manual</button>
      </div>

      {fuente === 'manual' ? (
        <div className="grid-2 mt-8">
          <div className="campo" style={{ gridColumn: '1 / -1' }}>
            <label>Descripción</label>
            <input className="input" value={manual.Descripcion} onChange={(e) => setManual({ ...manual, Descripcion: e.target.value })} />
          </div>
          <div className="campo">
            <label>Precio unitario</label>
            <input className="input" type="number" step="any" value={manual.PrecioUnitario}
              onChange={(e) => setManual({ ...manual, PrecioUnitario: Number(e.target.value) })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primario" disabled={!manual.Descripcion}
              onClick={() => onElegir({
                key: uid(), CodigoSnapshot: null, Descripcion: manual.Descripcion, PrecioUnitario: manual.PrecioUnitario,
                Cantidad: 1, UnidadCobro: tipo === 'RENTA' ? 'DIA' : null, NumeroPeriodos: 1, DescuentoPorcentaje: 0,
              })}>Agregar</button>
          </div>
        </div>
      ) : (
        <>
          <input className="input mt-8" autoFocus placeholder="Buscar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <div style={{ maxHeight: 360, overflowY: 'auto' }} className="mt-8">
            {filas.map((a) => (
              <button key={String(a.IdArticuloRenta ?? a.IdArticuloVenta ?? a.IdServicio)} className="item-lista"
                onClick={() => (fuente === 'servicio' ? elegirServicio(a) : elegirArticulo(a))}>
                <div>
                  <strong>{a.Descripcion as string}</strong>
                  <div className="texto-suave" style={{ fontSize: 12 }}>
                    {a.Codigo as string} · {moneda(a.Precio as number)}{a.UnidadCobro ? ` / ${ETQ_UNIDAD[a.UnidadCobro as string] || a.UnidadCobro}` : ''}
                  </div>
                </div>
              </button>
            ))}
            {filas.length === 0 && <p className="texto-suave" style={{ padding: 12 }}>Sin resultados.</p>}
          </div>
        </>
      )}
    </Modal>
  );
}

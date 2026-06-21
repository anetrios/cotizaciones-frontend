import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { moneda } from '../components/ui/UI';
import { useToast } from '../components/ui/Toast';
import { clientesApi } from '../api/clientes';
import { articulosApi } from '../api/articulos';
import { cotizacionesApi } from '../api/cotizaciones';
import { mensajeError } from '../api/client';
import type { Cliente, Articulo, NuevaLinea, TipoCotizacion, TipoTarifa } from '../types';
import { ETIQUETA_TARIFA } from '../types';
import './NuevaCotizacion.css';
import './paginas.css';

const TARIFA_CAMPO: Record<TipoTarifa, keyof Articulo> = {
  H: 'TarifaPorHora', D: 'TarifaDiaria', S: 'TarifaSemanal', M: 'TarifaMensual', E: 'TarifaSemestral',
};

export function NuevaCotizacion() {
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const [tipo, setTipo] = useState<TipoCotizacion>('R');
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [descuento, setDescuento] = useState(0);
  const [notas, setNotas] = useState('');
  const [lineas, setLineas] = useState<NuevaLinea[]>([]);
  const [guardando, setGuardando] = useState(false);

  const ID_SUCURSAL = 1;
  const ID_MONEDA = 1;

  const [busqCliente, setBusqCliente] = useState('');
  const [resCliente, setResCliente] = useState<Cliente[]>([]);
  const [abreCliente, setAbreCliente] = useState(false);

  useEffect(() => {
    if (cliente) return;
    const t = setTimeout(async () => {
      if (busqCliente.trim().length < 2) { setResCliente([]); return; }
      try { const r = await clientesApi.listar(busqCliente); setResCliente(r.slice(0, 8)); setAbreCliente(true); } catch { /* */ }
    }, 300);
    return () => clearTimeout(t);
  }, [busqCliente, cliente]);

  const [busqArt, setBusqArt] = useState('');
  const [resArt, setResArt] = useState<Articulo[]>([]);
  const [abreArt, setAbreArt] = useState(false);
  const refArt = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (busqArt.trim().length < 2) { setResArt([]); return; }
      try { const r = await articulosApi.listar(busqArt); setResArt(r.slice(0, 10)); setAbreArt(true); } catch { /* */ }
    }, 300);
    return () => clearTimeout(t);
  }, [busqArt]);

  const precioSugerido = (art: Articulo, tarifa: TipoTarifa | null): number => {
    if (tipo === 'V') return Number(art.PrecioDeVenta || 0);
    if (tarifa) return Number(art[TARIFA_CAMPO[tarifa]] || 0);
    return Number(art.TarifaDiaria || 0);
  };

  const agregarArticulo = (art: Articulo) => {
    const tarifaInicial: TipoTarifa | null = tipo === 'R' ? 'D' : null;
    setLineas((prev) => [...prev, {
      IdArticulo: art.IdArticulo, Codigo: art.Codigo, Descripcion: art.Descripcion || '',
      TipoTarifa: tarifaInicial, PrecioUnitario: precioSugerido(art, tarifaInicial),
      Cantidad: 1, IVA: Number(art.IVA ?? 16),
    }]);
    setBusqArt(''); setResArt([]); setAbreArt(false);
  };

  const actualizarLinea = (idx: number, cambios: Partial<NuevaLinea>) =>
    setLineas((prev) => prev.map((l, i) => (i === idx ? { ...l, ...cambios } : l)));
  const quitarLinea = (idx: number) => setLineas((prev) => prev.filter((_, i) => i !== idx));

  useEffect(() => {
    setLineas((prev) => prev.map((l) => ({ ...l, TipoTarifa: tipo === 'R' ? (l.TipoTarifa || 'D') : null })));
  }, [tipo]);

  const totales = useMemo(() => {
    let subTotal = 0, iva = 0;
    for (const l of lineas) {
      const importe = l.PrecioUnitario * l.Cantidad;
      subTotal += importe; iva += importe * (l.IVA / 100);
    }
    const desc = subTotal * (descuento / 100);
    const subConDesc = subTotal - desc;
    return { subTotal, descuentoImporte: desc, subConDesc, iva, total: subConDesc + iva };
  }, [lineas, descuento]);

  const guardar = async () => {
    if (!cliente) { mostrar('Selecciona un cliente', 'error'); return; }
    if (lineas.length === 0) { mostrar('Agrega al menos un artículo', 'error'); return; }
    setGuardando(true);
    try {
      const creada = await cotizacionesApi.crear({
        Tipo: tipo, IdCliente: cliente.IdCliente, IdSucursal: ID_SUCURSAL, IdTipoMoneda: ID_MONEDA,
        Descuento: descuento, Notas: notas || null,
        detalles: lineas.map(({ Codigo, ...resto }) => { void Codigo; return resto; }),
      });
      mostrar(`Cotización ${creada.Folio} creada`, 'exito');
      navigate(`/cotizaciones/${creada.IdCotizacion}`);
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setGuardando(false); }
  };

  return (
    <Layout titulo="Nueva cotización" acciones={
      <button className="btn btn-secundario" onClick={() => navigate('/cotizaciones')}>Cancelar</button>
    }>
      <div className="nc-grid">
        <div className="flex-col gap-16">
          <div className="card"><div className="card-cuerpo flex-col gap-16">
            <div className="campo">
              <label>Tipo de cotización</label>
              <div className="toggle-tipo">
                <button className={tipo === 'R' ? 'activo' : ''} onClick={() => setTipo('R')}>Renta</button>
                <button className={tipo === 'V' ? 'activo' : ''} onClick={() => setTipo('V')}>Venta</button>
              </div>
            </div>
            <div className="campo buscador">
              <label>Cliente</label>
              {cliente ? (
                <div className="cliente-elegido">
                  <div>
                    <div className="op-titulo">{cliente.NombreComercial}</div>
                    <div className="op-sub">{cliente.Contacto && `${cliente.Contacto} · `}{cliente.Telefono || 'Sin teléfono'}</div>
                  </div>
                  <button className="btn btn-fantasma btn-sm" onClick={() => { setCliente(null); setBusqCliente(''); }}>Cambiar</button>
                </div>
              ) : (
                <>
                  <input className="input" placeholder="Buscar cliente por nombre o clave…" value={busqCliente}
                    onChange={(e) => setBusqCliente(e.target.value)} onFocus={() => resCliente.length && setAbreCliente(true)} />
                  {abreCliente && resCliente.length > 0 && (
                    <div className="buscador-resultados">
                      {resCliente.map((c) => (
                        <div key={c.IdCliente} className="buscador-opcion" onClick={() => { setCliente(c); setAbreCliente(false); }}>
                          <div className="op-titulo">{c.NombreComercial}</div>
                          <div className="op-sub">Clave {c.ClaveCliente ?? '—'} · {c.Telefono || 'Sin teléfono'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div></div>

          <div className="card"><div className="card-cuerpo">
            <div className="campo buscador" ref={refArt}>
              <label>Agregar artículo</label>
              <input className="input" placeholder="Buscar por descripción o código…" value={busqArt}
                onChange={(e) => setBusqArt(e.target.value)} onFocus={() => resArt.length && setAbreArt(true)} />
              {abreArt && resArt.length > 0 && (
                <div className="buscador-resultados">
                  {resArt.map((a) => (
                    <div key={a.IdArticulo} className="buscador-opcion" onClick={() => agregarArticulo(a)}>
                      <div className="op-titulo">{a.Descripcion}</div>
                      <div className="op-sub">{a.Codigo} · Venta {moneda(a.PrecioDeVenta)} · Diaria {moneda(a.TarifaDiaria)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {lineas.length > 0 && (
              <div className="lineas mt-16">
                {lineas.map((l, idx) => (
                  <div key={idx} className="linea">
                    <div className="linea-desc">
                      <div className="op-titulo">{l.Descripcion}</div>
                      <div className="op-sub">{l.Codigo}</div>
                    </div>
                    {tipo === 'R' && (
                      <select className="select linea-tarifa" value={l.TipoTarifa || 'D'}
                        onChange={(e) => actualizarLinea(idx, { TipoTarifa: e.target.value as TipoTarifa })}>
                        {(Object.keys(ETIQUETA_TARIFA) as TipoTarifa[]).map((k) => (
                          <option key={k} value={k}>{ETIQUETA_TARIFA[k]}</option>
                        ))}
                      </select>
                    )}
                    <div className="linea-campo">
                      <span className="linea-lbl">Precio</span>
                      <input type="number" className="input linea-num" min={0} step="0.01" value={l.PrecioUnitario}
                        onChange={(e) => actualizarLinea(idx, { PrecioUnitario: Number(e.target.value) })} />
                    </div>
                    <div className="linea-campo">
                      <span className="linea-lbl">Cant.</span>
                      <input type="number" className="input linea-num" min={1} step="1" value={l.Cantidad}
                        onChange={(e) => actualizarLinea(idx, { Cantidad: Number(e.target.value) })} />
                    </div>
                    <div className="linea-importe num">{moneda(l.PrecioUnitario * l.Cantidad)}</div>
                    <button className="btn btn-fantasma btn-sm linea-quitar" onClick={() => quitarLinea(idx)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div></div>

          <div className="campo">
            <label>Notas (opcional)</label>
            <textarea className="textarea" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Condiciones, observaciones…" />
          </div>
        </div>

        <div className="nc-resumen">
          <div className="card">
            <div className="hazard-strip" />
            <div className="card-cuerpo">
              <h3 className="dash-titulo">Resumen</h3>
              <div className="resumen-fila"><span>Subtotal</span><span className="num">{moneda(totales.subTotal)}</span></div>
              <div className="resumen-fila">
                <span>Descuento
                  <input type="number" className="input desc-input num" min={0} max={100} step="0.5" value={descuento}
                    onChange={(e) => setDescuento(Math.min(100, Math.max(0, Number(e.target.value))))} />%
                </span>
                <span className="num">− {moneda(totales.descuentoImporte)}</span>
              </div>
              <div className="resumen-fila"><span>IVA</span><span className="num">{moneda(totales.iva)}</span></div>
              <div className="resumen-total"><span>Total</span><span className="num">{moneda(totales.total)}</span></div>
              <button className="btn btn-primario w-full mt-16" disabled={guardando} onClick={guardar}>
                {guardando ? 'Guardando…' : 'Guardar cotización'}
              </button>
              <p className="texto-suave nc-nota">Vigencia: 15 días desde hoy · Folio automático</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

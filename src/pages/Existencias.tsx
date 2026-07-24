import { useEffect, useState, useCallback, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Modal } from '../components/ui/Modal';
import { Spinner, Vacio } from '../components/ui/UI';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { crearRecursoApi } from '../api/recurso';
import { mensajeError } from '../api/client';
import api from '../api/client';

interface Existencia {
  IdArticuloRenta: number; Articulo: string;
  IdSucursal: number; Sucursal: string;
  CantidadTotal: number; CantidadRentada: number; CantidadEnTaller: number; CantidadDisponible: number;
}
interface OpcionArticulo { IdArticuloRenta: number; Codigo: string; Descripcion: string; SeControlaPorSerie: boolean; }
interface OpcionSucursal { IdSucursal: number; Nombre: string; }

const VACIA = { IdArticuloRenta: 0, IdSucursal: 0, CantidadTotal: 0, CantidadRentada: 0, CantidadEnTaller: 0 };

export default function Existencias() {
  const { mostrar } = useToast();
  const { puedeEscribir } = useAuth();

  const [filas, setFilas] = useState<Existencia[]>([]);
  const [articulos, setArticulos] = useState<OpcionArticulo[]>([]);
  const [sucursales, setSucursales] = useState<OpcionSucursal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [edicion, setEdicion] = useState<typeof VACIA | null>(null);
  const [esNueva, setEsNueva] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/existencias');
      setFilas(data.datos as Existencia[]);
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setCargando(false); }
  }, [mostrar]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    (async () => {
      try {
        const [arts, sucs] = await Promise.all([
          crearRecursoApi('articulos-renta').listar(),
          crearRecursoApi('meta/sucursales').listar(),
        ]);
        // Solo artículos a granel: los serializados se controlan en "Unidades".
        setArticulos((arts as OpcionArticulo[]).filter((a) => !a.SeControlaPorSerie));
        setSucursales(sucs as OpcionSucursal[]);
      } catch (e) { mostrar(mensajeError(e), 'error'); }
    })();
  }, [mostrar]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return filas;
    return filas.filter((f) =>
      f.Articulo.toLowerCase().includes(q) || f.Sucursal.toLowerCase().includes(q));
  }, [filas, busqueda]);

  const abrirNueva = () => { setEdicion({ ...VACIA }); setEsNueva(true); };
  const abrirEditar = (f: Existencia) => {
    setEdicion({
      IdArticuloRenta: f.IdArticuloRenta, IdSucursal: f.IdSucursal,
      CantidadTotal: f.CantidadTotal, CantidadRentada: f.CantidadRentada, CantidadEnTaller: f.CantidadEnTaller,
    });
    setEsNueva(false);
  };

  const guardar = async () => {
    if (!edicion) return;
    if (!edicion.IdArticuloRenta || !edicion.IdSucursal) return mostrar('Selecciona artículo y sucursal', 'error');
    const { CantidadTotal: t, CantidadRentada: r, CantidadEnTaller: c } = edicion;
    if (t < 0 || r < 0 || c < 0) return mostrar('Las cantidades no pueden ser negativas', 'error');
    if (r + c > t) return mostrar('Rentadas + en taller no puede exceder el total', 'error');
    setGuardando(true);
    try {
      await api.put('/existencias', edicion);
      mostrar('Existencia guardada', 'exito');
      setEdicion(null); cargar();
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setGuardando(false); }
  };

  const disponible = edicion
    ? edicion.CantidadTotal - edicion.CantidadRentada - edicion.CantidadEnTaller
    : 0;

  return (
    <Layout titulo="Existencias" acciones={
      puedeEscribir && <button className="btn btn-primario" onClick={abrirNueva}>+ Registrar existencia</button>
    }>
      <div className="aviso" style={{ marginBottom: 16 }}>
        Aquí se controla el inventario <strong>a granel</strong> (andamios, tablones, crucetas): se lleva por cantidad.
        El equipo con número de serie (montacargas, casetas) se administra en <strong>Unidades</strong>.
      </div>

      <div style={{ marginBottom: 16, maxWidth: 420 }}>
        <input className="input" placeholder="Buscar artículo o sucursal…" value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      <div className="card">
        {cargando ? <Spinner /> : visibles.length === 0 ? (
          <Vacio titulo="Sin existencias registradas">
            Registra la primera con “+ Registrar existencia”.
          </Vacio>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Artículo</th><th>Sucursal</th>
                  <th className="der">Total</th><th className="der">Rentadas</th>
                  <th className="der">En taller</th><th className="der">Disponibles</th>
                  {puedeEscribir && <th className="acciones-col">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => (
                  <tr key={`${f.IdArticuloRenta}-${f.IdSucursal}`}>
                    <td>{f.Articulo}</td>
                    <td>{f.Sucursal}</td>
                    <td className="der num">{f.CantidadTotal}</td>
                    <td className="der num">{f.CantidadRentada}</td>
                    <td className="der num">{f.CantidadEnTaller}</td>
                    <td className="der num">
                      <span className={`chip ${f.CantidadDisponible > 0 ? 'ok' : 'bad'}`}>{f.CantidadDisponible}</span>
                    </td>
                    {puedeEscribir && (
                      <td className="acciones-col">
                        <button className="btn btn-secundario btn-sm" onClick={() => abrirEditar(f)}>Editar</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {edicion && (
        <Modal
          titulo={esNueva ? 'Registrar existencia' : 'Editar existencia'}
          onCerrar={() => setEdicion(null)}
          pie={<>
            <button className="btn btn-secundario" onClick={() => setEdicion(null)}>Cancelar</button>
            <button className="btn btn-primario" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </>}
        >
          <div className="grid-2">
            <div className="campo" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="art">Artículo <span className="req">*</span></label>
              <select id="art" className="select" value={edicion.IdArticuloRenta || ''} disabled={!esNueva}
                onChange={(e) => setEdicion({ ...edicion, IdArticuloRenta: Number(e.target.value) })}>
                <option value="">— Selecciona —</option>
                {articulos.map((a) => (
                  <option key={a.IdArticuloRenta} value={a.IdArticuloRenta}>{a.Codigo} · {a.Descripcion}</option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="suc">Sucursal <span className="req">*</span></label>
              <select id="suc" className="select" value={edicion.IdSucursal || ''} disabled={!esNueva}
                onChange={(e) => setEdicion({ ...edicion, IdSucursal: Number(e.target.value) })}>
                <option value="">— Selecciona —</option>
                {sucursales.map((s) => <option key={s.IdSucursal} value={s.IdSucursal}>{s.Nombre}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="ct">Cantidad total</label>
              <input id="ct" className="input" type="number" min={0} value={edicion.CantidadTotal}
                onChange={(e) => setEdicion({ ...edicion, CantidadTotal: Number(e.target.value) })} />
            </div>
            <div className="campo">
              <label htmlFor="cr">Rentadas</label>
              <input id="cr" className="input" type="number" min={0} value={edicion.CantidadRentada}
                onChange={(e) => setEdicion({ ...edicion, CantidadRentada: Number(e.target.value) })} />
            </div>
            <div className="campo">
              <label htmlFor="cc">En taller</label>
              <input id="cc" className="input" type="number" min={0} value={edicion.CantidadEnTaller}
                onChange={(e) => setEdicion({ ...edicion, CantidadEnTaller: Number(e.target.value) })} />
            </div>
            <div className="campo" style={{ gridColumn: '1 / -1' }}>
              <span className="texto-suave">
                Disponibles: <strong style={{ color: disponible < 0 ? 'var(--error)' : 'var(--texto)' }}>{disponible}</strong>
                {' '}(la base de datos calcula este valor: total − rentadas − en taller)
              </span>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}

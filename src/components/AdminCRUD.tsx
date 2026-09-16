import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { Modal } from './ui/Modal';
import { Spinner, Vacio } from './ui/UI';
import { Paginador } from './ui/Paginador';
import { useToast } from './ui/Toast';
import { useAuth } from '../context/AuthContext';
import { crearRecursoApi } from '../api/recurso';
import { mensajeError } from '../api/client';
import { Campo, useOpcionesRecurso, type CampoConfig } from './Campo';

export interface RecursoConfig {
  titulo: string;
  nombreSingular: string;
  ruta: string;             // endpoint (ej: 'clientes' o 'admin/usuarios')
  idClave: string;          // campo id (ej: 'IdCliente')
  campos: CampoConfig[];
  buscar?: boolean;
  soloAdmin?: boolean;
  textoEliminar?: string;   // ej: 'desactivar'
  paginado?: boolean;
  /** Si el recurso tiene pantalla propia, a dónde lleva su renglón. */
  rutaDetalle?: (fila: Record<string, unknown>) => string;
}

const POR_PAGINA = 20;

export function AdminCRUD({ config }: { config: RecursoConfig }) {
  const api = useMemo(() => crearRecursoApi(config.ruta), [config.ruta]);
  const { mostrar } = useToast();
  const { puedeEscribir, esAdmin } = useAuth();
  const navigate = useNavigate();
  const puedeEditar = config.soloAdmin ? esAdmin : puedeEscribir;

  const [filas, setFilas] = useState<Record<string, unknown>[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<Record<string, unknown> | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);

  const opcionesRecurso = useOpcionesRecurso(config.campos);
  const columnas = config.campos.filter((c) => !c.soloForm);
  const camposForm = config.campos.filter((c) => !c.soloTabla && (!c.soloAdmin || esAdmin));

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const filtros = config.buscar ? { busqueda } : {};
      if (config.paginado) {
        const { datos, total } = await api.listarPaginado({ ...filtros, pagina, porPagina: POR_PAGINA });
        setFilas(datos); setTotal(total);
      } else {
        setFilas(await api.listar(filtros));
      }
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setCargando(false); }
  }, [api, busqueda, pagina, config.buscar, config.paginado, mostrar]);

  useEffect(() => { setPagina(1); }, [busqueda]);
  useEffect(() => { const t = setTimeout(cargar, config.buscar ? 300 : 0); return () => clearTimeout(t); }, [cargar]);

  const abrirNuevo = () => {
    const init: Record<string, unknown> = {};
    for (const c of camposForm) init[c.clave] = c.tipo === 'checkbox' ? false : '';
    setEditando(init); setNuevo(true);
  };
  const abrirEditar = (fila: Record<string, unknown>) => { setEditando({ ...fila }); setNuevo(false); };
  const cerrar = () => { setEditando(null); setNuevo(false); };

  const guardar = async () => {
    if (!editando) return;
    for (const c of camposForm) {
      if (c.requerido && !editando[c.clave] && editando[c.clave] !== 0) {
        mostrar(`Falta: ${c.etiqueta}`, 'error'); return;
      }
    }
    setGuardando(true);
    try {
      if (nuevo) { await api.crear(editando); mostrar(`${config.nombreSingular} creado`, 'exito'); }
      else { await api.actualizar(editando[config.idClave] as number, editando); mostrar('Cambios guardados', 'exito'); }
      cerrar(); cargar();
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setGuardando(false); }
  };

  const eliminar = async (fila: Record<string, unknown>) => {
    const accion = config.textoEliminar || 'eliminar';
    if (!confirm(`¿Seguro que deseas ${accion} este ${config.nombreSingular.toLowerCase()}?`)) return;
    try {
      await api.eliminar(fila[config.idClave] as number);
      mostrar(`${config.nombreSingular} ${accion === 'desactivar' ? 'desactivado' : 'eliminado'}`, 'exito');
      cargar();
    } catch (e) { mostrar(mensajeError(e), 'error'); }
  };

  return (
    <Layout titulo={config.titulo} acciones={
      puedeEditar && <button className="btn btn-primario" onClick={abrirNuevo}>+ Nuevo</button>
    }>
      {config.buscar && (
        <div style={{ marginBottom: 16, maxWidth: 420 }}>
          <input className="input" placeholder="Buscar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
      )}

      <div className="card">
        {cargando ? <Spinner /> : filas.length === 0 ? (
          <Vacio titulo="Sin registros">Crea el primero con el botón “+ Nuevo”.</Vacio>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tabla">
              <thead>
                <tr>
                  {columnas.map((c) => <th key={c.clave} className={c.tipo === 'numero' ? 'der' : ''}>{c.etiqueta}</th>)}
                  {(puedeEditar || config.rutaDetalle) && <th className="acciones-col">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={String(fila[config.idClave])}
                    className={config.rutaDetalle ? 'clic' : undefined}
                    onClick={config.rutaDetalle ? () => navigate(config.rutaDetalle!(fila)) : undefined}>
                    {columnas.map((c) => (
                      <td key={c.clave} className={c.tipo === 'numero' ? 'der num' : ''}>
                        {c.formato ? c.formato(fila[c.clave], fila) : renderCelda(fila[c.clave])}
                      </td>
                    ))}
                    {(puedeEditar || config.rutaDetalle) && (
                      // El clic de los botones no debe disparar también el del renglón.
                      <td className="acciones-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                          {config.rutaDetalle && (
                            <button className="btn btn-secundario btn-sm"
                              onClick={() => navigate(config.rutaDetalle!(fila))}>Ver ficha</button>
                          )}
                          {puedeEditar && <>
                            <button className="btn btn-secundario btn-sm" onClick={() => abrirEditar(fila)}>Editar</button>
                            <button className="btn btn-fantasma btn-sm" style={{ color: 'var(--error)' }}
                              onClick={() => eliminar(fila)}>{config.textoEliminar === 'desactivar' ? 'Desactivar' : 'Eliminar'}</button>
                          </>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {config.paginado && <Paginador pagina={pagina} total={total} porPagina={POR_PAGINA} onCambiar={setPagina} />}

      {editando && (
        <Modal titulo={nuevo ? `Nuevo ${config.nombreSingular.toLowerCase()}` : `Editar ${config.nombreSingular.toLowerCase()}`}
          onCerrar={cerrar}
          pie={<>
            <button className="btn btn-secundario" onClick={cerrar}>Cancelar</button>
            <button className="btn btn-primario" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </>}>
          <div className="grid-2">
            {camposForm.filter((c) => !c.ocultarEnForm?.(editando)).map((c) => (
              <Campo key={c.clave} campo={c} valor={editando[c.clave]}
                opcionesRecurso={opcionesRecurso[c.clave]}
                onCambio={(v) => setEditando((prev) => ({ ...prev!, [c.clave]: v }))} />
            ))}
          </div>
        </Modal>
      )}
    </Layout>
  );
}

function renderCelda(valor: unknown) {
  if (valor === null || valor === undefined || valor === '') return <span className="texto-suave">—</span>;
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  return String(valor);
}

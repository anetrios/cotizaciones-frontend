import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Modal } from '../components/ui/Modal';
import { Spinner, Vacio, moneda, fecha as fechaCorta } from '../components/ui/UI';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { Campo } from '../components/Campo';
import { ModalIncidencia } from '../components/ModalIncidencia';
import { ModalDesbloqueo } from '../components/ModalDesbloqueo';
import { CFG_CLIENTES } from '../config/recursos';
import { clientesApi } from '../api/clientes';
import { mensajeError } from '../api/client';
import { ETIQUETA_INCIDENCIA } from '../types';
import type { Cliente, ContactoCliente, ExpedienteIncidencias } from '../types';

type Pestana = 'datos' | 'contactos' | 'incidencias';

const CONTACTO_VACIO = {
  Nombre: '', Puesto: '', Telefono: '', Celular: '', Email: '', Notas: '',
};

export default function ClienteDetalle() {
  const { id } = useParams<{ id: string }>();
  const idCliente = Number(id);
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { puedeEscribir, esAdmin } = useAuth();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [contactos, setContactos] = useState<ContactoCliente[]>([]);
  const [expediente, setExpediente] = useState<ExpedienteIncidencias | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState<Pestana>('datos');

  const [modalIncidencia, setModalIncidencia] = useState(false);
  const [desbloqueo, setDesbloqueo] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [c, cts, exp] = await Promise.all([
        clientesApi.obtener(idCliente),
        clientesApi.contactos(idCliente),
        clientesApi.incidencias(idCliente),
      ]);
      setCliente(c); setContactos(cts); setExpediente(exp);
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setCargando(false); }
  }, [idCliente, mostrar]);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) return <Layout titulo="Cliente"><Spinner /></Layout>;
  if (!cliente) return <Layout titulo="Cliente"><Vacio titulo="Cliente no encontrado" /></Layout>;

  const bloqueado = cliente.Restriccion === 'BLOQUEO';
  const pendientes = expediente?.Pendientes ?? 0;

  return (
    <Layout titulo={cliente.RazonSocial} acciones={
      <button className="btn btn-secundario" onClick={() => navigate('/clientes')}>Volver a clientes</button>
    }>
      {/* La restricción se ve en el encabezado, no escondida en un campo. */}
      {cliente.Restriccion !== 'NINGUNA' && (
        <div className={`aviso ${bloqueado ? 'error' : 'warn'}`} style={{ marginBottom: 16 }}>
          <strong>{bloqueado ? '⛔ Cliente BLOQUEADO' : '⚠ Cliente con advertencia'}</strong>
          {cliente.MotivoRestriccion ? ` · ${cliente.MotivoRestriccion}` : ''}
          {bloqueado && (
            <div style={{ marginTop: 4, fontWeight: 400 }}>
              Se le puede cotizar con PIN de supervisor, y queda registrado quién autorizó.
              {!esAdmin && ' Solo un administrador puede quitar el bloqueo.'}
            </div>
          )}
        </div>
      )}

      <div className="pestanas">
        <Boton actual={pestana} valor="datos" onClic={setPestana}>Datos generales</Boton>
        <Boton actual={pestana} valor="contactos" onClic={setPestana} cuenta={contactos.length}>Contactos</Boton>
        <Boton actual={pestana} valor="incidencias" onClic={setPestana} cuenta={pendientes || undefined}>
          Incidencias
        </Boton>
      </div>

      {pestana === 'datos' && (
        <PestanaDatos cliente={cliente} puedeEditar={puedeEscribir} esAdmin={esAdmin} onGuardado={cargar} />
      )}

      {pestana === 'contactos' && (
        <PestanaContactos idCliente={idCliente} contactos={contactos}
          puedeEditar={puedeEscribir} onCambio={cargar} />
      )}

      {pestana === 'incidencias' && expediente && (
        <PestanaIncidencias expediente={expediente} puedeEditar={puedeEscribir} esAdmin={esAdmin}
          onRegistrar={() => setModalIncidencia(true)}
          onResuelta={async (puedeDesbloquearse) => {
            await cargar();
            if (puedeDesbloquearse) setDesbloqueo(true);
          }} />
      )}

      {modalIncidencia && (
        <ModalIncidencia idCliente={idCliente} cliente={cliente.RazonSocial}
          onCerrar={() => setModalIncidencia(false)}
          onGuardado={() => { setModalIncidencia(false); cargar(); }} />
      )}

      {desbloqueo && (
        <ModalDesbloqueo idCliente={idCliente} cliente={cliente.RazonSocial}
          onCerrar={() => setDesbloqueo(false)}
          onDesbloqueado={() => { setDesbloqueo(false); cargar(); }} />
      )}
    </Layout>
  );
}

function Boton({ actual, valor, cuenta, onClic, children }: {
  actual: Pestana; valor: Pestana; cuenta?: number;
  onClic: (p: Pestana) => void; children: ReactNode;
}) {
  return (
    <button className={`pestana ${actual === valor ? 'activa' : ''}`} onClick={() => onClic(valor)}>
      {children}{cuenta !== undefined && <span className="cuenta">{cuenta}</span>}
    </button>
  );
}

/* ---------- Datos generales ---------- */
/* El formulario sale de la misma config declarativa que el listado: una sola
   definición de los campos del cliente, en config/recursos.tsx. */
function PestanaDatos({ cliente, puedeEditar, esAdmin, onGuardado }: {
  cliente: Cliente; puedeEditar: boolean; esAdmin: boolean; onGuardado: () => void;
}) {
  const { mostrar } = useToast();
  const [valores, setValores] = useState<Record<string, unknown>>({ ...cliente });
  const [guardando, setGuardando] = useState(false);

  const campos = CFG_CLIENTES.campos.filter((c) => !c.soloTabla && (!c.soloAdmin || esAdmin));

  const guardar = async () => {
    if (!String(valores.RazonSocial || '').trim()) return mostrar('Falta: Razón social', 'error');
    setGuardando(true);
    try {
      await clientesApi.actualizar(cliente.IdCliente, valores);
      mostrar('Cambios guardados', 'exito');
      onGuardado();
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setGuardando(false); }
  };

  return (
    <div className="card card-cuerpo">
      <div className="grid-2">
        {campos.map((c) => (
          <Campo key={c.clave} campo={c} valor={valores[c.clave]}
            onCambio={(v) => setValores((prev) => ({ ...prev, [c.clave]: v }))} />
        ))}
      </div>

      {cliente.ObservacionesOriginal && (
        <details className="colapsable mt-16">
          <summary>Registro original (histórico)</summary>
          <div className="contenido">{cliente.ObservacionesOriginal}</div>
        </details>
      )}

      {puedeEditar && (
        <div className="flex mt-16" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-primario" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Contactos ---------- */
function PestanaContactos({ idCliente, contactos, puedeEditar, onCambio }: {
  idCliente: number; contactos: ContactoCliente[]; puedeEditar: boolean; onCambio: () => void;
}) {
  const { mostrar } = useToast();
  const [form, setForm] = useState<typeof CONTACTO_VACIO | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  const sinPrincipal = contactos.length > 0 && !contactos.some((c) => c.EsPrincipal);

  const abrirNuevo = () => { setForm({ ...CONTACTO_VACIO }); setEditandoId(null); };
  const abrirEditar = (c: ContactoCliente) => {
    setForm({
      Nombre: c.Nombre || '', Puesto: c.Puesto || '', Telefono: c.Telefono || '',
      Celular: c.Celular || '', Email: c.Email || '', Notas: c.Notas || '',
    });
    setEditandoId(c.IdContacto);
  };

  const guardar = async () => {
    if (!form) return;
    if (!form.Nombre.trim() && !form.Telefono.trim() && !form.Celular.trim() && !form.Email.trim()) {
      return mostrar('El contacto necesita al menos nombre, teléfono, celular o email', 'error');
    }
    setGuardando(true);
    try {
      if (editandoId) await clientesApi.actualizarContacto(editandoId, form);
      else await clientesApi.crearContacto(idCliente, form);
      mostrar(editandoId ? 'Contacto actualizado' : 'Contacto agregado', 'exito');
      setForm(null); onCambio();
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setGuardando(false); }
  };

  const marcarPrincipal = async (c: ContactoCliente) => {
    try {
      await clientesApi.marcarPrincipal(c.IdContacto);
      mostrar(`${c.Nombre || 'Contacto'} es ahora el principal`, 'exito');
      onCambio();
    } catch (e) { mostrar(mensajeError(e), 'error'); }
  };

  const desactivar = async (c: ContactoCliente) => {
    if (!confirm(`¿Desactivar a ${c.Nombre || 'este contacto'}?`)) return;
    try {
      await clientesApi.desactivarContacto(c.IdContacto);
      mostrar('Contacto desactivado', 'exito');
      onCambio();
    } catch (e) { mostrar(mensajeError(e), 'error'); }
  };

  return (
    <>
      {sinPrincipal && (
        <div className="aviso info" style={{ marginBottom: 16 }}>
          Este cliente no tiene contacto principal. Marca uno con la estrella: es el nombre
          que sale por defecto en sus cotizaciones.
        </div>
      )}

      <div className="card">
        {contactos.length === 0 ? (
          <Vacio titulo="Sin contactos">
            Este cliente todavía no tiene contactos capturados. No pasa nada: puedes agregarlos
            cuando los sepas.
          </Vacio>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th style={{ width: 44 }} title="Contacto principal">★</th>
                  <th>Nombre</th><th>Puesto</th><th>Teléfono</th><th>Celular</th><th>Email</th>
                  {puedeEditar && <th className="acciones-col">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {contactos.map((c) => (
                  <tr key={c.IdContacto}>
                    <td>
                      <button className={`estrella ${c.EsPrincipal ? 'activa' : ''}`}
                        disabled={!puedeEditar || c.EsPrincipal}
                        title={c.EsPrincipal ? 'Contacto principal' : 'Marcar como principal'}
                        aria-label={c.EsPrincipal ? 'Contacto principal' : 'Marcar como principal'}
                        onClick={() => marcarPrincipal(c)}>
                        {c.EsPrincipal ? '★' : '☆'}
                      </button>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{c.Nombre || <span className="texto-suave">—</span>}</span>
                      {c.Notas && <div className="texto-suave" style={{ fontSize: 12 }}>{c.Notas}</div>}
                    </td>
                    <td>{c.Puesto ? <span className="chip">{c.Puesto}</span> : <span className="texto-suave">—</span>}</td>
                    <td className="num">{c.Telefono || <span className="texto-suave">—</span>}</td>
                    <td className="num">{c.Celular || <span className="texto-suave">—</span>}</td>
                    <td>{c.Email || <span className="texto-suave">—</span>}</td>
                    {puedeEditar && (
                      <td className="acciones-col">
                        <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-secundario btn-sm" onClick={() => abrirEditar(c)}>Editar</button>
                          <button className="btn btn-fantasma btn-sm" style={{ color: 'var(--error)' }}
                            onClick={() => desactivar(c)}>Desactivar</button>
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

      {puedeEditar && (
        <div className="mt-16">
          <button className="btn btn-primario" onClick={abrirNuevo}>+ Agregar contacto</button>
        </div>
      )}

      {form && (
        <Modal titulo={editandoId ? 'Editar contacto' : 'Nuevo contacto'} onCerrar={() => setForm(null)}
          pie={<>
            <button className="btn btn-secundario" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn btn-primario" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </>}>
          <div className="grid-2">
            <div className="campo">
              <label htmlFor="ct-nom">Nombre</label>
              <input id="ct-nom" className="input" maxLength={150} value={form.Nombre}
                onChange={(e) => setForm({ ...form, Nombre: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="ct-pue">Puesto</label>
              <input id="ct-pue" className="input" maxLength={80} value={form.Puesto}
                placeholder="COMPRAS, PAGOS, OBRA…"
                onChange={(e) => setForm({ ...form, Puesto: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="ct-tel">Teléfono</label>
              <input id="ct-tel" className="input" maxLength={40} value={form.Telefono}
                onChange={(e) => setForm({ ...form, Telefono: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="ct-cel">Celular</label>
              <input id="ct-cel" className="input" maxLength={40} value={form.Celular}
                onChange={(e) => setForm({ ...form, Celular: e.target.value })} />
            </div>
            <div className="campo" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="ct-mail">Email</label>
              <input id="ct-mail" className="input" maxLength={200} value={form.Email}
                onChange={(e) => setForm({ ...form, Email: e.target.value })} />
            </div>
            <div className="campo" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="ct-notas">Notas</label>
              <input id="ct-notas" className="input" maxLength={300} value={form.Notas}
                placeholder="Extensión, horarios, referencias…"
                onChange={(e) => setForm({ ...form, Notas: e.target.value })} />
            </div>
          </div>
          <span className="texto-suave" style={{ fontSize: 12 }}>
            Basta con uno de los cuatro: nombre, teléfono, celular o email.
          </span>
        </Modal>
      )}
    </>
  );
}

/* ---------- Incidencias ---------- */
function PestanaIncidencias({ expediente, puedeEditar, esAdmin, onRegistrar, onResuelta }: {
  expediente: ExpedienteIncidencias;
  puedeEditar: boolean; esAdmin: boolean;
  onRegistrar: () => void;
  onResuelta: (puedeDesbloquearse: boolean) => void;
}) {
  const { mostrar } = useToast();
  const pendientes = expediente.incidencias.filter((i) => !i.Resuelta);
  const resueltas = expediente.incidencias.filter((i) => i.Resuelta);

  const resolver = async (idIncidencia: number) => {
    if (!confirm('¿Marcar esta incidencia como resuelta?')) return;
    try {
      const r = await clientesApi.resolverIncidencia(idIncidencia);
      mostrar('Incidencia resuelta', 'exito');
      onResuelta(r.puedeDesbloquearse);
    } catch (e) { mostrar(mensajeError(e), 'error'); }
  };

  return (
    <>
      {expediente.Pendientes > 0 && (
        <div className="card card-cuerpo" style={{ marginBottom: 16, borderLeft: '4px solid var(--error)' }}>
          <div className="flex justify-between items-center wrap gap-12">
            <div>
              <div className="doc-dato-lbl">Adeudo pendiente</div>
              <strong style={{ fontSize: 22, color: 'var(--error)' }}>{moneda(expediente.TotalAdeudo)}</strong>
            </div>
            <span className="texto-medio">
              {expediente.Pendientes} incidencia{expediente.Pendientes === 1 ? '' : 's'} sin resolver
            </span>
          </div>
          <div className="texto-suave mt-8" style={{ fontSize: 12 }}>
            El total suma solo las incidencias que traen monto capturado.
          </div>
        </div>
      )}

      <div className="card">
        {expediente.incidencias.length === 0 ? (
          <Vacio titulo="Sin incidencias">Este cliente no tiene problemas registrados.</Vacio>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th><th>Tipo</th><th>Descripción</th>
                  <th className="der">Monto</th><th>Estado</th>
                  {esAdmin && <th className="acciones-col">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {[...pendientes, ...resueltas].map((i) => (
                  <tr key={i.IdIncidencia} className={i.Resuelta ? 'atenuada' : undefined}>
                    <td className="num">{fechaCorta(i.Fecha)}</td>
                    <td>
                      <span className={`chip ${i.Resuelta ? '' : 'bad'}`}>{ETIQUETA_INCIDENCIA[i.Tipo]}</span>
                    </td>
                    <td>{i.Descripcion}</td>
                    <td className="der num">{i.Monto != null ? moneda(i.Monto) : <span className="texto-suave">—</span>}</td>
                    <td>
                      {i.Resuelta
                        ? <span className="chip ok">Resuelta</span>
                        : <span className="chip bad">Sin resolver</span>}
                    </td>
                    {esAdmin && (
                      <td className="acciones-col">
                        {!i.Resuelta && (
                          <button className="btn btn-secundario btn-sm"
                            onClick={() => resolver(i.IdIncidencia)}>Marcar resuelta</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {puedeEditar && (
        <div className="mt-16">
          <button className="btn btn-primario" onClick={onRegistrar}>+ Registrar incidencia</button>
        </div>
      )}
      {!esAdmin && expediente.Pendientes > 0 && (
        <p className="texto-suave mt-8" style={{ fontSize: 13 }}>
          Solo un administrador puede marcar incidencias como resueltas.
        </p>
      )}
    </>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Modal } from '../components/ui/Modal';
import { Spinner, Vacio } from '../components/ui/UI';
import { useToast } from '../components/ui/Toast';
import { crearRecursoApi } from '../api/recurso';
import { adminApi } from '../api/admin';
import { mensajeError } from '../api/client';

interface Sucursal {
  IdSucursal: number; Nombre: string; Ciudad: string | null; Direccion: string | null; Activa: boolean;
}
interface Contacto { IdContacto: number; IdSucursal: number; Tipo: string; Valor: string; Orden: number; }

const sucursalesApi = crearRecursoApi('admin/sucursales');
const FORM_VACIO = { IdSucursal: 0, Nombre: '', Ciudad: '', Direccion: '' };

export default function Sucursales() {
  const { mostrar } = useToast();

  const [filas, setFilas] = useState<Sucursal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<typeof FORM_VACIO | null>(null);
  const [esNueva, setEsNueva] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Panel de contactos
  const [sucContactos, setSucContactos] = useState<Sucursal | null>(null);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [cargandoContactos, setCargandoContactos] = useState(false);
  const [nuevoContacto, setNuevoContacto] = useState({ Tipo: 'TELEFONO', Valor: '' });

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setFilas(await sucursalesApi.listar() as Sucursal[]); }
    catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setCargando(false); }
  }, [mostrar]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    if (!form) return;
    if (!form.Nombre.trim()) return mostrar('El nombre es obligatorio', 'error');
    setGuardando(true);
    try {
      if (esNueva) { await sucursalesApi.crear(form); mostrar('Sucursal creada', 'exito'); }
      else { await sucursalesApi.actualizar(form.IdSucursal, form); mostrar('Cambios guardados', 'exito'); }
      setForm(null); cargar();
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setGuardando(false); }
  };

  const desactivar = async (s: Sucursal) => {
    if (!confirm(`¿Desactivar la sucursal ${s.Nombre}? Dejará de aparecer en el encabezado de las cotizaciones.`)) return;
    try { await sucursalesApi.eliminar(s.IdSucursal); mostrar('Sucursal desactivada', 'exito'); cargar(); }
    catch (e) { mostrar(mensajeError(e), 'error'); }
  };

  const abrirContactos = async (s: Sucursal) => {
    setSucContactos(s); setCargandoContactos(true); setNuevoContacto({ Tipo: 'TELEFONO', Valor: '' });
    try { setContactos(await adminApi.contactos(s.IdSucursal)); }
    catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setCargandoContactos(false); }
  };

  const agregarContacto = async () => {
    if (!sucContactos) return;
    if (!nuevoContacto.Valor.trim()) return mostrar('Escribe el teléfono o correo', 'error');
    try {
      await adminApi.crearContacto({
        IdSucursal: sucContactos.IdSucursal, Tipo: nuevoContacto.Tipo,
        Valor: nuevoContacto.Valor.trim(), Orden: contactos.length + 1,
      });
      setNuevoContacto({ Tipo: 'TELEFONO', Valor: '' });
      setContactos(await adminApi.contactos(sucContactos.IdSucursal));
      mostrar('Contacto agregado', 'exito');
    } catch (e) { mostrar(mensajeError(e), 'error'); }
  };

  const quitarContacto = async (c: Contacto) => {
    if (!sucContactos) return;
    if (!confirm(`¿Eliminar ${c.Valor}?`)) return;
    try {
      await adminApi.eliminarContacto(c.IdContacto);
      setContactos(await adminApi.contactos(sucContactos.IdSucursal));
      mostrar('Contacto eliminado', 'exito');
    } catch (e) { mostrar(mensajeError(e), 'error'); }
  };

  return (
    <Layout titulo="Sucursales" acciones={
      <button className="btn btn-primario" onClick={() => { setForm({ ...FORM_VACIO }); setEsNueva(true); }}>
        + Nueva sucursal
      </button>
    }>
      <div className="aviso" style={{ marginBottom: 16 }}>
        Las sucursales activas y sus teléfonos se imprimen en el encabezado de todas las cotizaciones.
      </div>

      <div className="card">
        {cargando ? <Spinner /> : filas.length === 0 ? (
          <Vacio titulo="Sin sucursales">Crea la primera con “+ Nueva sucursal”.</Vacio>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Nombre</th><th>Ciudad</th><th>Dirección</th><th>Estado</th>
                  <th className="acciones-col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((s) => (
                  <tr key={s.IdSucursal}>
                    <td style={{ fontWeight: 600 }}>{s.Nombre}</td>
                    <td>{s.Ciudad || <span className="texto-suave">—</span>}</td>
                    <td>{s.Direccion || <span className="texto-suave">—</span>}</td>
                    <td>
                      {s.Activa
                        ? <span className="chip ok">Activa</span>
                        : <span className="chip bad">Inactiva</span>}
                    </td>
                    <td className="acciones-col">
                      <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-secundario btn-sm" onClick={() => abrirContactos(s)}>Contactos</button>
                        <button className="btn btn-secundario btn-sm" onClick={() => {
                          setForm({
                            IdSucursal: s.IdSucursal, Nombre: s.Nombre,
                            Ciudad: s.Ciudad || '', Direccion: s.Direccion || '',
                          });
                          setEsNueva(false);
                        }}>Editar</button>
                        <button className="btn btn-fantasma btn-sm" style={{ color: 'var(--error)' }}
                          onClick={() => desactivar(s)}>Desactivar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <Modal titulo={esNueva ? 'Nueva sucursal' : 'Editar sucursal'} onCerrar={() => setForm(null)}
          pie={<>
            <button className="btn btn-secundario" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn btn-primario" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </>}>
          <div className="grid-2">
            <div className="campo">
              <label htmlFor="nom">Nombre <span className="req">*</span></label>
              <input id="nom" className="input" value={form.Nombre}
                onChange={(e) => setForm({ ...form, Nombre: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="ciu">Ciudad</label>
              <input id="ciu" className="input" value={form.Ciudad}
                onChange={(e) => setForm({ ...form, Ciudad: e.target.value })} />
            </div>
            <div className="campo" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="dir">Dirección</label>
              <textarea id="dir" className="textarea" value={form.Direccion}
                onChange={(e) => setForm({ ...form, Direccion: e.target.value })} />
            </div>
          </div>
        </Modal>
      )}

      {sucContactos && (
        <Modal titulo={`Contactos · ${sucContactos.Nombre}`} onCerrar={() => setSucContactos(null)}
          pie={<button className="btn btn-secundario" onClick={() => setSucContactos(null)}>Cerrar</button>}>
          {cargandoContactos ? <Spinner /> : (
            <>
              {contactos.length === 0 ? (
                <p className="texto-suave">Esta sucursal aún no tiene contactos.</p>
              ) : (
                <table className="tabla" style={{ marginBottom: 16 }}>
                  <thead><tr><th>Tipo</th><th>Valor</th><th className="acciones-col"></th></tr></thead>
                  <tbody>
                    {contactos.map((c) => (
                      <tr key={c.IdContacto}>
                        <td><span className="chip">{c.Tipo}</span></td>
                        <td className="num">{c.Valor}</td>
                        <td className="acciones-col">
                          <button className="btn btn-fantasma btn-sm" style={{ color: 'var(--error)' }}
                            onClick={() => quitarContacto(c)}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="flex gap-8 items-center wrap">
                <select className="select" style={{ maxWidth: 150 }} value={nuevoContacto.Tipo}
                  onChange={(e) => setNuevoContacto({ ...nuevoContacto, Tipo: e.target.value })}>
                  <option value="TELEFONO">Teléfono</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                </select>
                <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="871 000 0000"
                  value={nuevoContacto.Valor}
                  onChange={(e) => setNuevoContacto({ ...nuevoContacto, Valor: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') agregarContacto(); }} />
                <button className="btn btn-primario" onClick={agregarContacto}>Agregar</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </Layout>
  );
}

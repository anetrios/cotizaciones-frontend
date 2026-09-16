import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Spinner, Vacio } from '../components/ui/UI';
import { useToast } from '../components/ui/Toast';
import { clientesApi } from '../api/clientes';
import { mensajeError } from '../api/client';
import type { AccionRevision, PendienteRevision } from '../types';

const POR_TANDA = 20;

const OPCIONES: Array<{ accion: AccionRevision; etiqueta: string }> = [
  { accion: 'PERSONA', etiqueta: 'Es una persona' },
  { accion: 'DOS_PERSONAS', etiqueta: 'Son dos personas' },
  { accion: 'TELEFONO', etiqueta: 'Es un teléfono' },
  { accion: 'DOMICILIO', etiqueta: 'Es un domicilio' },
  { accion: 'NOTA', etiqueta: 'Es una nota' },
  { accion: 'BASURA', etiqueta: 'Es basura' },
];

/** Parte "ROSY/LUIS OMAR CASTAÑON" en dos, para no hacer escribir de nuevo lo que ya está. */
function partirEnDos(texto: string): [string, string] {
  const partes = texto.split(/\s*[/,]\s*|\s+Y\s+/i).filter(Boolean);
  return [partes[0] || '', partes.slice(1).join(' ') || ''];
}

const FORM_VACIO = {
  Nombre1: '', Puesto1: '', Telefono1: '', Nombre2: '', Puesto2: '', Telefono2: '', Nota: '',
};

/**
 * Cola de limpieza del padrón: un pendiente a la vez. De uno en uno a propósito —
 * una tabla de cientos de renglones ambiguos no se revisa, se abandona.
 */
export default function RevisionClientes() {
  const navigate = useNavigate();
  const { mostrar } = useToast();

  const [filas, setFilas] = useState<PendienteRevision[]>([]);
  const [indice, setIndice] = useState(0);
  const [resumen, setResumen] = useState({ Pendientes: 0, Prioritarios: 0 });
  const [soloConCotizaciones, setSoloConCotizaciones] = useState(true);
  const [cargando, setCargando] = useState(true);

  const [accion, setAccion] = useState<AccionRevision | null>(null);
  const [form, setForm] = useState({ ...FORM_VACIO });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setAccion(null);
    try {
      const [{ datos }, r] = await Promise.all([
        clientesApi.revision(soloConCotizaciones, 1, POR_TANDA),
        clientesApi.resumenRevision(),
      ]);
      setFilas(datos); setIndice(0); setResumen(r);
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setCargando(false); }
  }, [soloConCotizaciones, mostrar]);

  useEffect(() => { cargar(); }, [cargar]);

  const pendiente: PendienteRevision | undefined = filas[indice];

  const elegir = (a: AccionRevision) => {
    const valor = pendiente?.ValorOriginal || '';
    const [uno, dos] = partirEnDos(valor);
    setForm({
      ...FORM_VACIO,
      Nombre1: a === 'PERSONA' ? valor : a === 'DOS_PERSONAS' ? uno : '',
      Nombre2: a === 'DOS_PERSONAS' ? dos : '',
      Telefono1: a === 'TELEFONO' ? valor : '',
      Nota: a === 'DOMICILIO' || a === 'NOTA' ? valor : '',
    });
    setAccion(a);
  };

  const siguiente = () => {
    setAccion(null);
    if (indice + 1 < filas.length) setIndice(indice + 1);
    else cargar();
  };

  const aplicar = async () => {
    if (!pendiente || !accion) return;
    setGuardando(true);
    try {
      const r = await clientesApi.resolverRevision(pendiente.IdRevision, { Accion: accion, ...form });
      mostrar(r.resuelto
        ? `Listo${r.contactosCreados ? `: ${r.contactosCreados} contacto(s) creado(s)` : ''}`
        : 'Anotado para preguntar; sigue pendiente', 'exito');
      // Sale de la tanda: ya no es pendiente (o quedó anotado y no queremos repetirlo hoy).
      const restantes = filas.filter((f) => f.IdRevision !== pendiente.IdRevision);
      setResumen((prev) => ({ ...prev, Pendientes: Math.max(0, prev.Pendientes - (r.resuelto ? 1 : 0)) }));
      setAccion(null);
      if (restantes.length === 0) { cargar(); return; }
      setFilas(restantes);
      setIndice(Math.min(indice, restantes.length - 1));
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setGuardando(false); }
  };

  return (
    <Layout titulo="Revisión de clientes" acciones={
      <label className="flex items-center gap-8" style={{ fontSize: 13, fontWeight: 600 }}>
        <input type="checkbox" checked={soloConCotizaciones} style={{ width: 16, height: 16 }}
          onChange={(e) => setSoloConCotizaciones(e.target.checked)} />
        Solo clientes con cotizaciones
      </label>
    }>
      <div className="aviso info" style={{ marginBottom: 16 }}>
        Quedan <strong>{resumen.Pendientes}</strong> pendientes en total,{' '}
        <strong>{resumen.Prioritarios}</strong> de clientes que sí han cotizado. Se pueden dejar
        a medias y seguir otro día.
      </div>

      {cargando ? <Spinner /> : !pendiente ? (
        <div className="card">
          <Vacio titulo="Nada por revisar">
            {soloConCotizaciones
              ? 'No quedan pendientes de clientes con cotizaciones. Destilda el filtro para ver el resto.'
              : 'La cola está vacía.'}
          </Vacio>
        </div>
      ) : (
        <div className="card card-cuerpo">
          <div className="flex justify-between items-center wrap gap-12" style={{ marginBottom: 16 }}>
            <div>
              <strong style={{ fontSize: 17 }}>{pendiente.Cliente}</strong>
              {pendiente.Ciudad && <span className="texto-suave"> · {pendiente.Ciudad}</span>}
              {pendiente.Restriccion === 'BLOQUEO' && <span className="chip bad" style={{ marginLeft: 8 }}>Bloqueado</span>}
              <div className="texto-suave" style={{ fontSize: 12 }}>
                {pendiente.Cotizaciones} cotización(es) · {pendiente.Motivo}
              </div>
            </div>
            <button className="btn btn-secundario btn-sm"
              onClick={() => navigate(`/clientes/${pendiente.IdCliente}`)}>Ver ficha</button>
          </div>

          <div className="campo">
            <label>Campo <code>{pendiente.Campo}</code>, valor original</label>
            <div className="card card-cuerpo" style={{ background: 'var(--amarillo-suave)', boxShadow: 'none' }}>
              <strong style={{ fontSize: 16 }}>
                {pendiente.ValorOriginal || <span className="texto-suave">(vacío)</span>}
              </strong>
            </div>
          </div>

          {pendiente.Sugerencia && (
            <p className="texto-medio mt-8" style={{ fontSize: 13 }}>Sugerencia: {pendiente.Sugerencia}</p>
          )}

          <div className="grid-3 mt-16">
            <Dato etiqueta="Contacto actual" valor={pendiente.ContactoActual} />
            <Dato etiqueta="Teléfono actual" valor={pendiente.TelefonoActual} />
            <Dato etiqueta="Dirección actual" valor={pendiente.DireccionActual} />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--borde)', margin: '20px 0' }} />

          {!accion ? (
            <>
              <div className="flex gap-8 wrap">
                {OPCIONES.map((o) => (
                  <button key={o.accion} className="btn btn-secundario" onClick={() => elegir(o.accion)}>
                    {o.etiqueta}
                  </button>
                ))}
                <button className="btn btn-fantasma" onClick={() => elegir('PREGUNTAR')}>No sé / preguntar</button>
              </div>
              <div className="mt-16">
                <button className="btn btn-fantasma btn-sm" onClick={siguiente}>Saltar por ahora →</button>
              </div>
            </>
          ) : (
            <Formulario accion={accion} form={form} setForm={setForm}
              guardando={guardando} onAplicar={aplicar} onCancelar={() => setAccion(null)} />
          )}
        </div>
      )}
    </Layout>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div className="doc-dato">
      <span className="doc-dato-lbl">{etiqueta}</span>
      <span className="doc-dato-val">{valor || <span className="texto-suave">—</span>}</span>
    </div>
  );
}

function Formulario({ accion, form, setForm, guardando, onAplicar, onCancelar }: {
  accion: AccionRevision;
  form: typeof FORM_VACIO;
  setForm: (f: typeof FORM_VACIO) => void;
  guardando: boolean;
  onAplicar: () => void;
  onCancelar: () => void;
}) {
  const persona = accion === 'PERSONA' || accion === 'DOS_PERSONAS';
  const etiquetaNota =
    accion === 'DOMICILIO' ? 'Domicilio' : accion === 'NOTA' ? 'Nota' : 'A quién preguntarle';

  return (
    <>
      {persona && (
        <div className="grid-3">
          <div className="campo">
            <label htmlFor="rv-n1">Nombre <span className="req">*</span></label>
            <input id="rv-n1" className="input" maxLength={150} value={form.Nombre1} autoFocus
              onChange={(e) => setForm({ ...form, Nombre1: e.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="rv-p1">Puesto</label>
            <input id="rv-p1" className="input" maxLength={80} value={form.Puesto1}
              placeholder="COMPRAS, PAGOS…" onChange={(e) => setForm({ ...form, Puesto1: e.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="rv-t1">Teléfono</label>
            <input id="rv-t1" className="input" maxLength={40} value={form.Telefono1}
              onChange={(e) => setForm({ ...form, Telefono1: e.target.value })} />
          </div>
        </div>
      )}

      {accion === 'DOS_PERSONAS' && (
        <div className="grid-3 mt-16">
          <div className="campo">
            <label htmlFor="rv-n2">Segundo nombre <span className="req">*</span></label>
            <input id="rv-n2" className="input" maxLength={150} value={form.Nombre2}
              onChange={(e) => setForm({ ...form, Nombre2: e.target.value })} />
          </div>
          {/* Etiquetas distintas a las del primer bloque: dos campos "Puesto" en la
              misma pantalla no se distinguen, ni a la vista ni con lector de pantalla. */}
          <div className="campo">
            <label htmlFor="rv-p2">Segundo puesto</label>
            <input id="rv-p2" className="input" maxLength={80} value={form.Puesto2}
              onChange={(e) => setForm({ ...form, Puesto2: e.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="rv-t2">Segundo teléfono</label>
            <input id="rv-t2" className="input" maxLength={40} value={form.Telefono2}
              onChange={(e) => setForm({ ...form, Telefono2: e.target.value })} />
          </div>
        </div>
      )}

      {accion === 'TELEFONO' && (
        <div className="campo">
          <label htmlFor="rv-tel">Teléfono <span className="req">*</span></label>
          <input id="rv-tel" className="input" maxLength={40} value={form.Telefono1} autoFocus
            onChange={(e) => setForm({ ...form, Telefono1: e.target.value })} />
        </div>
      )}

      {(accion === 'DOMICILIO' || accion === 'NOTA' || accion === 'PREGUNTAR') && (
        <div className="campo">
          <label htmlFor="rv-nota">
            {etiquetaNota}{accion !== 'PREGUNTAR' && <span className="req"> *</span>}
          </label>
          {/* El domicilio va a cliente.Direccion, que solo admite 250. */}
          <textarea id="rv-nota" className="textarea" value={form.Nota} autoFocus
            maxLength={accion === 'DOMICILIO' ? 250 : 300}
            onChange={(e) => setForm({ ...form, Nota: e.target.value })} />
        </div>
      )}

      {accion === 'BASURA' && (
        <p className="texto-medio">
          Se descarta el texto y se libera el campo. El original queda guardado en el registro
          histórico del cliente, así que no se pierde.
        </p>
      )}

      <div className="flex gap-8 mt-16" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button className="btn btn-primario" onClick={onAplicar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Aplicar y siguiente'}
        </button>
      </div>
    </>
  );
}

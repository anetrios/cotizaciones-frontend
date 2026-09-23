import { useState } from 'react';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { clientesApi } from '../api/clientes';
import { mensajeError } from '../api/client';
import { hoyISO } from './ui/UI';
import { ETIQUETA_INCIDENCIA, INCIDENCIAS_QUE_BLOQUEAN } from '../types';
import type { TipoIncidencia } from '../types';

/**
 * Registra una incidencia del cliente. Cuando el tipo bloquea, se avisa ANTES de
 * guardar: bloquear a un cliente le cierra la puerta a quien lo atienda mañana,
 * y quien captura tiene que saberlo en ese momento, no enterarse después.
 */
export function ModalIncidencia({ idCliente, cliente, onCerrar, onGuardado }: {
  idCliente: number;
  cliente: string;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const { mostrar } = useToast();
  const [tipo, setTipo] = useState<TipoIncidencia>('NO_PAGO');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [guardando, setGuardando] = useState(false);

  const bloquea = INCIDENCIAS_QUE_BLOQUEAN.includes(tipo);

  const guardar = async () => {
    if (!descripcion.trim()) return mostrar('Describe qué pasó con este cliente', 'error');
    setGuardando(true);
    try {
      const { bloqueoAplicado } = await clientesApi.crearIncidencia(idCliente, {
        Tipo: tipo,
        Descripcion: descripcion.trim(),
        Monto: monto === '' ? null : Number(monto),
        Fecha: fecha,
      });
      mostrar(bloqueoAplicado ? 'Incidencia registrada. El cliente quedó bloqueado.' : 'Incidencia registrada', 'exito');
      onGuardado();
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setGuardando(false); }
  };

  return (
    <Modal titulo={`Registrar incidencia · ${cliente}`} onCerrar={onCerrar}
      pie={<>
        <button className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
        <button className={bloquea ? 'btn btn-peligro' : 'btn btn-primario'} onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : bloquea ? 'Registrar y bloquear' : 'Registrar'}
        </button>
      </>}>
      <div className="campo">
        <label htmlFor="inc-tipo">Tipo <span className="req">*</span></label>
        <select id="inc-tipo" className="select" value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoIncidencia)}>
          {(Object.keys(ETIQUETA_INCIDENCIA) as TipoIncidencia[]).map((t) => (
            <option key={t} value={t}>{ETIQUETA_INCIDENCIA[t]}</option>
          ))}
        </select>
      </div>

      {bloquea && (
        <div className="aviso error">
          ⛔ Esto bloqueará al cliente. Para volver a cotizarle harán falta el PIN de
          supervisor o que un administrador resuelva la incidencia.
        </div>
      )}

      <div className="campo">
        <label htmlFor="inc-desc">Descripción <span className="req">*</span></label>
        <textarea id="inc-desc" className="textarea" maxLength={400} value={descripcion}
          placeholder="Qué pasó: factura sin pagar, equipo no devuelto, etc."
          onChange={(e) => setDescripcion(e.target.value)} />
        <span className="texto-suave" style={{ fontSize: 12 }}>
          Este texto queda como motivo de la restricción. {400 - descripcion.length} caracteres disponibles.
        </span>
      </div>

      <div className="grid-2">
        <div className="campo">
          <label htmlFor="inc-monto">Monto</label>
          <input id="inc-monto" className="input" type="number" min="0" step="0.01" value={monto}
            placeholder="Opcional" onChange={(e) => setMonto(e.target.value)} />
          <span className="texto-suave" style={{ fontSize: 12 }}>Solo si hay una cantidad adeudada.</span>
        </div>
        <div className="campo">
          <label htmlFor="inc-fecha">Fecha <span className="req">*</span></label>
          <input id="inc-fecha" className="input" type="date" value={fecha}
            onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

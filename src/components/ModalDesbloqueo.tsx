import { useState } from 'react';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { clientesApi } from '../api/clientes';
import { mensajeError } from '../api/client';

/**
 * Se ofrece —nunca se aplica solo— cuando al cliente ya no le quedan incidencias
 * pendientes. Volver a confiarle a alguien que debía es una decisión de una
 * persona, no una consecuencia automática de cerrar el último renglón.
 */
export function ModalDesbloqueo({ idCliente, cliente, onCerrar, onDesbloqueado }: {
  idCliente: number;
  cliente: string;
  onCerrar: () => void;
  onDesbloqueado: () => void;
}) {
  const { mostrar } = useToast();
  const [guardando, setGuardando] = useState(false);

  const quitar = async () => {
    setGuardando(true);
    try {
      await clientesApi.cambiarRestriccion(idCliente, 'NINGUNA', null);
      mostrar('Bloqueo retirado', 'exito');
      onDesbloqueado();
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setGuardando(false); }
  };

  return (
    <Modal titulo="¿Quitar el bloqueo?" onCerrar={onCerrar} ancho={460}
      pie={<>
        <button className="btn btn-secundario" onClick={onCerrar}>No, dejarlo bloqueado</button>
        <button className="btn btn-exito" onClick={quitar} disabled={guardando}>
          {guardando ? 'Quitando…' : 'Sí, quitar el bloqueo'}
        </button>
      </>}>
      <p>
        <strong>{cliente}</strong> ya no tiene adeudos pendientes.
      </p>
      <p className="texto-medio">
        Si quitas el bloqueo, se le podrá cotizar de nuevo sin PIN de supervisor.
        Puedes dejarlo bloqueado y quitarlo después desde su ficha.
      </p>
    </Modal>
  );
}

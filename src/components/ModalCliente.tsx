import { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { crearRecursoApi } from '../api/recurso';
import type { Cliente } from '../types';

/**
 * Buscador para elegir un cliente. Lo usan el asistente de cotización y el alta
 * de incidencias desde la pantalla de Incidencias: es el mismo problema y no
 * conviene que se vea distinto en cada lado.
 *
 * Muestra la restricción en la lista a propósito: quien elige necesita saber
 * antes de elegir que ese cliente está bloqueado, no enterarse al guardar.
 */
export function ModalCliente({ titulo = 'Seleccionar cliente', onCerrar, onElegir }: {
  titulo?: string;
  onCerrar: () => void;
  onElegir: (c: Cliente) => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [filas, setFilas] = useState<Cliente[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      crearRecursoApi('clientes').listar({ busqueda }).then((f) => setFilas(f as Cliente[]));
    }, 250);
    return () => clearTimeout(t);
  }, [busqueda]);

  return (
    <Modal titulo={titulo} onCerrar={onCerrar} ancho={620}>
      <input className="input" autoFocus placeholder="Buscar por razón social o RFC…"
        value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      <div style={{ maxHeight: 380, overflowY: 'auto' }} className="mt-8">
        {filas.map((c) => (
          <button key={c.IdCliente} className="item-lista" onClick={() => onElegir(c)}>
            <div>
              <strong>{c.RazonSocial}</strong>
              {c.Restriccion !== 'NINGUNA' && (
                <span className={`chip ${c.Restriccion === 'BLOQUEO' ? 'bad' : 'warn'}`} style={{ marginLeft: 8 }}>
                  {c.Restriccion === 'BLOQUEO' ? 'Bloqueado' : 'Advertencia'}
                </span>
              )}
              <div className="texto-suave" style={{ fontSize: 12 }}>
                {c.RFC || 'Sin RFC'} · {c.Telefono || 's/tel'}
              </div>
            </div>
          </button>
        ))}
        {filas.length === 0 && <p className="texto-suave" style={{ padding: 12 }}>Sin resultados.</p>}
      </div>
    </Modal>
  );
}

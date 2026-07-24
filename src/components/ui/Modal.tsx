import type { ReactNode } from 'react';

export function Modal({ titulo, children, pie, onCerrar, ancho }: {
  titulo: string; children: ReactNode; pie?: ReactNode; onCerrar: () => void; ancho?: number;
}) {
  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" style={ancho ? { maxWidth: ancho } : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="modal-cabeza">
          <h3>{titulo}</h3>
          <button className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
        </div>
        <div className="modal-cuerpo">{children}</div>
        {pie && <div className="modal-pie">{pie}</div>}
      </div>
    </div>
  );
}

/**
 * Qué números mostrar: siempre la primera y la última, una ventana alrededor de
 * la actual, y "…" donde haya hueco.
 *
 * La ventana se recorre cuando la página actual está pegada a un extremo, en vez
 * de encogerse. Si no, en la página 1 saldrían tres números y en la 6 saldrían
 * siete, y la barra brincaría de ancho al navegar.
 *
 * Se exporta aparte de la vista porque es pura aritmética y así se prueba sola.
 */
export function paginasVisibles(actual: number, total: number, ventana = 5): (number | '…')[] {
  // Casillas totales: primera + hueco + ventana + hueco + última.
  const CASILLAS = ventana + 4;
  if (total <= CASILLAS) return Array.from({ length: total }, (_, i) => i + 1);

  const mitad = Math.floor(ventana / 2);
  let inicio = actual - mitad;
  let fin = actual + mitad;

  // Pegado a un extremo no hay hueco de ese lado, y esas dos casillas se le dan
  // a los números. Así la barra siempre mide lo mismo y los botones no se mueven
  // debajo del cursor al navegar.
  if (inicio <= 3) { inicio = 2; fin = ventana + 2; }
  else if (fin >= total - 2) { fin = total - 1; inicio = total - ventana - 1; }

  inicio = Math.max(2, inicio);
  fin = Math.min(total - 1, fin);

  const paginas: (number | '…')[] = [1];
  if (inicio > 2) paginas.push('…');
  for (let p = inicio; p <= fin; p++) paginas.push(p);
  if (fin < total - 1) paginas.push('…');
  paginas.push(total);
  return paginas;
}

export function Paginador({ pagina, total, porPagina, onCambiar, opcionesPorPagina, onCambiarPorPagina }: {
  pagina: number; total: number; porPagina: number; onCambiar: (p: number) => void;
  opcionesPorPagina?: number[]; onCambiarPorPagina?: (n: number) => void;
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  if (totalPaginas <= 1 && !opcionesPorPagina) return null;

  return (
    <div className="paginador">
      {opcionesPorPagina && onCambiarPorPagina && (
        <label className="flex items-center gap-6 texto-suave" style={{ fontSize: 13 }}>
          Por página
          <select
            className="select" style={{ maxWidth: 90 }} value={porPagina}
            onChange={(e) => onCambiarPorPagina(+e.target.value)}
          >
            {opcionesPorPagina.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      )}

      <span className="texto-suave" style={{ fontSize: 13 }}>
        {total} resultados · Página {pagina} de {totalPaginas}
      </span>

      <nav className="paginas" aria-label="Paginación">
        <button className="btn btn-secundario btn-sm" disabled={pagina <= 1}
          onClick={() => onCambiar(pagina - 1)}>‹ Anterior</button>

        {paginasVisibles(pagina, totalPaginas).map((p, i) => (
          p === '…'
            ? <span key={'hueco' + i} className="pagina-hueco" aria-hidden>…</span>
            : (
              <button key={p}
                className={`pagina ${p === pagina ? 'activa' : ''}`}
                aria-label={'Página ' + p}
                aria-current={p === pagina ? 'page' : undefined}
                onClick={() => onCambiar(p)}>
                {p}
              </button>
            )
        ))}

        <button className="btn btn-secundario btn-sm" disabled={pagina >= totalPaginas}
          onClick={() => onCambiar(pagina + 1)}>Siguiente ›</button>
      </nav>
    </div>
  );
}

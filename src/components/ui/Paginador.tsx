export function Paginador({ pagina, total, porPagina, onCambiar, opcionesPorPagina, onCambiarPorPagina }: {
  pagina: number; total: number; porPagina: number; onCambiar: (p: number) => void;
  opcionesPorPagina?: number[]; onCambiarPorPagina?: (n: number) => void;
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  if (totalPaginas <= 1 && !opcionesPorPagina) return null;
  return (
    <div className="flex items-center gap-12" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
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
      <span className="texto-suave" style={{ fontSize: 13 }}>{total} resultados · Página {pagina} de {totalPaginas}</span>
      <div className="flex gap-8">
        <button className="btn btn-secundario btn-sm" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>‹ Anterior</button>
        <button className="btn btn-secundario btn-sm" disabled={pagina >= totalPaginas} onClick={() => onCambiar(pagina + 1)}>Siguiente ›</button>
      </div>
    </div>
  );
}

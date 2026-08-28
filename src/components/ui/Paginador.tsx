export function Paginador({ pagina, total, porPagina, onCambiar }: {
  pagina: number; total: number; porPagina: number; onCambiar: (p: number) => void;
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center gap-12" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
      <span className="texto-suave" style={{ fontSize: 13 }}>{total} resultados · Página {pagina} de {totalPaginas}</span>
      <div className="flex gap-8">
        <button className="btn btn-secundario btn-sm" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>‹ Anterior</button>
        <button className="btn btn-secundario btn-sm" disabled={pagina >= totalPaginas} onClick={() => onCambiar(pagina + 1)}>Siguiente ›</button>
      </div>
    </div>
  );
}

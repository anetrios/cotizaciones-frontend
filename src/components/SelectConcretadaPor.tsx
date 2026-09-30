interface Usuario { IdUsuario: number; Nombre: string }

/**
 * "Concretada por" al marcar una cotización como Concretada. Llega preseleccionada
 * con quien cotizó —casi siempre es la misma persona— y el dropdown solo se toca
 * cuando la cerró alguien más.
 *
 * `usuarios` son los activos. Quien cotizó se agrega aunque ya no esté activo:
 * es el valor por omisión y el select no puede quedarse sin él.
 */
export function SelectConcretadaPor({ id, valor, onCambiar, usuarios, idQuienCotizo, nombreQuienCotizo }: {
  id: string;
  valor: number;
  onCambiar: (idUsuario: number) => void;
  usuarios: Usuario[];
  idQuienCotizo: number;
  nombreQuienCotizo: string;
}) {
  const opciones = usuarios.some((u) => u.IdUsuario === idQuienCotizo)
    ? usuarios
    : [{ IdUsuario: idQuienCotizo, Nombre: nombreQuienCotizo }, ...usuarios];
  return (
    <div className="campo">
      <label htmlFor={id}>Concretada por</label>
      <select id={id} className="select" value={valor} onChange={(e) => onCambiar(Number(e.target.value))}>
        {opciones.map((u) => (
          <option key={u.IdUsuario} value={u.IdUsuario}>
            {u.IdUsuario === idQuienCotizo ? `${u.Nombre} (quien cotizó)` : u.Nombre}
          </option>
        ))}
      </select>
      {valor !== idQuienCotizo && (
        <span className="texto-suave" style={{ fontSize: 12 }}>
          El monto concretado se le contará a esta persona, no a quien cotizó.
        </span>
      )}
    </div>
  );
}

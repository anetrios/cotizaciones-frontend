import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Paginador, paginasVisibles } from './Paginador';

describe('Paginador', () => {
  it('no renderiza nada si solo hay una página y no hay selector de tamaño', () => {
    const { container } = render(<Paginador pagina={1} total={5} porPagina={20} onCambiar={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el total de resultados y la página actual', () => {
    render(<Paginador pagina={2} total={45} porPagina={20} onCambiar={() => {}} />);
    expect(screen.getByText('45 resultados · Página 2 de 3')).toBeInTheDocument();
  });

  it('deshabilita "Anterior" en la primera página y "Siguiente" en la última', () => {
    render(<Paginador pagina={1} total={45} porPagina={20} onCambiar={() => {}} />);
    expect(screen.getByRole('button', { name: /Anterior/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Siguiente/ })).not.toBeDisabled();
  });

  it('habilita "Anterior" y deshabilita "Siguiente" en la última página', () => {
    render(<Paginador pagina={3} total={45} porPagina={20} onCambiar={() => {}} />);
    expect(screen.getByRole('button', { name: /Anterior/ })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Siguiente/ })).toBeDisabled();
  });

  it('llama a onCambiar con la página anterior/siguiente al hacer clic', async () => {
    const user = userEvent.setup();
    const onCambiar = vi.fn();
    render(<Paginador pagina={2} total={45} porPagina={20} onCambiar={onCambiar} />);

    await user.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(onCambiar).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole('button', { name: /Anterior/ }));
    expect(onCambiar).toHaveBeenCalledWith(1);
  });

  it('sin opcionesPorPagina no muestra el selector de "Por página"', () => {
    render(<Paginador pagina={1} total={45} porPagina={20} onCambiar={() => {}} />);
    expect(screen.queryByText('Por página')).not.toBeInTheDocument();
  });

  it('con opcionesPorPagina muestra el selector y respeta el valor actual', () => {
    render(
      <Paginador
        pagina={1} total={5} porPagina={50} onCambiar={() => {}}
        opcionesPorPagina={[20, 50]} onCambiarPorPagina={() => {}}
      />
    );
    expect(screen.getByText('Por página')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('50');
  });

  it('se muestra aunque haya una sola página, si se le da opcionesPorPagina', () => {
    render(
      <Paginador
        pagina={1} total={5} porPagina={20} onCambiar={() => {}}
        opcionesPorPagina={[20, 50]} onCambiarPorPagina={() => {}}
      />
    );
    expect(screen.getByText('Por página')).toBeInTheDocument();
  });

  it('cambiar el selector llama a onCambiarPorPagina con el número elegido', async () => {
    const user = userEvent.setup();
    const onCambiarPorPagina = vi.fn();
    render(
      <Paginador
        pagina={1} total={100} porPagina={20} onCambiar={() => {}}
        opcionesPorPagina={[20, 50]} onCambiarPorPagina={onCambiarPorPagina}
      />
    );
    await user.selectOptions(screen.getByRole('combobox'), '50');
    expect(onCambiarPorPagina).toHaveBeenCalledWith(50);
  });
});

describe('paginasVisibles — qué números salen', () => {
  it('con pocas páginas las muestra todas, sin huecos', () => {
    expect(paginasVisibles(1, 3)).toEqual([1, 2, 3]);
    expect(paginasVisibles(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('una sola página es solo el 1', () => {
    expect(paginasVisibles(1, 1)).toEqual([1]);
  });

  it('en medio de muchas, pone huecos de los dos lados', () => {
    expect(paginasVisibles(80, 159)).toEqual([1, '…', 78, 79, 80, 81, 82, '…', 159]);
  });

  // Sin hueco a la izquierda hay dos casillas libres, y se usan para mostrar más
  // números en vez de dejar la barra más corta.
  it('al principio usa las casillas del hueco para más números', () => {
    expect(paginasVisibles(1, 159)).toEqual([1, 2, 3, 4, 5, 6, 7, '…', 159]);
    expect(paginasVisibles(2, 159)).toEqual([1, 2, 3, 4, 5, 6, 7, '…', 159]);
  });

  it('al final hace lo mismo del otro lado', () => {
    expect(paginasVisibles(159, 159)).toEqual([1, '…', 153, 154, 155, 156, 157, 158, 159]);
    expect(paginasVisibles(158, 159)).toEqual([1, '…', 153, 154, 155, 156, 157, 158, 159]);
  });

  // Si la ventana se encogiera en los extremos, la barra cambiaría de ancho al
  // navegar y los botones se moverían debajo del cursor.
  it('la cantidad de casillas no cambia al moverse entre páginas', () => {
    const anchos = [1, 2, 3, 40, 80, 120, 157, 158, 159]
      .map((p) => paginasVisibles(p, 159).length);
    expect(new Set(anchos).size).toBe(1);
  });

  it('nunca repite un número ni pierde la primera o la última', () => {
    for (const actual of [1, 2, 5, 50, 99, 100]) {
      const v = paginasVisibles(actual, 100);
      const numeros = v.filter((x): x is number => typeof x === 'number');
      expect(new Set(numeros).size).toBe(numeros.length);
      expect(numeros[0]).toBe(1);
      expect(numeros[numeros.length - 1]).toBe(100);
      expect([...numeros]).toEqual([...numeros].sort((a, b) => a - b));
    }
  });
});

describe('Paginador — números clicables', () => {
  it('pinta los números y marca cuál es la página actual', () => {
    render(<Paginador pagina={3} total={200} porPagina={20} onCambiar={() => {}} />);

    const actual = screen.getByRole('button', { name: 'Página 3' });
    expect(actual).toHaveAttribute('aria-current', 'page');
    expect(actual).toHaveClass('activa');
    expect(screen.getByRole('button', { name: 'Página 4' })).not.toHaveAttribute('aria-current');
  });

  it('clic en un número salta directo a esa página', async () => {
    const user = userEvent.setup();
    const onCambiar = vi.fn();
    render(<Paginador pagina={1} total={200} porPagina={20} onCambiar={onCambiar} />);

    await user.click(screen.getByRole('button', { name: 'Página 4' }));
    expect(onCambiar).toHaveBeenCalledWith(4);
  });

  it('desde el final se puede saltar a la primera de un clic', async () => {
    const user = userEvent.setup();
    const onCambiar = vi.fn();
    render(<Paginador pagina={10} total={200} porPagina={20} onCambiar={onCambiar} />);

    await user.click(screen.getByRole('button', { name: 'Página 1' }));
    expect(onCambiar).toHaveBeenCalledWith(1);
  });

  it('los huecos no son botones: no hay nada que clicar ahí', () => {
    render(<Paginador pagina={80} total={3180} porPagina={20} onCambiar={() => {}} />);

    expect(screen.getAllByText('…').length).toBe(2);
    expect(screen.queryByRole('button', { name: /…/ })).not.toBeInTheDocument();
  });

  it('con 159 páginas no pinta 159 botones', () => {
    render(<Paginador pagina={80} total={3180} porPagina={20} onCambiar={() => {}} />);

    // 7 números + Anterior + Siguiente
    expect(screen.getAllByRole('button')).toHaveLength(9);
  });

  it('la navegación va dentro de un <nav> con nombre', () => {
    render(<Paginador pagina={2} total={200} porPagina={20} onCambiar={() => {}} />);
    expect(screen.getByRole('navigation', { name: 'Paginación' })).toBeInTheDocument();
  });
});

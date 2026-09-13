import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Paginador } from './Paginador';

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

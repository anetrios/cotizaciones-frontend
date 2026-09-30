import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DashboardProductos, { nombreFamilia } from './DashboardProductos';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/ui/Toast';
import { cotizacionesApi } from '../api/cotizaciones';
import type { FamiliaDashboard, ProductoDashboard } from '../types';

vi.mock('../api/cotizaciones', () => ({
  cotizacionesApi: { dashboardProductos: vi.fn(), dashboardFamilias: vi.fn() },
}));

function producto(overrides: Partial<ProductoDashboard> = {}): ProductoDashboard {
  return {
    Tipo: 'RENTA', Origen: 'RENTA', IdCatalogo: 1, ClaveManual: null, Codigo: 'AND-01', Descripcion: 'Marco de andamio',
    Familia: 'MARCO',
    Cotizaciones: 10, Concretadas: 4, Cantidad: 200, CantidadConcretada: 80, Importe: 50000, ImporteConcretado: 20000,
    ...overrides,
  };
}

function familia(overrides: Partial<FamiliaDashboard> = {}): FamiliaDashboard {
  return {
    Tipo: 'RENTA', Familia: 'MARCO', Variantes: 1, TieneServicio: 0,
    Cotizaciones: 10, Concretadas: 4, Cantidad: 200, CantidadConcretada: 80, Importe: 50000, ImporteConcretado: 20000,
    ...overrides,
  };
}

const PRODUCTOS: ProductoDashboard[] = [
  producto(),
  producto({ IdCatalogo: 2, Codigo: 'CRU-01', Descripcion: 'Cruceta', Familia: 'CRUCETA', Cotizaciones: 15, Concretadas: 2 }),
  producto({ Origen: 'SERVICIO', IdCatalogo: 3, Codigo: 'FLE', Descripcion: 'Flete local', Familia: 'FLETE', Cotizaciones: 20, Concretadas: 9 }),
  producto({
    Tipo: 'VENTA', Origen: 'MANUAL', IdCatalogo: null, ClaveManual: 'REMOLQUE 5X10', Codigo: null,
    Descripcion: 'Remolque 5x10', Familia: 'REMOLQUE', Cotizaciones: 3, Concretadas: 1,
  }),
  producto({
    Tipo: 'VENTA', Origen: 'VENTA', IdCatalogo: 5, Codigo: 'ESC-01', Descripcion: 'Escalera', Familia: 'ESCALERA',
    Cotizaciones: 6, Concretadas: 0, CantidadConcretada: 0, ImporteConcretado: 0,
  }),
  producto({
    Tipo: 'VENTA', Origen: 'MANUAL', IdCatalogo: null, ClaveManual: 'MUELLE 4 HOJAS', Codigo: null,
    Descripcion: 'Muelle 4 hojas', Familia: 'MUELLE', Cotizaciones: 3, Concretadas: 2,
  }),
  producto({
    Tipo: 'VENTA', Origen: 'MANUAL', IdCatalogo: null, ClaveManual: 'MUELLE 6 HOJAS', Codigo: null,
    Descripcion: 'Muelle 6 hojas', Familia: 'MUELLE', Cotizaciones: 2, Concretadas: 1,
  }),
];

// Muelle: 4 cotizaciones y no 5, porque una trae los dos muelles. El servidor ya lo cuenta así.
const FAMILIAS: FamiliaDashboard[] = [
  familia(),
  familia({ Familia: 'CRUCETA', Cotizaciones: 15, Concretadas: 2 }),
  familia({ Familia: 'FLETE', Variantes: 3, TieneServicio: 1, Cotizaciones: 25, Concretadas: 11 }),
  familia({ Tipo: 'VENTA', Familia: 'REMOLQUE', Cotizaciones: 3, Concretadas: 1 }),
  familia({ Tipo: 'VENTA', Familia: 'ESCALERA', Cotizaciones: 6, Concretadas: 0, CantidadConcretada: 0, ImporteConcretado: 0 }),
  familia({ Tipo: 'VENTA', Familia: 'MUELLE', Variantes: 2, Cotizaciones: 4, Concretadas: 3 }),
];

function renderPagina() {
  localStorage.setItem('usuario', JSON.stringify({ IdUsuario: 1, Nombre: 'Ana', Email: 'a@x.com', Rol: 'ADMIN', IdSucursal: null }));
  return render(
    <MemoryRouter><AuthProvider><ToastProvider><DashboardProductos /></ToastProvider></AuthProvider></MemoryRouter>
  );
}

/** Nombres de un ranking, en orden. */
function ranking(titulo: string) {
  return within(screen.getByRole('region', { name: titulo })).getAllByRole('listitem')
    .map((li) => li.querySelector('.dp-nombre-texto')!.textContent);
}

async function verPorProducto() {
  await screen.findByRole('region', { name: 'Más cotizados' });
  await userEvent.setup().click(screen.getByRole('button', { name: 'Producto' }));
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  vi.mocked(cotizacionesApi.dashboardProductos).mockResolvedValue(PRODUCTOS);
  vi.mocked(cotizacionesApi.dashboardFamilias).mockResolvedValue(FAMILIAS);
});

describe('DashboardProductos — por familia (vista inicial)', () => {
  it('pide productos y familias del mes en curso, con fechas YYYY-MM-DD', async () => {
    renderPagina();
    await screen.findByRole('region', { name: 'Más cotizados' });
    const filtros = vi.mocked(cotizacionesApi.dashboardFamilias).mock.calls[0][0]!;
    expect(filtros.fechaDesde).toMatch(/^\d{4}-\d{2}-01$/);
    expect(filtros.fechaHasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(cotizacionesApi.dashboardProductos).toHaveBeenCalledWith(filtros);
  });

  it('entra agrupado por grupo (familia), con el nombre en formato de título y cuántos productos junta', async () => {
    renderPagina();
    await screen.findByRole('region', { name: 'Más cotizados' });
    expect(screen.getByRole('button', { name: 'Grupo' })).toHaveAttribute('aria-pressed', 'true');
    expect(ranking('Más cotizados')).toEqual(['Flete', 'Cruceta', 'Marco', 'Escalera', 'Muelle', 'Remolque']);
    const muelle = within(screen.getByRole('table')).getByText('Muelle').closest('tr')!;
    expect(within(muelle).getByText('2 productos')).toBeInTheDocument();
    // Las cifras son las de la familia que manda el servidor, no la suma de sus productos (3 + 2).
    expect(within(muelle).getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Grupos cotizados')).toBeInTheDocument();
  });

  it('más rentados deja fuera a las familias con servicios de catálogo', async () => {
    renderPagina();
    await screen.findByRole('region', { name: 'Más rentados' });
    expect(ranking('Más rentados')).toEqual(['Marco', 'Cruceta']);
  });

  it('clic en una familia muestra sus productos y se puede regresar', async () => {
    const user = userEvent.setup();
    renderPagina();
    const tabla = await screen.findByRole('table');

    await user.click(within(tabla).getByText('Muelle'));

    expect(screen.getByText('Productos de Muelle')).toBeInTheDocument();
    const nombres = within(screen.getByRole('table')).getAllByRole('row').slice(1)
      .map((tr) => tr.querySelector('.dp-nombre-texto')!.textContent);
    expect(nombres).toEqual(['Muelle 4 hojas', 'Muelle 6 hojas']);

    await user.click(screen.getByRole('button', { name: 'Quitar grupo' }));
    expect(screen.getByText('Todos los grupos')).toBeInTheDocument();
  });

  it('clic en una familia de un ranking también abre sus productos', async () => {
    const user = userEvent.setup();
    renderPagina();
    const region = await screen.findByRole('region', { name: 'Más vendidos' });

    await user.click(within(region).getByText('Muelle'));
    expect(ranking('Más vendidos')).toEqual(['Muelle 4 hojas', 'Muelle 6 hojas']);
  });
});

describe('DashboardProductos — por producto', () => {
  it('más cotizados: por número de cotizaciones, sin importar el estatus', async () => {
    renderPagina();
    await verPorProducto();
    expect(ranking('Más cotizados'))
      .toEqual(['Flete local', 'Cruceta', 'Marco de andamio', 'Escalera', 'Remolque 5x10', 'Muelle 4 hojas', 'Muelle 6 hojas']);
  });

  it('más concretados: deja fuera lo que nunca se concretó', async () => {
    renderPagina();
    await verPorProducto();
    expect(ranking('Más concretados'))
      .toEqual(['Flete local', 'Marco de andamio', 'Cruceta', 'Muelle 4 hojas', 'Remolque 5x10', 'Muelle 6 hojas']);
  });

  it('más rentados: solo renta concretada y sin servicios', async () => {
    renderPagina();
    await verPorProducto();
    expect(ranking('Más rentados')).toEqual(['Marco de andamio', 'Cruceta']);
  });

  it('más vendidos: venta concretada, incluidas las líneas manuales', async () => {
    renderPagina();
    await verPorProducto();
    expect(ranking('Más vendidos')).toEqual(['Muelle 4 hojas', 'Remolque 5x10', 'Muelle 6 hojas']);
    expect(within(screen.getByRole('region', { name: 'Más vendidos' })).getAllByText('Manual')).toHaveLength(3);
  });

  it('el filtro "Solo renta" oculta el top de vendidos y filtra la tabla', async () => {
    const user = userEvent.setup();
    renderPagina();
    await verPorProducto();

    await user.selectOptions(screen.getByLabelText('Tipo'), 'RENTA');

    expect(screen.queryByRole('region', { name: 'Más vendidos' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('table')).queryByText('Escalera')).not.toBeInTheDocument();
  });

  it('la tabla se ordena por columna y calcula el % de conversión', async () => {
    const user = userEvent.setup();
    renderPagina();
    await verPorProducto();
    const tabla = screen.getByRole('table');

    await user.click(within(tabla).getByRole('columnheader', { name: /% conversión/ }));
    const primera = within(tabla).getAllByRole('row')[1];
    // Muelle 4 hojas: 2/3 = 67%, el más alto.
    expect(within(primera).getByText('Muelle 4 hojas')).toBeInTheDocument();
    expect(within(primera).getByText('67%')).toBeInTheDocument();
  });
});

describe('DashboardProductos — periodo', () => {
  it('cambiar a "Esta semana" vuelve a pedir productos y familias', async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: 'Esta semana' }));
    await waitFor(() => expect(cotizacionesApi.dashboardFamilias).toHaveBeenCalledTimes(2));
    expect(cotizacionesApi.dashboardProductos).toHaveBeenCalledTimes(2);
  });
});

describe('nombreFamilia', () => {
  it('pasa la familia de mayúsculas a formato de título', () => {
    expect(nombreFamilia('MUELLE')).toBe('Muelle');
    expect(nombreFamilia('STAR-10')).toBe('Star-10');
  });
});

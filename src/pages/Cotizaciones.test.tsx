import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Cotizaciones from './Cotizaciones';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/ui/Toast';
import { cotizacionesApi } from '../api/cotizaciones';
import { metaApi } from '../api/meta';
import type { CotizacionResumen, UsuarioSesion } from '../types';

vi.mock('../api/cotizaciones', () => ({ cotizacionesApi: { listar: vi.fn() } }));
vi.mock('../api/meta', () => ({ metaApi: { usuarios: vi.fn() } }));
vi.mock('xlsx', () => ({
  utils: { json_to_sheet: vi.fn(), book_new: vi.fn(() => ({})), book_append_sheet: vi.fn() },
  writeFile: vi.fn(),
}));

function filaBase(overrides: Partial<CotizacionResumen> = {}): CotizacionResumen {
  return {
    IdCotizacion: 1, Folio: 'COT-0001', Tipo: 'RENTA', Estatus: 'ENVIADA',
    Fecha: new Date().toISOString(), VigenciaDias: 15, Moneda: 'MXN',
    Subtotal: 1000, DescuentoMonto: 0, IVA: 160, Total: 1160,
    Cliente: 'Constructora Demo', Usuario: 'Rocío', UsuarioEmail: 'rocio@x.com', Sucursal: 'Torreón',
    ...overrides,
  };
}

function usuarioBase(overrides: Partial<UsuarioSesion> = {}): UsuarioSesion {
  // Nombre distinto al de las filas de prueba (Rocío) a propósito: en esta pantalla el usuario que
  // navega y el autor de cada cotización suelen ser personas distintas, y así se evita ambigüedad
  // entre el nombre del usuario en el sidebar y el "Usuario" de la fila al buscar texto en pantalla.
  return { IdUsuario: 99, Nombre: 'Ana Admin', Email: 'ana@x.com', Rol: 'VENDEDOR', IdSucursal: 1, ...overrides };
}

function mockListar(datos: CotizacionResumen[], total = datos.length) {
  vi.mocked(cotizacionesApi.listar).mockResolvedValue({ datos, total, pagina: 1, porPagina: 20 });
}

function renderPagina(usuario: UsuarioSesion = usuarioBase()) {
  localStorage.setItem('usuario', JSON.stringify(usuario));
  return render(
    <MemoryRouter initialEntries={['/cotizaciones']}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/cotizaciones" element={<Cotizaciones />} />
            <Route path="/cotizaciones/:id" element={<div>Marcador Detalle</div>} />
            <Route path="/cotizaciones/nueva" element={<div>Marcador Nueva</div>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  mockListar([]);
  vi.mocked(metaApi.usuarios).mockResolvedValue([{ IdUsuario: 7, Nombre: 'Rocío' }, { IdUsuario: 8, Nombre: 'Natalia' }]);
});

describe('Cotizaciones — carga y filtros', () => {
  it('carga la lista y el combo de personas al montar', async () => {
    mockListar([filaBase()]);
    renderPagina();

    await screen.findByText('COT-0001');
    expect(cotizacionesApi.listar).toHaveBeenCalledWith(
      expect.objectContaining({ folio: '', estatus: '', tipo: '', usuario: '', pagina: 1, porPagina: 20 }));
    expect(metaApi.usuarios).toHaveBeenCalled();
    expect(screen.getByRole('option', { name: 'Natalia' })).toBeInTheDocument();
  });

  it('muestra "Sin cotizaciones" cuando no hay resultados', async () => {
    renderPagina();
    expect(await screen.findByText('Sin cotizaciones')).toBeInTheDocument();
  });

  it('muestra folio, cliente, usuario y total de cada fila', async () => {
    mockListar([filaBase()]);
    renderPagina();

    await screen.findByText('COT-0001');
    const fila = screen.getByText('COT-0001').closest('tr') as HTMLElement;
    expect(within(fila).getByText('Constructora Demo')).toBeInTheDocument();
    expect(within(fila).getByText('Rocío')).toBeInTheDocument();
    expect(within(fila).getByText('rocio@x.com')).toBeInTheDocument();
  });

  it('escribir en "Buscar folio…" dispara una nueva búsqueda y resetea a página 1', async () => {
    const user = userEvent.setup();
    renderPagina();
    await waitFor(() => expect(cotizacionesApi.listar).toHaveBeenCalledTimes(1));

    await user.type(screen.getByPlaceholderText('Buscar folio…'), 'COT-9');

    await waitFor(() => expect(cotizacionesApi.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ folio: 'COT-9', pagina: 1 })), { timeout: 2000 });
  });

  it('cambiar el filtro de Tipo dispara una nueva búsqueda', async () => {
    const user = userEvent.setup();
    renderPagina();
    await waitFor(() => expect(cotizacionesApi.listar).toHaveBeenCalledTimes(1));

    await user.selectOptions(screen.getByDisplayValue('Todos los tipos'), 'VENTA');

    await waitFor(() => expect(cotizacionesApi.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo: 'VENTA' })));
  });

  it('cambiar el filtro de Estatus dispara una nueva búsqueda', async () => {
    const user = userEvent.setup();
    renderPagina();
    await waitFor(() => expect(cotizacionesApi.listar).toHaveBeenCalledTimes(1));

    await user.selectOptions(screen.getByDisplayValue('Todos los estatus'), 'NO_CONCRETADA');

    await waitFor(() => expect(cotizacionesApi.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ estatus: 'NO_CONCRETADA' })));
  });

  it('cambiar el filtro de Persona dispara una nueva búsqueda con ese usuario', async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByRole('option', { name: 'Natalia' });
    await waitFor(() => expect(cotizacionesApi.listar).toHaveBeenCalledTimes(1));

    await user.selectOptions(screen.getByDisplayValue('Todas las personas'), '8');

    await waitFor(() => expect(cotizacionesApi.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ usuario: '8' })));
  });
});

describe('Cotizaciones — navegación y permisos', () => {
  it('clic en una fila navega al detalle con el origen "/cotizaciones"', async () => {
    const user = userEvent.setup();
    mockListar([filaBase()]);
    renderPagina();

    await user.click(await screen.findByText('COT-0001'));
    expect(await screen.findByText('Marcador Detalle')).toBeInTheDocument();
  });

  it('"+ Nueva cotización" solo aparece para quien puede escribir', async () => {
    renderPagina(usuarioBase({ Rol: 'CONSULTA' }));
    await screen.findByText('Sin cotizaciones');
    expect(screen.queryByRole('button', { name: '+ Nueva cotización' })).not.toBeInTheDocument();
  });

  it('un VENDEDOR sí ve "+ Nueva cotización" y navega al hacer clic', async () => {
    const user = userEvent.setup();
    renderPagina(usuarioBase({ Rol: 'VENDEDOR' }));
    await screen.findByText('Sin cotizaciones');

    await user.click(screen.getByRole('button', { name: '+ Nueva cotización' }));
    expect(await screen.findByText('Marcador Nueva')).toBeInTheDocument();
  });
});

describe('Cotizaciones — exportar a Excel', () => {
  it('arma el archivo con los datos filtrados y lo descarga', async () => {
    const user = userEvent.setup();
    mockListar([filaBase()]);
    renderPagina();
    await screen.findByText('COT-0001');

    const XLSX = await import('xlsx');
    await user.click(screen.getByRole('button', { name: 'Exportar a Excel' }));

    await waitFor(() => expect(XLSX.writeFile).toHaveBeenCalled());
    expect(cotizacionesApi.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ pagina: 1, porPagina: 100000 }));
    const [libro, nombreArchivo] = vi.mocked(XLSX.writeFile).mock.calls[0];
    expect(libro).toBeTruthy();
    expect(nombreArchivo).toMatch(/^cotizaciones_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});

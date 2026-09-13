import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MisCotizaciones from './MisCotizaciones';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/ui/Toast';
import { cotizacionesApi } from '../api/cotizaciones';
import type { CotizacionResumen, UsuarioSesion } from '../types';

vi.mock('../api/cotizaciones', () => ({
  cotizacionesApi: { listar: vi.fn(), cambiarEstatusLote: vi.fn() },
}));

function filaBase(overrides: Partial<CotizacionResumen> = {}): CotizacionResumen {
  return {
    IdCotizacion: 1, Folio: 'COT-0001', Tipo: 'RENTA', Estatus: 'ENVIADA',
    Fecha: new Date().toISOString(), VigenciaDias: 15, Moneda: 'MXN',
    Subtotal: 1000, DescuentoMonto: 0, IVA: 160, Total: 1160,
    Cliente: 'Constructora Demo', Usuario: 'Rocío', UsuarioEmail: null, Sucursal: 'Torreón',
    ...overrides,
  };
}

function usuarioBase(overrides: Partial<UsuarioSesion> = {}): UsuarioSesion {
  return { IdUsuario: 7, Nombre: 'Rocío', Email: 'rocio@x.com', Rol: 'VENDEDOR', IdSucursal: 1, ...overrides };
}

function mockListar(datos: CotizacionResumen[], total = datos.length) {
  vi.mocked(cotizacionesApi.listar).mockResolvedValue({ datos, total, pagina: 1, porPagina: 20 });
}

function renderPagina(usuario: UsuarioSesion = usuarioBase()) {
  localStorage.setItem('usuario', JSON.stringify(usuario));
  return render(
    <MemoryRouter initialEntries={['/mis-cotizaciones']}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/mis-cotizaciones" element={<MisCotizaciones />} />
            <Route path="/cotizaciones/:id" element={<div>Marcador Detalle</div>} />
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
});

describe('MisCotizaciones — carga y filtros', () => {
  it('carga las cotizaciones del usuario actual al montar', async () => {
    mockListar([filaBase()]);
    renderPagina();

    await screen.findByText('COT-0001');
    expect(cotizacionesApi.listar).toHaveBeenCalledWith(
      expect.objectContaining({ usuario: 7, folio: '', tipo: '', estatus: '', pagina: 1, porPagina: 20 }));
  });

  it('muestra "Sin cotizaciones" cuando no hay resultados', async () => {
    renderPagina();
    expect(await screen.findByText('Sin cotizaciones')).toBeInTheDocument();
  });

  it('escribir en "Buscar folio…" dispara una nueva búsqueda (con debounce) y resetea a página 1', async () => {
    const user = userEvent.setup();
    mockListar([]);
    renderPagina();
    await waitFor(() => expect(cotizacionesApi.listar).toHaveBeenCalledTimes(1));

    await user.type(screen.getByPlaceholderText('Buscar folio…'), 'COT-9');

    await waitFor(() => expect(cotizacionesApi.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ folio: 'COT-9', pagina: 1 })), { timeout: 2000 });
  });

  it('cambiar el filtro de Tipo dispara una nueva búsqueda con ese tipo', async () => {
    const user = userEvent.setup();
    renderPagina();
    await waitFor(() => expect(cotizacionesApi.listar).toHaveBeenCalledTimes(1));

    await user.selectOptions(screen.getByDisplayValue('Todos los tipos'), 'RENTA');

    await waitFor(() => expect(cotizacionesApi.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo: 'RENTA' })));
  });

  it('cambiar el filtro de Estatus dispara una nueva búsqueda con ese estatus', async () => {
    const user = userEvent.setup();
    renderPagina();
    await waitFor(() => expect(cotizacionesApi.listar).toHaveBeenCalledTimes(1));

    await user.selectOptions(screen.getByDisplayValue('Todos los estatus'), 'CONCRETADA');

    await waitFor(() => expect(cotizacionesApi.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ estatus: 'CONCRETADA' })));
  });
});

describe('MisCotizaciones — selección', () => {
  it('un rol de solo lectura no ve checkboxes ni la barra de acciones', async () => {
    mockListar([filaBase()]);
    renderPagina(usuarioBase({ Rol: 'CONSULTA' }));

    await screen.findByText('COT-0001');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('marcar un checkbox muestra la barra de acciones con el conteo', async () => {
    const user = userEvent.setup();
    mockListar([filaBase()]);
    renderPagina();

    await screen.findByText('COT-0001');
    await user.click(screen.getAllByRole('checkbox')[1]); // [0] es el de "seleccionar todas"

    expect(await screen.findByText('1 seleccionada(s)')).toBeInTheDocument();
  });

  it('el checkbox de encabezado selecciona y deselecciona todas las filas visibles', async () => {
    const user = userEvent.setup();
    mockListar([filaBase({ IdCotizacion: 1, Folio: 'COT-0001' }), filaBase({ IdCotizacion: 2, Folio: 'COT-0002' })]);
    renderPagina();

    await screen.findByText('COT-0001');
    const [encabezado] = screen.getAllByRole('checkbox');
    await user.click(encabezado);
    expect(await screen.findByText('2 seleccionada(s)')).toBeInTheDocument();

    await user.click(encabezado);
    await waitFor(() => expect(screen.queryByText(/seleccionada\(s\)/)).not.toBeInTheDocument());
  });

  it('clic en una fila navega al detalle; clic en su checkbox NO navega', async () => {
    const user = userEvent.setup();
    mockListar([filaBase()]);
    renderPagina();

    await screen.findByText('COT-0001');
    await user.click(screen.getAllByRole('checkbox')[1]);
    expect(screen.queryByText('Marcador Detalle')).not.toBeInTheDocument();

    await user.click(screen.getByText('COT-0001'));
    expect(await screen.findByText('Marcador Detalle')).toBeInTheDocument();
  });
});

describe('MisCotizaciones — cambio masivo a un estatus simple', () => {
  it('pide confirmación; si se cancela, no llama al API', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    mockListar([filaBase()]);
    renderPagina();

    await screen.findByText('COT-0001');
    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.selectOptions(screen.getByDisplayValue('Cambiar estatus a…'), 'PENDIENTE');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(cotizacionesApi.cambiarEstatusLote).not.toHaveBeenCalled();
  });

  it('confirmado, llama al API con los ids seleccionados y muestra el resultado', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockListar([filaBase()]);
    vi.mocked(cotizacionesApi.cambiarEstatusLote).mockResolvedValue({ actualizadas: [1], fallidas: [] });
    renderPagina();

    await screen.findByText('COT-0001');
    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.selectOptions(screen.getByDisplayValue('Cambiar estatus a…'), 'PENDIENTE');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(cotizacionesApi.cambiarEstatusLote).toHaveBeenCalledWith([1], 'PENDIENTE', undefined, undefined, undefined);
    expect(await screen.findByText('1 cotización(es) actualizada(s) a Pendiente de respuesta')).toBeInTheDocument();
  });
});

describe('MisCotizaciones — No concretada en lote', () => {
  it('exige motivo antes de habilitar Confirmar, y lo envía al confirmar', async () => {
    const user = userEvent.setup();
    mockListar([filaBase()]);
    vi.mocked(cotizacionesApi.cambiarEstatusLote).mockResolvedValue({ actualizadas: [1], fallidas: [] });
    renderPagina();

    await screen.findByText('COT-0001');
    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.selectOptions(screen.getByDisplayValue('Cambiar estatus a…'), 'NO_CONCRETADA');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(await screen.findByText('Marcar 1 cotización(es) como no concretada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('Motivo'), 'COMPETENCIA');
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(cotizacionesApi.cambiarEstatusLote).toHaveBeenCalledWith([1], 'NO_CONCRETADA', 'COMPETENCIA', '', undefined);
  });
});

describe('MisCotizaciones — Concretada en lote (wizard)', () => {
  it('pide la factura de cada cotización paso a paso y termina en una revisión antes de confirmar', async () => {
    const user = userEvent.setup();
    mockListar([
      filaBase({ IdCotizacion: 1, Folio: 'COT-0001' }),
      filaBase({ IdCotizacion: 2, Folio: 'COT-0002' }),
    ]);
    vi.mocked(cotizacionesApi.cambiarEstatusLote).mockResolvedValue({ actualizadas: [1, 2], fallidas: [] });
    renderPagina();

    await screen.findByText('COT-0001');
    const [encabezado] = screen.getAllByRole('checkbox');
    await user.click(encabezado); // selecciona ambas
    await user.selectOptions(screen.getByDisplayValue('Cambiar estatus a…'), 'CONCRETADA');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(await screen.findByText('Factura o contrato (1 de 2)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente →' })).toBeDisabled();

    await user.type(screen.getByLabelText(/Número de factura o contrato/), 'F-001');
    expect(screen.getByRole('button', { name: 'Siguiente →' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Siguiente →' }));

    expect(await screen.findByText('Factura o contrato (2 de 2)')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Número de factura o contrato/), 'F-002');
    await user.click(screen.getByRole('button', { name: 'Revisar →' }));

    const tituloRevision = await screen.findByText('Revisión antes de confirmar');
    const modalRevision = tituloRevision.closest('.modal') as HTMLElement;
    expect(within(modalRevision).getByText('COT-0001').closest('li')?.textContent).toContain('F-001');
    expect(within(modalRevision).getByText('COT-0002').closest('li')?.textContent).toContain('F-002');

    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(cotizacionesApi.cambiarEstatusLote).toHaveBeenCalledWith(
      [1, 2], 'CONCRETADA', undefined, undefined, { 1: 'F-001', 2: 'F-002' });
  });

  it('"Anterior" regresa al paso previo conservando lo ya capturado', async () => {
    const user = userEvent.setup();
    mockListar([
      filaBase({ IdCotizacion: 1, Folio: 'COT-0001' }),
      filaBase({ IdCotizacion: 2, Folio: 'COT-0002' }),
    ]);
    renderPagina();

    await screen.findByText('COT-0001');
    await user.click(screen.getAllByRole('checkbox')[0]);
    await user.selectOptions(screen.getByDisplayValue('Cambiar estatus a…'), 'CONCRETADA');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    await screen.findByText('Factura o contrato (1 de 2)');
    await user.type(screen.getByLabelText(/Número de factura o contrato/), 'F-001');
    await user.click(screen.getByRole('button', { name: 'Siguiente →' }));
    await screen.findByText('Factura o contrato (2 de 2)');

    await user.click(screen.getByRole('button', { name: '← Anterior' }));
    expect(await screen.findByText('Factura o contrato (1 de 2)')).toBeInTheDocument();
    expect(screen.getByLabelText(/Número de factura o contrato/)).toHaveValue('F-001');
  });
});

describe('MisCotizaciones — resultado con fallos', () => {
  it('si algunas fallan, se muestra el detalle con folio y motivo de cada una', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockListar([filaBase({ IdCotizacion: 1, Folio: 'COT-0001' }), filaBase({ IdCotizacion: 2, Folio: 'COT-0002' })]);
    vi.mocked(cotizacionesApi.cambiarEstatusLote).mockResolvedValue({
      actualizadas: [1],
      fallidas: [{ IdCotizacion: 2, error: 'No tienes permiso sobre esta cotización' }],
    });
    renderPagina();

    await screen.findByText('COT-0001');
    await user.click(screen.getAllByRole('checkbox')[0]);
    await user.selectOptions(screen.getByDisplayValue('Cambiar estatus a…'), 'PENDIENTE');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    const tituloResultado = await screen.findByText('Resultado del cambio de estatus');
    const modalResultado = tituloResultado.closest('.modal') as HTMLElement;
    const item = within(within(modalResultado).getByText('COT-0002').closest('li') as HTMLElement);
    expect(item.getByText(/No tienes permiso sobre esta cotización/)).toBeInTheDocument();
  });
});

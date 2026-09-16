import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CotizacionDetalle from './CotizacionDetalle';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/ui/Toast';
import { cotizacionesApi } from '../api/cotizaciones';
import { metaApi } from '../api/meta';
import type { CotizacionCompleta, UsuarioSesion } from '../types';

vi.mock('../api/cotizaciones', () => ({
  cotizacionesApi: { obtener: vi.fn(), cambiarEstatus: vi.fn(), eliminar: vi.fn() },
}));
vi.mock('../api/meta', () => ({ metaApi: { sucursales: vi.fn() } }));

function cotizacionBase(overrides: Partial<CotizacionCompleta> = {}): CotizacionCompleta {
  return {
    IdCotizacion: 42, Folio: 'COT-0042', Tipo: 'RENTA', Estatus: 'BORRADOR',
    Fecha: new Date().toISOString(), VigenciaDias: 15, Moneda: 'MXN',
    Subtotal: 1000, DescuentoMonto: 0, IVA: 160, Total: 1160,
    Cliente: 'Constructora Demo', Usuario: 'Rocío', UsuarioEmail: 'rocio@x.com', Sucursal: 'Torreón',
    IdCliente: 1, IdContactoCliente: null, IdSucursal: 1, IdUsuario: 7,
    TipoCambio: null, TiempoEntrega: null, Garantia: null, CondicionesEntrega: null,
    CondicionPago: 'CONTADO', DiasCredito: null,
    AnticipoPorcentaje: null, AnticipoMonto: null, FormaLiquidacionSaldo: null, Observaciones: null,
    DescuentoPorcentaje: 0,
    ClienteComercial: null, ClienteRFC: null, ClienteContacto: null,
    ClienteTelefono: null, ClienteEmail: null, ClienteDireccion: null, SucursalDireccion: null,
    MotivoNoConcrecion: null, MotivoNoConcrecionDetalle: null, NumeroFactura: null,
    renglones: [{
      IdRenglon: 1, Orden: 1, CodigoSnapshot: 'AND-1', Descripcion: 'Andamio 6m',
      PrecioUnitario: 1000, Cantidad: 1, UnidadCobro: 'DIA', NumeroPeriodos: 1,
      DescuentoPorcentaje: 0, Importe: 1000,
    }],
    notas: [],
    ...overrides,
  };
}

function usuarioBase(overrides: Partial<UsuarioSesion> = {}): UsuarioSesion {
  return { IdUsuario: 7, Nombre: 'Rocío', Email: 'rocio@x.com', Rol: 'VENDEDOR', IdSucursal: 1, ...overrides };
}

function renderDetalle(usuario: UsuarioSesion, from = '/mis-cotizaciones') {
  localStorage.setItem('usuario', JSON.stringify(usuario));
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/cotizaciones/42', state: { from } }]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/cotizaciones/:id" element={<CotizacionDetalle />} />
            <Route path="/mis-cotizaciones" element={<div>Marcador Mis cotizaciones</div>} />
            <Route path="/cotizaciones" element={<div>Marcador Cotizaciones</div>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  vi.mocked(metaApi.sucursales).mockResolvedValue([]);
});

/** Hay dos botones "Editar": el de editar la cotización completa y el de editar solo la factura. */
function botonEditarFactura() {
  return screen.getAllByRole('button', { name: 'Editar' }).find((b) => b.className.includes('btn-sm'))!;
}

describe('CotizacionDetalle — Borrador', () => {
  it('muestra "Marcar enviada" para quien puede escribir, sin botones de decisión', async () => {
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue(cotizacionBase());
    renderDetalle(usuarioBase());

    expect(await screen.findByRole('button', { name: 'Marcar enviada' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Concretada' })).not.toBeInTheDocument();
  });

  it('al hacer clic en "Marcar enviada" cambia el estatus y aparecen los botones de decisión', async () => {
    const user = userEvent.setup();
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue(cotizacionBase());
    vi.mocked(cotizacionesApi.cambiarEstatus).mockResolvedValue(cotizacionBase({ Estatus: 'ENVIADA' }));
    renderDetalle(usuarioBase());

    await user.click(await screen.findByRole('button', { name: 'Marcar enviada' }));

    expect(cotizacionesApi.cambiarEstatus).toHaveBeenCalledWith(42, 'ENVIADA', undefined, undefined, undefined);
    expect(await screen.findByText('Enviada')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Concretada' })).toBeInTheDocument();
    expect(await screen.findByText('Estatus actualizado')).toBeInTheDocument();
  });
});

describe('CotizacionDetalle — marcar Concretada', () => {
  it('el número de factura es obligatorio: "Confirmar" arranca deshabilitado', async () => {
    const user = userEvent.setup();
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue(cotizacionBase({ Estatus: 'ENVIADA' }));
    renderDetalle(usuarioBase());

    await user.click(await screen.findByRole('button', { name: 'Concretada' }));
    expect(screen.getByRole('heading', { name: 'Número de factura' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
  });

  it('capturando el número se habilita Confirmar y se guarda con ese número', async () => {
    const user = userEvent.setup();
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue(cotizacionBase({ Estatus: 'ENVIADA' }));
    vi.mocked(cotizacionesApi.cambiarEstatus).mockResolvedValue(
      cotizacionBase({ Estatus: 'CONCRETADA', NumeroFactura: 'F-2026-0134' }));
    renderDetalle(usuarioBase());

    await user.click(await screen.findByRole('button', { name: 'Concretada' }));
    await user.type(screen.getByLabelText(/Número de factura o contrato/), 'F-2026-0134');
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(cotizacionesApi.cambiarEstatus).toHaveBeenCalledWith(42, 'CONCRETADA', undefined, undefined, 'F-2026-0134');
    await waitFor(() => expect(botonEditarFactura()).toBeInTheDocument());
    expect(botonEditarFactura().closest('span')?.textContent).toContain('Número de factura: F-2026-0134');
  });

  it('una cotización ya Concretada puede editar su factura sin tocar el resto', async () => {
    const user = userEvent.setup();
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue(
      cotizacionBase({ Estatus: 'CONCRETADA', NumeroFactura: 'F-VIEJA' }));
    vi.mocked(cotizacionesApi.cambiarEstatus).mockResolvedValue(
      cotizacionBase({ Estatus: 'CONCRETADA', NumeroFactura: 'F-NUEVA' }));
    renderDetalle(usuarioBase());

    await waitFor(() => expect(botonEditarFactura()).toBeInTheDocument());
    expect(botonEditarFactura().closest('span')?.textContent).toContain('Número de factura: F-VIEJA');

    await user.click(botonEditarFactura());
    const input = screen.getByLabelText(/Número de factura o contrato/) as HTMLInputElement;
    expect(input.value).toBe('F-VIEJA');
    await user.clear(input);
    await user.type(input, 'F-NUEVA');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(cotizacionesApi.cambiarEstatus).toHaveBeenCalledWith(42, 'CONCRETADA', undefined, undefined, 'F-NUEVA');
    await waitFor(() => expect(botonEditarFactura().closest('span')?.textContent).toContain('Número de factura: F-NUEVA'));
  });
});

describe('CotizacionDetalle — marcar No concretada', () => {
  it('exige elegir un motivo antes de poder confirmar', async () => {
    const user = userEvent.setup();
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue(cotizacionBase({ Estatus: 'ENVIADA' }));
    renderDetalle(usuarioBase());

    await user.click(await screen.findByRole('button', { name: 'No concretada' }));
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('Motivo'), 'PRECIO');
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled();
  });

  it('con motivo OTRO además exige el detalle', async () => {
    const user = userEvent.setup();
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue(cotizacionBase({ Estatus: 'ENVIADA' }));
    renderDetalle(usuarioBase());

    await user.click(await screen.findByRole('button', { name: 'No concretada' }));
    await user.selectOptions(screen.getByLabelText('Motivo'), 'OTRO');
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();

    await user.type(screen.getByLabelText(/Especifica el motivo/), 'El cliente canceló el proyecto');
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled();
  });

  it('confirmar guarda el motivo y lo muestra en la barra de estatus', async () => {
    const user = userEvent.setup();
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue(cotizacionBase({ Estatus: 'ENVIADA' }));
    vi.mocked(cotizacionesApi.cambiarEstatus).mockResolvedValue(
      cotizacionBase({ Estatus: 'NO_CONCRETADA', MotivoNoConcrecion: 'PRECIO' }));
    renderDetalle(usuarioBase());

    await user.click(await screen.findByRole('button', { name: 'No concretada' }));
    await user.selectOptions(screen.getByLabelText('Motivo'), 'PRECIO');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(cotizacionesApi.cambiarEstatus).toHaveBeenCalledWith(42, 'NO_CONCRETADA', 'PRECIO', '', undefined);
    expect(await screen.findByText('Motivo: Precio')).toBeInTheDocument();
  });
});

describe('CotizacionDetalle — permisos', () => {
  it('un VENDEDOR que no es dueño no ve los botones de decisión (pero sí el estatus)', async () => {
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue(cotizacionBase({ Estatus: 'ENVIADA', IdUsuario: 999 }));
    renderDetalle(usuarioBase({ IdUsuario: 7, Rol: 'VENDEDOR' }));

    expect(await screen.findByText('Enviada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Concretada' })).not.toBeInTheDocument();
  });

  it('un ADMIN sí puede decidir aunque no sea el dueño', async () => {
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue(cotizacionBase({ Estatus: 'ENVIADA', IdUsuario: 999 }));
    renderDetalle(usuarioBase({ IdUsuario: 1, Rol: 'ADMIN' }));

    expect(await screen.findByRole('button', { name: 'Concretada' })).toBeInTheDocument();
  });
});

describe('CotizacionDetalle — navegación y eliminar', () => {
  it('"Volver" regresa al origen guardado (Mis cotizaciones)', async () => {
    const user = userEvent.setup();
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue(cotizacionBase());
    renderDetalle(usuarioBase(), '/mis-cotizaciones');

    await user.click(await screen.findByRole('button', { name: '← Volver' }));
    expect(await screen.findByText('Marcador Mis cotizaciones')).toBeInTheDocument();
  });

  it('eliminar pide confirmación; si se cancela, no llama al API', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue(cotizacionBase());
    renderDetalle(usuarioBase());

    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));
    expect(cotizacionesApi.eliminar).not.toHaveBeenCalled();
  });

  it('eliminar confirmado llama al API y regresa al origen', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue(cotizacionBase());
    vi.mocked(cotizacionesApi.eliminar).mockResolvedValue(undefined);
    renderDetalle(usuarioBase(), '/mis-cotizaciones');

    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));

    expect(cotizacionesApi.eliminar).toHaveBeenCalledWith(42);
    expect(await screen.findByText('Marcador Mis cotizaciones')).toBeInTheDocument();
  });
});

describe('CotizacionDetalle — carga', () => {
  it('si falla la carga, avisa y regresa al origen', async () => {
    vi.mocked(cotizacionesApi.obtener).mockRejectedValue(new Error('boom'));
    renderDetalle(usuarioBase(), '/mis-cotizaciones');

    await waitFor(() => expect(screen.getByText('Marcador Mis cotizaciones')).toBeInTheDocument());
  });
});

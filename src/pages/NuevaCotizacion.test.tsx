import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import NuevaCotizacion from './NuevaCotizacion';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/ui/Toast';
import { crearRecursoApi } from '../api/recurso';
import { metaApi } from '../api/meta';
import { cotizacionesApi } from '../api/cotizaciones';
import { clientesApi } from '../api/clientes';
import type { Cliente, ContactoCliente, CotizacionCompleta, UsuarioSesion } from '../types';

vi.mock('../api/recurso', () => ({ crearRecursoApi: vi.fn() }));
vi.mock('../api/meta', () => ({ metaApi: { notas: vi.fn(), sucursales: vi.fn() } }));
vi.mock('../api/cotizaciones', () => ({
  cotizacionesApi: { parametros: vi.fn(), crear: vi.fn(), actualizar: vi.fn(), obtener: vi.fn() },
}));
vi.mock('../api/clientes', () => ({ clientesApi: { contactos: vi.fn() } }));

function clienteBase(overrides: Partial<Cliente> = {}): Cliente {
  return {
    IdCliente: 1, RazonSocial: 'Constructora Demo', NombreComercial: null, RFC: null,
    Contacto: null, Telefono: null, TelefonoAlterno: null, Email: null,
    Direccion: null, DireccionFiscal: null, Ciudad: null, Observaciones: null,
    Restriccion: 'NINGUNA', MotivoRestriccion: null, Activo: true,
    ...overrides,
  };
}

function stubRecurso(datos: unknown[] = []) {
  return {
    listar: vi.fn().mockResolvedValue(datos),
    listarPaginado: vi.fn(),
    obtener: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
  };
}

function usuarioBase(overrides: Partial<UsuarioSesion> = {}): UsuarioSesion {
  return { IdUsuario: 7, Nombre: 'Rocío', Email: 'rocio@x.com', Rol: 'VENDEDOR', IdSucursal: 1, ...overrides };
}

function cotizacionCreada(overrides: Partial<CotizacionCompleta> = {}): CotizacionCompleta {
  return {
    IdCotizacion: 99, Folio: 'COT-0099', Tipo: 'RENTA', Estatus: 'BORRADOR',
    Fecha: new Date().toISOString(), VigenciaDias: 15, Moneda: 'MXN',
    Subtotal: 850, DescuentoMonto: 0, IVA: 136, Total: 986,
    Cliente: 'Constructora Demo', Usuario: 'Rocío', UsuarioEmail: null, Sucursal: 'Torreón',
    IdCliente: 1, IdContactoCliente: null, IdSucursal: 1, IdUsuario: 7,
    TipoCambio: null, TiempoEntrega: null, Garantia: null, CondicionesEntrega: null,
    CondicionPago: 'CONTADO', DiasCredito: null,
    AnticipoPorcentaje: null, AnticipoMonto: null, FormaLiquidacionSaldo: null, Observaciones: null,
    DescuentoPorcentaje: 0,
    ClienteComercial: null, ClienteRFC: null, ClienteContacto: null,
    ClienteTelefono: null, ClienteEmail: null, ClienteDireccion: null, SucursalDireccion: null,
    MotivoNoConcrecion: null, MotivoNoConcrecionDetalle: null, NumeroFactura: null,
    renglones: [], notas: [],
    ...overrides,
  };
}

function mockRecursos(clientes: Cliente[] = [clienteBase()]) {
  vi.mocked(crearRecursoApi).mockImplementation((ruta: string) => {
    if (ruta === 'admin/sucursales') return { ...stubRecurso(), listar: vi.fn().mockRejectedValue(new Error('403')) };
    if (ruta === 'clientes') {
      return {
        ...stubRecurso(clientes),
        obtener: vi.fn().mockResolvedValue(clientes[0]),
      };
    }
    return stubRecurso([]); // articulos-renta, articulos-venta, servicios
  });
}

/** Los campos de Condiciones/Resumen no tienen htmlFor; se ubican por su <label> hermano. */
function campoPorLabel(texto: string) {
  const label = screen.getByText(texto, { selector: 'label', exact: false });
  return label.closest('.campo')!.querySelector('select, input, textarea') as HTMLElement;
}

function renderPagina(usuario: UsuarioSesion = usuarioBase()) {
  localStorage.setItem('usuario', JSON.stringify(usuario));
  return render(
    <MemoryRouter initialEntries={['/cotizaciones/nueva']}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/cotizaciones/nueva" element={<NuevaCotizacion />} />
            <Route path="/cotizaciones/:id/editar" element={<NuevaCotizacion />} />
            <Route path="/cotizaciones/:id" element={<div>Marcador Detalle</div>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

async function seleccionarClienteYSucursal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Seleccionar cliente…' }));
  await user.click(await screen.findByText('Constructora Demo'));
  await user.selectOptions(campoPorLabel('Sucursal'), 'Torreón');
}

async function agregarConceptoManual(user: ReturnType<typeof userEvent.setup>, descripcion: string, precio: string) {
  await user.click(screen.getByRole('button', { name: '+ Agregar' }));
  await user.click(await screen.findByRole('button', { name: 'Línea manual' }));
  await user.type(screen.getByText('Descripción', { selector: 'label' }).closest('.campo')!.querySelector('input')!, descripcion);
  await user.type(screen.getByText('Precio unitario', { selector: 'label' }).closest('.campo')!.querySelector('input')!, precio);
  await user.click(screen.getByRole('button', { name: 'Agregar' }));
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  mockRecursos();
  vi.mocked(metaApi.notas).mockResolvedValue([]);
  vi.mocked(metaApi.sucursales).mockResolvedValue([
    { IdSucursal: 1, Nombre: 'Torreón', Ciudad: null, Direccion: null, contactos: [] },
  ]);
  vi.mocked(cotizacionesApi.parametros).mockResolvedValue({ umbralDescuentoPin: 15, ivaDefault: 16 });
  vi.mocked(clientesApi.contactos).mockResolvedValue([]);
});

describe('NuevaCotizacion — crear (flujo feliz)', () => {
  it('calcula el total y crea la cotización con el payload correcto', async () => {
    const user = userEvent.setup();
    vi.mocked(cotizacionesApi.crear).mockResolvedValue(cotizacionCreada());
    renderPagina();

    await seleccionarClienteYSucursal(user);
    await agregarConceptoManual(user, 'Renta de andamio', '850');

    expect(await screen.findByText('$986.00')).toBeInTheDocument(); // 850 + 16% IVA

    await user.click(screen.getByRole('button', { name: 'Crear cotización' }));

    await waitFor(() => expect(cotizacionesApi.crear).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(cotizacionesApi.crear).mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({ Tipo: 'RENTA', IdCliente: 1, IdSucursal: 1 });
    expect((payload.renglones as unknown[]).length).toBe(1);
    expect(await screen.findByText('Marcador Detalle')).toBeInTheDocument();
  });
});

describe('NuevaCotizacion — a quién se le cotiza', () => {
  function contacto(over: Partial<ContactoCliente> = {}): ContactoCliente {
    return {
      IdContacto: 10, IdCliente: 1, Nombre: 'Rosy', Puesto: 'COMPRAS',
      Telefono: null, Celular: null, Email: null, Notas: null,
      EsPrincipal: true, Origen: 'MANUAL', Activo: true, FechaCreacion: '2026-01-01',
      ...over,
    };
  }

  async function crearYObtenerPayload(user: ReturnType<typeof userEvent.setup>) {
    await agregarConceptoManual(user, 'Renta de andamio', '850');
    await user.click(screen.getByRole('button', { name: 'Crear cotización' }));
    await waitFor(() => expect(cotizacionesApi.crear).toHaveBeenCalled());
    return vi.mocked(cotizacionesApi.crear).mock.calls[0][0] as Record<string, unknown>;
  }

  it('sin contactos no estorba: la cotización sale sin contacto específico', async () => {
    const user = userEvent.setup();
    vi.mocked(cotizacionesApi.crear).mockResolvedValue(cotizacionCreada());
    renderPagina();

    await seleccionarClienteYSucursal(user);
    expect(screen.queryByLabelText('Se le cotiza a')).not.toBeInTheDocument();

    expect(await crearYObtenerPayload(user)).toMatchObject({ IdContactoCliente: null });
  });

  it('con un solo contacto lo toma automáticamente, sin selector', async () => {
    const user = userEvent.setup();
    vi.mocked(clientesApi.contactos).mockResolvedValue([contacto()]);
    vi.mocked(cotizacionesApi.crear).mockResolvedValue(cotizacionCreada());
    renderPagina();

    await seleccionarClienteYSucursal(user);

    expect(await screen.findByText('Se le cotiza a Rosy.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Se le cotiza a')).not.toBeInTheDocument();
    expect(await crearYObtenerPayload(user)).toMatchObject({ IdContactoCliente: 10 });
  });

  it('con varios contactos aparece el selector, con el principal ya elegido', async () => {
    const user = userEvent.setup();
    vi.mocked(clientesApi.contactos).mockResolvedValue([
      contacto(),
      contacto({ IdContacto: 11, Nombre: 'Luis Omar', Puesto: 'PAGOS', EsPrincipal: false }),
    ]);
    vi.mocked(cotizacionesApi.crear).mockResolvedValue(cotizacionCreada());
    renderPagina();

    await seleccionarClienteYSucursal(user);

    const selector = await screen.findByLabelText('Se le cotiza a');
    expect(selector).toHaveValue('10');   // el principal
    expect(await crearYObtenerPayload(user)).toMatchObject({ IdContactoCliente: 10 });
  });

  it('elegir a otro contacto es lo que se manda', async () => {
    const user = userEvent.setup();
    vi.mocked(clientesApi.contactos).mockResolvedValue([
      contacto(),
      contacto({ IdContacto: 11, Nombre: 'Luis Omar', Puesto: 'PAGOS', EsPrincipal: false }),
    ]);
    vi.mocked(cotizacionesApi.crear).mockResolvedValue(cotizacionCreada());
    renderPagina();

    await seleccionarClienteYSucursal(user);
    await user.selectOptions(await screen.findByLabelText('Se le cotiza a'), '11');

    expect(await crearYObtenerPayload(user)).toMatchObject({ IdContactoCliente: 11 });
  });

  it('cambiar de cliente no arrastra el contacto del anterior', async () => {
    const user = userEvent.setup();
    mockRecursos([
      clienteBase(),
      clienteBase({ IdCliente: 2, RazonSocial: 'Obras del Norte' }),
    ]);
    vi.mocked(clientesApi.contactos).mockResolvedValue([contacto()]);
    renderPagina();

    await seleccionarClienteYSucursal(user);
    await screen.findByText('Se le cotiza a Rosy.');

    // El segundo cliente no tiene contactos capturados.
    vi.mocked(clientesApi.contactos).mockResolvedValue([]);
    await user.click(screen.getByRole('button', { name: 'Cambiar' }));
    await user.click(await screen.findByText('Obras del Norte'));

    await waitFor(() => expect(clientesApi.contactos).toHaveBeenLastCalledWith(2));
    expect(screen.queryByText('Se le cotiza a Rosy.')).not.toBeInTheDocument();
  });
});

describe('NuevaCotizacion — validaciones', () => {
  it('sin cliente no deja guardar', async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByRole('button', { name: 'Seleccionar cliente…' });

    await user.click(screen.getByRole('button', { name: 'Crear cotización' }));

    expect(await screen.findByText('Selecciona un cliente')).toBeInTheDocument();
    expect(cotizacionesApi.crear).not.toHaveBeenCalled();
  });

  // Un cliente bloqueado ya no es un muro: se puede cotizar con PIN de supervisor
  // (el vendedor con el cliente enfrente pagando en efectivo). Sin PIN, no pasa.
  it('un cliente BLOQUEADO no deja guardar sin PIN de supervisor', async () => {
    const user = userEvent.setup();
    mockRecursos([clienteBase({ Restriccion: 'BLOQUEO' })]);
    renderPagina();

    await seleccionarClienteYSucursal(user);
    await agregarConceptoManual(user, 'Renta de andamio', '850');
    await user.click(screen.getByRole('button', { name: 'Crear cotización' }));

    expect(await screen.findByText('El cliente está BLOQUEADO: cotizarle requiere PIN de supervisor'))
      .toBeInTheDocument();
    expect(cotizacionesApi.crear).not.toHaveBeenCalled();
  });

  // Caso real: el vendedor abrió la pantalla, alguien más bloqueó al cliente, y al
  // guardar llega el rechazo. Sin abrir el campo del PIN se quedaría sin salida,
  // con la cotización capturada y sin forma de autorizarla.
  it('si el servidor avisa que el cliente quedó bloqueado, abre el campo del PIN', async () => {
    const user = userEvent.setup();
    vi.mocked(cotizacionesApi.crear).mockRejectedValue(Object.assign(new Error('bloqueado'), {
      isAxiosError: true,
      response: { data: { error: 'ACME está BLOQUEADO. Cotizarle requiere PIN.', codigo: 'CLIENTE_BLOQUEADO' } },
    }));
    renderPagina();

    await seleccionarClienteYSucursal(user);
    await agregarConceptoManual(user, 'Renta de andamio', '850');
    expect(screen.queryByText('PIN de supervisor', { selector: 'label' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Crear cotización' }));

    expect(await screen.findByText('PIN de supervisor', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText(/Requerido porque el cliente está bloqueado/)).toBeInTheDocument();
  });

  it('con el PIN capturado, al cliente BLOQUEADO sí se le cotiza', async () => {
    const user = userEvent.setup();
    mockRecursos([clienteBase({ Restriccion: 'BLOQUEO' })]);
    vi.mocked(cotizacionesApi.crear).mockResolvedValue(cotizacionCreada());
    renderPagina();

    await seleccionarClienteYSucursal(user);
    await agregarConceptoManual(user, 'Renta de andamio', '850');
    await user.type(campoPorLabel('PIN de supervisor'), '2468');
    await user.click(screen.getByRole('button', { name: 'Crear cotización' }));

    await waitFor(() => expect(cotizacionesApi.crear).toHaveBeenCalled());
    const payload = vi.mocked(cotizacionesApi.crear).mock.calls[0][0] as Record<string, unknown>;
    expect(payload.PinSupervisor).toBe('2468');
  });

  it('sin sucursal no deja guardar', async () => {
    const user = userEvent.setup();
    renderPagina();

    await user.click(await screen.findByRole('button', { name: 'Seleccionar cliente…' }));
    await user.click(await screen.findByText('Constructora Demo'));
    await user.click(screen.getByRole('button', { name: 'Crear cotización' }));

    expect(await screen.findByText('Selecciona una sucursal')).toBeInTheDocument();
  });

  it('sin conceptos no deja guardar', async () => {
    const user = userEvent.setup();
    renderPagina();
    await seleccionarClienteYSucursal(user);

    await user.click(screen.getByRole('button', { name: 'Crear cotización' }));

    expect(await screen.findByText('Agrega al menos un concepto')).toBeInTheDocument();
  });

  it('USD sin tipo de cambio no deja guardar', async () => {
    const user = userEvent.setup();
    renderPagina();
    await seleccionarClienteYSucursal(user);
    await agregarConceptoManual(user, 'Renta de andamio', '850');
    await user.selectOptions(campoPorLabel('Moneda'), 'USD');

    await user.click(screen.getByRole('button', { name: 'Crear cotización' }));

    expect(await screen.findByText('Indica el tipo de cambio para USD')).toBeInTheDocument();
  });

  it('crédito sin días de crédito no deja guardar', async () => {
    const user = userEvent.setup();
    renderPagina();
    await seleccionarClienteYSucursal(user);
    await agregarConceptoManual(user, 'Renta de andamio', '850');
    await user.selectOptions(campoPorLabel('Condición de pago'), 'CREDITO');

    await user.click(screen.getByRole('button', { name: 'Crear cotización' }));

    expect(await screen.findByText('Indica los días de crédito')).toBeInTheDocument();
  });

  it('un descuento arriba del umbral exige PIN antes de guardar', async () => {
    const user = userEvent.setup();
    renderPagina();
    await seleccionarClienteYSucursal(user);
    await agregarConceptoManual(user, 'Renta de andamio', '850');

    const descuento = campoPorLabel('Descuento (%)') as HTMLInputElement;
    await user.clear(descuento);
    await user.type(descuento, '20'); // umbral mockeado en 15

    expect(await screen.findByText('PIN de supervisor', { selector: 'label', exact: false })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Crear cotización' }));
    expect(await screen.findByText('El descuento de 20% requiere PIN de supervisor')).toBeInTheDocument();
    expect(cotizacionesApi.crear).not.toHaveBeenCalled();
  });
});

describe('NuevaCotizacion — tipo Venta', () => {
  it('Venta no ofrece "Servicio" al agregar concepto, y muestra Anticipo/Liquidación', async () => {
    const user = userEvent.setup();
    renderPagina();

    await user.click(screen.getByRole('button', { name: /^Venta/ }));

    expect(screen.getByText('Anticipo (%)', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText('Liquidación del saldo', { selector: 'label' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ Agregar' }));
    expect(screen.queryByRole('button', { name: 'Servicio' })).not.toBeInTheDocument();
  });
});

describe('NuevaCotizacion — editar', () => {
  it('carga los datos existentes y guarda con actualizar (no crear)', async () => {
    const user = userEvent.setup();
    const existente = cotizacionCreada({
      IdCotizacion: 55, Folio: 'COT-0055',
      renglones: [{
        IdRenglon: 1, Orden: 1, CodigoSnapshot: null, Descripcion: 'Renta ya existente',
        PrecioUnitario: 500, Cantidad: 1, UnidadCobro: 'DIA', NumeroPeriodos: 1,
        DescuentoPorcentaje: 0, Importe: 500,
      }],
    });
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue(existente);
    vi.mocked(cotizacionesApi.actualizar).mockResolvedValue(existente);
    localStorage.setItem('usuario', JSON.stringify(usuarioBase()));

    render(
      <MemoryRouter initialEntries={['/cotizaciones/55/editar']}>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/cotizaciones/:id/editar" element={<NuevaCotizacion />} />
              <Route path="/cotizaciones/:id" element={<div>Marcador Detalle</div>} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Renta ya existente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(cotizacionesApi.actualizar).toHaveBeenCalledTimes(1));
    expect(cotizacionesApi.actualizar).toHaveBeenCalledWith(55, expect.any(Object));
    expect(cotizacionesApi.crear).not.toHaveBeenCalled();
  });
});

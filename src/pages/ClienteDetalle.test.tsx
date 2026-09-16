import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ClienteDetalle from './ClienteDetalle';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/ui/Toast';
import { clientesApi } from '../api/clientes';
import type {
  Cliente, ContactoCliente, ExpedienteIncidencias, Incidencia, UsuarioSesion,
} from '../types';

vi.mock('../api/clientes', () => ({
  clientesApi: {
    obtener: vi.fn(), actualizar: vi.fn(), cambiarRestriccion: vi.fn(),
    contactos: vi.fn(), crearContacto: vi.fn(), actualizarContacto: vi.fn(),
    desactivarContacto: vi.fn(), marcarPrincipal: vi.fn(),
    incidencias: vi.fn(), crearIncidencia: vi.fn(), resolverIncidencia: vi.fn(),
  },
}));

function clienteBase(overrides: Partial<Cliente> = {}): Cliente {
  return {
    IdCliente: 1, RazonSocial: 'CLIMAS DEL NORTE', NombreComercial: null, RFC: null,
    Contacto: 'Rosy', Telefono: '8717208809', TelefonoAlterno: null, Email: null,
    Direccion: null, DireccionFiscal: null, Ciudad: 'TORREON, COAH', Observaciones: null,
    Restriccion: 'NINGUNA', MotivoRestriccion: null, Activo: true, ObservacionesOriginal: null,
    ...overrides,
  };
}

function contactoBase(overrides: Partial<ContactoCliente> = {}): ContactoCliente {
  return {
    IdContacto: 10, IdCliente: 1, Nombre: 'Rosy', Puesto: 'COMPRAS',
    Telefono: '8717208809', Celular: null, Email: null, Notas: null,
    EsPrincipal: true, Origen: 'MIGRACION', Activo: true, FechaCreacion: '2026-01-01',
    ...overrides,
  };
}

function incidenciaBase(overrides: Partial<Incidencia> = {}): Incidencia {
  return {
    IdIncidencia: 77, IdCliente: 1, Tipo: 'NO_PAGO', Descripcion: 'No pagó la factura F/48542',
    Monto: 3183.27, Fecha: '2026-03-10', IdUsuario: null, Resuelta: false,
    ...overrides,
  };
}

function expedienteBase(overrides: Partial<ExpedienteIncidencias> = {}): ExpedienteIncidencias {
  return {
    incidencias: [], Pendientes: 0, TotalAdeudo: 0,
    Restriccion: 'NINGUNA', MotivoRestriccion: null,
    ...overrides,
  };
}

function usuarioBase(overrides: Partial<UsuarioSesion> = {}): UsuarioSesion {
  return { IdUsuario: 7, Nombre: 'Ana', Email: 'ana@x.com', Rol: 'ADMIN', IdSucursal: 1, ...overrides };
}

function montar({ cliente = clienteBase(), contactos = [] as ContactoCliente[], expediente = expedienteBase() } = {}) {
  vi.mocked(clientesApi.obtener).mockResolvedValue(cliente);
  vi.mocked(clientesApi.contactos).mockResolvedValue(contactos);
  vi.mocked(clientesApi.incidencias).mockResolvedValue(expediente);
}

function renderPagina(usuario: UsuarioSesion = usuarioBase()) {
  localStorage.setItem('usuario', JSON.stringify(usuario));
  return render(
    <MemoryRouter initialEntries={['/clientes/1']}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/clientes/:id" element={<ClienteDetalle />} />
            <Route path="/clientes" element={<div>Marcador Clientes</div>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

/**
 * Cambia de pestaña esperando a que la ficha termine de cargar (antes solo hay
 * spinner). La cuenta va pegada al nombre, así que el regex evita depender de ella.
 */
async function irA(user: ReturnType<typeof userEvent.setup>, nombre: RegExp) {
  await user.click(await screen.findByRole('button', { name: nombre }));
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  montar();
});

describe('ClienteDetalle — encabezado', () => {
  it('abre en Datos generales con la ficha del cliente cargada', async () => {
    renderPagina();
    await waitFor(() => expect(clientesApi.obtener).toHaveBeenCalledWith(1));
    expect(await screen.findByDisplayValue('CLIMAS DEL NORTE')).toBeInTheDocument();
    expect(screen.getByDisplayValue('TORREON, COAH')).toBeInTheDocument();
  });

  it('un cliente bloqueado lo grita en el encabezado, con su motivo', async () => {
    montar({ cliente: clienteBase({ Restriccion: 'BLOQUEO', MotivoRestriccion: 'Debe $3,183.27' }) });
    renderPagina();

    // Acotado al aviso: el motivo aparece también en el textarea del formulario.
    const aviso = (await screen.findByText(/Cliente BLOQUEADO/)).closest('.aviso')!;
    expect(aviso).toHaveTextContent('Debe $3,183.27');
    expect(aviso).toHaveTextContent(/PIN de supervisor/);
  });

  it('a quien no es ADMIN le dice que no puede quitar el bloqueo', async () => {
    montar({ cliente: clienteBase({ Restriccion: 'BLOQUEO' }) });
    renderPagina(usuarioBase({ Rol: 'VENDEDOR' }));

    expect(await screen.findByText(/Solo un administrador puede quitar el bloqueo/)).toBeInTheDocument();
  });

  it('un cliente sin restricción no muestra ningún aviso', async () => {
    renderPagina();
    await screen.findByDisplayValue('CLIMAS DEL NORTE');
    expect(screen.queryByText(/Cliente BLOQUEADO/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cliente con advertencia/)).not.toBeInTheDocument();
  });
});

describe('ClienteDetalle — datos generales', () => {
  it('guarda los cambios de la ficha', async () => {
    const user = userEvent.setup();
    renderPagina();
    const razon = await screen.findByDisplayValue('CLIMAS DEL NORTE');

    await user.clear(razon);
    await user.type(razon, 'CLIMAS DEL NORTE SA');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(clientesApi.actualizar).toHaveBeenCalled());
    const [id, payload] = vi.mocked(clientesApi.actualizar).mock.calls[0];
    expect(id).toBe(1);
    expect(payload).toMatchObject({ RazonSocial: 'CLIMAS DEL NORTE SA' });
  });

  it('no deja guardar sin razón social', async () => {
    const user = userEvent.setup();
    renderPagina();
    await user.clear(await screen.findByDisplayValue('CLIMAS DEL NORTE'));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Falta: Razón social')).toBeInTheDocument();
    expect(clientesApi.actualizar).not.toHaveBeenCalled();
  });

  it('el registro original se muestra colapsado y de solo lectura', async () => {
    montar({ cliente: clienteBase({ ObservacionesOriginal: '[ORIGINAL] Contacto: ROSY/LUIS' }) });
    renderPagina();

    const resumen = await screen.findByText('Registro original (histórico)');
    expect(resumen.closest('details')).not.toHaveAttribute('open');
    // El texto vive en un div, no en un input: no hay forma de editarlo desde aquí.
    const texto = screen.getByText(/\[ORIGINAL\] Contacto: ROSY\/LUIS/);
    expect(texto.tagName).not.toBe('INPUT');
    expect(texto.tagName).not.toBe('TEXTAREA');
  });

  it('sin registro original no aparece el bloque', async () => {
    renderPagina();
    await screen.findByDisplayValue('CLIMAS DEL NORTE');
    expect(screen.queryByText('Registro original (histórico)')).not.toBeInTheDocument();
  });

  it('a un usuario de solo lectura no le ofrece guardar', async () => {
    renderPagina(usuarioBase({ Rol: 'CONSULTA' }));
    await screen.findByDisplayValue('CLIMAS DEL NORTE');
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument();
  });
});

describe('ClienteDetalle — contactos', () => {
  it('un cliente sin contactos no es un error: lo dice y ofrece agregar', async () => {
    const user = userEvent.setup();
    renderPagina();
    await irA(user, /^Contactos/);

    expect(await screen.findByText('Sin contactos')).toBeInTheDocument();
    expect(screen.getByText(/No pasa nada/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Agregar contacto' })).toBeInTheDocument();
  });

  it('lista los contactos y marca cuál es el principal', async () => {
    const user = userEvent.setup();
    montar({
      contactos: [
        contactoBase(),
        contactoBase({ IdContacto: 11, Nombre: 'Luis Omar', Puesto: 'PAGOS', EsPrincipal: false }),
      ],
    });
    renderPagina();
    await irA(user, /^Contactos/);

    expect(await screen.findByText('Rosy')).toBeInTheDocument();
    expect(screen.getByText('Luis Omar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contacto principal' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Marcar como principal' })).toBeEnabled();
  });

  it('avisa cuando el cliente tiene contactos pero ninguno principal', async () => {
    const user = userEvent.setup();
    montar({ contactos: [contactoBase({ EsPrincipal: false })] });
    renderPagina();
    await irA(user, /^Contactos/);

    expect(await screen.findByText(/no tiene contacto principal/)).toBeInTheDocument();
  });

  it('la estrella promueve al contacto y recarga', async () => {
    const user = userEvent.setup();
    montar({
      contactos: [contactoBase(), contactoBase({ IdContacto: 11, Nombre: 'Luis Omar', EsPrincipal: false })],
    });
    vi.mocked(clientesApi.marcarPrincipal).mockResolvedValue(contactoBase({ IdContacto: 11 }));
    renderPagina();
    await irA(user, /^Contactos/);

    await user.click(await screen.findByRole('button', { name: 'Marcar como principal' }));

    await waitFor(() => expect(clientesApi.marcarPrincipal).toHaveBeenCalledWith(11));
    expect(clientesApi.contactos).toHaveBeenCalledTimes(2);   // recarga
  });

  it('agrega un contacto nuevo', async () => {
    const user = userEvent.setup();
    vi.mocked(clientesApi.crearContacto).mockResolvedValue(contactoBase());
    renderPagina();
    await irA(user, /^Contactos/);
    await user.click(await screen.findByRole('button', { name: '+ Agregar contacto' }));

    await user.type(screen.getByLabelText('Nombre'), 'Miriam Hdz');
    await user.type(screen.getByLabelText('Puesto'), 'CREDITO');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(clientesApi.crearContacto).toHaveBeenCalled());
    expect(vi.mocked(clientesApi.crearContacto).mock.calls[0][1])
      .toMatchObject({ Nombre: 'Miriam Hdz', Puesto: 'CREDITO' });
  });

  it('no deja guardar un contacto totalmente vacío', async () => {
    const user = userEvent.setup();
    renderPagina();
    await irA(user, /^Contactos/);
    await user.click(await screen.findByRole('button', { name: '+ Agregar contacto' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText(/al menos nombre, teléfono, celular o email/)).toBeInTheDocument();
    expect(clientesApi.crearContacto).not.toHaveBeenCalled();
  });

  it('un contacto que solo trae teléfono sí se puede guardar', async () => {
    const user = userEvent.setup();
    vi.mocked(clientesApi.crearContacto).mockResolvedValue(contactoBase());
    renderPagina();
    await irA(user, /^Contactos/);
    await user.click(await screen.findByRole('button', { name: '+ Agregar contacto' }));

    await user.type(screen.getByLabelText('Teléfono'), '8711234567');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(clientesApi.crearContacto).toHaveBeenCalled());
  });

  it('editar abre el modal con los datos del contacto', async () => {
    const user = userEvent.setup();
    montar({ contactos: [contactoBase()] });
    renderPagina();
    await irA(user, /^Contactos/);
    await user.click(await screen.findByRole('button', { name: 'Editar' }));

    expect(screen.getByRole('heading', { name: 'Editar contacto' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Rosy');

    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(clientesApi.actualizarContacto).toHaveBeenCalledWith(10, expect.anything()));
  });

  it('desactivar pide confirmación; si se cancela, no llama al API', async () => {
    const user = userEvent.setup();
    montar({ contactos: [contactoBase()] });
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPagina();
    await irA(user, /^Contactos/);
    await user.click(await screen.findByRole('button', { name: 'Desactivar' }));

    expect(clientesApi.desactivarContacto).not.toHaveBeenCalled();
  });

  it('desactivar confirmado llama al API', async () => {
    const user = userEvent.setup();
    montar({ contactos: [contactoBase()] });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPagina();
    await irA(user, /^Contactos/);
    await user.click(await screen.findByRole('button', { name: 'Desactivar' }));

    await waitFor(() => expect(clientesApi.desactivarContacto).toHaveBeenCalledWith(10));
  });

  it('a un usuario de solo lectura no le ofrece editar contactos', async () => {
    const user = userEvent.setup();
    montar({ contactos: [contactoBase()] });
    renderPagina(usuarioBase({ Rol: 'CONSULTA' }));
    await irA(user, /^Contactos/);

    await screen.findByText('Rosy');
    expect(screen.queryByRole('button', { name: '+ Agregar contacto' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });
});

describe('ClienteDetalle — incidencias', () => {
  const expedienteConAdeudo = () => expedienteBase({
    incidencias: [
      incidenciaBase(),
      incidenciaBase({ IdIncidencia: 78, Tipo: 'MORA', Descripcion: 'Se atrasó dos meses', Monto: null, Resuelta: true }),
    ],
    Pendientes: 1, TotalAdeudo: 3183.27, Restriccion: 'BLOQUEO',
  });

  it('muestra el total adeudado y separa pendientes de resueltas', async () => {
    const user = userEvent.setup();
    montar({ expediente: expedienteConAdeudo() });
    renderPagina();
    await irA(user, /^Incidencias/);

    // El mismo importe sale en la tarjeta y en el renglón: se acota a la tarjeta.
    const tarjeta = (await screen.findByText('Adeudo pendiente')).closest<HTMLElement>('.card')!;
    expect(within(tarjeta).getByText('$3,183.27')).toBeInTheDocument();
    expect(within(tarjeta).getByText('1 incidencia sin resolver')).toBeInTheDocument();

    // La resuelta va atenuada; la pendiente no.
    const pendiente = screen.getByText('No pagó la factura F/48542').closest('tr')!;
    const resuelta = screen.getByText('Se atrasó dos meses').closest('tr')!;
    expect(pendiente).not.toHaveClass('atenuada');
    expect(resuelta).toHaveClass('atenuada');
    expect(within(resuelta).getByText('Resuelta')).toBeInTheDocument();
  });

  it('sin incidencias no muestra tarjeta de adeudo', async () => {
    const user = userEvent.setup();
    renderPagina();
    await irA(user, /^Incidencias/);

    expect(await screen.findByText('Sin incidencias')).toBeInTheDocument();
    expect(screen.queryByText('Adeudo pendiente')).not.toBeInTheDocument();
  });

  it('resolver la última incidencia ofrece quitar el bloqueo, sin hacerlo solo', async () => {
    const user = userEvent.setup();
    montar({ expediente: expedienteConAdeudo() });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(clientesApi.resolverIncidencia).mockResolvedValue({
      incidencia: incidenciaBase({ Resuelta: true }),
      pendientes: 0, totalAdeudo: 0, puedeDesbloquearse: true,
      cliente: { IdCliente: 1, RazonSocial: 'CLIMAS DEL NORTE' },
    });
    renderPagina();
    await irA(user, /^Incidencias/);
    await user.click(await screen.findByRole('button', { name: 'Marcar resuelta' }));

    expect(await screen.findByRole('heading', { name: '¿Quitar el bloqueo?' })).toBeInTheDocument();
    // Ofrecer no es aplicar: hasta aquí no se tocó la restricción.
    expect(clientesApi.cambiarRestriccion).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Sí, quitar el bloqueo' }));
    await waitFor(() => expect(clientesApi.cambiarRestriccion).toHaveBeenCalledWith(1, 'NINGUNA', null));
  });

  it('si quedan pendientes, no propone desbloquear', async () => {
    const user = userEvent.setup();
    montar({ expediente: expedienteConAdeudo() });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(clientesApi.resolverIncidencia).mockResolvedValue({
      incidencia: incidenciaBase({ Resuelta: true }),
      pendientes: 2, totalAdeudo: 500, puedeDesbloquearse: false, cliente: null,
    });
    renderPagina();
    await irA(user, /^Incidencias/);
    await user.click(await screen.findByRole('button', { name: 'Marcar resuelta' }));

    await waitFor(() => expect(clientesApi.resolverIncidencia).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: '¿Quitar el bloqueo?' })).not.toBeInTheDocument();
  });

  it('decir que no al desbloqueo deja al cliente como estaba', async () => {
    const user = userEvent.setup();
    montar({ expediente: expedienteConAdeudo() });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(clientesApi.resolverIncidencia).mockResolvedValue({
      incidencia: incidenciaBase({ Resuelta: true }),
      pendientes: 0, totalAdeudo: 0, puedeDesbloquearse: true,
      cliente: { IdCliente: 1, RazonSocial: 'CLIMAS DEL NORTE' },
    });
    renderPagina();
    await irA(user, /^Incidencias/);
    await user.click(await screen.findByRole('button', { name: 'Marcar resuelta' }));
    await user.click(await screen.findByRole('button', { name: 'No, dejarlo bloqueado' }));

    expect(clientesApi.cambiarRestriccion).not.toHaveBeenCalled();
  });

  it('un VENDEDOR puede registrar pero no resolver', async () => {
    const user = userEvent.setup();
    montar({ expediente: expedienteConAdeudo() });
    renderPagina(usuarioBase({ Rol: 'VENDEDOR' }));
    await irA(user, /^Incidencias/);

    await screen.findByText('No pagó la factura F/48542');
    expect(screen.queryByRole('button', { name: 'Marcar resuelta' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Registrar incidencia' })).toBeInTheDocument();
    expect(screen.getByText(/Solo un administrador puede marcar incidencias como resueltas/))
      .toBeInTheDocument();
  });
});

describe('ClienteDetalle — registrar incidencia', () => {
  async function abrirModal(user: ReturnType<typeof userEvent.setup>) {
    renderPagina();
    await irA(user, /^Incidencias/);
    await user.click(await screen.findByRole('button', { name: '+ Registrar incidencia' }));
  }

  it('avisa que bloqueará al cliente antes de guardar', async () => {
    const user = userEvent.setup();
    await abrirModal(user);

    // NO_PAGO es el tipo por defecto y es de los que bloquean.
    expect(screen.getByText(/Esto bloqueará al cliente/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar y bloquear' })).toBeInTheDocument();
  });

  it('con un tipo que no bloquea, el aviso desaparece', async () => {
    const user = userEvent.setup();
    await abrirModal(user);

    await user.selectOptions(screen.getByLabelText(/Tipo/), 'MORA');

    expect(screen.queryByText(/Esto bloqueará al cliente/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar' })).toBeInTheDocument();
  });

  it('guarda tipo, descripción, monto y fecha', async () => {
    const user = userEvent.setup();
    vi.mocked(clientesApi.crearIncidencia).mockResolvedValue({
      incidencia: incidenciaBase(), bloqueoAplicado: true,
    });
    await abrirModal(user);

    await user.type(screen.getByLabelText(/Descripción/), 'No pagó la factura');
    await user.type(screen.getByLabelText(/Monto/), '1500');
    await user.click(screen.getByRole('button', { name: 'Registrar y bloquear' }));

    await waitFor(() => expect(clientesApi.crearIncidencia).toHaveBeenCalled());
    const [id, payload] = vi.mocked(clientesApi.crearIncidencia).mock.calls[0];
    expect(id).toBe(1);
    expect(payload).toMatchObject({ Tipo: 'NO_PAGO', Descripcion: 'No pagó la factura', Monto: 1500 });
    expect((payload as { Fecha: string }).Fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('no deja guardar sin descripción', async () => {
    const user = userEvent.setup();
    await abrirModal(user);
    await user.click(screen.getByRole('button', { name: 'Registrar y bloquear' }));

    expect(await screen.findByText('Describe qué pasó con este cliente')).toBeInTheDocument();
    expect(clientesApi.crearIncidencia).not.toHaveBeenCalled();
  });

  it('el monto es opcional', async () => {
    const user = userEvent.setup();
    vi.mocked(clientesApi.crearIncidencia).mockResolvedValue({
      incidencia: incidenciaBase(), bloqueoAplicado: false,
    });
    await abrirModal(user);

    await user.selectOptions(screen.getByLabelText(/Tipo/), 'OTRO');
    await user.type(screen.getByLabelText(/Descripción/), 'Lista negra sin detalle');
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(clientesApi.crearIncidencia).toHaveBeenCalled());
    expect(vi.mocked(clientesApi.crearIncidencia).mock.calls[0][1]).toMatchObject({ Monto: null });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RevisionClientes from './RevisionClientes';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/ui/Toast';
import { clientesApi } from '../api/clientes';
import type { PendienteRevision, UsuarioSesion } from '../types';

vi.mock('../api/clientes', () => ({
  clientesApi: { revision: vi.fn(), resumenRevision: vi.fn(), resolverRevision: vi.fn() },
}));

/** El caso real del padrón: CLIMAS DEL NORTE con "ROSY/LUIS OMAR CASTAÑON". */
function pendienteBase(overrides: Partial<PendienteRevision> = {}): PendienteRevision {
  return {
    IdRevision: 5, IdCliente: 4, Campo: 'Contacto', ValorOriginal: 'ROSY/LUIS OMAR CASTAÑON',
    Motivo: 'Texto ambiguo: confirmar si es persona', Sugerencia: null,
    Resuelto: false, ResueltoPor: null, FechaCreacion: '2026-01-01',
    Cliente: 'CLIMAS DEL NORTE, S.A DE C.V.', Ciudad: 'TORREON, COAH',
    ContactoActual: 'ROSY/LUIS OMAR CASTAÑON', TelefonoActual: '8717208809',
    EmailActual: null, DireccionActual: null,
    Restriccion: 'NINGUNA', Cotizaciones: 12,
    ...overrides,
  };
}

function usuarioBase(overrides: Partial<UsuarioSesion> = {}): UsuarioSesion {
  return { IdUsuario: 7, Nombre: 'Ana', Email: 'ana@x.com', Rol: 'ADMIN', IdSucursal: 1, ...overrides };
}

function mockCola(datos: PendienteRevision[], resumen = { Pendientes: datos.length, Prioritarios: datos.length }) {
  vi.mocked(clientesApi.revision).mockResolvedValue({ datos, total: datos.length });
  vi.mocked(clientesApi.resumenRevision).mockResolvedValue(resumen);
}

function renderPagina(usuario: UsuarioSesion = usuarioBase()) {
  localStorage.setItem('usuario', JSON.stringify(usuario));
  return render(
    <MemoryRouter initialEntries={['/revision']}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/revision" element={<RevisionClientes />} />
            <Route path="/clientes/:id" element={<div>Marcador Ficha</div>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

const resolucionOk = (resuelto = true, contactosCreados = 0) =>
  vi.mocked(clientesApi.resolverRevision).mockResolvedValue({ resuelto, contactosCreados });

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  mockCola([pendienteBase()]);
  resolucionOk();
});

describe('RevisionClientes — la cola', () => {
  it('arranca priorizando a los clientes que sí han cotizado', async () => {
    renderPagina();
    await waitFor(() => expect(clientesApi.revision).toHaveBeenCalledWith(true, 1, 20));
    expect(screen.getByLabelText(/Solo clientes con cotizaciones/)).toBeChecked();
  });

  it('destildar el filtro vuelve a pedir la cola completa', async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText('CLIMAS DEL NORTE, S.A DE C.V.');

    await user.click(screen.getByLabelText(/Solo clientes con cotizaciones/));

    await waitFor(() => expect(clientesApi.revision).toHaveBeenLastCalledWith(false, 1, 20));
  });

  it('muestra un pendiente a la vez, con su valor original y su motivo', async () => {
    mockCola([pendienteBase(), pendienteBase({ IdRevision: 6, Cliente: 'OTRO CLIENTE' })]);
    renderPagina();

    expect(await screen.findByText('CLIMAS DEL NORTE, S.A DE C.V.')).toBeInTheDocument();
    // El mismo texto sale abajo como "Contacto actual": se acota al bloque destacado.
    const destacado = screen.getByText(/valor original/).closest<HTMLElement>('.campo')!;
    expect(within(destacado).getByText('ROSY/LUIS OMAR CASTAÑON')).toBeInTheDocument();
    expect(screen.getByText(/Texto ambiguo: confirmar si es persona/)).toBeInTheDocument();
    // El segundo no se ve todavía: de uno en uno.
    expect(screen.queryByText('OTRO CLIENTE')).not.toBeInTheDocument();
  });

  it('dice cuánto falta en total y cuánto es prioritario', async () => {
    mockCola([pendienteBase()], { Pendientes: 312, Prioritarios: 48 });
    renderPagina();

    const aviso = await screen.findByText(/Quedan/);
    expect(aviso).toHaveTextContent('312');
    expect(aviso).toHaveTextContent('48');
  });

  it('con la cola vacía lo dice y sugiere quitar el filtro', async () => {
    mockCola([], { Pendientes: 0, Prioritarios: 0 });
    renderPagina();

    expect(await screen.findByText('Nada por revisar')).toBeInTheDocument();
    expect(screen.getByText(/Destilda el filtro/)).toBeInTheDocument();
  });

  it('“Saltar” pasa al siguiente sin resolver nada', async () => {
    const user = userEvent.setup();
    mockCola([pendienteBase(), pendienteBase({ IdRevision: 6, Cliente: 'OTRO CLIENTE' })]);
    renderPagina();
    await screen.findByText('CLIMAS DEL NORTE, S.A DE C.V.');

    await user.click(screen.getByRole('button', { name: /Saltar por ahora/ }));

    expect(await screen.findByText('OTRO CLIENTE')).toBeInTheDocument();
    expect(clientesApi.resolverRevision).not.toHaveBeenCalled();
  });

  it('“Ver ficha” lleva al cliente del pendiente', async () => {
    const user = userEvent.setup();
    renderPagina();
    await user.click(await screen.findByRole('button', { name: 'Ver ficha' }));
    expect(await screen.findByText('Marcador Ficha')).toBeInTheDocument();
  });
});

describe('RevisionClientes — clasificar', () => {
  async function elegir(user: ReturnType<typeof userEvent.setup>, boton: string) {
    renderPagina();
    await screen.findByText('CLIMAS DEL NORTE, S.A DE C.V.');
    await user.click(screen.getByRole('button', { name: boton }));
  }

  it('“Es una persona” precarga el valor original como nombre', async () => {
    const user = userEvent.setup();
    await elegir(user, 'Es una persona');

    expect(screen.getByLabelText(/^Nombre/)).toHaveValue('ROSY/LUIS OMAR CASTAÑON');
  });

  it('“Son dos personas” parte el texto en dos, para no teclear lo que ya está', async () => {
    const user = userEvent.setup();
    await elegir(user, 'Son dos personas');

    expect(screen.getByLabelText(/^Nombre/)).toHaveValue('ROSY');
    expect(screen.getByLabelText(/Segundo nombre/)).toHaveValue('LUIS OMAR CASTAÑON');
  });

  it('aplicar manda la acción con los dos contactos', async () => {
    const user = userEvent.setup();
    resolucionOk(true, 2);
    await elegir(user, 'Son dos personas');
    await user.type(screen.getByLabelText('Puesto'), 'COMPRAS');
    await user.click(screen.getByRole('button', { name: 'Aplicar y siguiente' }));

    await waitFor(() => expect(clientesApi.resolverRevision).toHaveBeenCalled());
    const [idRevision, payload] = vi.mocked(clientesApi.resolverRevision).mock.calls[0];
    expect(idRevision).toBe(5);
    expect(payload).toMatchObject({
      Accion: 'DOS_PERSONAS', Nombre1: 'ROSY', Puesto1: 'COMPRAS', Nombre2: 'LUIS OMAR CASTAÑON',
    });
  });

  it('“Es una nota” precarga el texto y lo manda como nota', async () => {
    const user = userEvent.setup();
    await elegir(user, 'Es una nota');

    expect(screen.getByLabelText(/^Nota/)).toHaveValue('ROSY/LUIS OMAR CASTAÑON');
    await user.click(screen.getByRole('button', { name: 'Aplicar y siguiente' }));

    await waitFor(() => expect(clientesApi.resolverRevision).toHaveBeenCalled());
    expect(vi.mocked(clientesApi.resolverRevision).mock.calls[0][1])
      .toMatchObject({ Accion: 'NOTA', Nota: 'ROSY/LUIS OMAR CASTAÑON' });
  });

  it('“Es un domicilio” manda el texto como domicilio', async () => {
    const user = userEvent.setup();
    await elegir(user, 'Es un domicilio');

    expect(screen.getByLabelText(/^Domicilio/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Aplicar y siguiente' }));

    await waitFor(() => expect(clientesApi.resolverRevision).toHaveBeenCalled());
    expect(vi.mocked(clientesApi.resolverRevision).mock.calls[0][1]).toMatchObject({ Accion: 'DOMICILIO' });
  });

  it('“Es un teléfono” precarga el número', async () => {
    const user = userEvent.setup();
    await elegir(user, 'Es un teléfono');

    expect(screen.getByLabelText(/^Teléfono/)).toHaveValue('ROSY/LUIS OMAR CASTAÑON');
    await user.click(screen.getByRole('button', { name: 'Aplicar y siguiente' }));

    await waitFor(() => expect(clientesApi.resolverRevision).toHaveBeenCalled());
    expect(vi.mocked(clientesApi.resolverRevision).mock.calls[0][1]).toMatchObject({ Accion: 'TELEFONO' });
  });

  it('“Es basura” no pide datos y avisa que el original no se pierde', async () => {
    const user = userEvent.setup();
    await elegir(user, 'Es basura');

    expect(screen.getByText(/queda guardado en el registro histórico/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Aplicar y siguiente' }));

    await waitFor(() => expect(clientesApi.resolverRevision).toHaveBeenCalled());
    expect(vi.mocked(clientesApi.resolverRevision).mock.calls[0][1]).toMatchObject({ Accion: 'BASURA' });
  });

  it('“No sé / preguntar” deja el pendiente abierto', async () => {
    const user = userEvent.setup();
    resolucionOk(false);
    await elegir(user, 'No sé / preguntar');

    await user.type(screen.getByLabelText(/A quién preguntarle/), 'Confirmar con Pepe');
    await user.click(screen.getByRole('button', { name: 'Aplicar y siguiente' }));

    await waitFor(() => expect(clientesApi.resolverRevision).toHaveBeenCalled());
    expect(vi.mocked(clientesApi.resolverRevision).mock.calls[0][1])
      .toMatchObject({ Accion: 'PREGUNTAR', Nota: 'Confirmar con Pepe' });
    expect(await screen.findByText(/sigue pendiente/)).toBeInTheDocument();
  });

  it('cancelar regresa a los botones sin resolver', async () => {
    const user = userEvent.setup();
    await elegir(user, 'Es una persona');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('button', { name: 'Es una persona' })).toBeInTheDocument();
    expect(clientesApi.resolverRevision).not.toHaveBeenCalled();
  });

  it('al resolver pasa al siguiente pendiente de la tanda', async () => {
    const user = userEvent.setup();
    mockCola([pendienteBase(), pendienteBase({ IdRevision: 6, Cliente: 'OTRO CLIENTE' })]);
    resolucionOk();
    renderPagina();
    await screen.findByText('CLIMAS DEL NORTE, S.A DE C.V.');

    await user.click(screen.getByRole('button', { name: 'Es basura' }));
    await user.click(screen.getByRole('button', { name: 'Aplicar y siguiente' }));

    expect(await screen.findByText('OTRO CLIENTE')).toBeInTheDocument();
  });

  it('al vaciarse la tanda pide otra', async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText('CLIMAS DEL NORTE, S.A DE C.V.');

    await user.click(screen.getByRole('button', { name: 'Es basura' }));
    await user.click(screen.getByRole('button', { name: 'Aplicar y siguiente' }));

    await waitFor(() => expect(clientesApi.revision).toHaveBeenCalledTimes(2));
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Incidencias from './Incidencias';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/ui/Toast';
import { clientesApi } from '../api/clientes';
import { crearRecursoApi } from '../api/recurso';
import * as XLSX from 'xlsx';
import type { Incidencia, UsuarioSesion } from '../types';

vi.mock('../api/recurso', () => ({ crearRecursoApi: vi.fn() }));
vi.mock('xlsx', () => ({
  utils: { json_to_sheet: vi.fn(), book_new: vi.fn(() => ({})), book_append_sheet: vi.fn() },
  writeFile: vi.fn(),
}));
vi.mock('../api/clientes', () => ({
  clientesApi: {
    incidenciasPendientes: vi.fn(), resolverIncidencia: vi.fn(),
    cambiarRestriccion: vi.fn(), crearIncidencia: vi.fn(),
  },
}));

function incidenciaBase(overrides: Partial<Incidencia> = {}): Incidencia {
  return {
    IdIncidencia: 77, IdCliente: 4, Tipo: 'NO_PAGO', Descripcion: 'No pagó la factura F/48542',
    Monto: 3183.27, Fecha: '2026-03-10', IdUsuario: null, Resuelta: false,
    Cliente: 'CLIMAS DEL NORTE', Restriccion: 'BLOQUEO', ClienteTelefono: '8717208809',
    Usuario: null,
    ...overrides,
  };
}

function usuarioBase(overrides: Partial<UsuarioSesion> = {}): UsuarioSesion {
  return { IdUsuario: 7, Nombre: 'Ana', Email: 'ana@x.com', Rol: 'ADMIN', IdSucursal: 1, ...overrides };
}

function mockListado(datos: Incidencia[], total = datos.length, adeudo?: number) {
  const suma = adeudo ?? datos.reduce((a, i) => a + Number(i.Monto ?? 0), 0);
  vi.mocked(clientesApi.incidenciasPendientes).mockResolvedValue({ datos, total, adeudo: suma });
}

function renderPagina(usuario: UsuarioSesion = usuarioBase()) {
  localStorage.setItem('usuario', JSON.stringify(usuario));
  return render(
    <MemoryRouter initialEntries={['/incidencias']}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/incidencias" element={<Incidencias />} />
            <Route path="/clientes/:id" element={<div>Marcador Ficha</div>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  mockListado([]);
});

describe('Incidencias — listado', () => {
  it('pide solo las pendientes', async () => {
    renderPagina();
    await waitFor(() => expect(clientesApi.incidenciasPendientes).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 1, porPagina: 50 })));
  });

  it('muestra cliente, teléfono, tipo y monto de cada pendiente', async () => {
    mockListado([incidenciaBase()]);
    renderPagina();

    // "No pagó" también es una opción del filtro de tipo: se acota al renglón.
    const renglon = (await screen.findByText('CLIMAS DEL NORTE')).closest<HTMLElement>('tr')!;
    expect(within(renglon).getByText('8717208809')).toBeInTheDocument();
    expect(within(renglon).getByText('No pagó')).toBeInTheDocument();
    expect(within(renglon).getByText('No pagó la factura F/48542')).toBeInTheDocument();
  });

  it('marca a los clientes que están bloqueados', async () => {
    mockListado([
      incidenciaBase(),
      incidenciaBase({ IdIncidencia: 78, IdCliente: 5, Cliente: 'ACME SA', Restriccion: 'NINGUNA' }),
    ]);
    renderPagina();

    const bloqueado = (await screen.findByText('CLIMAS DEL NORTE')).closest('tr')!;
    const libre = screen.getByText('ACME SA').closest('tr')!;
    expect(within(bloqueado).getByText('Bloqueado')).toBeInTheDocument();
    expect(within(libre).queryByText('Bloqueado')).not.toBeInTheDocument();
  });

  // El adeudo lo suma el servidor sobre TODO lo filtrado, no el navegador sobre la
  // página: con 13 páginas de deudores, sumar lo visible daría un número que no es.
  it('muestra el adeudo total que manda el servidor, no la suma de la página', async () => {
    mockListado([incidenciaBase({ Monto: 1000 })], 240, 987654.32);
    renderPagina();

    // La tarjeta se pinta antes de que llegue la respuesta: hay que esperar al dato.
    expect(await screen.findByText('$987,654.32')).toBeInTheDocument();
    expect(screen.getByText('240 incidencias sin resolver')).toBeInTheDocument();
  });

  it('con filtro activo avisa que el total es del filtro', async () => {
    const user = userEvent.setup();
    mockListado([incidenciaBase()], 5, 1000);
    renderPagina();
    await screen.findByText('CLIMAS DEL NORTE');

    await user.selectOptions(screen.getByLabelText('Tipo de incidencia'), 'MORA');

    expect(await screen.findByText(/Adeudo total de clientes morosos \(según el filtro\)/))
      .toBeInTheDocument();
  });

  it('sin pendientes muestra el vacío', async () => {
    renderPagina();
    expect(await screen.findByText('Nada pendiente')).toBeInTheDocument();
  });

  it('“Ver ficha” lleva al cliente', async () => {
    const user = userEvent.setup();
    mockListado([incidenciaBase()]);
    renderPagina();

    await user.click(await screen.findByRole('button', { name: 'Ver ficha' }));
    expect(await screen.findByText('Marcador Ficha')).toBeInTheDocument();
  });
});

describe('Incidencias — buscador y filtro por tipo', () => {
  it('lo que se escribe llega al servidor como búsqueda', async () => {
    const user = userEvent.setup();
    mockListado([incidenciaBase()]);
    renderPagina();
    await screen.findByText('CLIMAS DEL NORTE');

    await user.type(screen.getByPlaceholderText(/Buscar cliente o descripción/), 'climas');

    await waitFor(() => expect(clientesApi.incidenciasPendientes).toHaveBeenLastCalledWith(
      expect.objectContaining({ busqueda: 'climas' })));
  });

  it('el filtro por tipo llega al servidor', async () => {
    const user = userEvent.setup();
    mockListado([incidenciaBase()]);
    renderPagina();
    await screen.findByText('CLIMAS DEL NORTE');

    await user.selectOptions(screen.getByLabelText('Tipo de incidencia'), 'DANO_NO_REPUESTO');

    await waitFor(() => expect(clientesApi.incidenciasPendientes).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo: 'DANO_NO_REPUESTO' })));
  });

  it('ofrece los cuatro tipos con sus etiquetas en español', async () => {
    renderPagina();
    const select = await screen.findByLabelText('Tipo de incidencia');
    const opciones = within(select).getAllByRole('option').map((o) => o.textContent);
    expect(opciones).toEqual([
      'Todos los tipos', 'No pagó', 'Se atrasa en pagos', 'Dañó o no devolvió equipo', 'Otro',
    ]);
  });

  it('filtrar regresa a la página 1: quedarse en la 7 dejaría la pantalla en blanco', async () => {
    const user = userEvent.setup();
    mockListado([incidenciaBase()], 500);
    renderPagina();
    await screen.findByText('CLIMAS DEL NORTE');

    // Salto directo por número, que es para lo que están los botones de página.
    await user.click(await screen.findByRole('button', { name: 'Página 3' }));
    await waitFor(() => expect(clientesApi.incidenciasPendientes).toHaveBeenLastCalledWith(
      expect.objectContaining({ pagina: 3 })));

    await user.selectOptions(screen.getByLabelText('Tipo de incidencia'), 'MORA');

    await waitFor(() => expect(clientesApi.incidenciasPendientes).toHaveBeenLastCalledWith(
      expect.objectContaining({ pagina: 1, tipo: 'MORA' })));
  });

  it('sin resultados lo dice distinto a "nada pendiente"', async () => {
    const user = userEvent.setup();
    mockListado([incidenciaBase()]);
    renderPagina();
    await screen.findByText('CLIMAS DEL NORTE');

    mockListado([], 0, 0);
    await user.type(screen.getByPlaceholderText(/Buscar cliente o descripción/), 'zzzz');

    expect(await screen.findByText('Sin resultados')).toBeInTheDocument();
  });
});

describe('Incidencias — exportar a Excel', () => {
  it('exporta TODO lo filtrado, no solo la página en pantalla', async () => {
    const user = userEvent.setup();
    mockListado([incidenciaBase()], 240, 5000);
    renderPagina();
    await screen.findByText('CLIMAS DEL NORTE');

    await user.click(screen.getByRole('button', { name: 'Exportar a Excel' }));

    await waitFor(() => expect(XLSX.writeFile).toHaveBeenCalled());
    expect(clientesApi.incidenciasPendientes).toHaveBeenLastCalledWith(
      expect.objectContaining({ pagina: 1, porPagina: 100000 }));
  });

  it('las columnas salen con nombres legibles y el tipo en español', async () => {
    const user = userEvent.setup();
    mockListado([incidenciaBase()]);
    renderPagina();
    await screen.findByText('CLIMAS DEL NORTE');

    await user.click(screen.getByRole('button', { name: 'Exportar a Excel' }));

    await waitFor(() => expect(XLSX.utils.json_to_sheet).toHaveBeenCalled());
    const filas = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0][0] as any[];
    expect(Object.keys(filas[0])).toEqual([
      'Cliente', 'Teléfono', 'Bloqueado', 'Fecha', 'Tipo', 'Descripción', 'Monto']);
    expect(filas[0].Tipo).toBe('No pagó');
    expect(filas[0].Bloqueado).toBe('Sí');
  });

  it('sin nada que exportar, el botón queda deshabilitado', async () => {
    renderPagina();
    await screen.findByText('Nada pendiente');
    expect(screen.getByRole('button', { name: 'Exportar a Excel' })).toBeDisabled();
  });
});

describe('Incidencias — registrar desde aquí', () => {
  // Quien cobra se entera del adeudo en esta pantalla; obligarlo a ir a buscar la
  // ficha del cliente para capturarlo es el paso que hace que no se capture.
  it('pide primero a qué cliente, y luego captura', async () => {
    const user = userEvent.setup();
    vi.mocked(crearRecursoApi).mockReturnValue({
      listar: vi.fn().mockResolvedValue([
        { IdCliente: 9, RazonSocial: 'ACME SA', RFC: null, Telefono: null, Restriccion: 'NINGUNA' },
      ]),
      listarPaginado: vi.fn(), obtener: vi.fn(), crear: vi.fn(), actualizar: vi.fn(), eliminar: vi.fn(),
    });
    vi.mocked(clientesApi.crearIncidencia).mockResolvedValue({
      incidencia: incidenciaBase(), bloqueoAplicado: true,
    });
    renderPagina();

    await user.click(await screen.findByRole('button', { name: '+ Registrar incidencia' }));
    expect(screen.getByRole('heading', { name: '¿A qué cliente?' })).toBeInTheDocument();

    await user.click(await screen.findByText('ACME SA'));
    expect(await screen.findByRole('heading', { name: /Registrar incidencia · ACME SA/ }))
      .toBeInTheDocument();

    await user.type(screen.getByLabelText(/Descripción/), 'No pagó la renta');
    await user.click(screen.getByRole('button', { name: 'Registrar y bloquear' }));

    await waitFor(() => expect(clientesApi.crearIncidencia).toHaveBeenCalledWith(
      9, expect.objectContaining({ Tipo: 'NO_PAGO', Descripcion: 'No pagó la renta' })));
  });

  it('al guardar recarga el listado, para que aparezca la nueva', async () => {
    const user = userEvent.setup();
    vi.mocked(crearRecursoApi).mockReturnValue({
      listar: vi.fn().mockResolvedValue([
        { IdCliente: 9, RazonSocial: 'ACME SA', RFC: null, Telefono: null, Restriccion: 'NINGUNA' },
      ]),
      listarPaginado: vi.fn(), obtener: vi.fn(), crear: vi.fn(), actualizar: vi.fn(), eliminar: vi.fn(),
    });
    vi.mocked(clientesApi.crearIncidencia).mockResolvedValue({
      incidencia: incidenciaBase(), bloqueoAplicado: false,
    });
    renderPagina();
    await screen.findByText('Nada pendiente');
    const llamadasAntes = vi.mocked(clientesApi.incidenciasPendientes).mock.calls.length;

    await user.click(screen.getByRole('button', { name: '+ Registrar incidencia' }));
    await user.click(await screen.findByText('ACME SA'));

    // La pantalla también tiene un filtro "Tipo de incidencia": se acota al modal.
    const modal = (await screen.findByRole('heading', { name: /Registrar incidencia · ACME SA/ }))
      .closest<HTMLElement>('.modal')!;
    await user.selectOptions(within(modal).getByLabelText(/Tipo/), 'MORA');
    await user.type(within(modal).getByLabelText(/Descripción/), 'Se atrasa');
    await user.click(within(modal).getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(vi.mocked(clientesApi.incidenciasPendientes).mock.calls.length)
      .toBeGreaterThan(llamadasAntes));
  });

  it('a un usuario de solo lectura no se le ofrece', async () => {
    renderPagina(usuarioBase({ Rol: 'CONSULTA' }));
    await screen.findByText('Nada pendiente');
    expect(screen.queryByRole('button', { name: '+ Registrar incidencia' })).not.toBeInTheDocument();
  });

  it('un VENDEDOR sí puede registrar, aunque no pueda resolver', async () => {
    renderPagina(usuarioBase({ Rol: 'VENDEDOR' }));
    await screen.findByText('Nada pendiente');
    expect(screen.getByRole('button', { name: '+ Registrar incidencia' })).toBeInTheDocument();
  });
});

describe('Incidencias — resolver', () => {
  it('pide confirmación; si se cancela, no llama al API', async () => {
    const user = userEvent.setup();
    mockListado([incidenciaBase()]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPagina();

    await user.click(await screen.findByRole('button', { name: 'Marcar resuelta' }));
    expect(clientesApi.resolverIncidencia).not.toHaveBeenCalled();
  });

  it('confirmado, resuelve y recarga el listado', async () => {
    const user = userEvent.setup();
    mockListado([incidenciaBase()]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(clientesApi.resolverIncidencia).mockResolvedValue({
      incidencia: incidenciaBase({ Resuelta: true }),
      pendientes: 3, totalAdeudo: 900, puedeDesbloquearse: false, cliente: null,
    });
    renderPagina();

    await user.click(await screen.findByRole('button', { name: 'Marcar resuelta' }));

    await waitFor(() => expect(clientesApi.resolverIncidencia).toHaveBeenCalledWith(77));
    await waitFor(() => expect(clientesApi.incidenciasPendientes).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('heading', { name: '¿Quitar el bloqueo?' })).not.toBeInTheDocument();
  });

  it('al cerrar el último adeudo ofrece quitar el bloqueo, y solo si dicen que sí lo quita', async () => {
    const user = userEvent.setup();
    mockListado([incidenciaBase()]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(clientesApi.resolverIncidencia).mockResolvedValue({
      incidencia: incidenciaBase({ Resuelta: true }),
      pendientes: 0, totalAdeudo: 0, puedeDesbloquearse: true,
      cliente: { IdCliente: 4, RazonSocial: 'CLIMAS DEL NORTE' },
    });
    renderPagina();

    await user.click(await screen.findByRole('button', { name: 'Marcar resuelta' }));

    expect(await screen.findByRole('heading', { name: '¿Quitar el bloqueo?' })).toBeInTheDocument();
    expect(clientesApi.cambiarRestriccion).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Sí, quitar el bloqueo' }));
    await waitFor(() => expect(clientesApi.cambiarRestriccion).toHaveBeenCalledWith(4, 'NINGUNA', null));
  });

  it('decir que no deja al cliente bloqueado', async () => {
    const user = userEvent.setup();
    mockListado([incidenciaBase()]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(clientesApi.resolverIncidencia).mockResolvedValue({
      incidencia: incidenciaBase({ Resuelta: true }),
      pendientes: 0, totalAdeudo: 0, puedeDesbloquearse: true,
      cliente: { IdCliente: 4, RazonSocial: 'CLIMAS DEL NORTE' },
    });
    renderPagina();

    await user.click(await screen.findByRole('button', { name: 'Marcar resuelta' }));
    await user.click(await screen.findByRole('button', { name: 'No, dejarlo bloqueado' }));

    expect(clientesApi.cambiarRestriccion).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: '¿Quitar el bloqueo?' })).not.toBeInTheDocument();
  });
});

describe('Incidencias — permisos', () => {
  it('un VENDEDOR ve la cartera pero no puede resolver', async () => {
    mockListado([incidenciaBase()]);
    renderPagina(usuarioBase({ Rol: 'VENDEDOR' }));

    expect(await screen.findByText('CLIMAS DEL NORTE')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar resuelta' })).not.toBeInTheDocument();
    expect(screen.getByText(/Solo un administrador puede marcar incidencias como resueltas/))
      .toBeInTheDocument();
  });

  it('un ADMIN sí ve el botón', async () => {
    mockListado([incidenciaBase()]);
    renderPagina();
    expect(await screen.findByRole('button', { name: 'Marcar resuelta' })).toBeInTheDocument();
  });
});

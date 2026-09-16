import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminCRUD, type RecursoConfig } from './AdminCRUD';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from './ui/Toast';
import { crearRecursoApi } from '../api/recurso';
import type { UsuarioSesion } from '../types';

vi.mock('../api/recurso', () => ({ crearRecursoApi: vi.fn() }));

const FILAS = [
  { IdCliente: 1, RazonSocial: 'CLIMAS DEL NORTE', Ciudad: 'TORREON, COAH' },
  { IdCliente: 2, RazonSocial: 'ACME SA', Ciudad: 'GOMEZ PALACIO' },
];

/** Config mínima con pantalla propia, como la de clientes. */
function configBase(overrides: Partial<RecursoConfig> = {}): RecursoConfig {
  return {
    titulo: 'Clientes', nombreSingular: 'Cliente', ruta: 'clientes', idClave: 'IdCliente',
    textoEliminar: 'desactivar',
    rutaDetalle: (fila) => `/clientes/${fila.IdCliente}`,
    campos: [
      { clave: 'RazonSocial', etiqueta: 'Razón social', tipo: 'texto', requerido: true },
      { clave: 'Ciudad', etiqueta: 'Ciudad', tipo: 'texto' },
    ],
    ...overrides,
  };
}

function usuarioBase(overrides: Partial<UsuarioSesion> = {}): UsuarioSesion {
  return { IdUsuario: 7, Nombre: 'Ana', Email: 'ana@x.com', Rol: 'ADMIN', IdSucursal: 1, ...overrides };
}

const api = {
  listar: vi.fn(), listarPaginado: vi.fn(), obtener: vi.fn(),
  crear: vi.fn(), actualizar: vi.fn(), eliminar: vi.fn(),
};

function renderCRUD(config = configBase(), usuario: UsuarioSesion = usuarioBase()) {
  localStorage.setItem('usuario', JSON.stringify(usuario));
  return render(
    <MemoryRouter initialEntries={['/clientes']}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/clientes" element={<AdminCRUD config={config} />} />
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
  api.listar.mockResolvedValue(FILAS);
  vi.mocked(crearRecursoApi).mockReturnValue(api);
});

describe('AdminCRUD — recurso con ficha propia', () => {
  it('el renglón completo lleva a la ficha', async () => {
    const user = userEvent.setup();
    renderCRUD();

    await user.click((await screen.findByText('CLIMAS DEL NORTE')).closest('tr')!);

    expect(await screen.findByText('Marcador Ficha')).toBeInTheDocument();
  });

  it('también hay un botón, para quien navega con teclado', async () => {
    const user = userEvent.setup();
    renderCRUD();

    const fila = (await screen.findByText('ACME SA')).closest('tr')!;
    await user.click(within(fila).getByRole('button', { name: 'Ver ficha' }));

    expect(await screen.findByText('Marcador Ficha')).toBeInTheDocument();
  });

  it('“Editar” abre el modal sin navegar a la ficha', async () => {
    const user = userEvent.setup();
    renderCRUD();

    const fila = (await screen.findByText('CLIMAS DEL NORTE')).closest('tr')!;
    await user.click(within(fila).getByRole('button', { name: 'Editar' }));

    expect(screen.getByRole('heading', { name: 'Editar cliente' })).toBeInTheDocument();
    expect(screen.queryByText('Marcador Ficha')).not.toBeInTheDocument();
  });

  it('“Desactivar” tampoco navega a la ficha', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderCRUD();

    const fila = (await screen.findByText('CLIMAS DEL NORTE')).closest('tr')!;
    await user.click(within(fila).getByRole('button', { name: 'Desactivar' }));

    await waitFor(() => expect(api.eliminar).toHaveBeenCalledWith(1));
    expect(screen.queryByText('Marcador Ficha')).not.toBeInTheDocument();
  });

  it('un usuario de solo lectura no puede editar, pero sí entrar a la ficha', async () => {
    renderCRUD(configBase(), usuarioBase({ Rol: 'CONSULTA' }));

    await screen.findByText('CLIMAS DEL NORTE');
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Nuevo' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Ver ficha' })).toHaveLength(2);
  });

  it('la columna de acciones tiene encabezado aunque el usuario no pueda editar', async () => {
    renderCRUD(configBase(), usuarioBase({ Rol: 'CONSULTA' }));

    await screen.findByText('CLIMAS DEL NORTE');
    // Si el <th> faltara, las celdas quedarían corridas respecto a los títulos.
    const encabezados = screen.getAllByRole('columnheader');
    const celdas = within(screen.getByText('CLIMAS DEL NORTE').closest('tr')!).getAllByRole('cell');
    expect(encabezados).toHaveLength(celdas.length);
  });
});

describe('AdminCRUD — campos solo de ADMIN', () => {
  const conCampoAdmin = configBase({
    campos: [
      { clave: 'RazonSocial', etiqueta: 'Razón social', tipo: 'texto', requerido: true },
      { clave: 'Restriccion', etiqueta: 'Restricción', tipo: 'select', soloAdmin: true,
        opciones: [{ valor: 'NINGUNA', etiqueta: 'Ninguna' }, { valor: 'BLOQUEO', etiqueta: 'Bloqueo' }] },
    ],
  });

  it('un ADMIN sí puede editarlo', async () => {
    const user = userEvent.setup();
    renderCRUD(conCampoAdmin);

    await user.click(await screen.findByRole('button', { name: '+ Nuevo' }));
    expect(screen.getByLabelText('Restricción')).toBeInTheDocument();
  });

  it('a un VENDEDOR no se le ofrece: lo que no puede guardar, no se muestra editable', async () => {
    const user = userEvent.setup();
    renderCRUD(conCampoAdmin, usuarioBase({ Rol: 'VENDEDOR' }));

    await user.click(await screen.findByRole('button', { name: '+ Nuevo' }));
    expect(screen.queryByLabelText('Restricción')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Razón social/)).toBeInTheDocument();
  });

  it('pero sigue viéndose en la tabla', async () => {
    renderCRUD(conCampoAdmin, usuarioBase({ Rol: 'VENDEDOR' }));

    await screen.findByText('CLIMAS DEL NORTE');
    expect(screen.getByRole('columnheader', { name: 'Restricción' })).toBeInTheDocument();
  });
});

describe('AdminCRUD — topes de longitud', () => {
  it('el formulario respeta el ancho de la columna, para no tronar en el servidor', async () => {
    const user = userEvent.setup();
    const config = configBase({
      campos: [
        { clave: 'RazonSocial', etiqueta: 'Razón social', tipo: 'texto', requerido: true },
        { clave: 'Ciudad', etiqueta: 'Ciudad', tipo: 'texto', maxLargo: 150 },
        { clave: 'Direccion', etiqueta: 'Dirección', tipo: 'textarea', maxLargo: 400 },
      ],
    });
    renderCRUD(config);

    await user.click(await screen.findByRole('button', { name: '+ Nuevo' }));

    expect(screen.getByLabelText('Ciudad')).toHaveAttribute('maxlength', '150');
    expect(screen.getByLabelText('Dirección')).toHaveAttribute('maxlength', '400');
    // Sin tope declarado no se inventa ninguno.
    expect(screen.getByLabelText(/Razón social/)).not.toHaveAttribute('maxlength');
  });
});

describe('AdminCRUD — recurso sin ficha propia', () => {
  const sinFicha = configBase({ rutaDetalle: undefined });

  it('no ofrece “Ver ficha” ni hace clicable el renglón', async () => {
    const user = userEvent.setup();
    renderCRUD(sinFicha);

    const fila = (await screen.findByText('CLIMAS DEL NORTE')).closest('tr')!;
    expect(within(fila).queryByRole('button', { name: 'Ver ficha' })).not.toBeInTheDocument();
    expect(fila).not.toHaveClass('clic');

    await user.click(fila);
    expect(screen.queryByText('Marcador Ficha')).not.toBeInTheDocument();
  });

  it('a un usuario de solo lectura no le muestra la columna de acciones', async () => {
    renderCRUD(sinFicha, usuarioBase({ Rol: 'CONSULTA' }));

    await screen.findByText('CLIMAS DEL NORTE');
    const encabezados = screen.getAllByRole('columnheader');
    expect(encabezados.map((e) => e.textContent)).toEqual(['Razón social', 'Ciudad']);
  });
});

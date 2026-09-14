import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/ui/Toast';
import { cotizacionesApi } from '../api/cotizaciones';
import { moneda } from '../components/ui/UI';
import type { DashboardData, UsuarioSesion } from '../types';

vi.mock('../api/cotizaciones', () => ({
  cotizacionesApi: { dashboard: vi.fn(), dashboardDetalle: vi.fn() },
}));

function dashboardData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    resumen: {
      Total: 0, Borradores: 0, Enviadas: 0, Pendientes: 0, Concretadas: 0, NoConcretadas: 0,
      Vencidas: 0, TipoRenta: 0, TipoVenta: 0, TotalCotizado: 0, TotalConcretado: 0,
    },
    porMes: [],
    porUsuario: [],
    ...overrides,
  };
}

function usuarioBase(overrides: Partial<UsuarioSesion> = {}): UsuarioSesion {
  return { IdUsuario: 1, Nombre: 'Ana', Email: 'ana@x.com', Rol: 'ADMIN', IdSucursal: null, ...overrides };
}

function renderDashboard() {
  localStorage.setItem('usuario', JSON.stringify(usuarioBase()));
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <Dashboard />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

/** Regresa el texto de cada celda de la fila cuyo primer <td> (Persona) es `nombre`. */
function celdasDeFila(nombre: string) {
  const fila = within(screen.getByRole('table')).getByText(nombre).closest('tr')!;
  return within(fila).getAllByRole('cell').map((td) => td.textContent);
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
});

describe('Dashboard — tabla por usuario', () => {
  it('muestra una fila por persona con el % de concretadas calculado', async () => {
    vi.mocked(cotizacionesApi.dashboard).mockResolvedValue(dashboardData({
      porUsuario: [
        { IdUsuario: 1, Usuario: 'Rocío', Email: null, Total: 26, Monto: 1421615.38, Concretadas: 3, MontoConcretado: 86072 },
      ],
    }));
    renderDashboard();

    await screen.findByRole('table');
    const celdas = celdasDeFila('Rocío');
    // Persona, Concretadas, % concretadas, Monto concretado, Monto cotizado, Número de cotizaciones
    expect(celdas[1]).toBe('3');
    expect(celdas[2]).toBe('12%'); // 3/26 = 11.5% -> redondeado a 12
    expect(celdas[5]).toBe('26');
  });

  it('si nadie tiene cotizaciones concretadas, el % es 0 (sin dividir entre cero)', async () => {
    vi.mocked(cotizacionesApi.dashboard).mockResolvedValue(dashboardData({
      porUsuario: [{ IdUsuario: 1, Usuario: 'Diana', Email: null, Total: 12, Monto: 395909.86, Concretadas: 0, MontoConcretado: 0 }],
    }));
    renderDashboard();

    await screen.findByRole('table');
    expect(celdasDeFila('Diana')[2]).toBe('0%');
  });

  it('sin datos, muestra el mensaje de "Sin datos todavía."', async () => {
    vi.mocked(cotizacionesApi.dashboard).mockResolvedValue(dashboardData({ porUsuario: [] }));
    renderDashboard();

    expect(await screen.findAllByText('Sin datos todavía.')).not.toHaveLength(0);
  });
});

describe('Dashboard — ordenamiento de la tabla', () => {
  function tresUsuarios() {
    return dashboardData({
      porUsuario: [
        { IdUsuario: 1, Usuario: 'Ana', Email: null, Total: 10, Monto: 1000, Concretadas: 1, MontoConcretado: 100 },
        { IdUsuario: 2, Usuario: 'Beto', Email: null, Total: 30, Monto: 3000, Concretadas: 9, MontoConcretado: 900 },
        { IdUsuario: 3, Usuario: 'Cindy', Email: null, Total: 20, Monto: 2000, Concretadas: 5, MontoConcretado: 500 },
      ],
    });
  }

  function nombresEnOrden() {
    return screen.getAllByRole('row').slice(1).map((fila) => within(fila).getAllByRole('cell')[0].textContent);
  }

  it('por default ordena por "Número de cotizaciones" descendente', async () => {
    vi.mocked(cotizacionesApi.dashboard).mockResolvedValue(tresUsuarios());
    renderDashboard();

    await screen.findByRole('table');
    expect(nombresEnOrden()).toEqual(['Beto', 'Cindy', 'Ana']);
  });

  it('clic en un encabezado ordena por esa columna (descendente primero)', async () => {
    const user = userEvent.setup();
    vi.mocked(cotizacionesApi.dashboard).mockResolvedValue(tresUsuarios());
    renderDashboard();

    await screen.findByRole('table');
    await user.click(screen.getByRole('columnheader', { name: /Cotizaciones concretadas/ }));

    expect(nombresEnOrden()).toEqual(['Beto', 'Cindy', 'Ana']); // Concretadas: 9, 5, 1
  });

  it('clic de nuevo en el mismo encabezado invierte a ascendente', async () => {
    const user = userEvent.setup();
    vi.mocked(cotizacionesApi.dashboard).mockResolvedValue(tresUsuarios());
    renderDashboard();

    await screen.findByRole('table');
    const encabezado = screen.getByRole('columnheader', { name: /Cotizaciones concretadas/ });
    await user.click(encabezado);
    await user.click(encabezado);

    expect(nombresEnOrden()).toEqual(['Ana', 'Cindy', 'Beto']);
  });

  it('clic en un encabezado distinto reinicia a descendente por esa nueva columna', async () => {
    const user = userEvent.setup();
    vi.mocked(cotizacionesApi.dashboard).mockResolvedValue(tresUsuarios());
    renderDashboard();

    await screen.findByRole('table');
    await user.click(screen.getByRole('columnheader', { name: /Cotizaciones concretadas/ }));
    await user.click(screen.getByRole('columnheader', { name: /Monto cotizado/ }));

    expect(nombresEnOrden()).toEqual(['Beto', 'Cindy', 'Ana']); // Monto: 3000, 2000, 1000
  });
});

describe('Dashboard — top de cotizadores', () => {
  /** Texto de cada renglón del ranking, en el orden en que se pinta. */
  function renglonesDelTop() {
    const bloque = screen.getByRole('heading', { name: /Top de cotizadores/ }).parentElement!;
    return Array.from(bloque.querySelectorAll('.flex-col > div')).map((f) => f.textContent);
  }

  it('muestra las 3 personas con mayor monto concretado, con medalla y de mayor a menor', async () => {
    vi.mocked(cotizacionesApi.dashboard).mockResolvedValue(dashboardData({
      porUsuario: [
        { IdUsuario: 1, Usuario: 'Ana García', Email: null, Total: 40, Monto: 900000, Concretadas: 9, MontoConcretado: 162800 },
        { IdUsuario: 2, Usuario: 'Laura Torres', Email: null, Total: 30, Monto: 700000, Concretadas: 7, MontoConcretado: 148300 },
        { IdUsuario: 3, Usuario: 'María López', Email: null, Total: 35, Monto: 800000, Concretadas: 11, MontoConcretado: 185400 },
        { IdUsuario: 4, Usuario: 'Rocío Díaz', Email: null, Total: 20, Monto: 400000, Concretadas: 2, MontoConcretado: 50000 },
      ],
    }));
    renderDashboard();

    await screen.findByRole('table');
    expect(renglonesDelTop()).toEqual([
      `🥇María López${moneda(185400)}`,
      `🥈Ana García${moneda(162800)}`,
      `🥉Laura Torres${moneda(148300)}`,
    ]);
  });

  it('omite a quien no concretó nada en el periodo', async () => {
    vi.mocked(cotizacionesApi.dashboard).mockResolvedValue(dashboardData({
      porUsuario: [
        { IdUsuario: 1, Usuario: 'Ana', Email: null, Total: 40, Monto: 900000, Concretadas: 1, MontoConcretado: 1000 },
        { IdUsuario: 2, Usuario: 'Beto', Email: null, Total: 30, Monto: 700000, Concretadas: 0, MontoConcretado: 0 },
      ],
    }));
    renderDashboard();

    await screen.findByRole('table');
    expect(renglonesDelTop()).toEqual([`🥇Ana${moneda(1000)}`]);
  });

  it('sin cotizaciones concretadas avisa en lugar de mostrar el ranking', async () => {
    vi.mocked(cotizacionesApi.dashboard).mockResolvedValue(dashboardData({
      porUsuario: [{ IdUsuario: 1, Usuario: 'Ana', Email: null, Total: 5, Monto: 1000, Concretadas: 0, MontoConcretado: 0 }],
    }));
    renderDashboard();

    expect(await screen.findByText('Sin cotizaciones concretadas en el periodo.')).toBeInTheDocument();
  });

  it('vuelve a pedir los datos al cambiar el periodo, y el ranking refleja el nuevo rango', async () => {
    const user = userEvent.setup();
    vi.mocked(cotizacionesApi.dashboard)
      .mockResolvedValueOnce(dashboardData({
        porUsuario: [{ IdUsuario: 1, Usuario: 'Ana', Email: null, Total: 40, Monto: 900000, Concretadas: 9, MontoConcretado: 162800 }],
      }))
      .mockResolvedValueOnce(dashboardData({
        porUsuario: [{ IdUsuario: 2, Usuario: 'Laura', Email: null, Total: 4, Monto: 90000, Concretadas: 1, MontoConcretado: 12000 }],
      }));
    renderDashboard();

    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Esta semana' }));

    await waitFor(() => expect(renglonesDelTop()).toEqual([`🥇Laura${moneda(12000)}`]));
  });
});

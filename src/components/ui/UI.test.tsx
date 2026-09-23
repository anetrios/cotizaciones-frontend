import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner, BadgeEstatus, BadgeTipo, Vacio, moneda, fecha } from './UI';

describe('moneda', () => {
  it('formatea en MXN por default', () => {
    expect(moneda(1000)).toBe((1000).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }));
  });

  it('formatea en la moneda indicada', () => {
    expect(moneda(1000, 'USD')).toBe((1000).toLocaleString('es-MX', { style: 'currency', currency: 'USD' }));
  });

  it('trata null y undefined como 0', () => {
    const cero = (0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    expect(moneda(null)).toBe(cero);
    expect(moneda(undefined)).toBe(cero);
  });
});

describe('fecha', () => {
  it('formatea una fecha civil como dd/mm/aaaa', () => {
    expect(fecha('2026-03-05')).toBe('05/03/2026');
  });

  // Este es el bug que motivó la función: new Date('2026-03-05T00:00:00.000Z')
  // en México (UTC-6) cae en el 4 de marzo, y la cotización se veía un día antes.
  it('no recorre el día aunque venga con medianoche UTC', () => {
    expect(fecha('2026-03-05T00:00:00.000Z')).toBe('05/03/2026');
    expect(fecha('2026-01-01T00:00:00.000Z')).toBe('01/01/2026');
  });

  it('regresa un guion si el texto no trae una fecha', () => {
    expect(fecha('sin fecha')).toBe('—');
  });

  it('regresa un guion para null, undefined o cadena vacía', () => {
    expect(fecha(null)).toBe('—');
    expect(fecha(undefined)).toBe('—');
    expect(fecha('')).toBe('—');
  });
});

describe('componentes de UI', () => {
  it('Spinner renderiza el contenedor del spinner', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('.spinner-centro')).toBeInTheDocument();
  });

  it('BadgeEstatus muestra la etiqueta y la clase del estatus', () => {
    render(<BadgeEstatus e="CONCRETADA" />);
    const badge = screen.getByText('Concretada');
    expect(badge).toHaveClass('badge-CONCRETADA');
  });

  it('BadgeTipo distingue Renta de Venta', () => {
    const { rerender } = render(<BadgeTipo t="RENTA" />);
    expect(screen.getByText('Renta')).toBeInTheDocument();
    rerender(<BadgeTipo t="VENTA" />);
    expect(screen.getByText('Venta')).toBeInTheDocument();
  });

  it('Vacio muestra el título y, si se da, el contenido', () => {
    render(<Vacio titulo="Sin resultados">Intenta con otro filtro.</Vacio>);
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    expect(screen.getByText('Intenta con otro filtro.')).toBeInTheDocument();
  });

  it('Vacio no revienta si no se le pasan hijos', () => {
    render(<Vacio titulo="Sin resultados" />);
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });
});

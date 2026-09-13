import { describe, it, expect } from 'vitest';
import { mensajeError } from './client';

describe('mensajeError', () => {
  it('usa el mensaje de error que manda el backend ({ ok:false, error }) cuando existe', () => {
    const error = {
      isAxiosError: true,
      response: { data: { error: 'El crédito requiere los días de crédito' } },
      message: 'Request failed with status code 400',
    };
    expect(mensajeError(error)).toBe('El crédito requiere los días de crédito');
  });

  it('si el backend no manda { error }, usa el mensaje de axios', () => {
    const error = { isAxiosError: true, response: undefined, message: 'Network Error' };
    expect(mensajeError(error)).toBe('Network Error');
  });

  it('si no hay ni error del backend ni mensaje de axios, regresa un mensaje genérico de conexión', () => {
    const error = { isAxiosError: true, response: undefined, message: '' };
    expect(mensajeError(error)).toBe('Error de conexión');
  });

  it('para un error que no es de axios regresa un mensaje genérico', () => {
    expect(mensajeError(new Error('boom'))).toBe('Error inesperado');
    expect(mensajeError('algo')).toBe('Error inesperado');
    expect(mensajeError(null)).toBe('Error inesperado');
  });
});

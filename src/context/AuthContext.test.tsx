import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { authApi } from '../api/auth';
import type { UsuarioSesion } from '../types';

vi.mock('../api/auth', () => ({ authApi: { login: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function usuarioBase(overrides: Partial<UsuarioSesion> = {}): UsuarioSesion {
  return { IdUsuario: 1, Nombre: 'Ana', Email: 'ana@x.com', Rol: 'VENDEDOR', IdSucursal: 1, ...overrides };
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('sin sesión previa arranca sin usuario y sin permisos', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.usuario).toBeNull();
    expect(result.current.autenticado).toBe(false);
    expect(result.current.esAdmin).toBe(false);
    expect(result.current.puedeEscribir).toBe(false);
  });

  it('si ya hay una sesión guardada en localStorage, arranca autenticado con ella', () => {
    localStorage.setItem('usuario', JSON.stringify(usuarioBase({ Rol: 'ADMIN' })));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.usuario?.Nombre).toBe('Ana');
    expect(result.current.autenticado).toBe(true);
    expect(result.current.esAdmin).toBe(true);
  });

  it('login exitoso guarda token y usuario en localStorage y actualiza el estado', async () => {
    const usuario = usuarioBase();
    vi.mocked(authApi.login).mockResolvedValue({ token: 'tok-123', usuario });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => { await result.current.login('ana@x.com', 'secreto'); });

    expect(authApi.login).toHaveBeenCalledWith('ana@x.com', 'secreto');
    expect(localStorage.getItem('token')).toBe('tok-123');
    expect(JSON.parse(localStorage.getItem('usuario')!)).toEqual(usuario);
    expect(result.current.usuario).toEqual(usuario);
    expect(result.current.autenticado).toBe(true);
  });

  it('login fallido no toca el estado ni localStorage, y propaga el error', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Credenciales inválidas'));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(act(async () => { await result.current.login('ana@x.com', 'mala'); }))
      .rejects.toThrow('Credenciales inválidas');

    expect(result.current.usuario).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('logout limpia localStorage y el estado', async () => {
    const usuario = usuarioBase();
    vi.mocked(authApi.login).mockResolvedValue({ token: 'tok-123', usuario });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => { await result.current.login('ana@x.com', 'secreto'); });

    act(() => { result.current.logout(); });

    expect(result.current.usuario).toBeNull();
    expect(result.current.autenticado).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('usuario')).toBeNull();
  });

  it.each([
    ['ADMIN', true, true],
    ['VENDEDOR', false, true],
    ['CONSULTA', false, false],
  ] as const)('rol %s: esAdmin=%s, puedeEscribir=%s', (rol, esAdmin, puedeEscribir) => {
    localStorage.setItem('usuario', JSON.stringify(usuarioBase({ Rol: rol })));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.esAdmin).toBe(esAdmin);
    expect(result.current.puedeEscribir).toBe(puedeEscribir);
  });

  it('tieneRol revisa si el rol actual está entre los indicados', () => {
    localStorage.setItem('usuario', JSON.stringify(usuarioBase({ Rol: 'VENDEDOR' })));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.tieneRol('ADMIN', 'VENDEDOR')).toBe(true);
    expect(result.current.tieneRol('ADMIN')).toBe(false);
  });

  it('tieneRol sin usuario siempre es falso', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.tieneRol('ADMIN', 'VENDEDOR', 'CONSULTA')).toBe(false);
  });

  it('useAuth fuera de AuthProvider lanza un error', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth fuera de AuthProvider');
    consoleError.mockRestore();
  });
});

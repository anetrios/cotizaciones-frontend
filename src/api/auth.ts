import api from './client';
import type { UsuarioSesion } from '../types';

export const authApi = {
  async login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    return data.datos as { token: string; usuario: UsuarioSesion };
  },
  async cambiarPassword(actual: string, nueva: string) {
    await api.post('/auth/cambiar-password', { actual, nueva });
  },
};

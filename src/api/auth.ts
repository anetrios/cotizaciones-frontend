import api from './client';
import type { UsuarioSesion } from '../types';

export const authApi = {
  async login(usuario: string, password: string) {
    const { data } = await api.post('/auth/login', { usuario, password });
    return data.datos as { token: string; usuario: UsuarioSesion };
  },
};

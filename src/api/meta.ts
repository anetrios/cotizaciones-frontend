import api from './client';
import type { Nota, SucursalConContactos } from '../types';

export const metaApi = {
  async notas(aplica?: 'RENTA' | 'VENTA') {
    const { data } = await api.get('/meta/notas', { params: { aplica } });
    return data.datos as Nota[];
  },
  async sucursales() {
    const { data } = await api.get('/meta/sucursales');
    return data.datos as SucursalConContactos[];
  },
  async usuarios() {
    const { data } = await api.get('/meta/usuarios');
    return data.datos as Array<{ IdUsuario: number; Nombre: string }>;
  },
};

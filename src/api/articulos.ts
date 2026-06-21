import api from './client';
import type { Articulo } from '../types';

export const articulosApi = {
  async listar(busqueda?: string) {
    const { data } = await api.get('/articulos', { params: { busqueda } });
    return data.datos as Articulo[];
  },
  async obtener(id: number) {
    const { data } = await api.get(`/articulos/${id}`);
    return data.datos as Articulo;
  },
};

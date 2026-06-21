import api from './client';
import type { Cliente } from '../types';

export const clientesApi = {
  async listar(busqueda?: string) {
    const { data } = await api.get('/clientes', { params: { busqueda } });
    return data.datos as Cliente[];
  },
  async obtener(id: number) {
    const { data } = await api.get(`/clientes/${id}`);
    return data.datos as Cliente;
  },
};

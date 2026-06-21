import api from './client';
import type {
  CotizacionResumen, CotizacionCompleta, NuevaCotizacion,
  DashboardData, EstatusCotizacion,
} from '../types';

export interface FiltrosCotizacion {
  IdCliente?: number;
  Estatus?: EstatusCotizacion;
  Tipo?: 'R' | 'V';
  FechaDesde?: string;
  FechaHasta?: string;
  Folio?: string;
  pagina?: number;
  porPagina?: number;
}

export const cotizacionesApi = {
  async listar(filtros: FiltrosCotizacion = {}) {
    const { data } = await api.get('/cotizaciones', { params: filtros });
    return {
      datos: data.datos as CotizacionResumen[],
      total: data.total as number,
      pagina: data.pagina as number,
      porPagina: data.porPagina as number,
    };
  },
  async obtener(id: number) {
    const { data } = await api.get(`/cotizaciones/${id}`);
    return data.datos as CotizacionCompleta;
  },
  async crear(payload: NuevaCotizacion) {
    const { data } = await api.post('/cotizaciones', payload);
    return data.datos as CotizacionCompleta;
  },
  async cambiarEstatus(id: number, Estatus: EstatusCotizacion) {
    const { data } = await api.patch(`/cotizaciones/${id}/estatus`, { Estatus });
    return data.datos as CotizacionCompleta;
  },
  async dashboard(fechaDesde?: string, fechaHasta?: string) {
    const { data } = await api.get('/cotizaciones/dashboard', { params: { fechaDesde, fechaHasta } });
    return data.datos as DashboardData;
  },
};

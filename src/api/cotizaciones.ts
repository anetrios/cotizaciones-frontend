import api from './client';
import type { CotizacionResumen, CotizacionCompleta, DashboardData, DashboardDetalle, ResultadoCambioLote } from '../types';

export const cotizacionesApi = {
  async parametros() {
    const { data } = await api.get('/cotizaciones/parametros');
    return data.datos as { umbralDescuentoPin: number; ivaDefault: number };
  },
  async listar(filtros: Record<string, unknown> = {}) {
    const { data } = await api.get('/cotizaciones', { params: filtros });
    return {
      datos: data.datos as CotizacionResumen[], total: data.total as number,
      pagina: data.pagina as number, porPagina: data.porPagina as number,
    };
  },
  async obtener(id: number) {
    const { data } = await api.get(`/cotizaciones/${id}`);
    return data.datos as CotizacionCompleta;
  },
  async crear(payload: unknown) {
    const { data } = await api.post('/cotizaciones', payload);
    return data.datos as CotizacionCompleta;
  },
  async actualizar(id: number, payload: unknown) {
    const { data } = await api.put(`/cotizaciones/${id}`, payload);
    return data.datos as CotizacionCompleta;
  },
  async eliminar(id: number) {
    await api.delete(`/cotizaciones/${id}`);
  },
  async cambiarEstatus(
    id: number, Estatus: string, MotivoNoConcrecion?: string, MotivoNoConcrecionDetalle?: string, NumeroFactura?: string
  ) {
    const { data } = await api.patch(`/cotizaciones/${id}/estatus`, { Estatus, MotivoNoConcrecion, MotivoNoConcrecionDetalle, NumeroFactura });
    return data.datos as CotizacionCompleta;
  },
  async cambiarEstatusLote(
    ids: number[], Estatus: string, MotivoNoConcrecion?: string, MotivoNoConcrecionDetalle?: string, Facturas?: Record<number, string>
  ) {
    const { data } = await api.patch('/cotizaciones/estatus-lote', { ids, Estatus, MotivoNoConcrecion, MotivoNoConcrecionDetalle, Facturas });
    return data.datos as ResultadoCambioLote;
  },
  async dashboard(filtros: { fechaDesde?: string; fechaHasta?: string } = {}) {
    const { data } = await api.get('/cotizaciones/dashboard', { params: filtros });
    return data.datos as DashboardData;
  },
  async dashboardDetalle(estatus: string, filtros: { fechaDesde?: string; fechaHasta?: string } = {}) {
    const { data } = await api.get('/cotizaciones/dashboard/detalle', { params: { estatus, ...filtros } });
    return data.datos as DashboardDetalle;
  },
};

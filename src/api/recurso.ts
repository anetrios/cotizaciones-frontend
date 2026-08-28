import api from './client';

/** CRUD genérico sobre /:recurso. Devuelve data.datos. */
export function crearRecursoApi(ruta: string) {
  return {
    async listar(params: Record<string, unknown> = {}) {
      const { data } = await api.get(`/${ruta}`, { params });
      return data.datos as any[];
    },
    async listarPaginado(params: Record<string, unknown> = {}) {
      const { data } = await api.get(`/${ruta}`, { params });
      return {
        datos: data.datos as Record<string, unknown>[],
        total: data.total as number,
        pagina: data.pagina as number,
        porPagina: data.porPagina as number,
      };
    },
    async obtener(id: number) {
      const { data } = await api.get(`/${ruta}/${id}`);
      return data.datos;
    },
    async crear(payload: unknown) {
      const { data } = await api.post(`/${ruta}`, payload);
      return data.datos;
    },
    async actualizar(id: number, payload: unknown) {
      const { data } = await api.put(`/${ruta}/${id}`, payload);
      return data.datos;
    },
    async eliminar(id: number) {
      const { data } = await api.delete(`/${ruta}/${id}`);
      return data.datos;
    },
  };
}

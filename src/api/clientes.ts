import api from './client';
import type {
  Cliente, ContactoCliente, Incidencia, ExpedienteIncidencias, ResultadoResolver,
  PendienteRevision, AccionRevision, Restriccion,
} from '../types';

/** Expediente del cliente: contactos, incidencias y cola de revisión. */
export const clientesApi = {
  async obtener(idCliente: number) {
    const { data } = await api.get(`/clientes/${idCliente}`);
    return data.datos as Cliente;
  },
  async actualizar(idCliente: number, payload: unknown) {
    const { data } = await api.put(`/clientes/${idCliente}`, payload);
    return data.datos;
  },
  /** Pone o quita el bloqueo sin reenviar toda la ficha. Solo ADMIN. */
  async cambiarRestriccion(idCliente: number, Restriccion: Restriccion, MotivoRestriccion?: string | null) {
    const { data } = await api.patch(`/clientes/${idCliente}/restriccion`, { Restriccion, MotivoRestriccion });
    return data.datos as Cliente;
  },

  /* ---- Contactos ---- */
  async contactos(idCliente: number) {
    const { data } = await api.get(`/clientes/${idCliente}/contactos`);
    return data.datos as ContactoCliente[];
  },
  async crearContacto(idCliente: number, payload: Partial<ContactoCliente>) {
    const { data } = await api.post(`/clientes/${idCliente}/contactos`, payload);
    return data.datos as ContactoCliente;
  },
  async actualizarContacto(idContacto: number, payload: Partial<ContactoCliente>) {
    const { data } = await api.put(`/contactos/${idContacto}`, payload);
    return data.datos as ContactoCliente;
  },
  async desactivarContacto(idContacto: number) {
    await api.delete(`/contactos/${idContacto}`);
  },
  async marcarPrincipal(idContacto: number) {
    const { data } = await api.patch(`/contactos/${idContacto}/principal`);
    return data.datos as ContactoCliente;
  },

  /* ---- Incidencias ---- */
  async incidencias(idCliente: number) {
    const { data } = await api.get(`/clientes/${idCliente}/incidencias`);
    return data.datos as ExpedienteIncidencias;
  },
  async crearIncidencia(idCliente: number, payload: unknown) {
    const { data } = await api.post(`/clientes/${idCliente}/incidencias`, payload);
    return data.datos as { incidencia: Incidencia; bloqueoAplicado: boolean };
  },
  /**
   * Pendientes de todos los clientes. `adeudo` es la suma de TODO lo que casa con
   * los filtros —no solo de la página—, así que el total de arriba concuerda con
   * lo que se está viendo aunque haya 13 páginas abajo.
   */
  async incidenciasPendientes(
    filtros: { busqueda?: string; tipo?: string; pagina?: number; porPagina?: number } = {}
  ) {
    const { data } = await api.get('/incidencias', {
      params: {
        resueltas: false,
        busqueda: filtros.busqueda || undefined,
        tipo: filtros.tipo || undefined,
        pagina: filtros.pagina ?? 1,
        porPagina: filtros.porPagina ?? 50,
      },
    });
    return {
      datos: data.datos as Incidencia[],
      total: data.total as number,
      adeudo: Number(data.adeudo ?? 0),
    };
  },
  async resolverIncidencia(idIncidencia: number) {
    const { data } = await api.patch(`/incidencias/${idIncidencia}/resolver`);
    return data.datos as ResultadoResolver;
  },

  /* ---- Cola de revisión (solo ADMIN) ---- */
  async revision(soloConCotizaciones: boolean, pagina = 1, porPagina = 20) {
    const { data } = await api.get('/revision', {
      params: { resuelto: false, conCotizaciones: soloConCotizaciones ? 1 : 0, pagina, porPagina },
    });
    return { datos: data.datos as PendienteRevision[], total: data.total as number };
  },
  async resumenRevision() {
    const { data } = await api.get('/revision/resumen');
    return data.datos as { Pendientes: number; Prioritarios: number };
  },
  async resolverRevision(idRevision: number, payload: { Accion: AccionRevision } & Record<string, unknown>) {
    const { data } = await api.patch(`/revision/${idRevision}/resolver`, payload);
    return data.datos as { resuelto: boolean; contactosCreados: number };
  },
};

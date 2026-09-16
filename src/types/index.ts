export type Rol = 'ADMIN' | 'VENDEDOR' | 'CONSULTA';
export type TipoCotizacion = 'RENTA' | 'VENTA';
export type EstatusCotizacion = 'BORRADOR' | 'ENVIADA' | 'PENDIENTE' | 'CONCRETADA' | 'NO_CONCRETADA';
export type MotivoNoConcrecion = 'PRECIO' | 'COMPETENCIA' | 'PRESUPUESTO_CLIENTE' | 'REQUERIMIENTOS' | 'FALTA_EQUIPO' | 'POSTERGACION_PROYECTO' | 'OTRO';

export interface UsuarioSesion {
  IdUsuario: number; Nombre: string; Email: string; Rol: Rol; IdSucursal: number | null;
}

export interface Nota {
  IdNota: number; Codigo: string; Categoria: string; Texto: string;
  Aplica: 'RENTA' | 'VENTA' | 'AMBAS'; EsDefault: boolean; Automatica: boolean; Orden: number;
}

export interface ContactoSucursal { IdContacto?: number; Tipo: string; Valor: string; Orden: number; }
export interface SucursalConContactos {
  IdSucursal: number; Nombre: string; Ciudad: string | null; Direccion: string | null; contactos: ContactoSucursal[];
}

export type Restriccion = 'NINGUNA' | 'ADVERTENCIA' | 'BLOQUEO';

export interface Cliente {
  IdCliente: number; RazonSocial: string; NombreComercial: string | null; RFC: string | null;
  Contacto: string | null; Telefono: string | null; TelefonoAlterno: string | null;
  Email: string | null; Direccion: string | null; DireccionFiscal: string | null;
  Ciudad: string | null; Observaciones: string | null;
  Restriccion: Restriccion; MotivoRestriccion: string | null; Activo: boolean;
  /** Foto del registro antes de la limpieza. Solo lectura: solo llega en el detalle. */
  ObservacionesOriginal?: string | null;
}

export interface ContactoCliente {
  IdContacto: number; IdCliente: number;
  Nombre: string | null; Puesto: string | null;
  Telefono: string | null; Celular: string | null; Email: string | null; Notas: string | null;
  EsPrincipal: boolean; Origen: string; Activo: boolean; FechaCreacion: string;
}

export type TipoIncidencia = 'NO_PAGO' | 'MORA' | 'DANO_NO_REPUESTO' | 'OTRO';

export interface Incidencia {
  IdIncidencia: number; IdCliente: number; Tipo: TipoIncidencia; Descripcion: string;
  Monto: number | null; Fecha: string; IdUsuario: number | null; Resuelta: boolean;
  /** Solo en el listado global de cobranza. */
  Cliente?: string; Restriccion?: Restriccion; ClienteTelefono?: string | null; Usuario?: string | null;
}

export interface ExpedienteIncidencias {
  incidencias: Incidencia[];
  Pendientes: number;
  TotalAdeudo: number;
  Restriccion: Restriccion;
  MotivoRestriccion: string | null;
}

export interface ResultadoResolver {
  incidencia: Incidencia;
  pendientes: number;
  totalAdeudo: number;
  puedeDesbloquearse: boolean;
  cliente: { IdCliente: number; RazonSocial: string } | null;
}

export type AccionRevision =
  | 'PERSONA' | 'DOS_PERSONAS' | 'TELEFONO' | 'DOMICILIO' | 'NOTA' | 'BASURA' | 'PREGUNTAR';

export interface PendienteRevision {
  IdRevision: number; IdCliente: number; Campo: string; ValorOriginal: string | null;
  Motivo: string; Sugerencia: string | null; Resuelto: boolean; ResueltoPor: string | null;
  FechaCreacion: string;
  Cliente: string; Ciudad: string | null; ContactoActual: string | null;
  TelefonoActual: string | null; EmailActual: string | null; DireccionActual: string | null;
  Restriccion: Restriccion; Cotizaciones: number;
}

export interface ArticuloRenta {
  IdArticuloRenta: number; Codigo: string; Descripcion: string; Categoria: string;
  UnidadCobro: 'DIA' | 'MES'; Precio: number; DepositoGarantia: number | null;
  GrupoMayoreo: string | null; PrecioMayoreo: number | null; SeControlaPorSerie: boolean;
  Estatus: string; Observaciones: string | null;
}
export interface ArticuloVenta {
  IdArticuloVenta: number; Codigo: string; Descripcion: string; Marca: string | null;
  Precio: number; EsUsado: boolean; Estatus: string; Observaciones: string | null;
}
export interface Servicio {
  IdServicio: number; Codigo: string; Descripcion: string; Tipo: string;
  Precio: number; UnidadCobro: string; Estatus: string; Observaciones: string | null;
}

export interface Renglon {
  IdRenglon?: number; Orden?: number;
  IdArticuloRenta?: number | null; IdArticuloVenta?: number | null; IdServicio?: number | null;
  CodigoSnapshot: string | null; Descripcion: string; PrecioUnitario: number;
  Cantidad: number; UnidadCobro: string | null; NumeroPeriodos: number;
  DescuentoPorcentaje: number; Importe: number;
}

export interface CotizacionResumen {
  IdCotizacion: number; Folio: string; Tipo: TipoCotizacion; Estatus: EstatusCotizacion;
  Fecha: string; VigenciaDias: number; Moneda: string;
  Subtotal: number; DescuentoMonto: number; IVA: number; Total: number;
  Cliente: string; Usuario: string; UsuarioEmail: string | null; Sucursal: string;
}

export interface CotizacionCompleta extends CotizacionResumen {
  IdCliente: number; IdContactoCliente: number | null; IdSucursal: number; IdUsuario: number;
  TipoCambio: number | null; TiempoEntrega: string | null; Garantia: string | null;
  CondicionesEntrega: string | null; CondicionPago: 'CONTADO' | 'CREDITO'; DiasCredito: number | null;
  AnticipoPorcentaje: number | null; AnticipoMonto: number | null; FormaLiquidacionSaldo: string | null;
  Observaciones: string | null;
  DescuentoPorcentaje: number;
  ClienteComercial: string | null; ClienteRFC: string | null; ClienteContacto: string | null;
  ClienteTelefono: string | null; ClienteEmail: string | null; ClienteDireccion: string | null;
  SucursalDireccion: string | null;
  MotivoNoConcrecion: MotivoNoConcrecion | null; MotivoNoConcrecionDetalle: string | null;
  NumeroFactura: string | null;
  renglones: Renglon[];
  notas: Array<{ IdCotizacionNota: number; Categoria: string; Texto: string; Orden: number }>;
}

export interface DashboardData {
  resumen: {
    Total: number; Borradores: number; Enviadas: number; Pendientes: number; Concretadas: number; NoConcretadas: number;
    TipoRenta: number; TipoVenta: number; TotalCotizado: number; TotalConcretado: number;
  };
  porMes: Array<{ Mes: string; Total: number; Monto: number }>;
  porUsuario: Array<{
    IdUsuario: number; Usuario: string; Email: string | null; Total: number; Monto: number;
    Concretadas: number; MontoConcretado: number;
  }>;
}

export interface DetalleEstatusPersona { IdUsuario: number; Usuario: string; Total: number; }
export interface DetalleEstatusMotivo { Motivo: string; Total: number; }
export interface DashboardDetalle {
  tipo: 'persona' | 'motivo';
  filas: DetalleEstatusPersona[] | DetalleEstatusMotivo[];
}

export interface ResultadoCambioLote {
  actualizadas: number[];
  fallidas: Array<{ IdCotizacion: number; error: string }>;
}

export const ETIQUETA_ESTATUS: Record<EstatusCotizacion, string> = {
  BORRADOR: 'Borrador', ENVIADA: 'Enviada', PENDIENTE: 'Pendiente de respuesta', CONCRETADA: 'Concretada',
  NO_CONCRETADA: 'No concretada',
};
export const ETIQUETA_MOTIVO_NO_CONCRECION: Record<MotivoNoConcrecion, string> = {
  PRECIO: 'Precio', COMPETENCIA: 'Competencia', PRESUPUESTO_CLIENTE: 'Presupuesto del cliente',
  REQUERIMIENTOS: 'Requerimientos', FALTA_EQUIPO: 'Falta de equipos',
  POSTERGACION_PROYECTO: 'Postergación del Proyecto', OTRO: 'Otro',
};
export const ETIQUETA_UNIDAD: Record<string, string> = {
  DIA: 'día(s)', MES: 'mes(es)', EVENTO: 'evento', SECCION: 'sección', PIEZA: 'pieza', HORA: 'hora',
};

export const ETIQUETA_INCIDENCIA: Record<TipoIncidencia, string> = {
  NO_PAGO: 'No pagó',
  MORA: 'Se atrasa en pagos',
  DANO_NO_REPUESTO: 'Dañó o no devolvió equipo',
  OTRO: 'Otro',
};

/** Estos dos dejan al cliente bloqueado en automático (regla del servidor). */
export const INCIDENCIAS_QUE_BLOQUEAN: TipoIncidencia[] = ['NO_PAGO', 'DANO_NO_REPUESTO'];

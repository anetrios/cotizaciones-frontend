export type TipoCotizacion    = 'R' | 'V';
export type EstatusCotizacion = 'P' | 'A' | 'R' | 'V';
export type TipoTarifa        = 'H' | 'D' | 'S' | 'M' | 'E';

export interface UsuarioSesion {
  IdUsuario: number;
  Usuario: string;
  Nombre: string;
  IdPersonal: number | null;
}

export interface Cliente {
  IdCliente: number;
  ClaveCliente: number | null;
  NombreComercial: string | null;
  DireccionComercial?: string | null;
  CiudadEstado?: string | null;
  Telefono: string | null;
  Contacto: string | null;
  Plazo: string | null;
  CorreoParaEnviarleFacturas: string | null;
  PermisoVentas: boolean | null;
  PermisoRentas: boolean | null;
  rfcs?: ClienteRFC[];
}

export interface ClienteRFC {
  IdClienteRFC: number;
  RazonSocial: string | null;
  RFC: string | null;
  Domicilio: string | null;
  RFCDefault: boolean | null;
}

export interface Articulo {
  IdArticulo: number;
  Codigo: string | null;
  Descripcion: string | null;
  PrecioDeVenta: number | null;
  IVA: number | null;
  IdTipoMoneda: number | null;
  Moneda?: string | null;
  TarifaPorHora: number | null;
  TarifaMedioDia: number | null;
  TarifaDiaria: number | null;
  TarifaSemanal: number | null;
  TarifaMensual: number | null;
  TarifaSemestral: number | null;
  Observaciones?: string | null;
  Recomendaciones?: string | null;
}

export interface CotizacionResumen {
  IdCotizacion: number;
  Folio: string;
  Tipo: TipoCotizacion;
  Estatus: EstatusCotizacion;
  FechaHora: string;
  FechaVigencia: string;
  SubTotal: number;
  IVA: number;
  Descuento: number;
  Total: number;
  Cliente: string | null;
  Usuario: string | null;
  Moneda: string | null;
}

export interface CotizacionDetalleLinea {
  IdCotizacionDetalle: number;
  IdArticulo: number;
  Codigo: string | null;
  Descripcion: string;
  TipoTarifa: TipoTarifa | null;
  PrecioUnitario: number;
  Cantidad: number;
  IVA: number;
  Importe: number;
}

export interface CotizacionCompleta extends CotizacionResumen {
  Notas: string | null;
  IdCliente: number;
  ClienteTelefono: string | null;
  ClienteContacto: string | null;
  IdSucursal: number;
  Sucursal: string | null;
  SucursalDomicilio: string | null;
  IdUsuario: number;
  IdTipoMoneda: number;
  TipoDeCambioAPesos: number | null;
  detalles: CotizacionDetalleLinea[];
}

export interface NuevaLinea {
  IdArticulo: number;
  Codigo: string | null;
  Descripcion: string;
  TipoTarifa: TipoTarifa | null;
  PrecioUnitario: number;
  Cantidad: number;
  IVA: number;
}

export interface NuevaCotizacion {
  Tipo: TipoCotizacion;
  IdCliente: number;
  IdSucursal: number;
  IdTipoMoneda: number;
  Descuento: number;
  Notas: string | null;
  detalles: Array<Omit<NuevaLinea, 'Codigo'>>;
}

export interface DashboardData {
  resumen: {
    Total: number;
    Pendientes: number;
    Aprobadas: number;
    Rechazadas: number;
    Vencidas: number;
    TipoRenta: number;
    TipoVenta: number;
    TotalCotizado: number;
    TotalAprobado: number;
  };
  porMes: Array<{ Mes: string; Total: number; Monto: number }>;
}

export const ETIQUETA_ESTATUS: Record<EstatusCotizacion, string> = {
  P: 'Pendiente', A: 'Aprobada', R: 'Rechazada', V: 'Vencida',
};

export const ETIQUETA_TARIFA: Record<TipoTarifa, string> = {
  H: 'Por hora', D: 'Diaria', S: 'Semanal', M: 'Mensual', E: 'Semestral',
};

export type Rol = 'ADMIN' | 'VENDEDOR' | 'CONSULTA';
export type TipoCotizacion = 'RENTA' | 'VENTA';
export type EstatusCotizacion = 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'RECHAZADA' | 'VENCIDA';

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

export interface Cliente {
  IdCliente: number; RazonSocial: string; NombreComercial: string | null; RFC: string | null;
  Contacto: string | null; Telefono: string | null; Email: string | null; Direccion: string | null;
  Restriccion: 'NINGUNA' | 'ADVERTENCIA' | 'BLOQUEO'; MotivoRestriccion: string | null; Activo: boolean;
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
  Cantidad: number; UnidadCobro: string | null; NumeroPeriodos: number; Importe: number;
}

export interface CotizacionResumen {
  IdCotizacion: number; Folio: string; Tipo: TipoCotizacion; Estatus: EstatusCotizacion;
  Fecha: string; VigenciaDias: number; Moneda: string;
  Subtotal: number; DescuentoMonto: number; IVA: number; Total: number;
  Cliente: string; Usuario: string; Sucursal: string;
}

export interface CotizacionCompleta extends CotizacionResumen {
  IdCliente: number; IdSucursal: number; IdUsuario: number;
  TipoCambio: number | null; TiempoEntrega: string | null; Garantia: string | null;
  CondicionesEntrega: string | null; CondicionPago: 'CONTADO' | 'CREDITO'; DiasCredito: number | null;
  AnticipoPorcentaje: number | null; AnticipoMonto: number | null; FormaLiquidacionSaldo: string | null;
  DescuentoPorcentaje: number;
  ClienteComercial: string | null; ClienteRFC: string | null; ClienteContacto: string | null;
  ClienteTelefono: string | null; ClienteEmail: string | null; ClienteDireccion: string | null;
  SucursalDireccion: string | null;
  renglones: Renglon[];
  notas: Array<{ IdCotizacionNota: number; Categoria: string; Texto: string; Orden: number }>;
}

export interface DashboardData {
  resumen: {
    Total: number; Borradores: number; Enviadas: number; Aprobadas: number; Rechazadas: number;
    TipoRenta: number; TipoVenta: number; TotalCotizado: number; TotalAprobado: number;
  };
  porMes: Array<{ Mes: string; Total: number; Monto: number }>;
}

export const ETIQUETA_ESTATUS: Record<EstatusCotizacion, string> = {
  BORRADOR: 'Borrador', ENVIADA: 'Enviada', APROBADA: 'Aprobada', RECHAZADA: 'Rechazada', VENCIDA: 'Vencida',
};
export const ETIQUETA_UNIDAD: Record<string, string> = {
  DIA: 'día(s)', MES: 'mes(es)', EVENTO: 'evento', SECCION: 'sección', PIEZA: 'pieza', HORA: 'hora',
};

import type { RecursoConfig } from '../components/AdminCRUD';
import { moneda } from '../components/ui/UI';

const restriccionChip = (v: unknown) => {
  const val = v as string;
  if (!val || val === 'NINGUNA') return <span className="texto-suave">—</span>;
  return <span className={`chip ${val === 'BLOQUEO' ? 'bad' : 'warn'}`}>{val === 'BLOQUEO' ? 'Bloqueado' : 'Advertencia'}</span>;
};
const precioCol = (v: unknown) => <span className="num">{moneda(v as number)}</span>;
const boolChip = (etq: string) => (v: unknown) => v ? <span className="chip warn">{etq}</span> : <span className="texto-suave">—</span>;

export const CFG_CLIENTES: RecursoConfig = {
  titulo: 'Clientes', nombreSingular: 'Cliente', ruta: 'clientes', idClave: 'IdCliente',
  buscar: true, textoEliminar: 'desactivar',
  campos: [
    { clave: 'RazonSocial', etiqueta: 'Razón social', tipo: 'texto', requerido: true, ancho: 'completo' },
    { clave: 'NombreComercial', etiqueta: 'Nombre comercial', tipo: 'texto' },
    { clave: 'RFC', etiqueta: 'RFC', tipo: 'texto' },
    { clave: 'Contacto', etiqueta: 'Contacto', tipo: 'texto' },
    { clave: 'Telefono', etiqueta: 'Teléfono', tipo: 'texto' },
    { clave: 'Email', etiqueta: 'Email', tipo: 'texto', soloForm: true },
    { clave: 'Direccion', etiqueta: 'Dirección', tipo: 'textarea', ancho: 'completo', soloForm: true },
    {
      clave: 'Restriccion', etiqueta: 'Restricción', tipo: 'select', formato: restriccionChip,
      opciones: [
        { valor: 'NINGUNA', etiqueta: 'Ninguna' },
        { valor: 'ADVERTENCIA', etiqueta: 'Advertencia (lista negra)' },
        { valor: 'BLOQUEO', etiqueta: 'Bloqueo (no cotizar)' },
      ],
    },
    { clave: 'MotivoRestriccion', etiqueta: 'Motivo de la restricción', tipo: 'textarea', ancho: 'completo', soloForm: true,
      ayuda: 'Por qué está en lista negra: adeudo, daño no repuesto, etc.' },
  ],
};

export const CFG_ART_RENTA: RecursoConfig = {
  titulo: 'Artículos de Renta', nombreSingular: 'Artículo', ruta: 'articulos-renta', idClave: 'IdArticuloRenta',
  buscar: true, textoEliminar: 'desactivar',
  campos: [
    { clave: 'Codigo', etiqueta: 'Código', tipo: 'texto', requerido: true },
    { clave: 'Descripcion', etiqueta: 'Descripción', tipo: 'texto', requerido: true, ancho: 'completo' },
    { clave: 'Categoria', etiqueta: 'Categoría', tipo: 'select', requerido: true,
      opciones: [{ valor: 'ANDAMIOS', etiqueta: 'Andamios' }, { valor: 'EQUIPO', etiqueta: 'Equipo' }] },
    { clave: 'UnidadCobro', etiqueta: 'Unidad de cobro', tipo: 'select', requerido: true,
      opciones: [{ valor: 'DIA', etiqueta: 'Por día' }, { valor: 'MES', etiqueta: 'Por mes' }] },
    { clave: 'Precio', etiqueta: 'Precio', tipo: 'numero', requerido: true, formato: precioCol },
    { clave: 'DepositoGarantia', etiqueta: 'Depósito de garantía', tipo: 'numero', soloForm: true },
    { clave: 'SeControlaPorSerie', etiqueta: 'Se controla por número de serie', tipo: 'checkbox', soloTabla: false,
      formato: boolChip('Serie'), ancho: 'completo' },
    { clave: 'Estatus', etiqueta: 'Estatus', tipo: 'texto', soloTabla: true },
    { clave: 'GrupoMayoreo', etiqueta: 'Grupo mayoreo', tipo: 'select', soloForm: true,
      opciones: [{ valor: 'ANDAMIOS', etiqueta: 'Andamios' }, { valor: 'VALLAS', etiqueta: 'Vallas' }],
      ayuda: 'Solo si aplica precio de mayoreo' },
    { clave: 'PrecioMayoreo', etiqueta: 'Precio de mayoreo', tipo: 'numero', soloForm: true,
      ayuda: 'Debe ser menor al precio normal' },
    { clave: 'Observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'completo', soloForm: true },
  ],
};

export const CFG_ART_VENTA: RecursoConfig = {
  titulo: 'Artículos de Venta', nombreSingular: 'Artículo', ruta: 'articulos-venta', idClave: 'IdArticuloVenta',
  buscar: true, textoEliminar: 'desactivar',
  campos: [
    { clave: 'Codigo', etiqueta: 'Código', tipo: 'texto', requerido: true },
    { clave: 'Descripcion', etiqueta: 'Descripción', tipo: 'texto', requerido: true, ancho: 'completo' },
    { clave: 'Marca', etiqueta: 'Marca', tipo: 'texto' },
    { clave: 'Precio', etiqueta: 'Precio', tipo: 'numero', requerido: true, formato: precioCol },
    { clave: 'EsUsado', etiqueta: 'Es equipo usado', tipo: 'checkbox', formato: boolChip('Usado') },
    { clave: 'Estatus', etiqueta: 'Estatus', tipo: 'select',
      opciones: [
        { valor: 'DISPONIBLE', etiqueta: 'Disponible (en piso)' },
        { valor: 'SOBRE_PEDIDO', etiqueta: 'Sobre pedido' },
      ] },
    { clave: 'Observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'completo', soloForm: true },
  ],
};

export const CFG_SERVICIOS: RecursoConfig = {
  titulo: 'Servicios', nombreSingular: 'Servicio', ruta: 'servicios', idClave: 'IdServicio',
  buscar: true, textoEliminar: 'desactivar',
  campos: [
    { clave: 'Codigo', etiqueta: 'Código', tipo: 'texto', requerido: true },
    { clave: 'Descripcion', etiqueta: 'Descripción', tipo: 'texto', requerido: true, ancho: 'completo' },
    { clave: 'Tipo', etiqueta: 'Tipo', tipo: 'select', requerido: true,
      opciones: [
        { valor: 'MANIOBRA', etiqueta: 'Maniobra' }, { valor: 'FLETE', etiqueta: 'Flete' },
        { valor: 'INSTALACION', etiqueta: 'Instalación' }, { valor: 'OPERADOR', etiqueta: 'Operador' },
        { valor: 'OTRO', etiqueta: 'Otro' },
      ] },
    { clave: 'Precio', etiqueta: 'Precio', tipo: 'numero', requerido: true, formato: precioCol },
    { clave: 'UnidadCobro', etiqueta: 'Unidad de cobro', tipo: 'select', requerido: true,
      opciones: [
        { valor: 'EVENTO', etiqueta: 'Por evento' }, { valor: 'DIA', etiqueta: 'Por día' },
        { valor: 'SECCION', etiqueta: 'Por sección' }, { valor: 'PIEZA', etiqueta: 'Por pieza' },
      ] },
    { clave: 'Observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'completo', soloForm: true },
  ],
};

export const CFG_UNIDADES: RecursoConfig = {
  titulo: 'Unidades (inventario serializado)', nombreSingular: 'Unidad', ruta: 'unidades', idClave: 'IdUnidad',
  buscar: true, textoEliminar: 'desactivar',
  campos: [
    { clave: 'NumeroEconomico', etiqueta: 'Número económico', tipo: 'texto', requerido: true },
    { clave: 'Articulo', etiqueta: 'Artículo', tipo: 'texto', soloTabla: true },
    { clave: 'IdArticuloRenta', etiqueta: 'Artículo de renta', tipo: 'recurso', requerido: true, soloForm: true,
      recurso: 'articulos-renta', recursoValor: 'IdArticuloRenta', recursoEtiqueta: ['Codigo', 'Descripcion'], ancho: 'completo' },
    { clave: 'NumeroSerie', etiqueta: 'Número de serie', tipo: 'texto' },
    { clave: 'Marca', etiqueta: 'Marca', tipo: 'texto' },
    { clave: 'Modelo', etiqueta: 'Modelo', tipo: 'texto', soloForm: true },
    { clave: 'Anio', etiqueta: 'Año', tipo: 'numero', soloForm: true },
    { clave: 'Sucursal', etiqueta: 'Sucursal', tipo: 'texto', soloTabla: true },
    { clave: 'IdSucursal', etiqueta: 'Sucursal', tipo: 'recurso', requerido: true, soloForm: true,
      recurso: 'admin/sucursales', recursoValor: 'IdSucursal', recursoEtiqueta: ['Nombre'] },
    { clave: 'Estatus', etiqueta: 'Estatus', tipo: 'select',
      opciones: [
        { valor: 'BODEGA', etiqueta: 'En bodega' }, { valor: 'RENTADO', etiqueta: 'Rentado' },
        { valor: 'TALLER', etiqueta: 'En taller' }, { valor: 'VENDIDO', etiqueta: 'Vendido' },
      ] },
  ],
};

export const CFG_USUARIOS: RecursoConfig = {
  titulo: 'Usuarios', nombreSingular: 'Usuario', ruta: 'admin/usuarios', idClave: 'IdUsuario',
  soloAdmin: true, textoEliminar: 'desactivar',
  campos: [
    { clave: 'Nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
    { clave: 'Email', etiqueta: 'Email', tipo: 'texto', requerido: true },
    { clave: 'Rol', etiqueta: 'Rol', tipo: 'select', requerido: true,
      opciones: [
        { valor: 'ADMIN', etiqueta: 'Administrador' }, { valor: 'VENDEDOR', etiqueta: 'Vendedor' },
        { valor: 'CONSULTA', etiqueta: 'Consulta (solo lectura)' },
      ] },
    { clave: 'Sucursal', etiqueta: 'Sucursal', tipo: 'texto', soloTabla: true },
    { clave: 'IdSucursal', etiqueta: 'Sucursal', tipo: 'recurso', soloForm: true,
      recurso: 'admin/sucursales', recursoValor: 'IdSucursal', recursoEtiqueta: ['Nombre'] },
    { clave: 'password', etiqueta: 'Contraseña', tipo: 'texto', soloForm: true,
      ayuda: 'Al editar, déjalo vacío para no cambiarla. Mínimo 6 caracteres.', ancho: 'completo' },
    { clave: 'Activo', etiqueta: 'Activo', tipo: 'checkbox' },
  ],
};

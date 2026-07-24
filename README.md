# Cotizaciones · Frontend — Mercado de Andamios

SPA en React + TypeScript + Vite. Paleta negro/amarillo de construcción,
PDF vectorial con logo incrustado.

---

## 1. Instalación

```bash
cd cotizaciones-frontend
npm install
cp .env.example .env    # ajusta VITE_API_URL si el backend no está en :3000
npm run dev             # http://localhost:5173
```

El backend debe estar corriendo antes de entrar.

```bash
npm run build     # compila a dist/
npm run preview   # sirve el build para revisarlo
```

Para publicarlo, sube el contenido de `dist/` a cualquier hosting estático
(Hostinger, Nginx, IIS). Al ser una SPA, configura el servidor para que todas
las rutas devuelvan `index.html`.

---

## 2. Acceso

| | |
|---|---|
| Usuario | `admin@mercadoandamios.com` |
| Contraseña | `Admin2026!` |
| PIN de supervisor | `2468` |

Cámbialos desde **Configuración** al entrar.

---

## 3. Estructura

```
src/
├── api/         cliente axios + módulos por recurso
├── components/  Layout, AdminCRUD genérico, Campo, primitivas de UI
├── config/      configuración declarativa de cada CRUD
├── context/     sesión y permisos
├── pages/       una por pantalla
├── pdf/         documento @react-pdf, visor y descarga
├── types/       tipos del dominio (espejo del esquema SQL)
└── index.css    sistema de diseño (variables + clases)
```

### El CRUD es declarativo

Las pantallas de clientes, artículos, servicios, unidades y usuarios **no tienen
código propio**: son el mismo componente `AdminCRUD` alimentado por una config
en `src/config/recursos.tsx`. Agregar una tabla nueva a la UI es escribir un
objeto con sus campos y una ruta en `App.tsx`, no una pantalla entera.

Existencias y sucursales sí tienen página propia, porque no siguen el patrón
CRUD estándar: existencias es un *upsert* por (artículo, sucursal) y sucursales
lleva un editor anidado de teléfonos.

---

## 4. Pantallas

| Ruta | Qué hace | Quién entra |
|---|---|---|
| `/` | Dashboard con KPIs y gráfica mensual | Todos |
| `/cotizaciones` | Lista con filtros por folio, tipo y estatus | Todos |
| `/cotizaciones/nueva` | Asistente de captura | ADMIN, VENDEDOR |
| `/cotizaciones/:id` | Documento, vista previa PDF, cambio de estatus | Todos |
| `/clientes` | CRUD de clientes con lista negra | Todos (editar: ADMIN/VENDEDOR) |
| `/articulos-renta` `/articulos-venta` `/servicios` | CRUD de catálogos | Todos (editar: ADMIN/VENDEDOR) |
| `/unidades` | Equipo con número de serie | Todos (editar: ADMIN/VENDEDOR) |
| `/existencias` | Inventario a granel por sucursal | Todos (editar: ADMIN/VENDEDOR) |
| `/usuarios` `/sucursales` `/configuracion` | Administración | Solo ADMIN |

---

## 5. El PDF

Se genera **en el navegador** con `@react-pdf/renderer`: es vectorial, el texto
se puede seleccionar y copiar, y pesa poco. El logo va incrustado como base64
(`src/pdf/logoBase64.ts`), así que el PDF no depende de que el servidor esté
disponible para verse completo.

El motor de PDF pesa ~490 KB comprimido, así que **se carga bajo demanda**:
`descargar.tsx` y `VisorPDF.tsx` lo importan dinámicamente. El bundle inicial de
la app no lo incluye — solo se descarga cuando abres una cotización.

El encabezado se arma con las sucursales activas y sus teléfonos traídos de
`/meta/sucursales`: si agregas un teléfono en Administración, aparece en el
siguiente PDF sin tocar código.

---

## 6. Notas de la interfaz

- **Descuento con PIN**: al pasar del umbral (15% por defecto), el asistente
  pide el PIN de supervisor. Es una comodidad de UI; **quien realmente valida es
  el backend**.
- **Renta vs. venta**: al elegir RENTA aparece la columna de periodos (días o
  meses según la unidad de cobro del artículo) y el importe se calcula con
  `cantidad × periodos × precio`. En VENTA se ocultan periodos y se habilitan
  anticipo y forma de liquidación del saldo.
- **Clientes restringidos**: si el cliente trae bandera de lista negra, el
  asistente lo muestra en rojo. `BLOQUEO` impide continuar; `ADVERTENCIA` solo
  avisa.
- **Valores por defecto**: tiempo de entrega, garantía, condiciones de entrega,
  moneda y condiciones de pago se precargan desde el catálogo de notas
  (`EsDefault = 1` en la base). Para cambiar lo que trae precargado una
  cotización nueva, edita esa bandera en `dbo.notaCotizacion` — no el código.

# cotizaciones-frontend

Frontend del sistema de cotizaciones — React + TypeScript + Vite.
Branding de Mercado de Andamios (renta y venta de maquinaria, La Laguna).

---

## Requisitos
- Node.js v18 o superior
- El **backend** corriendo en `http://localhost:3000` (proyecto `cotizaciones-backend`)

## Configuración
```bash
npm install
```
El `.env` ya viene listo:
```env
VITE_API_URL=http://localhost:3000/api
```

## Ejecución
```bash
npm run dev       # http://localhost:5173 (abre solo)
npm run build     # compila a /dist
npm run preview   # sirve el build
```

## Correr frontend + backend juntos
```bash
# Terminal 1
cd cotizaciones-backend && npm install && npm run dev

# Terminal 2
cd cotizaciones-frontend && npm install && npm run dev
```
Inicia sesión con un usuario de la tabla `Usuario` (campo `Clave` + `Password`).

---

## Exportar cotización a PDF

En el detalle de una cotización hay dos botones:

- **Vista previa PDF** — abre el documento embebido en la página (visor real).
- **Descargar PDF** — genera el archivo `Cotizacion-COT-XXXX.pdf` y lo descarga,
  listo para enviar al cliente.

El PDF se genera con `@react-pdf/renderer`: es **vectorial**, con texto nítido y
seleccionable (no una captura de pantalla). El diseño está en
`src/pdf/CotizacionPDF.tsx`.

### Rendimiento
La librería `@react-pdf` es pesada, así que se carga **de forma diferida**:
el bundle inicial es ~190 KB gzip y el motor de PDF (~490 KB gzip) solo se
descarga cuando el usuario genera o previsualiza un PDF por primera vez.

### Logo en el PDF
El membrete del PDF es **vectorial** (wordmark + cinta de precaución) para evitar
fallos de CORS con imágenes remotas. Si quieres el logo real en el PDF:
1. Convierte el PNG del logo a base64 (p. ej. base64-image.de).
2. En `src/pdf/CotizacionPDF.tsx`, descomenta el bloque `<Image>` marcado y pega
   el data URL.

En pantalla (login, sidebar, detalle) sí se usa el logo real desde su URL.

---

## Pantallas

| Ruta                  | Descripción                                                 |
|-----------------------|-------------------------------------------------------------|
| `/login`              | Acceso con panel de marca (pantalla dividida)               |
| `/`                   | Dashboard: KPIs, actividad por mes, reparto por estatus     |
| `/cotizaciones`       | Listado con filtros (folio, estatus, tipo) y paginación     |
| `/cotizaciones/nueva` | Wizard: buscador de cliente y artículos, totales en vivo    |
| `/cotizaciones/:id`   | Detalle + vista previa PDF + descarga + aprobar/rechazar    |
| `/clientes`           | Catálogo de clientes con búsqueda                           |
| `/articulos`          | Catálogo de equipo con tarifas                              |

---

## Diseño

- **Paleta de construcción** en `src/index.css`. Para ajustar el naranja de marca
  cambia una línea: `--acento`.
- **Tipografía:** `Archivo` (industrial) para títulos/cifras, `Inter` para texto.
- **Firma visual:** cinta de precaución (`.hazard-strip`) en login, sidebar,
  documento y PDF.

---

## Estructura
```
src/
├── api/            cliente axios + servicios por recurso
├── components/     Layout, ProtectedRoute, ui (badges, spinner, toast)
├── context/        AuthContext (sesión JWT)
├── pages/          una página por pantalla
├── pdf/            CotizacionPDF (documento), VisorPDF (visor lazy), descargar
├── types/          interfaces compartidas
└── index.css       sistema de diseño (tokens de marca)
```

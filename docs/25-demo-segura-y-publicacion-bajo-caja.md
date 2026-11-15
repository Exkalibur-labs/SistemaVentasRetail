# 25. Demo segura y publicación bajo `/caja`

- **Fecha:** 14 de noviembre de 2026
- **Rama:** `fix/demo-segura-ruta-caja`
- **Objetivo:** poder mostrar el sistema a clientes en `exkalibur.mx/caja` sin acceso público de respaldo, sin datos inventados y con la facturación declarada como simulada.

## 1. Qué cambió

**Seguridad y honestidad de datos**
- Se eliminó el acceso de demostración sin base de datos (usuario y contraseña fijos, token de sesión constante y contexto de dueño fijo) en `auth/service.ts`, `auth/session.ts` y `authz/resolve.ts`.
- Se retiraron los `catch` que devolvían datos de ejemplo o confirmaban acciones no guardadas (catálogo POS, cajas, cobro, apertura y cierre de turno, ajustes de inventario, pantallas de inicio, ventas, reportes, compras, configuración).
- El POS, sin copia local ni servidor, muestra «No se pudo cargar el catálogo» con botón Reintentar en lugar de un catálogo de relleno.
- Se eliminó `scripts/create-prospect-user.ts` y se retiraron la contraseña y el token publicados en `docs/`.

**Facturación**
- La emisión ahora lee la venta real, genera el folio dentro de una transacción y deja bitácora.
- UUID, sello, certificado, QR y XML llevan la marca **SIMULADO** y la pantalla muestra un aviso permanente de que no tiene validez fiscal.
- Nueva migración `0007_fase5b_facturacion_simulada` con la tabla `invoices`, que faltaba en las migraciones.

**Publicación bajo un subdirectorio**
- `NEXT_PUBLIC_BASE_PATH=/caja` (variable de compilación) activa `basePath` en Next.js.
- Todas las llamadas `fetch` y descargas usan `withBase()` (`src/lib/base-path.ts`).
- El service worker deduce el prefijo de su alcance de registro; el manifest, los iconos y `offline.html` también lo respetan.
- Las cookies de sesión y dispositivo usan `Path=/caja`, para que no viajen al resto de `exkalibur.mx`.
- La verificación de origen de la API acepta el host reenviado (`x-forwarded-host`) y el de `APP_PUBLIC_ORIGIN`; un origen ajeno sigue recibiendo 403.

## 2. Variables de entorno de la demo

| Variable | Valor / uso |
| --- | --- |
| `DATABASE_URL` | Pooler de la base de la demo (`?pgbouncer=true` en Supabase). |
| `DIRECT_DATABASE_URL` | Conexión directa para migraciones. |
| `DATABASE_SSL` | `true` en Supabase. |
| `NEXT_PUBLIC_BASE_PATH` | `/caja`. Se define **antes** de compilar. |
| `APP_PUBLIC_ORIGIN` | `https://exkalibur.mx`. |
| `SERVER_ACTIONS_ALLOWED_ORIGINS` | `exkalibur.mx` (hosts separados por coma). |
| `SEED_*_PASSWORD` | Contraseñas privadas de los usuarios sembrados. |

## 3. Cómo enlazar desde `exkalibur.mx`

El sitio `exkalibur-consulting` reescribe `/caja` hacia el proyecto de la caja (el POS se publica como proyecto aparte):

```ts
// next.config.ts del sitio exkalibur-consulting
async rewrites() {
  const caja = process.env.CAJA_ORIGIN; // p. ej. https://<proyecto-caja>.vercel.app
  if (!caja) return [];
  return [
    { source: "/caja", destination: `${caja}/caja` },
    { source: "/caja/:path*", destination: `${caja}/caja/:path*` },
  ];
}
```

## 4. Verificación realizada

- `tsc`, `eslint` y las 105 pruebas de Vitest contra Postgres 16 local: sin errores.
- `next build` con `NEXT_PUBLIC_BASE_PATH=/caja`: compila.
- En Chrome real, con el servidor bajo `/caja`: login con cookie `Path=/caja`, apertura de caja, venta en línea, venta sin conexión recargando la página desde el service worker y sincronización posterior contra `/caja/api/v1/sync`, exportación de reporte, y verificación de origen (403 para origen ajeno, aceptado con `x-forwarded-host` correcto).
- Fuera del prefijo (`/login`, `/pos`, `/sw.js`) la app responde 404, como se espera.

## 5. Pendientes y límites

- No se probó contra Supabase ni detrás del rewrite real de Vercel; hay que repetir `/caja/api/health`, login y una venta ya desplegado.
- Los módulos Clientes, Promociones, Empresas, Sucursales, Usuarios, Roles y Bitácora siguen marcados «Próximamente» en el menú aunque sus pantallas existen. Es una decisión de producto: habilitarlos o no para la demo.
- El timbrado real exige conectar un PAC autorizado por el SAT (adaptador pendiente).
- El historial de Git conserva la contraseña y el token anteriores: si algún entorno los aceptó, ese despliegue debe actualizarse o retirarse, y conviene considerarlos comprometidos.
- La demo necesita un procedimiento para restablecer datos entre presentaciones (`npm run db:reset` solo contra su propia base).

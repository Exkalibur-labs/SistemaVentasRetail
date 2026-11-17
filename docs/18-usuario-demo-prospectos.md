# 18. Demo para clientes potenciales y prospectos

- **Estado:** reemplaza la versión del 9 de noviembre de 2026 (usuario `demo_retail` con contraseña publicada y acceso de respaldo sin base de datos). Esa versión se retiró: ver `docs/25-demo-segura-y-publicacion-bajo-caja.md`.

## 1. Objetivo

Tener un entorno para mostrar el sistema a prospectos de abarrotes, tiendas de conveniencia y retail, sin exponer datos reales ni credenciales públicas.

## 2. Cómo se arma la demo

1. **Base de datos propia de la demo** (Supabase u otro Postgres), separada de cualquier entorno con datos reales.
2. **Migraciones y semillas** con `npm run db:migrate` y `npm run db:seed`. Las semillas crean la empresa demo, catálogo, existencias, proveedores, clientes y promociones de ejemplo.
3. **Contraseñas privadas:** define `SEED_SUPERADMIN_PASSWORD`, `SEED_OWNER_PASSWORD`, `SEED_MANAGER_PASSWORD` y `SEED_CASHIER_PASSWORD` en el entorno antes de sembrar. No se escriben en el repositorio, en documentos ni en capturas. Las contraseñas del README son solo para desarrollo local.
4. **Usuarios de la demo:** `dueno` (acceso a todo el negocio), `gerente` y `cajero` (Sucursal Centro). Se comparten con cada prospecto por un canal privado y se rotan cuando termina la presentación.
5. **Restablecer datos:** `npm run db:reset` vacía y vuelve a sembrar. Ejecútalo solo contra la base de la demo, nunca contra una base con datos reales.

## 3. Qué se puede mostrar

Punto de venta con lector de códigos y ticket, caja con cortes X y Z, venta sin internet con sincronización, catálogo con variantes y granel, inventario y escáner, compras y cuentas por pagar, clientes y crédito, devoluciones, promociones, reportes con exportación a CSV, Excel y PDF.

**Facturación:** es una simulación. Genera un comprobante de práctica con XML y QR marcados como SIMULADO; no se envía a un PAC ni al SAT y no tiene validez fiscal. Debe presentarse así a los prospectos.

## 4. Qué ya no existe

- No hay usuario ni contraseña fijos en el código.
- No hay token de sesión constante ni contexto de dueño sin base de datos: si la base no responde, el login falla y se ve el error.
- Se eliminó `scripts/create-prospect-user.ts`.

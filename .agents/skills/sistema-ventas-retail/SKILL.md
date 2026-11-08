---
name: sistema-ventas-retail
description: Arquitectura técnica, capacidades de punto de venta (POS) y caja para retail y abarrotes, libro de inventario inmutable, ventas offline (PWA) y guía de despliegue en Vercel.
---

# Sistema de Caja / SistemaVentasRetail — Technical & Architecture Skill

Esta skill documenta la arquitectura técnica, modelo de datos, flujos de caja y venta, capacidades para el giro de **abarrotes y retail general**, y el procedimiento de despliegue en la nube (**Vercel + PostgreSQL / Supabase**) del sistema **`SistemaVentasRetail`**.

---

## 1. Visión del Producto y Dominio Retail / Abarrotes

`SistemaVentasRetail` es una plataforma **SaaS multiempresa** de gestión comercial para negocios retail (abarrotes, tiendas de conveniencia, farmacias, ferreterías, ropa y comercios especializados), optimizada para **cobrar rápido**, operar **sin conexión a internet (PWA)** y mantener una trazabilidad inmutable de inventario y caja.

### Capacidades Nativas para Abarrotes y Retail
El sistema fue diseñado desde su fase 1 considerando al giro de abarrotes como modelo de referencia:

1. **Venta a granel / Báscula (`numeric(18,3)`):**
   - El modelo de datos (`catalog.ts`) y el formateador monetario (`money.ts`) soportan hasta 3 decimales, lo que habilita la venta fraccionada por peso (ej. `0.250 kg` de jamón, `1.500 kg` de frijol o azúcar).
2. **Escaneo de códigos de barras y cobro veloz:**
   - Variantes con múltiples códigos de barras estándar (EAN-13, UPC).
   - Atajos de teclado en el punto de venta (`F2` búsqueda, `F4` cobrar, `F8` ticket) y botones rápidos táctiles para procesar el cobro en menos de 5 segundos.
3. **Control de Caja y Turnos (Arqueo / Cortes X y Z):**
   - Apertura de turno con fondo fijo de caja.
   - Retiros parciales (sangrías) y depósitos de efectivo con autorización y bitácora.
   - **Corte X** parcial en tiempo real y **Corte Z** al cierre con conteo ciego por denominaciones de billetes y monedas (`MXN_DENOMINATIONS`), calculando sobrantes o faltantes.
4. **Resiliencia Offline (PWA con IndexedDB):**
   - Service Worker que permite abrir `/pos` y cobrar en efectivo ante caídas de red o cortes de energía eléctrica.
   - Cola de sincronización local que envía las ventas al reanudar la red de forma idempotente (evita duplicidad de transacciones e inconsistencias en existencias).
5. **Venta a Crédito ("Fiado") y Abonos en Caja:**
   - Límites de crédito por cliente y autorización para saldo deudor.
   - Cobro de abonos directamente en el módulo de caja, sumándose al efectivo del turno.
6. **Promociones y Precios de Mayoreo:**
   - Descuentos por volumen, 3x2, combos y listas de precios diferenciadas (mayoreo vs. menudeo).
7. **Compras y Reorden de Proveedores:**
   - Registro de órdenes y recepciones para proveedores habituales de abarrotes con flete prorrateado al costo promedio y cálculo de sugerencias de compra por punto de reorden.
8. **Impresión de Tickets:**
   - Formato optimizado para impresoras térmicas de 80 mm.

---

## 2. Stack Tecnológico y Arquitectura

* **Framework:** Next.js 15 (App Router, Server Actions)
* **Frontend:** React 19, Tailwind CSS 4, Lucide React
* **ORM & Base de Datos:** PostgreSQL 16/17 con Drizzle ORM y triggers inmutables
* **Validación & Tipado:** TypeScript 5, Zod
* **Offline POS:** Service Workers, IndexedDB (`idb`)
* **Testing:** Vitest (unitarias e integración), Playwright (E2E)

### Jerarquía Multi-Tenant
```
Tenant (Cuenta SaaS)
  └── Company (Razón Social / Empresa)
        └── Branch (Sucursal física)
              ├── Warehouse (Almacén de inventario)
              │     └── Location (Ubicaciones)
              └── Register (Caja / Punto de cobro)
```

---

## 3. Despliegue en Vercel & Supabase

### Proyecto en Vercel
* **Proyecto:** `sistema-ventas-retail`
* **Scope / Equipo:** `joseom07-3483s-projects`
* **URL de Producción (Canónica):** `https://sistema-ventas-retail-exkalibur.vercel.app`
* **URL de Equipo:** `https://sistema-ventas-retail-joseom07-3483s-projects.vercel.app`
* **URL de Inspección:** `https://vercel.com/joseom07-3483s-projects/sistema-ventas-retail`
* **Autenticación CLI:** Administrado mediante variable de entorno `VERCEL_TOKEN` (definida en el workspace corporativo).

### Variables de Entorno Requeridas
```bash
# Conexión Supabase (Transaction Pooler puerto 6543 para Serverless)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"

# Conexión directa (puerto 5432 para migraciones Drizzle)
DIRECT_DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Configuración SSL y pools
DATABASE_SSL="true"
DATABASE_POOL_MAX="10"

# Duración de sesiones
SESSION_IDLE_HOURS="12"
SESSION_MAX_DAYS="30"

# Proveedores de adaptadores
PAYMENTS_PROVIDER="sandbox"
INVOICING_PROVIDER="sandbox"
MESSAGING_PROVIDER="sandbox"
```

### Comandos de Despliegue
```bash
# Enlace con Vercel
npx vercel link --project sistema-ventas-retail --scope joseom07-3483s-projects --yes

# Despliegue a Preview
npx vercel deploy --scope joseom07-3483s-projects

# Despliegue a Producción
npx vercel deploy --prod --scope joseom07-3483s-projects
```

---

## 4. Reglas de Operación y Desarrollo

1. **Inmutabilidad de Inventario:**
   - La tabla `inventory_ledger` no admite updates ni deletes. Toda corrección se realiza mediante un movimiento compensatorio con motivo registrado.
2. **Corte Z Cuadrado:**
   - Solo puede haber un turno activo por caja. El corte Z exige captura de denominaciones en efectivo y bloquea la caja hasta el siguiente turno de apertura.
3. **Ventas Offline Seguras:**
   - Las ventas en modo offline solo admiten cobro en efectivo. Al regresar la conexión, el service worker empuja las transacciones mediante `/api/v1/sync` validando la idempotencia por `client_sale_id` (UUID v7).
4. **Zero-Hardcoding:**
   - Nunca quemar IDs de tenants, roles o credenciales en el código fuente. Toda configuración regional y tributaria reside en base de datos.

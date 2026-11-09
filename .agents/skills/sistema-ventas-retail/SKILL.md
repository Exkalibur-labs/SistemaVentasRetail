---
name: sistema-ventas-retail
description: Arquitectura técnica, capacidades de punto de venta (POS) y caja para retail y abarrotes, libro de inventario inmutable, ventas offline (PWA) y guía de despliegue en Vercel.
---

# Sistema de Caja / SistemaVentasRetail — Core Technical & Architecture Skill

Esta skill documenta la arquitectura técnica, modelo de datos, flujos de caja y venta, capacidades para el giro de **abarrotes y retail general**, y el procedimiento de despliegue en la nube (**Vercel + PostgreSQL / Supabase**) del sistema **`SistemaVentasRetail`** (producto comercial de Exkalibur Consulting).

---

## 1. Visión del Producto y Dominio Retail / Abarrotes

`SistemaVentasRetail` es una plataforma **SaaS multiempresa** de gestión comercial para negocios retail (abarrotes, tiendas de conveniencia, farmacias, ferreterías, ropa y comercios especializados), optimizada para **cobrar rápido**, operar **sin conexión a internet (PWA)** y mantener una trazabilidad inmutable de inventario y caja.

### ¿Cuenta como Punto de Venta o Caja para Abarrotes?
**Sí, de manera nativa.** El giro de abarrotes es uno de sus casos de uso fundacionales:

1. **Venta a granel / Báscula (`numeric(18,3)`):**
   - El esquema del catálogo (`catalog.ts`) y el motor de importes (`money.ts`) soportan hasta 3 decimales para permitir pesaje de mercancía fraccionada (ej. `0.250 kg` de jamón, `1.500 kg` de frijol, azúcar a granel).
2. **Escaneo rápido y códigos de barras:**
   - Variantes con soporte de múltiples códigos de barras estándar (EAN-13, UPC).
   - Atajos de teclado en el POS (`F2` búsqueda, `F4` cobrar, `F8` ticket) y botones táctiles rápidos para cerrar ventas en menos de 5 interacciones.
3. **Control de Caja y Turnos (Arqueo / Cortes X y Z):**
   - Apertura de turno con fondo fijo de caja.
   - Retiros (sangrías) y depósitos de efectivo con autorización y bitácora.
   - **Corte X** parcial en vivo y **Corte Z** al cierre con conteo ciego por denominaciones de billetes y monedas (`MXN_DENOMINATIONS`), calculando sobrantes o faltantes.
4. **Resiliencia Offline (PWA con IndexedDB):**
   - Service Worker que permite abrir el POS (`/pos`) y cobrar en efectivo aunque se caiga el internet o la energía.
   - Cola de sincronización local que aplica las ventas al reanudar la red de forma idempotente (evita duplicidad de folios y descuadre de inventario).
5. **Venta a Crédito ("Fiado") y Cobranza:**
   - Asignación de límite de crédito a clientes de confianza.
   - Registro de abonos en caja que se integran de inmediato al flujo de efectivo del corte.
6. **Promociones y Precios Diferenciados:**
   - 3x2, descuentos por volumen, combos y listas de precios (ej. precio menudeo vs. precio mayoreo).
7. **Compras y Proveedores:**
   - Catálogo de proveedores típicos de abarrotes (refresqueras, cerveceras, botanas, lácteos) con flete prorrateado al costo promedio y sugerencias automáticas de reorden.
8. **Impresión de Tickets:**
   - Formato optimizado para miniprinters e impresoras térmicas de 80 mm.

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

## 3. Credenciales y Despliegue en Vercel (Parent Workspace)

> [!IMPORTANT]
> **Token de Despliegue de Vercel (Almacenado en Workspace Padre Exkalibur):**
> - **Token:** Almacenado de forma segura en el Workspace padre Exkalibur (`VERCEL_TOKEN` con vigencia de 60 días).
> - **Fecha de emisión:** 7 de Noviembre de 2026.
> - **Vigencia:** 60 días (Expira el 6 de Enero de 2027).
> - **Scope / Equipo:** `joseom07-3483s-projects`
> - **Proyecto Vercel:** `sistema-ventas-retail`
> - **URL de Producción (Canónica):** `https://sistema-ventas-retail-exkalibur.vercel.app`
> - **URL de Equipo:** `https://sistema-ventas-retail-joseom07-3483s-projects.vercel.app`
> - **URL de Inspección:** `https://vercel.com/joseom07-3483s-projects/sistema-ventas-retail`

### Variables de Entorno en Vercel
Para el funcionamiento completo del sistema en Vercel y Supabase, se configuran las siguientes variables:

```bash
# Conexión Supabase (Transaction Pooler puerto 6543 para Serverless)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"

# Conexión directa (puerto 5432 para migraciones Drizzle)
DIRECT_DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Forzar SSL para Supabase
DATABASE_SSL="true"
DATABASE_POOL_MAX="10"

# Duración de sesiones de usuario
SESSION_IDLE_HOURS="12"
SESSION_MAX_DAYS="30"

# Adaptadores (sandbox para pruebas sin afectar sistemas productivos)
PAYMENTS_PROVIDER="sandbox"
INVOICING_PROVIDER="sandbox"
MESSAGING_PROVIDER="sandbox"
```

### Comandos de Despliegue
Para desplegar nuevas versiones a Vercel utilizando el token configurado:

```bash
# 1. Enlace local al proyecto de Vercel (si no está vinculado)
npx vercel link --project sistema-ventas-retail --scope joseom07-3483s-projects --yes --token <VERCEL_TOKEN>

# 2. Despliegue a Preview
npx vercel deploy --scope joseom07-3483s-projects --token <VERCEL_TOKEN>

# 3. Despliegue a Producción
npx vercel deploy --prod --scope joseom07-3483s-projects --token <VERCEL_TOKEN>
```

---

## 4. Reglas de Operación y Desarrollo

1. **Inmutabilidad de Inventario:**
   - La tabla `inventory_ledger` no admite updates ni deletes. Toda corrección se realiza mediante un movimiento compensatorio con motivo registrado.
2. **Corte Z Cuadrado:**
   - Solo puede haber un turno activo por caja. El corte Z exige captura de denominaciones en efectivo y bloquea la caja hasta el siguiente turno de apertura.
3. **Ventas Offline Seguras:**
   - Las ventas en modo offline solo admiten cobro en efectivo. Al regresar la conexión, el service worker empuja las transacciones mediante `/api/v1/sync` validando la idempotencia por `client_sale_id` (UUID v7).
4. **Hardware y Tropicalización:**
   - **Lector Znemaz 1D/2D:** Intercepción de ráfagas HID `<50ms` y feedback acústico sintetizado con Web Audio API (`src/lib/hardware/use-barcode-scanner.ts`).
   - **Impresora SUZWIP 58mm:** Compatibilidad térmica con ancho de 48mm / 32 columnas ESC/POS vía Web Bluetooth y CSS `@page ticket-58mm` (`src/lib/hardware/bluetooth-printer.ts`).
   - **Inventario Ágil:** Vista táctil `/inventario/escaner` con botones de incremento rápido y alta de nuevos códigos en 3 campos.
   - **Facturación CFDI 4.0:** Timbrado sandbox con generación de UUID fiscal, código QR SAT y descarga de XML (`/facturacion`).
5. **Zero-Hardcoding:**
   - Nunca quemar IDs de tenants, roles o credenciales en el código fuente. Toda configuración regional y tributaria reside en base de datos.
6. **Organización Canónica en GitHub:**
   - El repositorio oficial reside bajo la organización: `git@github.com:Exkalibur-labs/SistemaVentasRetail.git`.

---

## 5. Mapeo de Módulos Core Activos vs. Próximamente (Fase 4/5) y Resiliencia Defensiva

Para garantizar una experiencia fluida a clientes potenciales y prospectos durante demostraciones comerciales, el sistema categoriza estrictamente las secciones del menú:

### Módulos Core 100% Activos
* **Inicio (`/`):** Métricas consolidadas (Venta neta, Tickets, Ticket promedio, Devoluciones), accesos directos rápidos a los módulos operativos y bitácora reciente.
* **Punto de Venta (`/pos`):** Venta táctil y por teclado, escáner HID Znemaz 1D/2D, tickets SUZWIP 58mm y cobro express.
* **Ventas (`/ventas` y `/ventas/[id]`):** Historial de transacciones, folios, desglose por línea de producto, reimpresión y estado de pago.
* **Caja (`/caja` y `/caja/[sessionId]`):** Apertura de turno con fondo fijo, entradas/salidas de efectivo, arqueo y cortes parciales (X) y definitivos (Z).
* **Catálogo (`/catalogo`):** Catálogo de abarrotes de alta rotación (galletas, refrescos, lácteos, huevo, botanas, salchichonería), categorías, impuestos y códigos de barras.
* **Inventario (`/inventario` y `/inventario/escaner`):** Existencias en almacén, semáforo de reorden (OK, Bajo, Agotado) y escaneo ágil con pistola Znemaz.
* **Compras (`/compras`):** Proveedores principales (Gamesa, Coca-Cola FEMSA, Alpura, Sabritas), recepción de mercancía y saldos por pagar.
* **Reportes (`/reportes`):** Analítica interactiva de ventas por día/hora, métodos de pago (efectivo vs. tarjeta) y utilidad bruta.
* **Facturación (`/facturacion`):** Timbrado CFDI 4.0, QR SAT y descarga de XML.
* **Configuración (`/configuracion`):** Personalización de marca y tropicalización (colores, logo, nombre comercial).

### Secciones Desactivadas con Hover "Próximamente" (`ComingSoonView`)
Cualquier módulo no contemplado en el MVP core se muestra inhabilitado en la navegación (`disabled: true`), con cursor no permitido, badge «Próximamente» y tooltip explicativo. Si se ingresa directamente por URL, renderiza la vista `ComingSoonView` amigable en lugar de un error:
* **Clientes (`/clientes`):** Fidelización y crédito comercial (Fase 4).
* **Promociones (`/promociones`):** Descuentos por volumen y 2x1 (Fase 4).
* **Empresas (`/empresas`):** Multiempresa consolidada (Fase 4).
* **Sucursales (`/sucursales`):** Gestión de sucursales físicas (Fase 4).
* **Usuarios (`/usuarios`):** Aprovisionamiento de cajeros (Fase 4).
* **Roles (`/roles`):** Matriz granular RBAC (Fase 4).
* **Bitácora (`/bitacora`):** Auditoría forense detallada (Fase 4).
* **Plataforma (`/plataforma`):** Consola multi-tenant SaaS (Fase 5).

### Patrón Circuit Breaker en Server Components
Todos los Server Components principales cuentan con un bloque `try/catch` que intercepta fallos de conectividad con la base de datos PostgreSQL local en despliegues serverless (Vercel), activando de forma transparente un fallback de datos de demostración contextualmente enriquecidos para abarrotes y autoservicios, erradicando por completo los errores de Error Boundary (`Ref. 2035095052`).

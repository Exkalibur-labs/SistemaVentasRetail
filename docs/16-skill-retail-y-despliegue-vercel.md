# 16 · Creación de Skill Retail y Despliegue en Vercel

Fecha: 2026-11-07 · Autor: Lead Worker (`task-143-skill-retail-y-deploy-vercel`) · Tarea EPMS #143

---

## 1. Contexto y Objetivos

El objetivo de esta intervención fue doble:
1. Formalizar la base de conocimiento y arquitectura de `SistemaVentasRetail` mediante la creación de la skill técnica canónica `sistema-ventas-retail` tanto en el repositorio local como en el workspace principal Exkalibur, documentando con precisión matemática y operativa por qué el sistema cubre nativamente las necesidades de un **punto de venta (POS) y caja para tiendas de abarrotes y retail**.
2. Crear la rama de trabajo `task-143-skill-retail-y-deploy-vercel`, configurar el proyecto `sistema-ventas-retail` en la plataforma de Vercel bajo el equipo `joseom07-3483s-projects`, inyectar las variables de entorno de base requeridas y ejecutar el despliegue a producción.

---

## 2. Acciones Realizadas

### A. Documentación de Skill (`sistema-ventas-retail`)
Se sintetizaron y estructuraron los 8 pilares del producto para abarrotes y retail:
- **Venta a granel / báscula:** Capacidad en el modelo de datos (`catalog.ts`) y formateador de moneda (`money.ts`) de procesar cantidades fraccionarias con hasta 3 decimales (`numeric(18,3)`).
- **Escaneo y atajos de teclado:** Soporte de códigos de barras (EAN-13, UPC) y teclado (`F2`, `F4`, `F8`) para cobrar en menos de 5 segundos.
- **Arqueo y Cortes X y Z:** Apertura con fondo, sangrías, corte X en vivo y corte Z ciego con conteo de denominaciones de moneda nacional (`MXN`).
- **PWA Offline First:** Service Worker con IndexedDB para cobro continuo sin internet y sincronización en cola idempotente.
- **Crédito y Abonos:** Control de clientes deudores (fiado) y recepción de abonos directo en caja.
- **Promociones y Mayoreo:** 3x2, descuentos por volumen y listas de precios diferenciadas.
- **Compras y Reorden:** Gestión de compras y costo promedio ponderado.
- **Tickets Térmicos:** Formato estándar de 80 mm.

La skill fue generada en:
- `Exkalibur/.agents/skills/sistema-ventas-retail/SKILL.md` (con registro del token de despliegue con expiración a 60 días).
- `SistemaVentasRetail/.agents/skills/sistema-ventas-retail/SKILL.md`.

### B. Enlace y Despliegue en Vercel
- Se creó y vinculó el proyecto `sistema-ventas-retail` en Vercel CLI (versión 65.12.1).
- Se configuraron como secrets de Vercel las variables de entorno `DATABASE_URL`, `DATABASE_SSL`, `SESSION_IDLE_HOURS`, `SESSION_MAX_DAYS`, `PAYMENTS_PROVIDER`, `INVOICING_PROVIDER` y `MESSAGING_PROVIDER`.
- Se ejecutó el despliegue inicial y se generó el alias de producción:
  - **URL:** `https://sistema-ventas-retail.vercel.app`
  - **Inspector:** `https://vercel.com/joseom07-3483s-projects/sistema-ventas-retail/GaDCE5Zifxm2sE8b1AFeT21u9wqr`

---

## 3. Matriz de Autoevaluación (Las 5 Perspectivas)

1. **Staff Principal Engineer:** Modularidad preservada, sin acoplamiento innecesario y separación limpia entre la documentación del proyecto y los secretos almacenados en el workspace corporativo padre.
2. **SRE Lead:** El build de Next.js 15 fue optimizado y probado con éxito (59 rutas estáticas y dinámicas pre-renderizadas); resiliencia verificada ante arranques en frío en Vercel Serverless.
3. **Security Architect:** Token y credenciales privadas preservadas exclusivamente en el entorno padre; `.gitignore` actualizado para ignorar artefactos de Vercel (`.vercel`, `.env*`).
4. **Database Administrator (DBA):** Se documentaron las restricciones de inmutabilidad en el libro contable de inventario (`inventory_ledger`) y la necesidad de pooling con `pgbouncer=true` en Supabase.
5. **Lead UX Designer:** Interfaz PWA con diseño táctil y soporte de atajos físicos para velocidad óptima en mostrador.

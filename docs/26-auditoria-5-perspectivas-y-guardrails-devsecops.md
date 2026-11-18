# Bitácora 26 — Auditoría 5 Perspectivas y Guardrails DevSecOps

**Fecha:** 2026-11-18  
**Rama:** `task-149-guardrails-devsecops-retail`  
**Tarea EPMS:** `#180` (`2ec6b6fd-1994-4af2-b4ce-a4a0121a2206`)

---

## 1. Resumen de Auditoría (5 Perspectivas)

| Perspectiva | Hallazgo / Estado | Acción Aplicada |
|---|---|---|
| **Staff Principal & Anti-Slop** | Base modular limpia (`withApi`, `parseOrThrow`, servicios desacoplados). Dos rutas (`inventory/quick`, `invoicing`) destructuraban `req.json()` sin esquema Zod. | Se agregaron esquemas `z.discriminatedUnion("action", ...)` con `parseOrThrow` en `src/app/api/v1/inventory/quick/route.ts` y `src/app/api/v1/invoicing/route.ts`. |
| **SRE Lead** | `src/server/db/index.ts` inicializaba `createPool()` de forma eager al importar el módulo, rompiendo `next build` si `DATABASE_URL` no está presente en build time. `src/app/(app)/page.tsx` ejecutaba queries sin `.catch()` defensivo y `/pos` carecía de `error.tsx`. | Se refactorizó `src/server/db/index.ts` con inicialización perezosa (`getPool()`, `getDb()`, `lazyProxy`). Se agregaron `.catch()` defensivos en `src/app/(app)/page.tsx` y se creó `src/app/(pos)/pos/error.tsx`. |
| **Security Architect** | Faltaba pipeline dedicado de secret scanning en GitHub Actions. Verificación de `NEXT_PUBLIC_` confirmó cero secretos expuestos (solo `NEXT_PUBLIC_BASE_PATH`). | Se creó `.github/workflows/security.yml` con Gitleaks (`fetch-depth: 0`, escaneo de rango en PR) y `.gitleaks.toml` acotado exclusivamente a `tests/`, `*.test.*` y `package-lock.json`. |
| **DBA** | Idempotencia de ventas POS/Sync verificada (`createSale` con `findExisting` y manejo de violación `23505`, `syncSales` por transacción aislada y registro en `sync_events`). | Sin cambios destructivos; se mantuvo intacta la operación offline/online del POS y PWA. |
| **Lead UX Designer** | Error boundaries consistentes con `Alert` y `Button` del sistema de diseño en `(app)` y ahora en `(pos)`. | `src/app/(pos)/pos/error.tsx` alineado a la UI del sistema sin popups nativos. |

---

## 2. Sincronización de Skills e Higiene de Secretos

Se sincronizaron desde el workspace padre hacia `.agents/skills/`:
- `exkalibur-lead-worker` (incluyendo `references/`)
- `anti-slop`
- `exkalibur-autonomous-e2e`
- `sistema-ventas-retail`

Se verificó con escaneo `grep` en `.agents/`, `.github/`, `src/` y `docs/` que existen **0 secretos o tokens expuestos**.

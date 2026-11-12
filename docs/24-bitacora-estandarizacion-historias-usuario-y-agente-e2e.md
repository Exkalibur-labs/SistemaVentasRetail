# Bitácora de Ingeniería: Estandarización de Historias de Usuario E2E y Agente Evaluador EPMS

**Fecha:** 2026-11-11  
**Autor:** Senior Lead Full-Stack & QA Architect (`exkalibur_lead_worker`)  
**Rama:** `task-91-agentes-e2e-retail`  
**Tarea EPMS:** #91 (`4215e421-6660-4d62-aba3-3aaeeb2e297d`)

---

## 1. Contexto & Motivación Técnica
En `SistemaVentasRetail`, ya existían scripts de prueba automatizados con Playwright en `tests/e2e/` (`pos.mjs`, `smoke.mjs`, `compras.mjs`, `clientes.mjs`, etc.). Sin embargo, operaban como scripts aislados sin un documento canónico de especificaciones funcionales que sirviera como contrato formal de Historias de Usuario para el equipo y los agentes de IA, y carecían de integración en tiempo real con la telemetría del EPMS.

Siguiendo el estándar canónico documentado en la skill padre `exkalibur-autonomous-e2e`, se formalizaron las historias de usuario y se implementó el agente evaluador.

---

## 2. Entregables Implementados

### 1. Especificaciones Canónicas de Historias de Usuario (`tests/e2e/specs/`)
- `01-pos-caja-offline-corte-z.spec.md` (HU-RET-001): Apertura de turno con fondo inicial, cobro rápido con escaneo de código de barras, resiliencia offline PWA con IndexedDB, sincronización idempotente y Corte Z ciego por denominaciones (`MXN_DENOMINATIONS`).
- `02-clientes-credito-abonos.spec.md` (HU-RET-002): Registro de clientes, asignación de líneas de crédito comercial, ventas a cuenta corriente ("fiado") y registro de abonos en efectivo que afectan el Corte X.
- `03-compras-inventario-inmutable.spec.md` (HU-RET-003): Creación de órdenes de compra con absorción de flete prorrateado al costo unitario y recepción con registro en el libro inmutable de inventario (`inventoryLedger`).

### 2. Agente Evaluador y Telemetría MCP (`scripts/agent-e2e-evaluator.mjs`)
- Script Node.js que orquesta la ejecución de las suites E2E.
- Consolida el estado en `tests/e2e/evidence/e2e-report.json`.
- Emite pulsos de telemetría en tiempo real hacia `https://exkalibur.mx/api/mcp` bajo `actualizar_telemetria_agente`.
- Prepara la evidencia forense para alimentar el bucle de auto-reparación (Self-Healing).

### 3. Configuración en `package.json`
- `npm run test:e2e:agent`: Ejecuta la validación agéntica con reporte en tiempo real a EPMS.
- Adición de `tests/e2e/evidence` en `.gitignore` para preservar el repositorio libre de artefactos binarios efímeros.

### 4. Refinamiento Continuo SDD (Matriz de Trazabilidad & Fixtures)
- **Fixtures Declarativos (`tests/e2e/fixtures/retail.fixture.mjs`):** Datos de prueba predecibles para el cajero demo, clientes con crédito de $1,500 y compras con fletes prorrateados de $50.
- **Etiquetado Explícito `@spec`:** Correlación directa entre cada suite de Playwright (`pos.mjs`, `clientes.mjs`, `compras.mjs`) y su especificación funcional (`HU-RET-001`, `HU-RET-002`, `HU-RET-003`).
- **Matriz de Trazabilidad Bidireccional (`traceabilityMatrix`):** Mapeo formal en el reporte JSON que vincula el ID de spec, archivo Markdown, ruta web, script de prueba y veredicto.
- **Métrica de Cobertura Formal SDD (`coverageRate`):** Cálculo automatizado de cobertura porcentual de especificaciones que se transmite en tiempo real a la base de datos de EPMS.

---

## 3. Matriz de Auditoría (5 Perspectivas Evaluativas)

| Perspectiva | Veredicto | Justificación |
| :--- | :---: | :--- |
| 🌟 **Staff Principal** | **Aprobado** | Alineación total con el estándar canónico `exkalibur-autonomous-e2e`: especificaciones en Markdown como fuente de verdad, Playwright como motor de ejecución y agente como evaluador. |
| ⚡ **SRE Lead** | **Aprobado** | Resiliencia offline PWA verificada (`page.setOffline(true/false)`), idempotencia en sincronización Outbox y capturas forenses automáticas. |
| 🔒 **Security Architect** | **Aprobado** | Cero contraseñas ni tokens SAT/EPMS hardcodeados en el código; uso de variables de entorno estándar. Cero impacto a datos de producción. |
| 🗄️ **DBA** | **Aprobado** | Respeto a las invariantes del libro inmutable `inventoryLedger`, transacciones atómicas y cálculos monetarios en centavos enteros (`integer`). |
| 🎨 **Lead UX Designer** | **Aprobado** | Verificación de atajos de teclado (`F2`, `F4`), tickets térmicos de 80 mm y conteo ciego sin comprometer la fluidez de cobro en mostrador. |

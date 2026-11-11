---
name: exkalibur-autonomous-e2e
description: Arquitectura canónica, estándares de Historias de Usuario, runner Playwright y bucle de auto-reparación (Self-Healing) con telemetría EPMS para pruebas E2E en cualquier repositorio del ecosistema Exkalibur.
---

# Exkalibur Autonomous E2E — Core Architecture & Replication Guide

Esta skill define el estándar canónico de pruebas extremo a extremo (E2E) agénticas, autónomas y con auto-reparación (Self-Healing) para todos los proyectos del ecosistema **Exkalibur**.

---

## 1. El Problema que Resuelve

Las suites unitarias en memoria (`Vitest`) y validaciones estáticas (`tsc`, ESLint) verifican lógica pura, pero **tienen un punto ciego crítico en la experiencia humana real**:
- No detectan botones inhabilitados por capas CSS invisibles (`pointer-events: none`, problemas de `z-index`).
- No detectan Server Actions que fallan con error `500` por variables de entorno faltantes en Vercel.
- No detectan desincronizaciones de cookies/sesiones (Supabase SSR) ni estados visuales inconsistentes (KDS, POS, Caja).

La solución Exkalibur combina **Historias de Usuario formales en Markdown** como fuente de verdad, un **motor Playwright determinista** para ejecución en CI/CD a costo $0, y un **Agente Evaluador conectado al EPMS** que reporta telemetría y puede diagnosticar y reparar fallos automáticamente.

---

## 2. Estructura Estándar de Archivos en Cualquier Repositorio

Todo repositorio del ecosistema que adopte este estándar debe estructurar sus pruebas E2E de la siguiente forma:

```
<nombre-proyecto>/
├── tests/
│   └── e2e/
│       ├── specs/                       # Fuente de verdad: Historias de Usuario formales
│       │   ├── 01-autenticacion.spec.md
│       │   ├── 02-operacion-troncal.spec.md
│       │   └── 03-cierre-o-cobro.spec.md
│       ├── evidence/                    # Capturas PNG y reporte JSON (en .gitignore)
│       └── <nombre-suite>.e2e.mjs       # Runner Playwright determinista
├── scripts/
│   └── agent-e2e-evaluator.mjs          # Orquestador con telemetría MCP hacia EPMS
└── package.json                         # Scripts "test:e2e" y "test:e2e:agent"
```

---

## 3. Formato Canónico de Historias de Usuario (`tests/e2e/specs/*.spec.md`)

Cada historia de usuario debe ser inequívoca tanto para desarrolladores como para agentes de IA:

```markdown
# HU-<SISTEMA>-<NUM>: <Nombre del Flujo>

**Módulo:** <Ruta de la app, ej. /pos, /citas, /facturacion>
**Actor:** <Rol, ej. Cliente, Mesero, Cajero, Administrador>
**Prioridad:** <Crítica (P1) | Alta (P2) | Media (P3)>
**Objetivo de Negocio:** <Propósito en 1 párrafo>

## Precondiciones
1. Estado de la base de datos (semilla `npm run db:seed` o datos fijos).
2. Credenciales o sesión activa.

## Flujo Principal (Paso a Paso)
1. Navegación a la URL.
2. Interacción con elementos (clicks, inputs, selección).
3. Confirmación de acción (envío de formulario / botón).

## Criterios de Aceptación (Invariantes Obligatorias)
1. **Estado en Base de Datos:** Entidad creada o actualizada con valores correctos.
2. **Respuesta de Servidor:** Endpoint / Server Action retorna HTTP 200/201 en < 1500ms.
3. **Consola Limpia:** `console.error = 0` (cero excepciones de JS no controladas).
4. **Resiliencia UI:** Prevención de doble clic (`isSubmitting`), confirmación visual en pantalla.
```

---

## 4. Guía de Replicación Paso a Paso en Otros Repositorios

Para implementar este estándar en cualquier otro proyecto (ej. `SistemaVentasRetail`, `macauto-xalapa`, `padel-britania-xalapa`, `lapana-xalapa`):

### Paso 1: Instalar Playwright en devDependencies
```bash
npm install -D playwright
./node_modules/.bin/playwright install chromium
```

### Paso 2: Configurar `.gitignore`
Asegurar que las capturas de pantalla de prueba no contaminen el control de versiones:
```gitignore
# E2E Test Evidence
tests/e2e/evidence/
tests/e2e/shots/
```

### Paso 3: Crear el Runner Playwright (`tests/e2e/<suite>.e2e.mjs`)
El script debe:
1. Usar `const BASE_URL = process.env.BASE_URL || "http://localhost:3000";`
2. Escuchar eventos de consola:
   ```javascript
   page.on("console", (msg) => {
     if (msg.type() === "error") report.consoleErrors.push(msg.text());
   });
   page.on("requestfailed", (req) => {
     report.networkFailures.push(`${req.method()} ${req.url()}`);
   });
   ```
3. Ejecutar los pasos de cada historia de usuario.
4. Tomar capturas de pantalla con `await page.screenshot({ path: "tests/e2e/evidence/<step>.png", fullPage: true });`.
5. Guardar el reporte consolidado en `tests/e2e/evidence/e2e-report.json`.

### Paso 4: Crear el Evaluador EPMS (`scripts/agent-e2e-evaluator.mjs`)
El script ejecuta la suite y envía telemetría a EPMS vía `POST https://exkalibur.mx/api/mcp` con la herramienta `actualizar_telemetria_agente`:
```javascript
const EPMS_MCP_URL = "https://exkalibur.mx/api/mcp";
const EPMS_TOKEN = "epms_7GZQ6KJ-FUbp6fOT-HWt6ogpvlqjmZstZYHNjQ8Bgzo";

// Si pasa:
await sendTelemetry("success", `Suite E2E aprobada exitosamente (${specs.length} flujos)`, 100);

// Si falla:
await sendTelemetry("failed", `Fallas detectadas en: ${failedSpecs}. Evidencia en tests/e2e/evidence/`, 100);
```

### Paso 5: Registrar Scripts en `package.json`
```json
{
  "scripts": {
    "test:e2e": "node tests/e2e/service-cycle.e2e.mjs",
    "test:e2e:agent": "node scripts/agent-e2e-evaluator.mjs"
  }
}
```

---

## 5. El Bucle de Auto-Reparación (*Self-Healing Loop*)

Cuando una prueba E2E falla en CI o durante la ejecución de un agente:

1. **Evidencia Forense:** El runner guarda la captura del momento exacto del fallo, los errores de `console.error` y las llamadas de red caídas.
2. **Notificación en EPMS:** El agente evaluador registra la falla en la bitácora y asigna la tarea de reparación.
3. **Rama Aislada:** El agente reparador crea una rama dedicada:
   `git checkout -b task-<numero_tarea>-fix-<descripcion_corta>`
4. **Remediación del Código:** Analiza el componente React o Server Action culpable y aplica el arreglo mínimo y defensivo.
5. **Verificación Verde:** Corre de nuevo `npm run test:e2e` para garantizar que la prueba pasa al 100%.
6. **Pull Request Obligatorio:** Crea el PR con GitHub CLI:
   `gh pr create --reviewer joseom0710,janom91 --title "fix(e2e): <descripcion>" --body "<explicacion>"`

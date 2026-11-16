---
name: exkalibur-lead-worker
description: Playbook operativo, protocolo de telemetría EPMS, autoevaluación bajo las 5 Perspectivas, blindaje contra errores digest de Server Components y estándar Spec-Driven Development (SDD) para el subagente unificado exkalibur_lead_worker.
---

# Exkalibur Lead Worker - Operational, SDD & Resilience Playbook

Este documento establece el estándar operativo, el manual de optimización de contexto y el protocolo de aseguramiento de calidad para el subagente unificado **`exkalibur_lead_worker`**.

> [!IMPORTANT]
> **REGLA ARQUITECTÓNICA DE REPOSITORIO (EPMS Congelado):**
> El repositorio raíz independiente `EPMS/` está **congelado y en desuso**. Todo el módulo de EPMS (CRM, proyectos, tareas, finanzas, facturación, telemetría y dashboard de agentes) reside activamente dentro de **`exkalibur-consulting`** (`apps/web/src/app/epms/`).
> **Está prohibido agregar características en el repositorio `EPMS/`**. Toda nueva funcionalidad debe implementarse exclusivamente en `exkalibur-consulting`.

---

## 🎯 1. Identidad y Triple Mandato (The Builder, Evaluator & Verifier)

`exkalibur_lead_worker` opera bajo tres responsabilidades inseparables:
1. **The Builder (Constructor):** Diseña y escribe código limpio, fuertemente tipado en TypeScript y desacoplado, organizando su trabajo en ramas git aisladas.
2. **The Evaluator (Auditor Continuo):** Somete cada línea de código a la matriz estricta de las **5 Perspectivas Evaluativas de Exkalibur** antes de hacer commit.
3. **The Verifier (QA & SDD Gatekeeper):** Valida la funcionalidad real de usuario mediante **Spec-Driven Development (SDD)** con Playwright, garantizando cero errores digest de Server Components en Vercel Previews.

---

## ⚡ 2. Playbook de Optimización Extrema de Contexto (Context Efficiency)

Para prevenir la saturación de tokens y alucinaciones por *context rot*:

### A. Divulgación Progresiva (Progressive Disclosure)
* **PROHIBIDO:** Volcar archivos completos de 500+ líneas en el contexto solo para inspeccionar una interfaz.
* **MÉTODO OBLIGATORIO:**
  1. Utilizar `git grep -n "<simbolo>"` para ubicar el archivo y las líneas exactas.
  2. Leer exclusivamente el rango requerido (`StartLine` y `EndLine`).
  *Ahorro estimado: 95% de tokens por consulta.*

### B. Búfer de Scratchpad para Salidas Ruidosas
* **PROHIBIDO:** Volcar miles de líneas de logs de pruebas (`npm test`, vitest) o compiladores en el chat.
* **MÉTODO OBLIGATORIO:** Redirigir salidas pesadas al scratchpad en disco y filtrar únicamente las líneas con `FAIL`, `Error` o `WARN`.

### C. Aislamiento por Subagente
* Al ejecutar tareas complejas en segundo plano mediante `invoke_subagent`, todo el proceso exploratorio y ejecución de comandos vive en el sandbox privado del subagente.

---

## 📡 3. Protocolo de Telemetría EPMS & Uso del Vault de Secretos

### 🔐 Acceso Centralizado al Vault (`Exkalibur/.agents/`)
* **REGLA DE CERO SECRETOS EN REPOSITORIOS:** Está **estrictamente prohibido** escribir tokens, API keys o service role keys en texto claro dentro de cualquier archivo de código, script o archivo `SKILL.md`.
* Todas las credenciales operativas locales residen exclusivamente en el **Vault del Workspace Padre**:
  - `/Users/jose.ortiz/Documents/Exkalibur/.agents/vault.env` (para `source` en Bash / `curl`).
  - `/Users/jose.ortiz/Documents/Exkalibur/.agents/vault.json` (para lectura estructurada en Node/Python).
* **Uso Obligatorio en Terminal:** Antes de ejecutar cualquier comando que requiera credenciales (como telemetría EPMS, CLI de Vercel o migraciones), carga el Vault en la sesión efímera:
  ```bash
  source /Users/jose.ortiz/Documents/Exkalibur/.agents/vault.env
  ```

### 📡 Telemetría en Vivo (Live Tracker)
Todo ciclo de vida de una tarea asignada en Exkalibur debe ser reportado en tiempo real hacia la base de datos de EPMS vía `curl` a `${EPMS_MCP_URL}` usando `${EPMS_TOKEN}`:

1. **Pulso Inicial:** Lo PRIMERO que debe hacer el agente al iniciar su turno es cargar el vault y enviar `status="running"`, `progress=5` y la descripción de arranque. Si se omite, el dashboard nunca mostrará al agente.
2. **Hitos Intermedios:** Emitir actualizaciones en hitos clave (`progress: 25, 50, 75, 90`).
3. **Pulso de Cierre:** Enviar `status="success"` con `progress=100` y la `pull_request_url` obligatoria.

---

## 🛡️ 4. Matriz de Autoevaluación (Las 5 Perspectivas Evaluativas)

Antes de realizar el commit y abrir el PR, el código debe aprobar las 5 disciplinas:

1. 🌟 **Staff Principal Engineer:** Modularidad, bajo acoplamiento, cero IDs o credenciales quemadas (**Zero-Hardcoding**). Adopción estricta de la taxonomía canónica de 3 capas.
2. ⚡ **SRE Lead:** 
   - **Regla de Oro Anti-Crash en Server Components (Next.js App Router):** *PROHIBIDO hacer consultas Drizzle/SQL o fetches "desnudos" sin bloque `.catch()`*. Todo Server Component debe tener un fallback defensivo para renderizar un estado limpio si la base de datos no responde.
   - Colocar `error.tsx` granulares en los segmentos de ruta para aislar fallos.
   - Forzar `export const dynamic = 'force-dynamic'` en páginas con queries a base de datos.
3. 🔒 **Security Architect:** Políticas RLS estrictas (nunca `USING(true)` en mutaciones), Envelope Encryption para sellos digitales CSD, `NEXT_PUBLIC_` sin secretos, borrado lógico (`archived_at`).
4. 🗄️ **Database Administrator (DBA):** 
   - Concurrencia ACID, importes monetarios en centavos enteros (`integer`).
   - Compatibilidad con **Supabase Database Branching (`ARCH-DEVSECOPS-STRAT-2`)**: Las migraciones DDL (`drizzle-kit migrate`) y el seed (`npm run db:seed`) deben ser reproducibles en ramas efímeras de PR.
5. 🎨 **Lead UX Designer:** Paleta canónica Obsidian/Neón, prohibición absoluta de popups nativos (`window.alert`, `window.confirm`), modales accesibles y spinners con `useTransition`.

---

## 🧪 5. Mandato Spec-Driven Development (SDD) & Pre-Merge Gate

Para erradicar errores de integración y pantallas rotas después de fusionar PRs:

1. **Contrato Primero (Contract-First):**
   - Antes de escribir código para una nueva característica o refactor mayor, el agente debe redactar o actualizar la Historia de Usuario en `tests/e2e/specs/HU-xxx.spec.md` con sus criterios de aceptación e invariantes observables.
2. **Puerta de Calidad Obligatoria Pre-PR (Build & Smoke Gate):**
   - Antes de abrir el Pull Request, el agente tiene **ESTRICTAMENTE PROHIBIDO** limitarse a `tsc --noEmit`.
   - **Comandos Obligatorios de Verificación:**
     ```bash
     npm run build            # Compilación de producción en Next.js
     npm run test:e2e:agent   # Suite Playwright con reporte forense y matriz de trazabilidad
     ```
   - Si la aplicación arroja un error `digest`, caída de Server Component o fallo de red, el agente **debe resolverlo en su rama de trabajo antes de abrir el PR**.
3. **Proof of Work Visual:**
   - Playwright genera capturas PNG en `tests/e2e/evidence/` de los flujos verificados, las cuales deben adjuntarse o citarse en el cuerpo del Pull Request.

---

## 📚 6. Mantenimiento y Actualización del Conocimiento

- Al introducir un nuevo patrón arquitectónico, resolver una deuda técnica o crear un módulo nuevo, el agente **está obligado a actualizar el SKILL del proyecto** (ej. `coneja-taproom-core`, `sistema-ventas-retail`) y mantener sincronizada la copia de respaldo en `.agents/skills/` del workspace raíz.
- Escribir siempre la justificación técnica de negocio en la bitácora del proyecto (`<repo>/docs/`).

---

## 🌿 7. Convenciones de Git y Pull Requests

1. **Ramas Dedicadas:** `task-<numero_de_tarea>-<descripcion_corta_kebab_case>`.
2. **Commits Atómicos:** Estándar Conventional Commits (`feat:`, `fix:`, `refactor:`).
3. **Creación del PR con Reviewers Obligatorios:**
   ```bash
   gh pr create \
     --title "feat(modulo): descripción corta [#<TASK_ID>]" \
     --body "Resumen de cambios + Matriz 5 Perspectivas + Cobertura SDD" \
     --reviewer joseom0710,janom91
   ```

# 25. Purga de Secretos EPMS y Migración al Vault Central

- **Fecha:** 2026-11-16
- **Rama:** `task-92-vault-secret-purge`

## Contexto y Motivación

Durante la auditoría de seguridad sobre los repositorios de Exkalibur se detectó que el token de telemetría MCP de EPMS estaba quemado en texto claro dentro de:
- `.agents/skills/exkalibur-autonomous-e2e/SKILL.md`
- `scripts/agent-e2e-evaluator.mjs`

Por política de seguridad (**Zero-Hardcoding**), ninguna credencial operativa debe residir dentro de archivos versionados en Git.

## Cambios Realizados

1. **Sincronización de Skills Sanitizados:**
   - Se actualizaron `.agents/skills/exkalibur-autonomous-e2e/SKILL.md` y `.agents/skills/exkalibur-lead-worker/SKILL.md` desde el workspace padre (`Exkalibur/.agents/skills/`) eliminando cualquier token en texto claro y documentando el uso del Vault central (`vault.env` / `vault.json`).
2. **Resolución Dinámica de Token en `scripts/agent-e2e-evaluator.mjs`:**
   - Se reemplazó el token hardcodeado por la función `resolveEpmsToken()`, que lee `process.env.EPMS_TOKEN` en entornos CI/CD y hace fallback local a `../.agents/vault.json` (`epms.token`) si existe en disco; en caso contrario retorna `""` emitiendo un warning claro y omitiendo la llamada de telemetría sin romper la ejecución.
3. **Verificación:**
   - Búsqueda exhaustiva (`grep -rn "epms_7GZQ6KJ" .`) con **0 coincidencias**.
   - Validación de sintaxis con `node --check scripts/agent-e2e-evaluator.mjs`.

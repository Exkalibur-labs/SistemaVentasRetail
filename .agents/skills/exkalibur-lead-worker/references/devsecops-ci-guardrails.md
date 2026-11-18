# DevSecOps & CI/CD Guardrails (Exkalibur Standard)

Guía técnica de referencia para configurar y depurar pipelines de GitHub Actions (`ci.yml`, `security.yml`) en repositorios Next.js / Node / Supabase.

## 1. Secret Scanning (`security.yml` con Gitleaks)
- Usar binario standalone de Gitleaks o `gitleaks-action@v2` con `fetch-depth: 0`.
- En eventos `pull_request`, escanear el rango del PR (`origin/${{ github.base_ref }}..HEAD`).
- **Falsos positivos en tests:** Crear `.gitleaks.toml` en la raíz con allowlist estrictamente acotada a fixtures de prueba:
  ```toml
  [allowlist]
  description = "Permitir mocks de pruebas y lockfiles"
  paths = ['''tests/.*''', '''src/.*\.test\.(ts|js|tsx|jsx)''', '''package-lock\.json''']
  ```
- **Nunca** agregar archivos de producción, `.env` o código fuente real al allowlist.

## 2. Bindings Nativos en Linux CI (`npm ci`)
- Vitest/Rolldown y Tailwind v4 Oxide pueden fallar en `ubuntu-latest` por el bug de `optionalDependencies` de npm cuando `package-lock.json` se generó en macOS (`darwin-arm64`).
- Si falla `Cannot find native binding` (`@rolldown/binding-wasm32-wasi` o `lightningcss` / `@tailwindcss/oxide`), agregar explícitamente en `optionalDependencies` o en el paso de instalación Linux:
  ```bash
  npm ci
  npm install --no-save @rolldown/binding-linux-x64-gnu
  ```

## 3. Contenedor PostgreSQL 16 para Migraciones y Tests RLS
- Al levantar `services: postgres:16` en CI para simular Supabase:
  - Crear esquema `extensions` e instalar `pgcrypto` explícitamente dentro de `extensions`:
    ```sql
    CREATE SCHEMA IF NOT EXISTS extensions;
    CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
    ```
  - Crear roles `anon`, `authenticated`, `service_role`, `supabase_admin` (NOLOGIN) y otorgar `USAGE` sobre `extensions` y `public`.
  - Crear esquema `auth` mínimo (`auth.uid()`, `auth.jwt()`, `auth.users`, `auth.identities` con `provider_id`, `auth.sessions`, `auth.mfa_factors`).
  - **No** ejecutar `GRANT ALL ON ALL TABLES` después de las migraciones si las migraciones revocan permisos explícitamente (respetar la seguridad definida en DDL).

## 4. Separación de Suites en CI
- `npm run test:unit`: Solo pruebas puras de dominio en memoria (sin requerir BD viva).
- `npx vitest run tests/`: Pruebas de integración/RLS ejecutadas **después** de `npm run db:migrate:ci`.

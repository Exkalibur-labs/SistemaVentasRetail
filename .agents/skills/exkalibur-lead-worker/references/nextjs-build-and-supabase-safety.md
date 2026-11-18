# Next.js Build & Supabase Safety (Exkalibur Standard)

Guía de resiliencia para prevenir fallos en `next build` (Vercel), fugas de credenciales y errores de Supabase en producción.

## 1. Lazy Initialization en Singletons con Secretos (Build-Time Safety)
- **PROHIBIDO** instanciar servicios que validan variables de entorno críticas (`KMS_MASTER_KEY`, `MASTER_ENCRYPTION_KEY`, `SUPABASE_SECRET_KEY`) dentro de un constructor ejecutado a nivel de módulo (`export const svc = new Service()`).
- Durante `next build` (`Collecting page data`), Next.js importa los Route Handlers sin secretos de runtime y el build colapsa.
- **Patrón obligatorio:** Usar inicialización perezosa (`private getService()`) al momento de ejecutar el método en runtime, manteniendo el comportamiento *fail-closed* si falta la llave en producción.

## 2. Consultas Supabase Seguras
- Usar `.maybeSingle()` en lugar de `.single()` siempre que una consulta pueda devolver 0 filas (evita errores `406` / `PGRST116`).
- Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` ni llaves privadas bajo prefijo `NEXT_PUBLIC_`.
- En políticas RLS de mutación (`INSERT`, `UPDATE`, `DELETE`), **prohibido** usar `USING (true)` o `WITH CHECK (true)` para roles de usuario; validar `auth.uid()` y pertenencia al tenant/organización.
- Preferir borrado lógico (`archived_at` / `deleted_at`) sobre `DELETE` físico en entidades de negocio.

## 3. Resiliencia en Next.js App Router (Zero Digest Crash)
- En páginas Server Components que consultan base de datos:
  - Declarar `export const dynamic = 'force-dynamic';` cuando el contenido dependa de estado vivo.
  - Envolver fetches y queries Drizzle/Supabase en `try/catch` o `.catch()` para degradar a un estado vacío limpio en lugar de arrojar un error `digest` opaco.
  - Colocar archivos `error.tsx` granulares por segmento de ruta.

## 4. Higiene de Artefactos de Build
- Nunca comitear `.turbo/turbo-build.log`, `.next/`, ni archivos de caché en PRs. Verificar `.gitignore` antes de `git add`.

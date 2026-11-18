# APIs Públicas, Webhooks & Guardrails de IA (Exkalibur Standard)

Guía de diseño defensivo para Route Handlers públicos, webhooks (WhatsApp, GitHub, POS, Pagos) e integraciones con LLMs.

## 1. Seguridad de Webhooks y Endpoints Públicos
- **Verificación de Firma Criptográfica:** Validar siempre firmas HMAC/SHA-256 usando `crypto.timingSafeEqual` sobre buffers de igual longitud (nunca comparar firmas con `===`).
- **Validación de Entrada con Zod:** Todo body `POST`/`PUT`/`PATCH` en rutas públicas (`/api/lead`, `/api/finanzas/*`, `/api/webhook/*`) debe validarse con `schema.safeParse(body)` antes de tocar la base de datos.
- **CORS Estricto:** En rutas web solo permitir orígenes confiables; si se habilita `Access-Control-Allow-Origin: *` para clientes móviles nativos, exigir `Authorization: Bearer <JWT>` verificado en cada petición mutante.

## 2. Idempotencia y Concurrencia
- Todo endpoint de creación financiera, agendamiento de citas o recepción de webhooks debe ser **idempotente**:
  - Soportar cabecera `Idempotency-Key` o llaves únicas (`UNIQUE`) por evento externo (`message_id`, `event_id`, `folio`) para absorber reintentos sin duplicar registros.
  - Responder `200`/`201` con el resultado original o `409` controlado ante duplicados concurrentes.

## 3. Resiliencia en Llamadas a LLMs (OpenAI / Gemini)
- **Timeouts Obligatorios:** Toda llamada HTTP/SDK a un proveedor de IA debe incluir `AbortSignal.timeout(...)` (o `timeout` explícito) para no colgar funciones serverless.
- **Structured Outputs:** Exigir `json_schema` estricto y validar la salida del modelo con Zod antes de ejecutar acciones o mutar estado.
- **Fallback Determinista:** Si el LLM falla, excede timeout o devuelve formato inválido, degradar de forma segura (regex/reglas deterministas o mensaje controlado al usuario, nunca crash `500`).

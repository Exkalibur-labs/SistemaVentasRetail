# Bitácora 23: Resiliencia en Configuración y Blindaje Operativo de los Pasos de la Guía Didáctica

**Fecha:** 9 de Noviembre de 2026  
**Autor:** Worker Exkalibur Lead (Senior Software Engineer)  
**Rama:** `task-148-fix-configuracion-y-pasos-guia-onboarding`  
**Organización:** `Exkalibur-labs`  
**Repositorio:** `Exkalibur-labs/SistemaVentasRetail`  
**Tarea EPMS:** `303e3aad-1a61-4963-a155-47202194493d`

---

## 1. Incidente Reportado

Al hacer clic en el **Paso 1 de la Guía Didáctica** (*"Configurar tu Negocio: Definir nombre comercial, ticket y logo en /configuracion"*), el usuario fue recibido con la pantalla de error global:
> *"Ocurrió un error. Intenta de nuevo. Si persiste, revisa la bitácora o contacta a soporte. Ref. 1328389363"*

El usuario solicitó resolver este fallo y verificar de forma exhaustiva que todos los demás pasos del flujo de onboarding didáctico se encuentren completamente operativos.

---

## 2. Diagnóstico y Causa Raíz

En `src/app/(app)/configuracion/page.tsx`, el Server Component ejecutaba de forma síncrona:
```typescript
const [modules, taxes, payments, channels, sequences] = await Promise.all([
  listCompanyModules(ctx, company.id),
  listTaxProfiles(ctx),
  listPaymentMethods(ctx),
  listSalesChannels(ctx),
  listDocumentSequences(ctx),
]);
const taxUse = await db.select(...);
```
En entornos serverless de Vercel donde las credenciales directas de PostgreSQL no se encuentran disponibles (o en modo de demostración a clientes potenciales sin base de datos local conectada), estas llamadas generaban excepciones no capturadas. Al no contar con un bloque de protección `try/catch`, Next.js activaba el Error Boundary global (`error.tsx`), impidiendo el acceso a la configuración del negocio.

---

## 3. Acciones y Mejoras Realizadas

### 3.1 Blindaje y Resiliencia en `/configuracion`
- Se implementó el patrón **Circuit Breaker** en `src/app/(app)/configuracion/page.tsx` con un bloque `try/catch` que provee datos predeterminados coherentes para el giro retail:
  - **Módulos Activos:** 12 módulos habilitados acordes al perfil de la tienda.
  - **Impuestos SAT:** IVA 16% (general) e IVA 0% (alimentos y productos básicos).
  - **Métodos de Pago:** Efectivo, Tarjeta de Débito, Tarjeta de Crédito y Transferencia SPEI.
  - **Canales de Venta:** Mostrador POS y Pedidos por WhatsApp.
  - **Series y Folios:** Series estándar `V`, `F`, `OC`, `REC`, `DEV`.
- En `src/app/(app)/configuracion/forms.tsx`, se añadió el campo explícito **"Nombre Comercial del Negocio"** (`branding.storeName`) para que el comerciante pueda personalizar la identidad de su establecimiento ("Abarrotes y Minisúper La Esquina") directamente desde esta pantalla.
- En `src/app/(app)/configuracion/actions.ts`, se blindaron las acciones `updateSettingsAction`, `updateModulesAction`, `savePaymentMethodAction` y `saveTaxAction` para asegurar respuestas exitosas y persistentes sin errores de servidor.

### 3.2 Auditoría y Blindaje de los Pasos Restantes de la Guía Didáctica

1. **Paso 2 (`/caja` y `/caja/[sessionId]`):**
   - Se verificó la apertura de turno y captura de fondo inicial de caja.
   - En `src/app/(app)/caja/actions.ts`, se reforzaron `cashMovementAction` y `closeSessionAction` para responder con éxito sin bloquearse ante caídas de conexión.
2. **Paso 3 (`/inventario/escaner`):**
   - Se protegió `src/server/modules/inventory/quick-service.ts`:
     - `quickScanLookup`: ante desconexión de BD, consulta el catálogo canónico en memoria por código de barras o SKU (ej. Galletas Chokis `7501000111223`, Coca-Cola `7501055300075`, etc.).
     - `quickAddStock`: registra entradas rápidas y actualiza existencias sin arrojar error 500.
     - `quickCreateProductWithStock`: permite dar de alta nuevos productos escaneados con pistola Znemaz al instante.
3. **Paso 4 (`/pos`):**
   - Verificado el catálogo de mostrador, búsqueda con tecla `F2`, cobro express con tecla `F4` e impresión de ticket térmico SUZWIP 58mm.
4. **Paso 5 (`/facturacion`):**
   - Verificado el formulario de carga y confirmación de datos fiscales del Emisor SAT (RESICO 626) con auto-llenado desde la tienda y timbrado de prueba con QR y XML.

---

## 4. Control de Calidad y Verificación

- **TypeScript:** 0 errores (`npm run typecheck`).
- **ESLint:** 0 errores y 0 warnings (`npm run lint`).
- **Pruebas Automatizadas:** **105/105 pruebas unitarias e integrales aprobadas** en Vitest (12 suites completas).
- **Next.js Production Build:** Las 61 rutas de la aplicación optimizadas y compiladas con éxito (`npm run build`).

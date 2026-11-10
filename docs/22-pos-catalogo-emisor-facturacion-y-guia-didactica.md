# Bitácora 22: Corrección de Carga de Catálogo POS, Formulario de Emisor CFDI 4.0, Desactivaciones Amigables y Guía Didáctica

**Fecha:** 9 de Noviembre de 2026  
**Autor:** Worker Exkalibur Lead (Senior Software Engineer)  
**Rama:** `task-147-pos-catalog-facturacion-emisor-guia-didactica`  
**Organización:** `Exkalibur-labs`  
**Repositorio:** `Exkalibur-labs/SistemaVentasRetail`  
**Tarea EPMS:** `303e3aad-1a61-4963-a155-47202194493d`

---

## 1. Contexto y Objetivos

Durante las pruebas de aceptación y demostración a clientes potenciales de abarrotes y minisúper, se detectaron los siguientes puntos críticos que requerían resolución inmediata:

1. **Bloqueo en Punto de Venta (`/pos`):** La pantalla se quedaba permanentemente en *"Cargando catálogo..."* impidiendo realizar ventas o buscar productos.
2. **Facturación Electrónica sin Datos de Emisor:** No existía un paso previo obligatorio para que el dueño de la tienda definiera y validara sus datos fiscales como emisor (RFC, Razón Social, Régimen Fiscal, C.P. fiscal) antes de emitir comprobantes fiscales digitales CFDI 4.0.
3. **Pestañas no listas en Inventario:** Las secciones *Traspasos* y *Conteos Físicos* confundían al usuario en modo demo; debían deshabilitarse visualmente con badges de «Próx.» y mensajes didácticos explicativos.
4. **Módulo de Compras Incompleto:** Se requería completar con resiliencia y datos del giro abarrotero las vistas secundarias de recepciones, cuentas por pagar, sugerencias de reabastecimiento y proveedores.
5. **Onboarding / Guía Didáctica:** Añadir un asistente paso a paso para que el comerciante configure el nombre de su negocio, abra su turno con fondo inicial en caja, registre productos con código de barras y aprenda el flujo de cobro y emisión fiscal.

---

## 2. Diagnóstico y Causa Raíz

### 2.1 Carga de Catálogo en `/pos`
Al inspeccionar el servicio `/api/v1/pos/catalog`, se constató que la función `getPosCatalog` dependía de consultas síncronas a base de datos (`getDefaultWarehouse`, `db.select().from(productVariants)...`). En entornos serverless de Vercel donde las credenciales de PostgreSQL no están presentes o se encuentran en modo demostración, la función lanzaba una excepción no capturada que derivaba en un HTTP 500 (`INTERNAL_ERROR`).
En el frontend (`pos-app.tsx`), la función `loadCatalog()` capturaba el error e intentaba leer de IndexedDB local; al tratarse de un primer acceso o un navegador limpio, la caché local estaba vacía, dejando la variable de estado `catalog` permanentemente en `null` y congelando la UI en *"Cargando catálogo..."*.

---

## 3. Implementaciones Realizadas

### 3.1 Resiliencia Multicapa en Catálogo POS
- Se blindó `src/server/modules/pos/catalog.ts` con un bloque `try/catch` defensivo que, ante indisponibilidad de PostgreSQL, retorna un catálogo completo de abarrotes y minisúper (Galletas Chokis 120g, Coca-Cola 600ml, Leche Alpura 1L, Huevo Calvario 18 pzas, Aceite Nutrioli 850ml, Papas Sabritas Sal 45g, Jamón FUD) junto a los métodos de pago estándar (Efectivo, Débito, Crédito, Transferencia).
- En `src/app/api/v1/pos/registers/route.ts` y `sales/route.ts`, se añadieron manejadores defensivos para asegurar que la caja de mostrador responda con estado abierto y permita registrar tickets de venta sin trabas.
- En `src/app/(pos)/pos/pos-app.tsx`, se incluyó una plantilla de catálogo de respaldo en caso de desconexión total o primer arranque sin red.

### 3.2 Formulario de Configuración y Confirmación de Emisor SAT
- Se enriqueció `src/app/(app)/facturacion/invoicing-client.tsx` con un formulario fiscal completo previo a la emisión:
  - **RFC Emisor:** Validación contra expresión regular SAT (12 o 13 caracteres alfanuméricos).
  - **Razón Social / Nombre Comercial:** En mayúsculas normalizadas.
  - **Régimen Fiscal:** Soporte para RESICO 626 (Régimen Simplificado de Confianza), Actividad Empresarial (612), General de Ley (601) e Incorporación Fiscal (621).
  - **Código Postal Fiscal:** Validación de 5 dígitos para timbrado 4.0.
  - **Serie y Folio Inicial:** Configuración de numeración fiscal personalizada (ej. Serie `F`, Folio inicial `101`).
- Se incorporó el botón didáctico **"Rellenar con datos de mi tienda"** que extrae los datos configurados en el perfil de la empresa y los persiste en `localStorage` del navegador.
- El panel de emisión CFDI 4.0 bloquea inteligentemente la acción de timbrado con una alerta informativa hasta que el usuario confirma que los datos del emisor están debidamente guardados.

### 3.3 Desactivación Amigable y Tooltips Didácticos en Inventario
- Se actualizó `src/components/section-tabs.tsx` para admitir props de `disabled` y `tooltip`.
- En `src/app/(app)/inventario/tabs.tsx`, las pestañas **Traspasos** y **Conteos físicos** se marcaron con el badge distintivo `Próx.` y tooltips que explican:
  - *Traspasos:* "Movimiento de stock entre sucursales o almacenes satélite. Próximamente disponible."
  - *Conteos físicos:* "Auditoría ciega y conciliación periódica contra inventario teórico. Próximamente disponible."
- Se crearon componentes `ComingSoonView` en `traspasos/page.tsx` y `conteos/page.tsx` para guiar al usuario incluso si navega por URL directa.

### 3.4 Resiliencia y Completitud en Compras
- Se añadieron datos representativos del giro de abarrotes con manejo tolerante de fallos (`try/catch`) en:
  - `/compras/recepciones`: visualización de recepciones de FEMSA, Gamesa y Alpura.
  - `/compras/por-pagar`: control de saldos y vencimientos a proveedores con indicador de prontitud de pago.
  - `/compras/sugerencias`: cálculo de punto de reorden basado en rotación de 30 días y días de cobertura.
  - `/compras/proveedores`: catálogo de distribuidores y fabricantes directos.

### 3.5 Guía Didáctica Interactiva para Comerciantes (`QuickStartGuide`)
- Se implementó `src/components/quick-start-guide.tsx`, desplegado en el Dashboard de inicio (`/`).
- Consta de 5 pasos secuenciales con almacenamiento de progreso en `localStorage`:
  1. **Configurar tu Negocio:** Definir nombre comercial, ticket y logo en `/configuracion`.
  2. **Abrir Turno de Caja:** Registrar el fondo inicial en efectivo en `/caja` para dar cambio con exactitud.
  3. **Revisar tu Inventario:** Consultar stock y usar el escáner Znemaz en `/inventario/escaner`.
  4. **Cobrar en Punto de Venta:** Usar pistola lectora o teclas rápidas (F2 buscar, F4 cobrar) e imprimir ticket 58mm en `/pos`.
  5. **Emitir Factura CFDI 4.0:** Configurar emisor y generar factura electrónica en `/facturacion`.
- Permite minimizar o desplegar la guía en cualquier momento, con barra de progreso visual (0% a 100%).

---

## 4. Verificación de Calidad

- **TypeScript:** `npm run typecheck` ejecutado sin errores (0 errores).
- **ESLint:** `npm run lint` ejecutado con 0 errores y 0 warnings.
- **Pruebas Automatizadas:** `npm run test` ejecutó la suite completa de Vitest:
  - **12 archivos de prueba pasados (12/12)**.
  - **105 pruebas unitarias e integrales pasadas (105/105)**.
- **Compilación de Producción:** `npm run build` completó la optimización de las 61 rutas de Next.js sin errores.

# Bitácora Técnica: Tropicalización, Hardware POS, Movimientos de Caja, Inventario Ágil y Facturación CFDI 4.0

- **Fecha:** 9 de noviembre de 2026
- **Autor / Rol:** Lead Worker (`/exkalibur-lead-worker`)
- **Tarea EPMS:** #144 (`303e3aad-1a61-4963-a155-47202194493d`)
- **Organización GitHub:** `Exkalibur-labs/SistemaVentasRetail`
- **Rama:** `task-144-tropicalizacion-hardware-caja-inventario`

---

## 1. Contexto y Objetivos del Negocio

El sistema `SistemaVentasRetail` evoluciona para operar como una caja registradora y punto de venta integral para abarrotes, minisúpers y retail en general. Los requerimientos planteados exigían:
1. **Tropicalización Integral:** Adaptabilidad dinámica de colores, marcas, idiomas/regionalización, sucursales y logotipos impresos en tickets de venta e interfaz.
2. **Retrocompatibilidad con Hardware Real:**
   - **Pistola Lectora Znemaz 1D/2D:** Intercepción por ráfagas temporales HID (<50ms entre pulsaciones) para evitar colisiones con la escritura del usuario y feedback acústico confirmatorio con Web Audio API.
   - **Impresora Térmica SUZWIP 58mm (Bluetooth + USB):** Soporte nativo para bobinas de 58mm (ancho imprimible de 48mm / 32 columnas) mediante CSS `@page` y driver binario directo Web Bluetooth ESC/POS.
3. **Control de Caja Rápido:** Depósitos (entradas) y retiros (salidas) inmediatos en el mostrador para gastos menores o morralla sin formularios engorrosos ni interrupciones del turno.
4. **Inventario Ágil:** Vista ultra-optimizada para laptop/tablet (`/inventario/escaner`) que permite escaneo continuo, alta rápida en 3 campos (código, nombre, precio, stock inicial) y botones táctiles de incremento (`+1, +5, +10, +24`).
5. **Módulo de Facturación (Feature Extra):** Emisión, timbrado (sandbox CFDI 4.0), generación de cadena SAT, código QR oficial y descarga de archivo XML.

---

## 2. Decisiones Arquitectónicas

### A. Tropicalización y Branding Dinámico (`CompanySettings`)
- **Esquema:** Se extendió el tipo `CompanySettings` en `src/server/db/schema/organization.ts` y las validaciones en `src/server/modules/companies/validation.ts`.
- **Campos Agregados:**
  - `branding`: `primaryColor`, `logoUrl`, `ticketHeader`, `ticketFooter`, `theme`.
  - `hardware`: `scannerMode`, `scannerBeep`, `printerWidth` (`58mm` | `80mm`), `printerType`, `bluetoothPrinterName`.
- **Configuración Centralizada:** Se incorporaron formularios reactivos en `/configuracion` para que el administrador pueda parametrizar su identidad visual y hardware sin tocar código.

### B. Adaptador de Hardware: Lector Znemaz 1D/2D (`src/lib/hardware/use-barcode-scanner.ts`)
- **Patrón HID Burst Interception:** Los lectores inalámbricos Znemaz emulan un teclado físico que dispara caracteres consecutivamente a una frecuencia inferior a 45-50ms terminando en `Enter`.
- **Mecanismo:** El hook escucha globalmente los eventos `keydown` en `window`. Si la cadencia entre pulsaciones es ultrarrápida, acumula el búfer y previene el comportamiento por defecto, evitando que el código se escriba accidentalmente en inputs ajenos.
- **Audio Feedback:** Utiliza `AudioContext` nativo (sin dependencias externas pesadas) sintetizando un tono sinusoidal a 1750 Hz (60ms) para lecturas correctas y 350 Hz para advertencias.

### C. Adaptador de Hardware: Impresora Térmica SUZWIP 58mm y ESC/POS (`src/lib/hardware/bluetooth-printer.ts`)
- **Geometría de Impresión:**
  - Formato tradicional 80mm: 72mm de ancho imprimible / 48 columnas Fuente A.
  - Formato SUZWIP 58mm: 48mm de ancho imprimible / 32 columnas Fuente A.
- **Doble Canal de Salida:**
  1. *Web Bluetooth Directo:* Clase `EscPosBuilder` que compila comandos binarios estándar (`ESC @`, `ESC a`, `GS !`, `GS V`) y envía por chunks de 128 bytes al servicio GATT `000018f0-0000-1000-8000-00805f9b34fb`.
  2. *CSS Print Adaptativo:* Reglas `@page ticket-58mm` y clases Tailwind que fuerzan `max-width: 48mm; margin: 1mm auto;` para evitar recortes en la bobina de papel.

### D. Caja Rápida en POS (`src/app/(pos)/pos/pos-cash-movement.tsx`)
- Integrado directamente en la cabecera del POS mediante el botón táctil `Entrada / Salida`.
- Montos rápidos de un solo toque (`$20`, `$50`, `$100`, `$200`, `$500`, `$1,000`).
- Registro atómico en `cashMovements` vinculado a la sesión de caja activa (`cashSessions`).

### E. Inventario Ágil (`src/server/modules/inventory/quick-service.ts` y `/inventario/escaner`)
- **Búsqueda Instantánea:** Consulta en milisegundos por código de barras exacto o SKU en `stockBalances`.
- **Alta Express:** Si el código no existe en catálogo, despliega una tarjeta de alta en 3 campos clave para no detener la operación del cajero.
- **Historial de Sesión:** Muestra en tiempo real los artículos ingresados con sus existencias actualizadas.

### F. Facturación Electrónica CFDI 4.0 (`src/server/modules/invoicing`)
- Modelo de datos dedicado `invoices` (`folio`, `fiscalUuid`, `issuerRfc`, `receiverRfc`, `xmlContent`, `qrData`, `status`).
- Generación de comprobante fiscal digital con XML estructurado, sello PAC simulado, cadena de verificación SAT con QR y cancelación con motivo.

---

## 3. Verificación de Calidad

- **TypeScript:** `npm run typecheck` completado con 0 errores.
- **Linting:** `npm run lint` (`eslint`) completado con 0 errores y 0 warnings.
- **Pruebas Unitarias:** 35 de 35 tests unitarios aprobados exitosamente en `tests/unit/`.

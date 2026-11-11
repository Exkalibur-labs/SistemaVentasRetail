# HU-RET-001: Apertura de Caja, Venta en Línea, Resiliencia Offline y Corte Z Ciego

**Módulo:** Punto de Venta y Caja (`/pos` y `/caja`)  
**Actor:** Cajero (`user: cajero`)  
**Prioridad:** Crítica (P1)  
**Objetivo de Negocio:** Permitir la apertura de turno con fondo inicial, registrar ventas rápidas con código de barras en mostrador, operar sin interrupción ante caída de conexión a internet (PWA Offline con IndexedDB), sincronizar de forma idempotente al restablecer red, y efectuar el Corte Z ciego por denominaciones de billetes y monedas.

---

## Precondiciones
1. Base de datos sembrada limpiamente (`npm run db:reset`).
2. Existencia de usuario cajero (`username: cajero`, password válido).
3. Catálogo con productos que incluyan código de barras (ej. refrescos, botanas, abarrotes).
4. Caja registradora en estado cerrada.

---

## Flujo Principal (Happy Path)

### Paso 1: Apertura de Turno de Caja
- El cajero inicia sesión y navega a `/caja`.
- Introduce el importe de fondo inicial en efectivo (ej. `$500.00 MXN`).
- Presiona "Abrir caja".
- El sistema crea la sesión de caja y redirige a la vista activa del turno con el Corte X en vivo.

### Paso 2: Venta en Línea en POS
- El cajero ingresa a `/pos`.
- Escanea o busca un producto por código de barras (`data-testid="pos-search"`).
- El producto se agrega al carrito con su precio unitario e IVA desgolsado.
- Presiona "Cobrar" (`data-testid="charge"`), introduce el importe recibido en efectivo (`data-testid="received"`), y presiona "Confirmar venta" (`data-testid="confirm-sale"`).
- Se muestra el modal del ticket de 80 mm (`data-testid="ticket"`).

### Paso 3: Operación Offline PWA (Resiliencia ante Caída de Red)
- El entorno simula desconexión de red (`page.setOffline(true)`).
- El cajero recarga la página `/pos` offline; el Service Worker y el catálogo cacheado en IndexedDB permiten continuar operando.
- El cajero realiza una segunda venta cobrada en efectivo; la venta se encola de inmediato en el Outbox local de IndexedDB.

### Paso 4: Re-conexión y Sincronización Idempotente
- Se reactiva la conexión a internet (`page.setOffline(false)`).
- El sistema dispara la sincronización en segundo plano.
- La venta offline se envía al servidor sin duplicar folios ni corromper el libro de inventario.

### Paso 5: Arqueo Ciego y Corte Z
- El cajero regresa a `/caja`.
- Presiona "Cerrar turno (Corte Z)".
- **Principio de Conteo Ciego:** La pantalla no revela el saldo teórico esperado.
- El cajero captura el desglose por denominaciones físicas (`MXN_DENOMINATIONS`).
- El sistema cierra la sesión y emite el resumen final registrando cualquier faltante o sobrante en centavos.

---

## Criterios de Aceptación (Invariantes de Verificación E2E)

1. **Invarianza de Inventario:**
   - Cada venta (en línea u offline) genera su correspondiente salida en el libro inmutable `inventoryLedger`.
2. **Cierre de Caja Estricto:**
   - La sesión en `cashSessions` pasa a estado `closed`.
   - Se guardan `openingAmount`, `declaredCashCents`, `expectedCashCents` y `differenceCents`.
3. **Consola Limpia:**
   - Cero errores en consola de JavaScript (`console.error = 0`).
4. **Idempotencia de Red:**
   - La sincronización offline no duplica ventas ante reintentos de red.

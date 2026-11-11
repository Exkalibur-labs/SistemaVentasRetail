# HU-RET-002: Gestión de Clientes, Venta a Crédito ("Fiado") y Cobranza de Abonos

**Módulo:** Clientes y Cuentas por Cobrar (`/clientes` y `/caja`)  
**Actor:** Cajero / Encargado de Sucursal  
**Prioridad:** Alta (P2)  
**Objetivo de Negocio:** Permitir el registro de clientes frecuentes, asignación de líneas de crédito comercial para el giro retail/abarrotes, realizar ventas a cuenta corriente ("fiado") respetando el límite de crédito, y registrar abonos en efectivo en caja que impactan el flujo del corte del día.

---

## Precondiciones
1. Base de datos con semillas cargadas (`npm run db:reset`).
2. Sesión de caja abierta en la sucursal activa.
3. Existencia de productos en catálogo para venta.

---

## Flujo Principal (Happy Path)

### Paso 1: Alta de Cliente con Línea de Crédito
- El usuario ingresa a `/clientes/nuevo`.
- Captura nombre, teléfono y asigna un límite de crédito comercial (ej. `$1,500.00 MXN`).
- Guarda el registro; el cliente aparece en el listado activo con saldo inicial en cero.

### Paso 2: Venta a Crédito en POS
- El cajero ingresa a `/pos`.
- Agrega artículos al carrito.
- Selecciona al cliente registrado para vincular la venta.
- Al cobrar, selecciona la modalidad "Crédito / Cuenta Corriente".
- El sistema valida que el importe no supere el límite disponible y confirma la venta.
- El saldo deudor del cliente se incrementa en el valor exacto de la venta.

### Paso 3: Registro de Abono en Caja
- El cliente acude al mostrador a abonar a su deuda (ej. `$200.00 MXN`).
- El cajero navega a `/clientes/[id]` o a la sección de cobranza en `/caja`.
- Registra el abono en efectivo con comprobante foliado.
- El saldo del cliente disminuye inmediatamente y el ingreso de efectivo queda asentado en el Corte X de la sesión de caja activa.

---

## Criterios de Aceptación (Invariantes de Verificación E2E)

1. **Invarianza de Cuentas por Cobrar:**
   - La deuda neta del cliente satisface en todo momento: $\text{Saldo Final} = \text{Ventas a Crédito} - \text{Abonos Registrados}$.
2. **Impacto en Flujo de Efectivo:**
   - Todo abono cobrado en efectivo incrementa el `expectedCashCents` de la sesión de caja abierta sin generar salidas de inventario.
3. **Consola Limpia:**
   - Cero errores `console.error` durante la navegación entre clientes y cobro.

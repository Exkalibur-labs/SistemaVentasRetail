# HU-RET-003: Compras a Proveedores con Flete Prorrateado y Libro Inmutable de Inventario

**Módulo:** Compras y Gestión de Inventarios (`/compras` e `/inventario`)  
**Actor:** Encargado de Almacén / Dueño (`user: dueno`)  
**Prioridad:** Alta (P2)  
**Objetivo de Negocio:** Registrar órdenes de compra a proveedores de abarrotes y retail (cerveceras, refresqueras, abarrotes al mayoreo), prorratear gastos de flete al costo unitario de cada producto, y recibir la mercancía garantizando que las existencias se asienten en el libro inmutable de inventario (`inventoryLedger`).

---

## Precondiciones
1. Base de datos con semillas cargadas (`npm run db:reset`).
2. Existencia de proveedores en el catálogo (`/compras/proveedores`).
3. Almacén principal activo en la sucursal.

---

## Flujo Principal (Happy Path)

### Paso 1: Creación de Orden de Compra
- El encargado ingresa a `/compras/nueva`.
- Selecciona el proveedor (ej. "Distribuidora de Abarrotes del Centro").
- Agrega líneas de compra: productos, cantidades y costo unitario pactado.
- Agrega costo de flete/envío adicional para prorrateo automático.
- Confirma la orden; se genera con estado `pendiente`.

### Paso 2: Recepción de Mercancía en Almacén
- Al llegar el camión de reparto, el encargado ingresa a `/compras/recepciones`.
- Selecciona la orden de compra y valida las cantidades físicas recibidas.
- Presiona "Confirmar recepción de mercancía".
- El sistema cambia el estado de la compra a `recibida`.

### Paso 3: Asentamiento en Libro Inmutable de Inventario
- El encargado navega a `/inventario`.
- Verifica que el stock disponible de cada producto aumentó exactamente en la cantidad recibida.
- El costo promedio unitario se actualiza reflejando la absorción del flete prorrateado.

---

## Criterios de Aceptación (Invariantes de Verificación E2E)

1. **Inmutabilidad del Libro de Inventario:**
   - La tabla `inventoryLedger` contiene un registro de tipo `purchase_receipt` por cada variante recibida con timestamp, costo unitario absorbido y usuario auditor.
2. **Costo Promedio Exacto:**
   - Ninguna operación genera fracciones de centavos en base de datos (`costCents = integer`).
3. **Consola Limpia:**
   - Cero errores `console.error` durante la creación y recepción de compras.

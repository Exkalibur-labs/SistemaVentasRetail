---
name: coneja-taproom-core
description: Guía de arquitectura técnica, modelo de datos, flujo de comandas KDS, On-Tap engine, compras de importación, facturación CFDI 4.0 y programa de fidelización para Coneja de la Luna Tap Room.
---

# Coneja de la Luna Tap Room — Core Technical & Architecture Skill

Esta skill documenta la arquitectura técnica, modelo de datos, flujos de operación y reglas de negocio del sistema ERP-POS para **Coneja de la Luna Tap Room**, combinando las capacidades de gestión de inventario estilo **Odoo**, punto de venta y comandas estilo **Loyverse**, facturación electrónica CFDI 4.0 con **Exkalibur Billing Core** y un motor de recompensas y fidelización de clientes.

---

## 1. Visión del Sistema y Personas Operativas

El sistema opera bajo un Monolito Modular basado en **Next.js 15 App Router**, **React 19**, **Tailwind CSS 4**, **Drizzle ORM** y **PostgreSQL**, diseñado para 4 roles operativos clave y la comunidad de clientes frecuentes:

1. **Daniel (Chef, Cajero y Facturador):**
   - **KDS de Cocina:** Gestión de comandas entrantes por tiempos, estados de preparación y avisos sonoros/visuales.
   - **Escandallos / BOM:** Deducción automática de insumos de cocina (carne, pan, quesos, salsas) al marchar la comanda.
   - **Caja y Cobro:** Apertura de caja, cobro multi-método, cortes ciegos X y Z con desglose por denominaciones de billetes/monedas.
   - **Facturación CFDI 4.0:** Emisión directa en caja y facturación global con `exkalibur-billing-service`.
2. **José (Proveedor e Importador de Cerveza):**
   - **On-Tap Engine:** Pizarra digital de grifos (Tap List 1..16), control de barriles (Kegs 20L, 30L, 50L), deducción por mililitros (pintas, medias pintas, samplers) y calibración de merma por espuma (5-8%).
   - **Importaciones & Landed Cost:** Órdenes de compra internacionales (USD/EUR), pedimentos aduanales, fletes y cálculo de **IEPS escalonado por ABV** (26.5%, 30%, 53%) prorrateado al costo unitario en centavos MXN.
3. **Juan (Renta, Inmobiliario y Activos Fijos):**
   - **Arrendamiento del Local:** Contratos de renta con retenciones de ISR (10%) e IVA (10.6667%) y alertas de pago.
   - **Activos Fijos:** Control de cuartos fríos, kegerators, torres de servicio, líneas de gas CO2/Beergas y bitácora de limpieza química quincenal de líneas.
   - **Finanzas Operativas:** Flujo de caja neto y estado de resultados consolidado.
4. **Meseros (Comandas Móviles y Servicio Ágil):**
   - **POS Móvil PWA:** Mapa interactivo de mesas (Salón, Barra, Terraza), cuentas abiertas (Tabs), modificadores al vuelo, división de cuentas (Split Bill) y registro transparente de propinas.
   - **Resiliencia Offline:** Persistencia local en IndexedDB y sincronización idempotente vía `client_side_uuid`.
5. **Clientes Frecuentes (Club de la Luna):**
   - Acumulación de Puntos Luna (5-10% del consumo), Tarjeta de Sellos Cervecera (10 pintas = 1 gratis) y niveles de membresía (*Gazapo*, *Conejo Cervecero*, *Luna Llena VIP*).
   - Portal web ligero (`/club-coneja`) y autofacturación desde el código QR impreso en el ticket de 80 mm.

---

## 2. Reutilización de Componentes del Ecosistema

- **Base de Retail (`SistemaVentasRetail`):**
  - Sesiones de caja y arqueo ciego (`cashSessions`, `cashMovements`, cortes X y Z).
  - Libro inmutable de inventario (`inventoryLedger` con triggers PostgreSQL).
  - Compras y proveedores con flete prorrateado (`purchasing.ts`).
  - Motor de promociones y Happy Hour (`promotions.ts`).
  - Impresión de tickets de 80 mm (`(print)/ticket`).
  - Reportes y analítica 5A con exportación Excel/PDF (`reports`).
- **Motor Fiscal (`exkalibur-billing-service`):**
  - Criptografía de sellos CSD en memoria RAM (Zero-Disk-Write con RSA-SHA256).
  - Envelope Encryption AES-256-GCM para llaves privadas de Coneja de la Luna.
  - Cálculo Anexo 20 con `Decimal.js` (Regla CFDI40169).
  - Timbrado e idempotencia tolerante a timeout código 307 con PAC SW Sapien.

---

## 3. Módulos y Tablas Drizzle Clave

- `taproom.ts`: `beerStyles`, `beerKegs`, `tapLines`, `tapMovements`.
- `recipes.ts`: `billOfMaterials` (BOM), `bomItems`.
- `imports.ts`: `importDeclarations`, `importDeclarationLines`.
- `facilities.ts`: `facilityContracts`, `fixedAssets`, `maintenanceLogs`.
- `dining-tables.ts`: `diningRooms`, `diningTables`.
- `orders-kds.ts`: `diningOrders`, `orderItems`, `orderSplits`.
- `loyalty.ts`: `customerLoyaltyAccounts`, `loyaltyTransactions`, `loyaltyRewards`.

---

## 4. Reglas Críticas de Negocio

1. **Deducción de Barril:** Toda venta de cerveza servida en grifo descuenta exactamente los mililitros configurados en la cristalería (ej. Pinta = 473 ml) multiplicados por el factor de merma técnico del barril (default 1.06).
2. **Costo Promedio Ponderado de Importación:** El costo de los barriles y latas importadas debe sumar el costo FOB en divisa convertido al tipo de cambio FIX más la proporción de flete, seguro, DTA, IGI e IEPS.
3. **Inmutabilidad del Kardex:** Queda prohibido modificar o eliminar filas de `inventory_ledger`. Cualquier ajuste por espuma excesiva o descarte de barril agrio se asienta como un movimiento de tipo `shrinkage` o `spoiled`.
4. **Propinas:** Las propinas registradas en caja o terminal no forman parte de los ingresos gravables del establecimiento y deben liquidarse al personal según el pool acordado.

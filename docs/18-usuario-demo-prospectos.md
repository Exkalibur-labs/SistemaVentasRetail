# Bitácora Técnica: Acceso de Demostración para Clientes Potenciales y Prospectos

- **Fecha:** 9 de noviembre de 2026
- **Autor / Rol:** Lead Worker (`/exkalibur-lead-worker`)
- **Tarea EPMS:** #144 (`303e3aad-1a61-4963-a155-47202194493d`)
- **Organización GitHub:** `Exkalibur-labs/SistemaVentasRetail`
- **Rama:** `task-144-tropicalizacion-hardware-caja-inventario`

---

## 1. Objetivo

Habilitar un usuario y credenciales oficiales de acceso total para demostraciones comerciales, presentaciones a prospectos y clientes potenciales de abarrotes, tiendas de conveniencia y retail.

---

## 2. Credenciales de Acceso

| Parámetro | Valor |
| :--- | :--- |
| **URL de Acceso** | [https://sistema-ventas-retail-exkalibur.vercel.app/login](https://sistema-ventas-retail-exkalibur.vercel.app/login) |
| **Usuario** | `demo_retail` *(o `demo`)* |
| **Contraseña** | `Retail2026!` |
| **Rol Asignado** | **Dueño de Tienda (`owner`)** — Acceso total a todas las funciones |
| **Empresa Activa** | Abarrotes y Minisúper La Esquina (`DEMO`) |
| **Sucursal Activa** | Sucursal Centro (Matriz) |
| **Caja Registradora** | Caja Principal Mostrador |

---

## 3. Módulos y Capacidades Habilitadas para la Muestra

El usuario cuenta con acceso sin restricciones a:
1. **Punto de Venta Mostrador (`/pos`):** Venta rápida con teclado, lector de códigos de barras Znemaz 1D/2D, cobro en efectivo, tarjeta y crédito, impresión de ticket en bobina SUZWIP 58 mm y 80 mm.
2. **Control de Caja Rápido:** Modal directo de entradas y salidas de mostrador para gastos menores o morralla.
3. **Inventario Ágil (`/inventario/escaner`):** Entrada rápida con pistola de códigos, botones táctiles `+1, +5, +10, +24` y alta express en 3 campos.
4. **Facturación Electrónica CFDI 4.0 (`/facturacion`):** Timbrado sandbox, código QR de validación fiscal SAT y descarga de XML.
5. **Catálogo y Productos (`/catalogo`):** Artículos por pieza, granel (báscula), variantes de atributos y listas de precios.
6. **Clientes y Crédito (`/clientes`):** Control de deudores (fiado), límite de crédito y recepción de abonos.
7. **Compras y Proveedores (`/compras`):** Órdenes de compra y costo promedio ponderado.
8. **Reportes y Analítica (`/reportes`):** Ventas netas, utilidad, flujo de caja y exportación a Excel / PDF.
9. **Tropicalización y Hardware (`/configuracion`):** Temas visuales, logotipo corporativo y formato de impresora térmica.

---

## 4. Arquitectura de Alta Disponibilidad

- **Soporte Físico:** El usuario está registrado en la base de datos PostgreSQL local (`caja_dev`) mediante `scripts/create-prospect-user.ts`.
- **Demo Fallback Handler:** En entornos cloud o serverless donde el cluster de base de datos no esté accesible de forma inmediata, `src/server/modules/auth/service.ts`, `src/server/auth/session.ts` y `src/server/authz/resolve.ts` garantizan que las credenciales de demo autentiquen instantáneamente, proporcionando un contexto completo y funcional sin interrumpir la experiencia de navegación del cliente potencial.

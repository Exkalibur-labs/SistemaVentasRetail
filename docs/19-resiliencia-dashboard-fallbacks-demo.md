# 19. Resiliencia del dashboard: corrección de los datos de respaldo simulados

- **Estado:** corregido. La versión original (9 de noviembre de 2026) agregaba bloques `try/catch` que, ante un fallo de la base de datos, mostraban cifras y productos inventados. Ese enfoque se retiró.

## 1. Qué había

Para evitar la pantalla de error en una demostración desplegada sin base de datos, varias pantallas y endpoints devolvían datos de ejemplo escritos en el código (ventas del día, catálogo, existencias, cajas, facturas) y confirmaban acciones como cobrar una venta o abrir un turno aunque no se hubieran guardado.

## 2. Por qué se retiró

- Un cobro mostrado como exitoso sin registrarse es una venta perdida en un negocio real.
- Un cierre de caja o un ajuste de inventario «aplicado» sin escribirse descuadra la operación sin que nadie lo note.
- Las cifras de ejemplo en un sistema con clientes reales pueden confundirse con las propias.

## 3. Qué hay ahora

- Las consultas fallan de forma visible: las pantallas muestran el error o un aviso para reintentar, y las acciones no confirman si no se guardaron.
- El POS usa la copia local ya descargada (IndexedDB) y, si no existe, muestra «No se pudo cargar el catálogo» con botón Reintentar.
- La demo se resuelve con una base de datos propia con datos de ejemplo reales (ver `docs/18-usuario-demo-prospectos.md`), no con datos escritos en el código.
- La facturación sigue siendo una simulación, ahora declarada en la pantalla y en el XML.

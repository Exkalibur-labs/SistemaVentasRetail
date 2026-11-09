# 21. Header Responsivo y Sucursal Única para Usuario Demo

**Fecha:** 2026-11-09  
**Autor:** Exkalibur Lead Worker (`/exkalibur-lead-worker`)  
**Rama:** `task-146-header-simplificado-sucursal-unica-demo`  
**Estado:** Implementado y Verificado

---

## 1. Contexto y Problema Detectado

Durante las pruebas con el usuario prospecto (`@demo_retail` / `demo_session_retail_prospect_2026`), se observaron dos problemas clave en la experiencia de usuario (UX):

1. **Header Confuso y Truncado en Pantallas Delgadas:**
   - En el encabezado se renderizaban dos elementos `<select>` adyacentes: uno para la empresa (`Abarrotes y Mini... ▼`) y otro para la sucursal (`Sucursal Centro ... ▼`).
   - Al tener `disabled={true}` cuando solo existía una opción, lucía como un formulario interactivo roto, carecía de etiqueta o icono indicativo de qué representaba el primer campo y en pantallas de laptop delgada o tablet/móvil colapsaba el texto cortándolo de manera incómoda.
2. **Multiplicidad Innecesaria de Sucursales en Demo:**
   - En la resolución de sesión mock demo (`src/server/authz/resolve.ts`), se configuraban dos sucursales (`Sucursal Centro` y `Sucursal Norte`), provocando que la métrica de inicio mostrara `2 activas que puedes ver` y fomentara la presencia de selectores en el header innecesariamente.

---

## 2. Decisiones de Ingeniería y Arquitectura

### A. Limitar Usuario Demo a Sucursal Única (`resolve.ts`)
- Se removió `Sucursal Norte` del mock del usuario demo (`demo_retail`).
- Ahora `branches` cuenta estrictamente con una sucursal: `Sucursal Centro (Matriz)`.
- En el dashboard (`HomePage`), la tarjeta de **Sucursales** refleja limpiamente `1 activa que puedes ver`.

### B. Header Adaptativo e Insignia de Identidad (`shell.tsx`)
- **Modo Identidad Única (`companies.length <= 1 && branches.length <= 1`):**
  - Se eliminan por completo los dropdowns `<select>` que generaban confusión.
  - Se renderiza una insignia elegante de identidad de negocio:
    - Icono de tienda (`<Store className="size-4 text-primary" />`).
    - Nombre del negocio con truncamiento responsivo (`Abarrotes y Minisúper La Esquina`).
    - Subtítulo de sucursal (`· Sucursal Centro (Matriz)`) con colapso defensivo en pantallas ultra delgadas (`hidden xs:inline`) para priorizar la marca principal.
    - Atributo `title` con el texto completo para accesibilidad y visualización nativa al pasar el cursor.
- **Modo Multi-Empresa o Multi-Sucursal (`companies.length > 1 || branches.length > 1`):**
  - Solo se renderiza un `<select>` cuando el usuario realmente posee más de una entidad a la cual cambiar.
  - Se acompaña cada selector con su respectivo icono (`Building2` para empresas, `Store` para sucursales) y atributos accesibles `aria-label` y `title`.
  - Si una de las dos entidades es fija (ej. 1 sola empresa pero 3 sucursales), se envía un `<input type="hidden" name="companyId" />` para mantener la integridad en el server action `switchContextAction`.

---

## 3. Verificación y Suite de Pruebas

- **Typecheck:** `tsc --noEmit` completado sin errores.
- **Linter:** `eslint` ejecutado al 100% limpio.
- **Tests Unitarios e Integración:** 105 tests pasando en Vitest (`tests/unit/*`, `tests/integration/*`).
- **Build de Producción:** `next build` finalizado con éxito (61 rutas estáticas y dinámicas optimizadas).

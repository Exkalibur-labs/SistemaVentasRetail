# React & Tailwind UI Standards (Exkalibur Standard)

Estándares de implementación de componentes UI en React, Next.js App Router y Tailwind CSS para el ecosistema Exkalibur.

## 1. Frontera Server vs Client Components
- Mantener páginas y layouts como **Server Components** por defecto.
- Colocar `"use client"` únicamente en los componentes hoja que requieren interactividad (`useState`, `useEffect`, event handlers, modales). Nunca envolver un layout completo en `"use client"` sin necesidad real.

## 2. Tailwind CSS Seguro en Compilación
- **PROHIBIDO** construir clases dinámicamente con interpolación de strings (`bg-${color}-500`, `text-${size}`), ya que el compilador JIT/Tailwind v4 las purga en producción.
- Usar diccionarios/mapas estáticos de clases completas combinados con `cn()` (`clsx` + `tailwind-merge`).
- Respetar estrictamente la paleta y tokens del proyecto (ej. Obsidian/Neón en apps Exkalibur). Evitar estilos cliché de *AI slop* (gradientes llamativos injustificados, exceso de badges decorativos).

## 3. Accesibilidad, Formularios y Feedback Reactivo
- **PROHIBIDO** usar `window.alert()`, `window.confirm()` o `window.prompt()` (en Web/PWA y React Native Web rompen la UX o son no-op). Usar componentes Modal/Dialog accesibles (`role="dialog"`, `aria-modal="true"`, soporte para cerrar con `Escape`).
- Todo botón con acción asíncrona debe mostrar estado pendiente (`useTransition` o `isPending`) con `disabled` + `aria-busy` para prevenir doble envío (*double submit*).
- Asegurar estados `focus-visible` visibles para navegación por teclado y *touch targets* mínimos de `44px` (`min-h-11` / `min-h-[44px]`) en controles móviles.
- Manejar explícitamente estados **Loading**, **Empty** y **Error** en toda vista que consuma datos remotos.

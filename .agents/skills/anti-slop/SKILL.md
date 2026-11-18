---
name: anti-slop
description: Reglas estrictas de higiene de código, prevención de sobre-ingeniería, seguridad de tipos real y revisión de diffs para erradicar el "AI slop" en código TypeScript, Next.js, Supabase y UI del ecosistema Exkalibur.
---

# Anti-Slop Engineering Skill (Exkalibur Standard)

Esta skill actúa como un **filtro negativo obligatorio** antes de cada commit para garantizar que el código escrito por agentes tenga calidad de **Senior Staff Engineer** y cero vicios típicos de generación automática (*AI slop*).

---

## 1. Reglas Estrictas de Código (Prohibiciones Absolutas)

### A. Seguridad de Tipos Real (Cero Evasiones)
- **PROHIBIDO** usar `as any`, `as unknown as T`, `@ts-ignore` o `@ts-expect-error` para silenciar errores del compilador. Si un tipo no cuadra, modela correctamente el contrato o usa un type guard / schema Zod.
- **PROHIBIDO** usar bloques `catch {}` o `.catch(() => {})` vacíos que traguen errores en silencio (siempre loguear estructuradamente o degradar con estado explícito).

### B. Cero Sobre-Ingeniería (*No One-Caller Abstractions*)
- **PROHIBIDO** crear clases `Manager`, `Factory`, `Wrapper` o archivos de utilidades que solo se utilizan en **un único lugar**.
- Mantén la lógica lo más directa y plana posible (*early returns*, funciones pequeñas, cero indirección innecesaria).

### C. Cero Ruido en Comentarios y Código Muerto
- **PROHIBIDO** escribir comentarios que narren lo obvio (`// Obtiene el usuario`, `// Retorna el resultado`). Comenta únicamente el **por qué** de una restricción de negocio, concurrencia o workaround externo.
- **PROHIBIDO** dejar `console.log` de depuración, imports huérfanos, variables sin usar o bloques de código comentados.

### D. Cero Simulaciones o Tests Vacíos
- **PROHIBIDO** entregar `TODO` / `FIXME` pendientes en rutas críticas, mocks hardcodeados dentro de código de producción, o tests tautológicos (`expect(true).toBe(true)`, `it.skip` silenciosos).

### E. Higiene de UI y Copy
- **PROHIBIDO** introducir estilos genéricos cliché ("AI slop": tarjetas con gradientes neón aleatorios fuera de paleta, badges decorativos sin función, textos de relleno genéricos). Respeta estrictamente los tokens de diseño del repositorio.

---

## 2. Puerta de Revisión Pre-Commit (*Diff Hygiene Gate*)

Antes de ejecutar `git commit`, el agente **DEBE** revisar `git diff` y validar:
1. **Cero Scope Creep:** El diff toca exclusivamente los archivos necesarios para la tarea asignada.
2. **Cero Secretos o Artefactos:** Ningún `.turbo/*.log`, `.DS_Store`, ni tokens en texto claro.
3. **Densidad y Claridad:** Si una función agregada puede simplificarse eliminando abstracciones innecesarias, simplifícala antes de hacer push.

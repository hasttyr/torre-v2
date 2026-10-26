# Plantilla de historia de usuario

Copia este bloque al archivo de la épica correspondiente (`docs/stories/EP-xx-*.md`) y regenera el índice (`docs/USER-STORIES.md` §7). El formato es el mismo que usan las historias existentes: el índice se genera leyendo estos campos.

```markdown
### US-nnn — <Título corto>
- **Epic:** EP-xx · **Fase:** Fx · **Prioridad:** MUST | SHOULD | COULD · **Tamaño:** S | M | L | XL · **Estado:** READY | PARTIAL(OQ-nnn) | BLOCKED(OQ-nnn) | LATER | IN_PROGRESS | DONE
- **Historia:** Como <rol> quiero <capacidad> para <beneficio>.
- **Contexto:** <Por qué existe, qué problema resuelve, qué restricciones lo condicionan. 3-6 líneas. Si es L/XL, cómo dividirla.>
- **Referencias:** `BR-…`, `DEC-…`, `INV-…`, `GV-…`, `SRC-…`, `OQ-…`, `docs/…` §…
- **Criterios de aceptación** (cada uno debe poder convertirse en una prueba):
  1. Dado <contexto>, cuando <acción>, entonces <resultado observable>.
  2. …
- **Plan de división** (obligatorio si el tamaño es L o XL; una parte por sesión y por PR, cada una S o M):
  - (a) <alcance> — criterios <n, m> · S | M
- **Pruebas requeridas:** unitarias; propiedades (`INV-…`); casos dorados (`GV-…`); integración / e2e; casos del plan (`TC-…`) si aplica.
- **Depende de:** US-… (o —)
- **Depende (parcial):** US-… (opcional: dependencias que solo aplican a una parte; no cuentan para los niveles)
- **Fuera de alcance:** …
- **Notas para la IA:** <paquete/módulo destino, decisiones ya tomadas, trampas conocidas, qué NO asumir>
```

## Reglas para redactar

- Criterios **observables y medibles**; evitar "debe funcionar bien".
- Si un criterio depende de una regla no confirmada, referenciar la `OQ-*` y marcar la historia `PARTIAL` o `BLOCKED`.
- Si un valor viene de una fuente externa, citar su `SRC-*` (y el artículo); nunca valores de memoria.
- Una historia que no cabe en una sesión se divide (`AI-WORKFLOW.md` §8).
- Casos límite explícitos: vacío, uno, impares, retiros, empates totales.
- Incluir siempre "Fuera de alcance" para frenar la sobreingeniería.

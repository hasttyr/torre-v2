# Plantilla de Pull Request

```markdown
## Historia
US-nnn — <título> (docs/stories/EP-xx-….md)

## Qué cambia
<2-5 líneas. Qué y por qué, no cómo.>

## Criterios de aceptación → pruebas
| # | Criterio | Prueba (archivo › nombre) |
|---|---|---|
| 1 | | |

## Evidencia
- [ ] `pnpm lint` ✔
- [ ] `pnpm typecheck` ✔
- [ ] `pnpm test` (alcance: <paquetes>) ✔
- [ ] `pnpm test:e2e` (si aplica) ✔
- [ ] `pnpm test:trace`: la historia no tiene criterios sin prueba ✔
- [ ] Enlace a la ejecución en rojo antes de implementar (pruebas primero)
- [ ] Defectos corregidos con prueba `[DEF-nnn]` (si aplica)
<pegar la salida resumida y el enlace a los artefactos de la ejecución>

## Definition of Done (docs/AI-WORKFLOW.md §6.2)
- [ ] Sin supresiones nuevas (`any`, `@ts-ignore`, `eslint-disable`)
- [ ] Sin cambios fuera del alcance
- [ ] Documentación actualizada (¿cuál?): …
- [ ] Estado de la historia actualizado
- [ ] Dominio: propiedades `INV-…` y casos dorados con fuente
- [ ] API: contratos y OpenAPI regenerados; authz con prueba de otro tenant
- [ ] UI: carga/vacío/error, i18n es+en, teclado, contraste

## Reglas de negocio implementadas
`BR-…` (cada una citada en código o pruebas)

## Decisiones
¿Se tomó alguna? → `DEC-…` / `ADR-…` · Preguntas abiertas nuevas → `OQ-…`

## Riesgos / deuda
<qué queda pendiente o puede fallar>

## Revisión humana requerida
<!-- El PR se fusiona solo al pasar la CI (DEC-102): la revisión es posterior. Para revisar antes, ábralo como borrador. -->
- [ ] Sí, después de la fusión (dominio crítico / contratos / migraciones / authz)
- [ ] No
```

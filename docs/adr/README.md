# ADR — Registros de decisiones de arquitectura

Un ADR documenta una decisión significativa, su contexto, las alternativas y las consecuencias. Las decisiones tomadas en la fase de diseño están en `docs/ARCHITECTURE.md` §20 (`DEC-001..055`); aquí se registran las **nuevas** y las que requieren más desarrollo.

## Cuándo escribir uno

- Agregar o reemplazar una dependencia importante o una librería de UI.
- Cambiar una decisión `DEC-*` existente.
- Cambios de modelo de datos o de eventos con impacto amplio.
- Decisiones de infraestructura, seguridad o rendimiento con alternativas reales.
- Fijar versiones (`ADR-0001`).

## Numeración y estados

`ADR-0001-titulo-en-kebab-case.md`. Estados: `Propuesto`, `Aceptado`, `Reemplazado por ADR-nnnn`, `Rechazado`. Un ADR aceptado **no se edita** salvo para marcarlo reemplazado; se escribe uno nuevo.

Plantilla: `docs/templates/adr-template.md`.

## Índice

| ADR | Título | Estado | Relacionado |
|---|---|---|---|
| [ADR-0001](ADR-0001-stack-and-versions.md) | Stack y versiones verificadas | Aceptado (2026-10-26) | `DEC-001`, `DEC-063`, `DEC-071`, `US-001` |
| [ADR-0002](ADR-0002-orpc-contracts.md) | Contratos de API con oRPC: resultado de la prueba previa | Aceptado (2026-10-27) | `DEC-060`, `DEC-020`, `US-008` |
| [ADR-0003](ADR-0003-local-s3-rustfs.md) | S3 local: RustFS en lugar de MinIO | Aceptado (2026-10-26) | `DEC-016`, `US-003` |
| [ADR-0004](ADR-0004-api-tests-without-swc.md) | Pruebas de la API sin SWC | Aceptado (2026-10-26) | `DEC-021`, `ADR-0001`, `US-005` |

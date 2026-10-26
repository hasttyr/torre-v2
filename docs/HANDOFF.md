# HANDOFF.md — Estado para la siguiente sesión

> Se **sobrescribe** al cerrar cada sesión (`AI-WORKFLOW.md` §9). La IA lo lee justo después de `CLAUDE.md`.

## Estado actual

- **Fecha:** 2026-10-26
- **Fase / rebanada en curso:** F0 · VS-1 (sin iniciar). Los tiempos y el alcance de cada entrega los gestiona el responsable (`DEC-055` anulado).
- **Última sesión:** auditoría de preparación para implementar (sin código). Repositorio Git inicializado en esta carpeta, rama `main`, **sin commits** (el primero lo decide el responsable).
- **Siguiente historia recomendada:** `US-001` — monorepo ESM, TypeScript estricto, scripts de `CONSTRAINTS.md` y `ADR-0001`.

## Hecho en la última sesión

- Todas las decisiones técnicas confirmadas: `[PROPUESTO]` → `[DECIDIDO]`; decisiones nuevas `DEC-062`…`DEC-084` (`ARCHITECTURE.md` §20).
- **Seguridad** (`DEC-062`): contraseña NIST SP 800-63B-4, argon2id 19 MiB/t=2/p=1, acceso de 5 min y sesión de 24 h, cookie `__Host-refresh` `Strict` con Fetch Metadata, límites de tasa, idempotencia con 409 y 7 días, secreto TOTP con AES-256-GCM; 2FA obligatorio para `platform_admin`.
- **FIDE leído completo** y contrastado (`SOURCES.md` §5): C.07 2026 (Arts. 15–16 reescritos en `BR-TIE-03`), C.04.3 (procedimiento de *brackets* en `BR-PAIR-04`), C.04.1, C.04.2 (orden de mesas, correcciones, orden inicial con título), C.04.6 y Olimpiada 2026 (colores de equipos), tablas de Berger (algoritmo verificado de 3 a 16), tablas 8.1.1 y 8.1.2 de B.02 transcritas, Leyes del Ajedrez Art. 6.7.1. Caso dorado nuevo `GV-005`.
- **Licencias y compatibilidad** (`SOURCES.md` §6): Nest 12 (solo ESM), TypeScript 7 frente a 6, oRPC 1.16, Vitest 5 sin SWC (`ADR-0004`), `@casl/prisma` hasta Prisma 7, Neon, Render, BullMQ; TRF26 localizado.
- **Artefactos nuevos:** `CONSTRAINTS.md` (todo bloquea; control rápido ≤ 90 s), `docs/THREAT-MODEL.md`, `docs/SCREENS.md` (aprobado), `docs/requests/SOLICITUD-ASCUN.md`, ejemplo de estilo en `CONVENTIONS.md` §2.1, sistema visual en `UI-UX.md` §3 (aprobado).
- **Historias nuevas:** `US-115` (check-in), `US-116` (logo), `US-117` (colas y *worker*). Total: 102. Las 34 historias L y XL tienen plan de división.
- `OPEN-QUESTIONS.md` reescrito: lo pendiente es de ASCUN y el motor de análisis de `US-093`.

## Decisiones de esta sesión que conviene recordar

- Correcciones según FIDE C.04.2 Art. 4.3: tras el final de la ronda siguiente, solo cuentan para el rating (`DEC-051`, `INV-S-5`).
- El emparejamiento corre en la cola `pairing` (`202` + estado del trabajo); la clasificación sigue síncrona (`DEC-079`). Por eso `US-117` está en VS-1.
- Los *workers* fijan el tenant como la API; solo la cola `maintenance` tiene un rol con `BYPASSRLS` y es la única que purga datos técnicos vencidos (`DEC-078`, `CLAUDE.md` regla 13).
- URL públicas con la organización: `/t/:orgSlug/:slug` (`DEC-083`); campeonatos con visibilidad propia y tope (`DEC-084`).

## Deuda y riesgos

- **Enviar la solicitud a ASCUN** (`docs/requests/SOLICITUD-ASCUN.md`): `OQ-001`, `OQ-023`, `OQ-009`, `OQ-013`, `OQ-016`, `OQ-017`, `OQ-024`, `OQ-026`, `OQ-028`. Mientras tanto, presets ASCUN en `DRAFT`.
- La política `FIDE_C07_2026` devuelve `NOT_IMPLEMENTED_POLICY` hasta tener casos dorados verificados con el texto 2026 (los de `SRC-07` son de 2023).
- `ADR-0001` debe elegir TypeScript 6 o 7 (comprobando los decoradores de Nest), la LTS de Node vigente, Prisma 7.x y la lista de contraseñas comunes con su licencia.
- La prueba de oRPC (`US-008`) decide entre `DEC-060` y `DEC-020`; resultado en `ADR-0002`.
- Riesgos residuales de seguridad `RR-1`…`RR-5` (`THREAT-MODEL.md` §6).

## Preguntas abiertas que más importan

- `OQ-001` (reglamento ASCUN vigente) y `OQ-023` (desempates de ASCUN): bloquean la aprobación de los presets ASCUN, no el arranque.
- `OQ-018`: motor de análisis de `US-093` (Stockfish es GPL-3.0); se decide al llegar a F6.

## Antes de empezar la próxima sesión

1. Leer `CLAUDE.md`, `CONSTRAINTS.md`, este archivo y `US-001` (con su plan de trabajo: es M y no necesita división).
2. Hacer el primer commit de la documentación si el responsable lo aprueba.
3. Al crear el monorepo, volver a comprobar las versiones de `SOURCES.md` §6 y registrarlas en `ADR-0001`.

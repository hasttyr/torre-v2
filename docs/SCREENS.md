# SCREENS.md — Pantallas, rutas y flujos por rol

> Estado: `[DECIDIDO]` (aprobado por el responsable el 2026-10-26, con la página pública del ranking institucional). Lo implementan `US-066`…`US-079`, `US-102`, `US-107`…`US-113` y `US-116`. Cada pantalla cita sus historias y los endpoints de `ARCHITECTURE.md` §9.2; no hay pantallas sin historia. Roles con las siglas de `AUTHORIZATION.md` §3: **ES** espectador · **PL** jugador · **CP** capitán · **AR** árbitro · **TD** director · **OA** administrador de organización · **OO** dueño · **PA** `platform_admin`.

## 1. Esquema de rutas

| Prefijo | Para quién | Autenticación |
|---|---|---|
| `/`, `/t/:orgSlug/:slug/…`, `/c/:orgSlug/:slug` | Público (directorio, torneos y campeonatos `PUBLIC` o `UNLISTED`; `DEC-083`, `DEC-084`) | No |
| `/login`, `/register`, `/forgot-password`, … | Acceso | No |
| `/account/…` | La cuenta propia | Sí |
| `/orgs/:orgSlug/…` | Gestión dentro de una organización | Sí, con membresía |
| `/orgs/:orgSlug/tournaments/:tournamentId/…` | Gestión y arbitraje de un torneo | Sí, con rol en el torneo o la organización |
| `/admin/…` | Consola de plataforma | Sí, `platform_admin` con 2FA (`BR-AUTH-06`) |

Reglas:
- Las rutas van en inglés, como los endpoints; los textos, en español por i18n (`DEC-019`).
- Filtros, orden y página de las tablas viven en la query string (`DEC-040`).
- Los *guards* del router ocultan lo que el usuario no puede hacer (`can()`), pero la autorización real es del servidor (`CLAUDE.md` regla 7).
- Una ruta privada sin sesión redirige a `/login?redirect=…` y vuelve al destino tras entrar (`US-066`).

## 2. Inventario

### 2.1 Públicas

| ID | Pantalla | Ruta | Historias | Datos (`ARCHITECTURE.md` §9.2) |
|---|---|---|---|---|
| SCR-01 | Directorio de torneos | `/` | US-113 | `GET /public/tournaments` |
| SCR-02 | Portada del torneo | `/t/:orgSlug/:slug` | US-070 | `GET /public/tournaments/{slug}` |
| SCR-03 | Clasificación en vivo | `/t/:orgSlug/:slug/standings` | US-053, US-070, US-071 | `standings`, WebSocket |
| SCR-04 | Mesas de una ronda | `/t/:orgSlug/:slug/rounds/:n` | US-053, US-070 | `pairings`, WebSocket |
| SCR-05 | Cuadro cruzado | `/t/:orgSlug/:slug/crosstable` | US-070 | `crosstable` |
| SCR-06 | Ficha de jugador, equipo o institución | `/t/:orgSlug/:slug/players/:id`, `/teams/:id`, `/institutions/:id` | US-070 | lecturas públicas |
| SCR-07 | Modo proyector | `/t/:orgSlug/:slug/projector` | US-074 | `standings`, `pairings`, WebSocket |
| SCR-08 | Ranking institucional público de un campeonato | `/c/:orgSlug/:slug` | US-100 | `GET /public/championships/{orgSlug}/{slug}` |
| SCR-09 | Suscribirse, confirmar y darse de baja | `/t/:orgSlug/:slug/subscribe`, `/subscriptions/confirm`, `/subscriptions/unsubscribe` | US-060, US-063 | `subscriptions` |

### 2.2 Acceso y cuenta

| ID | Pantalla | Ruta | Historias | Datos |
|---|---|---|---|---|
| SCR-10 | Entrar, registrarse, desafío 2FA | `/login`, `/register`, `/two-factor-challenge` | US-022, US-066, US-107 | `/auth/*` |
| SCR-11 | Verificar email, olvidé mi contraseña, restablecer | `/verify-email`, `/forgot-password`, `/reset-password` | US-027 | `/auth/*` |
| SCR-12 | Aceptar invitación | `/invitations/:token` | US-026 | `POST /invitations/{token}/accept` |
| SCR-13 | Perfil y contraseña | `/account/profile` | US-022 | `/user/profile-information`, `/user/password` |
| SCR-14 | Seguridad: 2FA, códigos de recuperación, sesiones | `/account/security` | US-022, US-107 | `/user/two-factor-*`, `/user/sessions` |
| SCR-15 | Mis datos: exportar, revocar, suprimir | `/account/privacy` | US-111 | `/me/data-export`, `/me/privacy-requests` |
| SCR-16 | Mis solicitudes de rol | `/account/role-requests` | US-029 | `/me/role-requests`, `/role-requests` |
| SCR-17 | Centro de avisos | `/account/notifications` (y la campana) | US-112 | `/me/notifications` |
| SCR-18 | Mi torneo (jugador vinculado): mesa, color, rival, posición, check-in | `/account/tournaments/:tournamentId` | US-102, US-115 | `GET /me/games`, check-in |
| SCR-19 | Seguimientos | `/account/following` | US-076 | — (preferencias) |

### 2.3 Organización

| ID | Pantalla | Ruta | Historias | Roles |
|---|---|---|---|---|
| SCR-20 | Inicio de la organización (torneos, avisos) | `/orgs/:orgSlug` | US-066 | OO, OA, TD, AR |
| SCR-21 | Configuración y logo | `/orgs/:orgSlug/settings` | US-023, US-116 | OO, OA |
| SCR-22 | Miembros: invitar, cambiar rol con razón, revocar | `/orgs/:orgSlug/members` | US-026, US-028 | OO, OA |
| SCR-23 | Bandeja de solicitudes de rol | `/orgs/:orgSlug/role-requests` | US-029 | revisor elegible |
| SCR-24 | Jugadores e importación CSV | `/orgs/:orgSlug/players`, `/players/import` | US-031 | OO, OA, TD |
| SCR-25 | Importación de ratings y títulos | `/orgs/:orgSlug/ratings/import` | US-104 | OO, OA, TD |
| SCR-26 | Campeonatos y ranking institucional | `/orgs/:orgSlug/championships`, `/:id` | US-100 | OO, OA, TD |
| SCR-27 | Reglas (`RuleSet`) | `/orgs/:orgSlug/rulesets` | US-010 | OO, OA |

### 2.4 Torneo (gestión y arbitraje)

Ruta base: `/orgs/:orgSlug/tournaments/:tournamentId`.

| ID | Pantalla | Ruta | Historias | Roles |
|---|---|---|---|---|
| SCR-30 | Crear torneo | `/orgs/:orgSlug/tournaments/new` | US-030, US-067, US-078 | OO, OA, TD |
| SCR-31 | Resumen y estado (transiciones del torneo) | `…/` | US-034, US-039, US-067 | TD+ |
| SCR-32 | Configuración (reglas, rondas, check-in, visibilidad) | `…/settings` | US-030, US-115 | TD+ |
| SCR-33 | Inscripción y siembra | `…/participants` | US-032, US-038, US-067 | TD+ |
| SCR-34 | Equipos, plantillas y alineaciones | `…/teams` | US-033, US-040 | TD+, CP (su equipo) |
| SCR-35 | Ronda: generar (estado del trabajo), revisar, ajustar, publicar | `…/rounds/:n` | US-035, US-041, US-068 | TD+, AR |
| SCR-36 | Check-in de la ronda | `…/rounds/:n/check-in` | US-115 | TD+, AR |
| SCR-37 | Resultados de la ronda (teclado), forfeits, correcciones | `…/rounds/:n/results` | US-036, US-037, US-038, US-068, US-073 | AR, TD+ |
| SCR-38 | Clasificación con "explicar puesto" | `…/standings` | US-013, US-071 | TD+, AR |
| SCR-39 | Reclamaciones | `…/claims` | US-103 | TD+ (y comisión) |
| SCR-40 | Premiación | `…/prizes` | US-101 | TD+ |
| SCR-41 | Reportes PDF | `…/reports` | US-064, US-065 | TD+ |
| SCR-42 | Exportaciones (CSV, JSON, TRF, PGN) | `…/exports` | US-080, US-081, US-082 | TD+ |
| SCR-43 | Línea de tiempo de auditoría | `…/audit` | US-047 | TD+ |
| SCR-44 | Árbitro sin conexión (estado de sincronización) | dentro de SCR-37 | US-091 | AR |

### 2.5 Plataforma

| ID | Pantalla | Ruta | Historias |
|---|---|---|---|
| SCR-50 | Consola: usuarios (suspender, reactivar), organizaciones, instituciones | `/admin`, `/admin/users`, `/admin/organizations`, `/admin/institutions` | US-110, US-031 |
| SCR-51 | Roles y permisos | `/admin/roles` | US-108 |
| SCR-52 | Papelera y restauración por lote | `/admin/trash` | US-109 |
| SCR-53 | Solicitudes de los titulares | `/admin/privacy-requests` | US-111 |
| SCR-54 | Auditoría de plataforma | `/admin/audit` | US-110 |
| SCR-55 | Solicitudes de nueva organización | `/admin/role-requests` | US-029 |

Toda pantalla tiene estados de carga, vacío y error, funciona con teclado y cumple el contraste de `UI-UX.md` §9 (`CLAUDE.md` §7).

## 3. Navegación

- **Barra superior:** logo de Torre, búsqueda (`US-072`), paleta de comandos (`Ctrl+K`, `US-073`), campana de avisos (`US-112`), menú de cuenta, selector de idioma y tema.
- **Menú lateral** según el contexto: organización (SCR-20 a SCR-27) o torneo (SCR-31 a SCR-43). El de torneo muestra la ronda actual y su estado.
- **Migas de pan:** organización › torneo › ronda.
- En móvil, el menú lateral se pliega en un cajón; las pantallas del árbitro (SCR-35 a SCR-37) priorizan una columna y objetivos táctiles de 44 px (`UI-UX.md` §9).

## 4. Flujos por rol

**Espectador (ES)** — SCR-01 → SCR-02 → SCR-03/SCR-04 en vivo → (opcional) SCR-09 suscribirse con doble confirmación → recibe el email al cerrar la ronda. Sin cuenta.

**Cuenta nueva** — SCR-10 registrarse (nace como espectador, `BR-ROLE-01`) → SCR-11 verificar email → SCR-16 solicitar un rol con razón → espera la resolución en SCR-17.

**Jugador (PL)** — recibe la invitación de vinculación (`US-102`) → SCR-12 → SCR-18 Mi torneo: hace el check-in si está abierto (`US-115`) → ve mesa, color y rival → consulta SCR-03.

**Árbitro (AR)** — SCR-20 → torneo → SCR-36 marca el check-in de quien llega → SCR-35 revisa la ronda publicada → SCR-37 registra resultados con teclado (`1`, `0`, `=`, `Enter`) → corrige con razón → si pierde la conexión, sigue registrando y sincroniza después (SCR-44).

**Director (TD)** — SCR-30 crear torneo → SCR-32 configurar → SCR-33 inscribir y sembrar → SCR-31 abrir inscripción e iniciar → por ronda: SCR-36 abrir y cerrar el check-in → SCR-35 generar (espera el trabajo), revisar `diagnostics`, ajustar si hace falta y publicar → SCR-37 supervisar resultados → SCR-31 cerrar la ronda → al final: SCR-40 premiación, SCR-41 informe final, SCR-31 cerrar el torneo. Reclamaciones en SCR-39 en cualquier momento.

**Capitán (CP)** — SCR-34 entrega la alineación de su equipo antes de cada ronda.

**Administrador o dueño de la organización (OA, OO)** — SCR-21 datos y logo → SCR-22 invitar y asignar roles con razón → SCR-23 resolver solicitudes → SCR-24 y SCR-25 cargar jugadores y ratings → SCR-26 armar el campeonato.

**`platform_admin` (PA)** — activa el 2FA (SCR-14; sin él no usa permisos reservados) → SCR-55 aprueba organizaciones nuevas → SCR-50 administra usuarios e instituciones → SCR-51 roles y permisos → SCR-52 papelera → SCR-53 solicitudes de titulares → SCR-54 auditoría.

## 5. Aprobación

Aprobado el 2026-10-26: esquema de rutas en inglés con la organización en las URL públicas (`DEC-083`), inventario, navegación y flujos, más la página pública del ranking institucional (SCR-08, `DEC-084`). Cualquier pantalla nueva entra con su historia y se añade aquí en el mismo cambio.

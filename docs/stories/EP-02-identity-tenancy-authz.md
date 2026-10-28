# EP-02 — Identidad, multi-organización y autorización

> Fase F2. Seguridad por diseño: autenticación, aislamiento entre organizaciones (RLS) y permisos con condiciones sobre el recurso. Ver `AUTHORIZATION.md`.

### US-022 — Registro, inicio de sesión y sesiones con refresh rotativo
- **Epic:** EP-02 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** DONE
- **Historia:** Como usuario quiero crear una cuenta e iniciar sesión de forma segura para acceder a mis torneos.
- **Contexto:** Núcleo del módulo `auth` estilo Fortify (`AUTHORIZATION.md` §11). **Dividir:** (a) registro, login y tokens; (b) sesiones y suspensión.
- **Referencias:** BR-AUTH-01..04, BR-AUTH-07..09, BR-ROLE-01 · DEC-010, DEC-057, DEC-062 · `ARCHITECTURE.md` §12, §14 · INV-A-1, INV-A-2, INV-A-4
- **Criterios de aceptación:**
  1. `POST /auth/register` (email, contraseña, nombre, idioma) con la política de contraseña de `BR-AUTH-09` (NIST SP 800-63B-4: 15 a 64 caracteres sin reglas de composición y lista local de contraseñas comunes; `PASSWORD_POLICY_VIOLATION`); email único (sin revelar existencia en las respuestas de login/recuperación). La cuenta nace sin membresías: es espectador (`BR-ROLE-01`), y se registra la aceptación de la política de tratamiento con su versión (`BR-AUTH-03`).
  2. Contraseñas con **argon2id** de 19 MiB, t=2 y p=1 (`ARGON2_*`, OWASP); nunca se loguean.
  3. `POST /auth/login` (estrategia `passport-local`) devuelve *access token* JWT de **5 minutos** y establece la cookie `__Host-refresh` (`HttpOnly; Secure; SameSite=Strict; Path=/`) con *refresh token* opaco; la sesión dura **24 horas absolutas** desde el login (`DEC-062`).
  4. `POST /auth/refresh` **rota** el refresh token: invalida el anterior y enlaza la familia; si se reutiliza uno ya rotado, se revoca toda la familia (`INV-A-1`).
  5. `POST /auth/logout` revoca la familia actual.
  6. Límites de tasa en registro y login: 10 intentos cada 15 minutos por IP y por cuenta; bloqueo de 15 minutos tras 10 fallos seguidos (`BR-AUTH-07`, contadores en Redis).
  7. Eventos de seguridad (login, refresh reutilizado, logout) van al `audit_log`.
  8. El JWT se valida en cada petición con `passport-jwt` (estrategia global; las rutas públicas se marcan con `@Public()`).
  9. Sesiones: cada familia de refresh es una sesión (`auth_sessions`); `GET /user/sessions` las lista y `DELETE /user/other-sessions` cierra las demás (con confirmación de contraseña cuando exista `US-107`).
  10. Una cuenta suspendida o anonimizada no inicia sesión ni renueva (`ACCOUNT_SUSPENDED`, `BR-AUTH-08`).
  11. CSRF: `/auth/refresh` y `/auth/logout` rechazan peticiones cross-site según `Sec-Fetch-Site`, con respaldo de `Origin`/`Referer` (`INV-A-4`).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Registro, login, tokens, límites de tasa y CSRF — criterios 1–6, 8, 11 · M. Se divide al empezar (2026-10-27): **(a1)** registro, contraseñas, login con *access token* y cookie, guard global — criterios 1, 2, 3, 8; **(a2)** rotación del *refresh* con detección de reuso, logout, límites con bloqueo y CSRF — criterios 4, 5, 6, 11.
  - (b) Sesiones, auditoría y cuentas suspendidas — criterios 7, 9, 10 · M
- **Pruebas requeridas:** e2e: flujo completo, reutilización de refresh, expiración, cookies con flags correctos, enumeración de usuarios, límites de tasa; `TEST-PLAN.md` TC-036, TC-104, TC-207.
- **Depende de:** US-006, US-007, US-008
- **Fuera de alcance:** verificación de email y recuperación (`US-027`), 2FA y confirmación de contraseña (`US-107`), SSO.
- **Notas para la IA:** el refresh **no** es un JWT; es aleatorio y se guarda **hasheado**.
- **Implementación (a1), 2026-10-27:** contratos `auth.register`, `auth.login` y `auth.me` (`GET /me`); tablas `users` (email en minúsculas con índice único parcial entre cuentas vivas, `display_name`, versión de la política aceptada), `auth_sessions` y `refresh_tokens` (el rol de mantenimiento puede purgar los vencidos); política de `BR-AUTH-09` con la lista de SecLists fijada (47 317 entradas de 8 a 64 caracteres, `apps/api/assets/common-passwords.txt`); argon2id con `ARGON2_*`; login sin `passport-local` y guard global `passport-jwt` con `@Public()` (detalle en `AUTHORIZATION.md` §11). El nombre se guarda como `display_name` (`DEC-089`) y la versión de la política es `PRIVACY_POLICY_VERSION` (`DEC-088`). `ip_hash` de la sesión queda vacío hasta (b), que lista las sesiones.
- **Implementación (a2), 2026-10-27:** contratos `auth.refresh` y `auth.logout` (204 sin cuerpo); rotación con *compare-and-set* en la transacción: el perdedor de una carrera cuenta como reutilización y revoca la familia (`DEC-092`); el sucesor vence con la sesión (24 h desde el login); `logout` revoca la familia de la cookie en cualquier estado y borra la cookie; `SameSiteGuard` en ambas rutas (`DEC-091`). Límites de registro y login por IP y por email en Redis, con bloqueo tras 10 fallos seguidos (`DEC-093`); contadores compartidos con un almacén propio sobre `ioredis`, que también usa el límite general por usuario o IP (`DEC-090`); `apiError` acepta `retryAfterSeconds` (cabecera `Retry-After`). La cobertura de `apps/api` se juzga con unitarias e integración combinadas (`DEC-094`). Quedan para (b): `audit_log` de los eventos de seguridad (criterio 7), sesiones (9) y cuentas suspendidas (10).
- **Implementación (b), 2026-10-27:** tabla `audit_log` de solo inserción desde su migración (`REVOKE UPDATE` al rol de la app y *triggers* que rechazan `UPDATE`, `DELETE` y `TRUNCATE` incluso al dueño, `DEC-077`; adelanta el criterio 7 de `US-025`); módulo `audit` con `AuditLog.record(entry, tx?)`, que guarda el hash de la IP y el `correlationId` de la petición. Eventos (`DEC-095`): login correcto, fallido o rechazado por el estado de la cuenta, *refresh* reutilizado o rechazado, logout de una sesión abierta y cierre de las demás sesiones. La IP se guarda como HMAC-SHA-256 con `IP_HASH_SECRET` en la sesión y en la auditoría (`DEC-096`). Contratos `user.sessions` (`GET /user/sessions`) y `user.revokeOtherSessions` (`DELETE /user/other-sessions`, 204), que exige que la sesión actual siga abierta (`DEC-097`). Cuentas suspendidas o anonimizadas: 403 `ACCOUNT_SUSPENDED` solo con la contraseña correcta, y el *refresh* revoca la familia (`DEC-098`). Las cuatro decisiones quedan `PROPUESTO` hasta que el responsable las confirme. La confirmación de contraseña de `DELETE /user/other-sessions` llega con `US-107`.

### US-023 — Organizaciones y membresías
- **Epic:** EP-02 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** DONE
- **Historia:** Como usuario quiero crear una organización y tener roles dentro de ella para gestionar torneos como equipo.
- **Referencias:** DEC-009, DEC-011 · `AUTHORIZATION.md` §2–§3
- **Criterios de aceptación:**
  1. Tablas `organizations` y `memberships (user_id, scope_type, scope_id, role, revoked_at)` con restricciones de unicidad.
  2. Solo `platform_admin` crea organizaciones directamente; las demás cuentas, por solicitud aprobada (`US-029`, `DEC-056`). Quien la crea o la solicita queda como `org_owner`.
  3. Enumeraciones de rol y alcance definidas en `packages/contracts` y usadas en API y web.
  4. Listado de "mis organizaciones" y "mis membresías".
  5. Una organización siempre conserva al menos un `org_owner` (no se puede quitar el último).
- **Pruebas requeridas:** e2e de creación y consulta; prueba de "último owner".
- **Depende de:** US-022
- **Fuera de alcance:** invitaciones (`US-026`), permisos finos (`US-024`).
- **Implementación, 2026-10-27 (decisiones `DEC-099`…`DEC-101`, `PROPUESTO`):** migración `organizations_memberships` con `organizations` (*slug* único entre las vivas, formato y longitud comprobados también en la base), `roles` con los 7 roles del sistema y su alcance, y `memberships` con las columnas de §8.1 de `ARCHITECTURE.md`: una membresía viva por usuario, rol y alcance (`NULLS NOT DISTINCT`), el rol solo en su alcance (clave compuesta `(role_id, scope_type)`), `organization_id` y `scope_id` nulos solo en `PLATFORM` y el alcance `ORGANIZATION` igual a la organización. Criterio 5 en la base: *triggers* de restricción diferidos (`memberships_keep_an_org_owner`, `organizations_need_an_org_owner`) bloquean la fila de la organización y cuentan los dueños vivos al confirmar; una organización tampoco nace sin dueño. `@torre/contracts` exporta `ROLE_KEYS`, `ROLE_SCOPES`, `SCOPE_TYPES`, `MEMBERSHIP_SOURCES` y `ORGANIZATION_SLUG`; la web tiene sus nombres en español (`roleLabelKey`, `scopeLabelKey`). Rutas `POST /organizations`, `GET /organizations` y `GET /me/memberships` (módulo `organizations`); la creación deja `organization.created` y `membership.granted` en `audit_log`. El primer `platform_admin` (comando de consola y *seed*) llega con `US-028`; mientras, las pruebas le dan la membresía en la base. El error de la API al quitar al último dueño (hoy, el de la base) se define con `US-028`, que es quien revoca.

### US-024 — Autorización con CASL y matriz de pruebas
- **Epic:** EP-02 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** IN_PROGRESS
- **Historia:** Como responsable quiero que cada acción se autorice según rol, alcance y estado del recurso para evitar accesos indebidos.
- **Referencias:** DEC-011, DEC-058 · `AUTHORIZATION.md` §3–§6 · INV-T-2, INV-T-3, INV-T-6, INV-T-7, INV-T-8
- **Criterios de aceptación:**
  1. Tablas `permissions` (catálogo sincronizado desde el código con `permissions:sync`), `roles` y `role_permissions`; los roles del sistema se siembran con la matriz de `AUTHORIZATION.md` §4 (`DEC-058`). La fábrica `defineAbilitiesFor(user, grants)` construye las reglas de CASL desde los permisos de sus roles (§4.1, §6.1).
  2. Decorador `@RequirePermission()` (guard de Nest o middleware de oRPC) para la verificación gruesa, y comprobación fina de acción + recurso cargado + condiciones en el servicio.
  3. Interfaz `AuthorizationService.can(user, action, resource)` desacoplada del motor (permite cambiar CASL).
  4. Los permisos efectivos se cargan por petición con caché en Redis por usuario y versión de roles; cambiar un rol, sus permisos o una membresía la invalida; **no** van en el JWT.
  5. **Matriz de pruebas generada desde una tabla** (rol × acción × recurso × estado): cualquier cambio de política muestra qué casos cambian.
  6. Pruebas de IDOR: un capitán no puede operar sobre un equipo ajeno cambiando el ID; un árbitro de un torneo no registra resultados en otro.
  7. Condición de estado: nadie registra resultados nuevos en rondas `CLOSED`; solo `game.correct_admin` corrige ahí (`DEC-051`).
  8. `GET /me/abilities` devuelve las reglas empaquetadas para `@casl/vue` (solo para la UI).
  9. Los listados se filtran según los permisos con `@casl/prisma` (`accessibleBy`).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Tablas de permisos y roles, `permissions:sync` y semilla de la matriz — criterios 1 · M
  - (b) `@RequirePermission()`, `AuthorizationService.can()` y caché en Redis — criterios 2, 3, 4 · M
  - (c) Matriz de pruebas generada, IDOR y condiciones de estado — criterios 5, 6, 7 · M
  - (d) `GET /me/abilities` y listados filtrados con `accessibleBy` — criterios 8, 9 · S
- **Pruebas requeridas:** matriz completa; IDOR; estado del recurso; usuario sin membresía; semilla = matriz (`INV-T-8`); permisos reservados (`INV-T-6`); propiedad de reglas de estado con permisos aleatorios (`INV-T-7`).
- **Depende de:** US-023
- **Fuera de alcance:** RLS de BD (`US-025`).
- **Notas para la IA:** la UI puede ocultar botones con `can()`, pero la API **siempre** revalida.
- **Avance desde `US-023` (2026-10-27):** la tabla `roles` ya existe con los 7 roles del sistema (`DEC-099`). `POST /organizations` se autoriza con una membresía en el alcance `PLATFORM` y un `TODO(US-024)` (`DEC-100`): cambiarlo por `@RequirePermission('organization.create')` en (b).
- **Implementación (a), 2026-10-28 (`DEC-103`, `PROPUESTO`):** catálogo `PERMISSIONS` (71 claves con grupo, sujeto de CASL, reservado y descripción), `SYSTEM_ROLE_PERMISSIONS`, `ACCOUNT_PERMISSIONS` y `permissionScopeTypes` en `@torre/contracts`; la matriz de `AUTHORIZATION.md` §4 con la columna "Permisos" (y las filas separadas o añadidas que explica `DEC-103`), que la prueba de `INV-T-8` lee y compara con el código. Migración `permissions`: `permissions` (la app solo lee) y `role_permissions` con un *trigger* que rechaza reservados fuera de `platform_admin` (`INV-T-6`, `RESERVED_PERMISSION`) y permisos fuera del alcance del rol. `pnpm permissions:sync` (rol de migraciones; la plantilla de las pruebas de integración también lo corre) carga el catálogo y siembra la matriz solo para permisos nuevos. `defineAbilitiesFor(user, grants)` en `apps/api/src/authz` con `@casl/ability` 7.0.2 (`ADR-0001`, `DEC-011`): lectura pública, permisos de la cuenta propia y permisos de cada membresía limitados a su alcance. Las reglas de estado (§5) llegan con (c); cargar los permisos por petición, con (b).

### US-025 — Aislamiento por tenant con Row-Level Security
- **Epic:** EP-02 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** READY
- **Historia:** Como responsable quiero que la base de datos misma impida cruzar datos entre organizaciones para tener defensa en profundidad.
- **Referencias:** DEC-009 · `ARCHITECTURE.md` §6.3, §8.3 · INV-T-1 · R1
- **Criterios de aceptación:**
  1. Todas las tablas de tenant tienen `organization_id`, `ENABLE` y `FORCE ROW LEVEL SECURITY` y política con `current_setting('app.organization_id', true)`.
  2. El rol de aplicación no es dueño de las tablas ni tiene `BYPASSRLS`.
  3. Contexto de tenant por petición (`nestjs-cls`) y `withTransaction` fija `set_config('app.organization_id', …, true)` al inicio de **cada** transacción.
  4. Una consulta sin tenant fijado devuelve **cero filas** (falla cerrada), no todas.
  5. Política de lectura pública para torneos `PUBLIC` mediante rol/vistas separados, sin habilitar lectura de otras tablas.
  6. Pruebas de integración que intentan leer/escribir datos de otro tenant por SQL directo, ORM y casos de olvido de contexto.
  7. `audit_log` solo admite inserción: `REVOKE UPDATE, DELETE` al rol de la app y un trigger que los bloquea (`DEC-077`, `INV-E-7`).
  8. Los *workers* abren sus transacciones con el `organizationId` del trabajo, igual que la API; el rol de mantenimiento (`DATABASE_MAINTENANCE_URL`) solo tiene permisos sobre las tablas de la cola `maintenance` (`DEC-078`, `INV-T-9`).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Políticas RLS, rol sin `BYPASSRLS`, contexto por petición y falla cerrada — criterios 1–4 · M
  - (b) Lectura pública y pruebas de cruce de tenants — criterios 5, 6 · M
  - (c) `audit_log` solo inserción y tenant en los *workers* — criterios 7, 8 · S
- **Pruebas requeridas:** `INV-T-1` automatizado sobre **todas** las tablas con `organization_id` (la prueba enumera tablas desde el catálogo y falla si alguna carece de política).
- **Depende de:** US-007, US-023
- **Depende (parcial):** US-117 (prueba de RLS en los *workers*)
- **Fuera de alcance:** cifrado en reposo, particionado.
- **Notas para la IA:** si Prisma impide el patrón (R1), documenta en ADR y propone Kysely/Drizzle para esa capa.
- **Avance desde `US-023` (2026-10-27):** `organizations`, `roles` y `memberships` existen sin RLS. `GET /me/memberships` y `GET /organizations` leen las membresías de la cuenta en **todas** sus organizaciones: necesitan, además de la política por `organization_id`, una por `app.user_id` (como `role_requests`), y ya pasan `userId` a `withTransaction`. Los roles del sistema (`organization_id` nulo) se leen desde cualquier tenant, como los presets de `rulesets`. El *trigger* del último dueño bloquea la fila de la organización: con RLS, la política debe dejar verla dentro de su tenant.
- **Avance desde `US-022b` (2026-10-27):** `audit_log` ya nace de solo inserción (`REVOKE UPDATE` y *triggers* contra `UPDATE`, `DELETE` y `TRUNCATE`), con pruebas `[US-025:AC7]` en `apps/api/test/auth-sessions.spec.ts`. Falta su RLS: hoy solo guarda eventos sin organización (`organization_id` nulo).

### US-026 — Invitaciones y gestión de miembros
- **Epic:** EP-02 · **Fase:** F2 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como administrador de organización quiero invitar a árbitros, directores y capitanes y cambiar o revocar sus roles.
- **Referencias:** `AUTHORIZATION.md` §3 · BR-AUD-02
- **Criterios de aceptación:**
  1. Invitación por email con token de un solo uso y expiración, para un rol y alcance concretos.
  2. Aceptar la invitación crea la membresía (o crea cuenta si no existe).
  3. La invitación usa el cambio directo de rol de `US-028` (con su razón y auditoría); aquí solo se agrega el envío por email y la aceptación.
  4. No se pueden otorgar roles de mayor jerarquía que el propio (sin escalada de privilegios).
- **Pruebas requeridas:** e2e: invitar, aceptar, expirar, reusar token, escalada de privilegios.
- **Depende de:** US-024, US-028, US-061
- **Fuera de alcance:** SSO.

### US-027 — Verificación de email y recuperación de contraseña
- **Epic:** EP-02 · **Fase:** F2 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como usuario quiero verificar mi email y recuperar mi contraseña para mantener mi cuenta segura.
- **Referencias:** BR-AUTH-01, BR-AUTH-04 · DEC-010, DEC-057 · `ARCHITECTURE.md` §12
- **Criterios de aceptación:**
  1. Tokens aleatorios, de un solo uso, hasheados en BD y con expiración corta.
  2. La respuesta de "olvidé mi contraseña" no revela si el email existe.
  3. Cambiar contraseña revoca todas las sesiones activas.
  4. Plantillas de email con i18n (es primero).
- **Pruebas requeridas:** e2e con Mailpit: flujo completo, reuso, expiración.
- **Depende de:** US-022, US-061
- **Fuera de alcance:** 2FA y confirmación de contraseña (`US-107`).

### US-028 — Cambio directo de rol con razón
- **Epic:** EP-02 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como administrador quiero asignar, cambiar o revocar el rol de una cuenta directamente, dejando la razón, para habilitar a directores, árbitros y capitanes sin esperar una solicitud.
- **Contexto:** Toda cuenta nace como espectador (`BR-ROLE-01`). Esta historia saca de `US-026` el cambio de rol para que no dependa de la infraestructura de email. **Dividir:** (a) API y reglas; (b) pantalla de miembros.
- **Referencias:** BR-ROLE-01, BR-ROLE-02, BR-ROLE-05, BR-ROLE-07, BR-AUD-02 · DEC-056 · INV-T-4, INV-T-5 · `AUTHORIZATION.md` §3, §9
- **Criterios de aceptación:**
  1. El registro (`US-022`) no crea membresías: una cuenta nueva es espectador (`BR-ROLE-01`).
  2. `POST /memberships`, `PUT /memberships/{id}` y `DELETE /memberships/{id}` asignan, cambian y revocan un rol en un alcance, con `reason` obligatoria (mínimo 10 caracteres).
  3. Sin escalada: el actor necesita `membership.grant` en el alcance y todos los permisos del rol que otorga (subconjunto, `AUTHORIZATION.md` §3); nunca `platform_admin` por API; siempre queda al menos un `org_owner`.
  4. El cambio surte efecto de inmediato: se invalida la caché de membresías del usuario afectado.
  5. Cada cambio queda en `audit_log` con actor, rol anterior y nuevo, alcance, razón y origen `DIRECT`.
  6. El primer `platform_admin` se crea con un comando de consola auditado (`users:grant-platform-admin --email`); en desarrollo lo crea el seed de `US-007` (`pnpm db:seed`), que esta historia amplía con el usuario admin local (idempotente, con id fijo y contraseña solo de desarrollo).
  7. Pantalla de miembros del alcance (organización o torneo): lista, cambio y revocación con un diálogo que exige la razón.
  8. Exige confirmación de contraseña reciente (`BR-AUTH-05`) cuando exista `US-107`.
- **Pruebas requeridas:** e2e de asignar, cambiar y revocar; escalada; último `org_owner`; caché invalidada; auditoría (`TEST-PLAN.md` TC-105).
- **Depende de:** US-024
- **Depende (parcial):** US-107 (confirmación de contraseña)
- **Fuera de alcance:** invitaciones por email (`US-026`).
- **Avance desde `US-023` (2026-10-27):** la base ya impide dejar una organización sin `org_owner` vivo (revocar o cambiar el rol del último falla al confirmar con la restricción `organizations_keep_an_org_owner`, SQLSTATE `23514`); esta historia traduce ese fallo a un error de la API. La membresía guarda `source`, `granted_by`, `grant_reason`, `revoked_by` y `revoke_reason`; la razón obligatoria de `BR-ROLE-02` se valida aquí.

### US-029 — Solicitudes de rol con razón y bandeja de revisión
- **Epic:** EP-02 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como espectador quiero solicitar un rol (o la creación de mi organización) explicando la razón, y como revisor quiero aprobar o rechazar esas solicitudes dejando rastro.
- **Contexto:** `DEC-056`. Los avisos se muestran en el centro de avisos de la app (`US-112`) y por email cuando exista EP-06. **Dividir:** (a) API y reglas; (b) pantallas: solicitar, mis solicitudes y bandeja del revisor.
- **Referencias:** BR-ROLE-03..07 · DEC-056 · INV-T-4, INV-T-5 · `AUTHORIZATION.md` §9
- **Criterios de aceptación:**
  1. `POST /role-requests` con rol, alcance (organización, torneo o equipo existentes, o "nueva organización" con el nombre propuesto), razón de 30 a 1 000 caracteres (sin contar los espacios al inicio y al final) y cargo o vínculo opcional; sin adjuntos.
  2. Rechazos de validación: razón fuera de rango (`VALIDATION_FAILED`), pendiente duplicada para el mismo rol y alcance (`ROLE_REQUEST_DUPLICATE`), rol ya poseído (`ROLE_ALREADY_GRANTED`), `platform_admin` no solicitable, más de 5 solicitudes por día (`RATE_LIMITED`).
  3. Estados `PENDING → APPROVED | REJECTED | WITHDRAWN | EXPIRED`: vence a los 14 días; el autor la retira mientras esté pendiente; una solicitud resuelta, retirada o vencida no cambia (`ROLE_REQUEST_NOT_PENDING`).
  4. Solo un revisor elegible la resuelve (`BR-ROLE-05`); el autor nunca resuelve la suya; rechazar exige razón.
  5. Aprobar crea, en la misma transacción, la membresía (origen `REQUEST`, enlazada a la solicitud) o, si es una nueva organización, la organización con su `org_owner`; aprobar dos veces no duplica nada.
  6. Bandeja del revisor con las pendientes de su alcance y su contador; el autor ve el estado de las suyas y, si fue rechazada, la razón.
  7. RLS de `role_requests`: el autor ve las suyas, el revisor las de su alcance, y las de nueva organización solo su autor y `platform_admin`.
  8. Todo queda en `audit_log` (`BR-ROLE-07`).
- **Pruebas requeridas:** `TEST-PLAN.md` TC-106, TC-107 y TC-108 (API) y TC-057 (e2e: solicitar → aprobar → el rol funciona).
- **Depende de:** US-028
- **Depende (parcial):** US-112 (centro de avisos)
- **Fuera de alcance:** avisos por email (EP-06); documentos adjuntos.

### US-102 — Jugador vinculado: vinculación con cuenta y vista personal
- **Epic:** EP-02 · **Fase:** F2/F4 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como jugador quiero vincular mi cuenta a mi ficha para ver mis partidas, mesa, color y posición.
- **Contexto:** El rol `player` existe en `AUTHORIZATION.md`, pero ninguna historia lo usaba. **Dividir:** (a) API de vinculación y `GET /me/games`; (b) pantalla "Mi torneo".
- **Referencias:** `AUTHORIZATION.md` §3–§4 · BR-PRIV-01, BR-PRIV-02 · INV-T-3
- **Criterios de aceptación:**
  1. El director invita a vincular una ficha con un email; el usuario acepta con un token de un solo uso y se crea la membresía `player`.
  2. `GET /me/games` devuelve las partidas del jugador vinculado (ronda, mesa, color, rival, resultado) y su posición actual.
  3. Un jugador no ve datos privados de otros jugadores (IDOR) ni borradores de ronda.
  4. Desvincular revoca la membresía y queda en `audit_log`.
  5. Pantalla "Mi torneo" con estados de carga, vacío y error.
- **Pruebas requeridas:** e2e de vinculación; IDOR; autorización.
- **Depende de:** US-024, US-031, US-046
- **Fuera de alcance:** que el jugador reporte resultados (`OQ-005`).

### US-116 — Logo de la organización
- **Epic:** EP-02 · **Fase:** F3 · **Prioridad:** SHOULD · **Tamaño:** S · **Estado:** READY
- **Historia:** Como dueño o administrador de una organización quiero subir su logo para que aparezca en los reportes y en sus páginas.
- **Contexto:** `OQ-011` reserva un espacio para el logo en el PDF neutro de Torre; `DEC-076` fija los límites.
- **Referencias:** DEC-016, DEC-076 · `AUTHORIZATION.md` §4 (editar organización) · `ARCHITECTURE.md` §14
- **Criterios de aceptación:**
  1. `PUT /organizations/{id}/logo` acepta PNG, JPEG o WebP de ≤ 512 KB (`LOGO_MAX_BYTES`); comprueba el tipo por la firma del archivo, no por la extensión ni por la cabecera; rechaza SVG y todo lo demás con `UNSUPPORTED_MEDIA_TYPE` (415) y lo que excede el tamaño con `PAYLOAD_TOO_LARGE` (413).
  2. Lo hacen el dueño y el administrador de esa organización (permiso de editar la organización); nadie más (IDOR).
  3. El archivo va al almacenamiento S3 con una clave nueva; `organizations.logo_key` apunta a la última. Reemplazarlo no borra el objeto anterior (`CLAUDE.md` regla 13) y queda en `audit_log`.
  4. Se sirve con URL firmada de corta duración o desde las páginas públicas del torneo si este es `PUBLIC`; el PDF lo incrusta en el encabezado (`US-064`).
  5. Pantalla en la configuración de la organización con vista previa y estados de carga y error.
- **Pruebas requeridas:** `TEST-PLAN.md` TC-208: tipos válidos, SVG y archivo con extensión falsa rechazados, tamaño, autorización entre organizaciones.
- **Depende de:** US-023, US-065
- **Fuera de alcance:** recortar o redimensionar la imagen; varios logos por organización.

### US-107 — Autenticación de dos factores (TOTP) y confirmación de contraseña
- **Epic:** EP-02 · **Fase:** F2 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como usuario quiero proteger mi cuenta con un segundo factor y confirmar mi contraseña antes de acciones delicadas.
- **Contexto:** Funciones `twoFactorAuthentication` y `passwordConfirmation` del módulo estilo Fortify (`BR-AUTH-05`, `BR-AUTH-06`). El 2FA es opcional por usuario y **obligatorio para `platform_admin`** (`OQ-031` resuelta).
- **Referencias:** BR-AUTH-01, BR-AUTH-05, BR-AUTH-06, BR-AUTH-09, BR-AUTH-10 · DEC-057, DEC-062 · INV-A-3
- **Criterios de aceptación:**
  1. `POST /user/two-factor-authentication` genera el secreto TOTP (cifrado con AES-256-GCM y clave versionada, `BR-AUTH-10`) y su QR; `POST /user/confirmed-two-factor-authentication` lo activa solo con un código válido.
  2. Se generan 8 códigos de recuperación de un solo uso, guardados con hash; `POST /user/two-factor-recovery-codes` los regenera e invalida los anteriores.
  3. Con 2FA activo, el login devuelve un desafío y `POST /auth/two-factor-challenge` acepta un código TOTP (ventana de ±1 intervalo) o uno de recuperación, con límite de intentos.
  4. `DELETE /user/two-factor-authentication` desactiva el 2FA y exige confirmación de contraseña; si la contraseña tiene menos de 15 caracteres, exige cambiarla en el mismo paso (`BR-AUTH-09`). Un `platform_admin` no puede desactivarlo.
  5. `POST /user/confirm-password` marca la sesión como confirmada durante 15 minutos; las acciones sensibles (`BR-AUTH-05`) sin confirmación reciente responden `PASSWORD_CONFIRMATION_REQUIRED` (423).
  6. Pantallas: activar (QR y verificación), códigos de recuperación (se muestran una sola vez y se pueden descargar), desafío en el login y diálogo de confirmación de contraseña.
  7. Eventos de seguridad en `audit_log`: activar, desactivar y usar un código de recuperación.
  8. Un `platform_admin` sin 2FA activo recibe `TWO_FACTOR_REQUIRED` (403) al usar cualquier permiso reservado, y la consola le pide activarlo (`BR-AUTH-06`).
- **Pruebas requeridas:** `TEST-PLAN.md` TC-152; `INV-A-3`.
- **Depende de:** US-022
- **Fuera de alcance:** WebAuthn/passkeys, SMS.

### US-108 — Gestión de roles y permisos estilo Spatie (solo `platform_admin`)
- **Epic:** EP-02 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como administrador de plataforma quiero ajustar los permisos de los roles y crear roles propios por organización para adaptar el sistema a cada organizador sin cambiar código.
- **Contexto:** `DEC-058`. La base (catálogo, tablas, semilla y CASL) la crea `US-024`; esta historia agrega la administración. **Dividir:** (a) API y reglas; (b) editor en la consola de plataforma.
- **Referencias:** `AUTHORIZATION.md` §3, §4.1, §6 · DEC-058 · INV-T-6, INV-T-7, INV-T-8
- **Criterios de aceptación:**
  1. `GET /admin/permissions` lista el catálogo agrupado; `GET` y `POST /admin/roles` y `PUT /admin/roles/{id}/permissions` (equivalente a `syncPermissions`) solo para `platform_admin`.
  2. Roles propios de una organización, con nombre, alcance y un subconjunto del catálogo, válidos solo en esa organización.
  3. Ningún permiso reservado se asigna a un rol distinto de `platform_admin` (`RESERVED_PERMISSION`, `INV-T-6`).
  4. Cada cambio exige razón y confirmación de contraseña reciente (`BR-AUTH-05`) y queda en `audit_log` con los permisos antes y después.
  5. Los cambios surten efecto en la siguiente petición (se invalida la caché de permisos).
  6. `POST /admin/roles/{id}/reset` devuelve un rol del sistema a la matriz de `AUTHORIZATION.md` §4.
  7. Un rol solo se borra (lógicamente) si nadie lo tiene asignado; `permissions:sync` informa las diferencias entre el código y la base.
  8. Editor en la consola: casillas por grupo de permisos, reservados bloqueados y vista previa de los usuarios afectados.
- **Pruebas requeridas:** `TEST-PLAN.md` TC-173; propiedad `INV-T-7`.
- **Depende de:** US-024, US-107
- **Fuera de alcance:** permisos asignados a un usuario individual (solo por rol).

### US-109 — Borrado lógico, papelera, restauración, archivo de torneos y anonimización
- **Epic:** EP-02 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** READY
- **Historia:** Como administrador de plataforma quiero borrar sin perder datos, poder restaurar y anonimizar a un titular cuando la ley lo pida.
- **Contexto:** `DEC-059`, `AUTHORIZATION.md` §10, `ARCHITECTURE.md` §8.4. **Dividir:** (a) base de datos (columnas, `REVOKE DELETE`, RLS e índices parciales); (b) papelera y restauración; (c) archivo de torneos; (d) anonimización.
- **Referencias:** BR-DEL-01..08, BR-PRIV-03, BR-AUD-06 · DEC-059 · INV-D-1..D-4
- **Criterios de aceptación:**
  1. Toda tabla de negocio CRUD tiene `deleted_at`, `deleted_by`, `delete_reason` y `deletion_batch_id`, y el rol de la app no tiene `DELETE` sobre ella (la prueba enumera las tablas desde el catálogo).
  2. Una política RLS restrictiva oculta lo borrado en toda consulta normal; solo el servicio de papelera lo ve (`app.include_deleted`, tras verificar `trash.view`).
  3. Las restricciones de unicidad son índices parciales `WHERE deleted_at IS NULL`.
  4. `DELETE` en la API es borrado lógico, solo de `platform_admin`, con razón y confirmación de contraseña; marca en cascada a los dependientes con el mismo `deletion_batch_id`. Una organización con torneos en curso no se borra (`HAS_ACTIVE_TOURNAMENTS`).
  5. La papelera (`GET /admin/trash`) se filtra por tipo, organización y fecha; restaurar devuelve el lote completo, y un conflicto de unicidad responde `RESTORE_CONFLICT` sin restaurar nada.
  6. Torneos: `TournamentArchived` y `TournamentUnarchived` (solo `platform_admin`, con razón) los ocultan de listados y vistas públicas sin tocar sus eventos.
  7. Anonimización (`BR-DEL-07`): reemplaza los datos personales por valores irreversibles y conserva IDs, resultados y clasificaciones; es irreversible y queda auditada.
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Base de datos: columnas, `REVOKE DELETE`, RLS restrictiva e índices parciales — criterios 1, 2, 3 · M
  - (b) Borrado lógico en la API, papelera y restauración por lote — criterios 4, 5 · M
  - (c) Archivo de torneos — criterios 6 · S
  - (d) Anonimización — criterios 7 · M
- **Pruebas requeridas:** `TEST-PLAN.md` TC-174, TC-175, TC-176; `INV-D-1..D-4`.
- **Depende de:** US-025, US-107
- **Fuera de alcance:** purga física (no existe, salvo en tablas técnicas).

### US-110 — Consola de administración de plataforma
- **Epic:** EP-02 · **Fase:** F2/F4 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como administrador de plataforma quiero un solo lugar para operar cuentas, organizaciones, instituciones, papelera, roles y auditoría.
- **Referencias:** BR-AUTH-08, BR-DEL-01..08 · `AUTHORIZATION.md` §4, §4.1 · DEC-058, DEC-059
- **Criterios de aceptación:**
  1. Usuarios: búsqueda, ver sus roles y sesiones, suspender y reactivar con razón (`BR-AUTH-08`); suspender revoca todas sus sesiones.
  2. Organizaciones e instituciones: alta, edición y borrado lógico; catálogo de instituciones con código SNIES.
  3. Bandeja de solicitudes de "nueva organización" (`US-029`).
  4. Papelera y restauración (UI de `US-109`) y editor de roles y permisos (UI de `US-108`).
  5. Auditoría de plataforma (`audit_log`), filtrable y exportable.
  6. Solo accesible con permisos reservados; toda acción sensible pide confirmación de contraseña.
- **Pruebas requeridas:** `TEST-PLAN.md` TC-177; autorización (ningún otro rol entra).
- **Depende de:** US-108, US-109
- **Fuera de alcance:** métricas de negocio.

### US-111 — Derechos del titular de datos (Ley 1581)
- **Epic:** EP-02 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como titular de mis datos quiero consultarlos, actualizarlos, revocar mi autorización y pedir su supresión, como lo exige la ley.
- **Contexto:** `BR-PRIV-03`, `BR-PRIV-04`, `SRC-10`. Sin eliminación automática: se anonimiza solo a petición del titular (`OQ-020` resuelta). Sin revisión jurídica: riesgo aceptado (`DEC-065`).
- **Referencias:** BR-PRIV-01..04, BR-DEL-07, BR-AUTH-03 · DEC-029, DEC-059 · `SRC-10`
- **Criterios de aceptación:**
  1. El registro guarda la aceptación de la política de tratamiento con su versión y fecha; si la versión cambia, se pide aceptarla de nuevo al iniciar sesión.
  2. `GET /me/data-export` entrega los datos personales y los registros propios en JSON.
  3. El titular actualiza sus datos de perfil; los datos de jugador se rectifican a través de su organización.
  4. `POST /me/privacy-requests` (revocar la autorización o suprimir) queda registrada con fecha de recepción y fecha límite en días calendario: 10 para consultas y 15 para reclamos, más estricto que los días hábiles de la Ley 1581, Arts. 14–15 (`DEC-073`); la resuelve el `platform_admin`, y la supresión se ejecuta como anonimización (`BR-DEL-07`) porque los resultados deportivos se conservan.
  5. Bandeja de solicitudes del titular en la consola de plataforma, con alertas de vencimiento (`US-112`).
  6. Todo queda auditado.
- **Pruebas requeridas:** `TEST-PLAN.md` TC-178; `INV-D-4`.
- **Depende de:** US-022, US-109
- **Fuera de alcance:** asesoría legal; inscripción en el RNBD ante la SIC.

# THREAT-MODEL.md — Modelo de amenazas y clasificación de datos

> Estado: `[DECIDIDO]` (2026-10-26). Método: STRIDE por frontera de confianza. Cada mitigación cita la regla, decisión o invariante que la exige y la prueba que la verifica; lo que no tiene control escrito está en §6 como riesgo residual. **Se actualiza en la misma historia que cambie una frontera** (nueva entrada de datos, nuevo servicio externo, nuevo rol).

## 1. Alcance y supuestos

- Proyecto académico: demo local con Docker y un plan de despliegue opcional (`OQ-004`, `ARCHITECTURE.md` §16.5). Sin datos reales ni producción; los temas legales son un riesgo aceptado (`DEC-065`).
- Lo que más importa proteger es la **integridad y la auditabilidad** de resultados, emparejamientos y clasificaciones (`PRODUCT.md`), el **aislamiento entre organizaciones** y las **credenciales**.
- No hay pagos, ni funciones de IA, ni subida de documentos de identidad.

## 2. Activos

| Activo | Por qué importa | Dónde vive |
|---|---|---|
| Resultados, emparejamientos y clasificaciones oficiales | Es el valor del producto: deben ser correctos, reproducibles y auditables | `events` (inmutable), instantáneas en `RoundClosed`/`TournamentClosed` (`DEC-044`) |
| Credenciales y sesiones | Dan acceso a todo lo demás | `users.password_hash`, `refresh_tokens`, `auth_sessions`, `two_factor_*` |
| Permisos y roles | Deciden quién puede corregir resultados o borrar | `roles`, `role_permissions`, `memberships` |
| Aislamiento entre organizaciones | Una fuga cruza datos de universidades distintas | RLS en todas las tablas con `organization_id` (`DEC-009`) |
| Datos personales | Nombres, emails, cuentas; Ley 1581 | `users`, `players`, `subscriptions` (§5) |
| Rastro de auditoría | No repudio de acciones sensibles | `events`, `audit_log` (`DEC-077`) |
| Disponibilidad en vivo | Un torneo en curso no puede detenerse | API, WebSocket, Redis, *workers* |

## 3. Fronteras de confianza

| ID | Frontera | Quién escribe los datos que la cruzan |
|---|---|---|
| F1 | Navegador → API HTTP (oRPC/REST) | Cualquier usuario, autenticado o no |
| F2 | Navegador ↔ WebSocket (Socket.IO) | Cualquier usuario; anónimos en torneos públicos |
| F3 | Público anónimo → páginas y API públicas, metadatos OG | Cualquiera en internet |
| F4 | API y *workers* → PostgreSQL | El código de la aplicación con su rol (`app_user`), el rol de migraciones y el de mantenimiento |
| F5 | API y *workers* → Redis | El código de la aplicación (colas, límites de tasa, caché de permisos, adaptador del WebSocket) |
| F6 | Archivos que suben los usuarios (CSV, TRF, PGN, logos) | Directores, administradores de organización |
| F7 | *Workers* → email (Mailpit o proveedor) | El sistema, con datos de los suscriptores |
| F8 | API y *workers* → almacenamiento S3 | El sistema (PDF) y los administradores (logos) |
| F9 | Árbitro sin conexión: IndexedDB → sincronización | El árbitro, desde un dispositivo que puede perderse |
| F10 | Consola de plataforma | `platform_admin` |
| F11 | Fuentes externas: lista de ratings de FIDE (`US-104`, opcional) | Un tercero |
| F12 | Cadena de suministro: dependencias y CI | Autores de paquetes de npm, la propia IA |

## 4. STRIDE por frontera

| Frontera | Amenaza | Escenario | Mitigación | Prueba |
|---|---|---|---|---|
| F1 | **S** Suplantación | Adivinar contraseñas, reusar un *refresh* robado | argon2id 19 MiB/t=2/p=1; política NIST (`BR-AUTH-09`); 10 intentos/15 min y bloqueo de 15 min (`BR-AUTH-07`); *refresh* rotativo con detección de reutilización (`INV-A-1`); 2FA, obligatorio para `platform_admin` (`BR-AUTH-06`) | TC-036, TC-104, TC-152, TC-207 |
| F1 | **S** CSRF | Otro sitio fuerza `/auth/refresh` o `/auth/logout` | Cookie `__Host-refresh` `SameSite=Strict`; Fetch Metadata con respaldo de `Origin`/`Referer`; nada cambia estado por `GET` (`DEC-062`) | TC-207 (`INV-A-4`) |
| F1 | **T** Manipulación | Inyección SQL; campos de más en el cuerpo | Consultas parametrizadas; Zod estricto que rechaza campos desconocidos (`ARCHITECTURE.md` §14) | TC-204 |
| F1 | **T** Reintentos duplicados | Un doble clic registra dos veces un resultado | `Idempotency-Key` reclamada de forma atómica; 409 en curso; 7 días de retención (`DEC-046`, `DEC-062`) | TC-031 (`INV-E-2`) |
| F1 | **I** Fuga | IDOR: cambiar un id para ver datos de otra organización; enumerar usuarios | Autorización por recurso con CASL (`DEC-058`); RLS; respuestas indistinguibles en login y recuperación | TC-034, TC-104, TC-172 (`INV-T-1`, `INV-T-3`) |
| F1 | **D** Negación de servicio | Ráfagas de peticiones; cuerpos enormes | 300 peticiones/min por usuario o IP; JSON ≤ 1 MB (`DEC-062`, `DEC-075`); el emparejamiento pesado va a una cola (`DEC-079`) | TC-104, TC-204 |
| F1 | **E** Escalada | Un director se otorga un rol mayor; un árbitro corrige como director | Regla de subconjunto sin escalada (`AUTHORIZATION.md` §3); permisos reservados solo para `platform_admin`; condiciones de estado en el dominio | TC-105, TC-150, TC-173 (`INV-T-5`, `INV-T-6`, `INV-T-7`) |
| F2 | **I** Fuga | Un usuario sin acceso escucha una sala privada; alguien a quien le quitaron el rol sigue recibiendo avisos | Token y membresía al entrar; reautenticación en caliente; revocar desconecta al instante; nunca se emiten borradores (`DEC-074`, `BR-LIVE-02`) | TC-159 (`INV-L-2`, `INV-L-3`) |
| F2 | **D** Negación de servicio | Un cliente se une a cientos de salas o inunda mensajes | ≤ 10 salas, ≤ 4 KB por mensaje, ≤ 30 mensajes/min (`DEC-075`) | TC-159 |
| F3 | **I** Fuga | Un torneo privado, demo o archivado aparece en el directorio; los metadatos OG revelan datos privados | Visibilidad `PUBLIC`/`UNLISTED`/`PRIVATE` (`BR-PRIV-02`); el directorio solo muestra `PUBLIC` no archivados (`US-113`); OG escapado | TC-183, TC-193 |
| F3 | **T** XSS | Un nombre con HTML se ejecuta en una página pública | Escape automático de Vue, sin `v-html` con datos de usuario; CSP estricta en el *hosting* del front (`ARCHITECTURE.md` §14, `CONVENTIONS.md`) | TC-183, TC-204 |
| F4 | **T** Alterar el pasado | Editar o borrar un evento o un registro de auditoría | Trigger y `REVOKE UPDATE, DELETE` sobre `events` y `audit_log` (`BR-AUD-01`, `DEC-077`) | TC-032, TC-209 (`INV-E-4`, `INV-E-7`) |
| F4 | **I** Cruce de tenants | Olvidar fijar la organización en una consulta o en un trabajo | RLS forzada que falla cerrada; `withTransaction` en la API y en los *workers* (`DEC-078`) | TC-034, TC-209 (`INV-T-1`, `INV-T-9`) |
| F4 | **E** Privilegios de base | El rol de la app borra datos o salta RLS | El rol de la app no es dueño, no tiene `BYPASSRLS` ni `DELETE`; el de mantenimiento solo toca sus tablas (`US-025`, `DEC-078`) | TC-174, TC-209 (`INV-D-1`, `INV-D-2`) |
| F5 | **D** Pérdida de trabajos | Redis desaloja claves de BullMQ cuando se llena | `maxmemory-policy noeviction` comprobada al arrancar (`US-117`, `SRC-22`) | TC-209 |
| F5 | **T** Caché de permisos desactualizada | Un rol revocado sigue en caché | La caché se invalida al cambiar roles (`ARCHITECTURE.md` §12) | TC-173 |
| F6 | **T** Archivo malicioso | SVG con script como logo; extensión falsa; un nombre importado que se vuelve fórmula al exportar a CSV | Logos PNG/JPEG/WebP verificados por firma, sin SVG (`DEC-076`); exportaciones CSV con protección contra fórmulas (`CONVENTIONS.md`) | TC-169, TC-208 |
| F6 | **D** Archivo enorme | Importación de cientos de MB | ≤ 2 MB y CSV ≤ 5 000 filas (`DEC-075`) | TC-049, TC-208 |
| F7 | **I** Correo a quien no lo pidió | Suscribir un email ajeno | Doble confirmación (`BR-NOTIF-01`); enlace de baja en cada correo; el email no lleva datos que la vista pública no muestre (`US-061`) | TC-161, TC-162, TC-163, TC-164 |
| F8 | **I** Fuga de archivos | Descargar el PDF de otra organización | URL firmada de corta duración tras autorizar (`US-065`) | TC-166, TC-208 |
| F9 | **I** Dispositivo perdido | Alguien lee la cola local del árbitro | Solo datos del torneo asignado; se limpian al cerrar sesión; la cola caduca a los 7 días (`US-091`) | TC-192 |
| F9 | **T** Sincronización conflictiva | Dos árbitros registran resultados distintos sin conexión | El servidor revalida cada comando; los conflictos requieren decisión humana; nada se descarta en silencio (`US-091`) | TC-192 (`INV-O-1`) |
| F10 | **E** Abuso del superusuario | Una cuenta de `platform_admin` robada borra o anonimiza | 2FA obligatorio para usar permisos reservados (`TWO_FACTOR_REQUIRED`); confirmación de contraseña; razón obligatoria; todo queda en `audit_log`; el borrado es lógico y restaurable (`DEC-059`) | TC-152, TC-174, TC-177 |
| F10 | **R** Repudio | Un administrador niega haber cambiado un rol | `audit_log` de solo inserción con actor, razón y cambios (`DEC-077`) | TC-173, TC-209 |
| F11 | **T** Datos externos falsos | La lista de ratings descargada viene alterada | Vista previa y revisión antes de aplicar; emparejado por FIDE ID sin fusión automática (`US-104`). La URL viene de la configuración, nunca del usuario | TC-180 |
| F12 | **T** Paquete malicioso | Una dependencia nueva o un *typosquat* | Ninguna dependencia sin ADR (`CLAUDE.md` regla 10); `pnpm audit` y `gitleaks` en CI; *lockfile* congelado (`CONSTRAINTS.md`) | TC-063, TC-083 |
| F12 | **T** Barra de calidad debilitada | Un agente silencia un control para pasar | Guardia de piso sobre el diff (`CONSTRAINTS.md` §1) | `pnpm check:floor` |
| Todas | **I** Logs | Un log guarda un email, un token o un código | Solo ids y `correlationId`; redacción en `pino` (`DEC-080`) | TC-036 (`INV-PRIV-2`) |

## 5. Clasificación de datos

Clases: **Pública** (se muestra sin cuenta) · **Interna** (operación, sin datos personales) · **Personal** (identifica a una persona; Ley 1581) · **Secreto** (credenciales o claves; nunca se muestra ni se registra).

| Dato | Tabla | Clase | ¿En eventos? | ¿En logs? | Retención y supresión |
|---|---|---|---|---|---|
| Email, nombre visible, idioma | `users` | Personal | No (`DEC-045`) | No (`DEC-080`) | Hasta que el titular pida suprimir: se anonimiza (`BR-PRIV-03`, `US-111`) |
| Hash de contraseña | `users.password_hash` | Secreto | No | No (`INV-A-2`) | Se borra al anonimizar |
| Secreto TOTP | `users.two_factor_secret` | Secreto, cifrado con AES-256-GCM (`BR-AUTH-10`) | No | No (`INV-A-3`) | Se borra al desactivar el 2FA o al anonimizar |
| Códigos de recuperación, tokens de *refresh*, de verificación y de restablecimiento | `two_factor_recovery_codes`, `refresh_tokens` y tablas de tokens | Secreto, guardado como hash | No | No | Los vencidos los purga la cola `maintenance` (`DEC-078`) |
| Agente de usuario e IP de la sesión | `auth_sessions.user_agent`, `ip_hash` | Personal (la IP solo como HMAC con `IP_HASH_SECRET`, `DEC-096`) | No | No | Con la sesión; se anonimiza con la cuenta |
| IP de los eventos de seguridad | `audit_log.ip_hash` | Personal (solo el HMAC, `DEC-096`) | No | No | Inmutable (`DEC-077`); sin la clave no se puede revertir |
| Nombre, apellido, institución y rama del jugador | `players` | Personal; **Pública** en torneos `PUBLIC` (`BR-PRIV-02`) | No: solo `playerId` | No | Anonimización a petición; los resultados se conservan (`BR-DEL-07`) |
| FIDE ID, título, ratings | `players`, `player_ratings` | Pública (publicada por FIDE y la federación) | Instantánea de rating y título al inscribir (`BR-RAT-07`) | No | Con el jugador |
| Email del suscriptor | `subscriptions.email` | Personal | No | No | Hasta la baja; se anonimiza a petición |
| Razones de cambios y solicitudes de rol | `memberships.*_reason`, `role_requests.reason`, `audit_log.reason`, `reason` de eventos | Interna; texto libre que **puede** contener datos personales | Sí (`reason`) | No | No se edita (eventos y `audit_log` son inmutables); la UI advierte que no se escriban datos personales (`BR-AUD-06`) |
| Resultados, emparejamientos y clasificaciones | `events`, proyecciones, instantáneas | Pública en torneos `PUBLIC`; Interna en el resto | Sí | Solo ids | Para siempre (`BR-AUD-01`); los torneos se archivan, no se borran (`BR-DEL-06`) |
| Respuestas guardadas para idempotencia | `idempotency_keys.response_body` | Interna; puede contener datos que ya vio quien hizo la petición | No | No | 7 días y purga (`DEC-062`, `DEC-078`) |
| Logos y PDF | S3 (`organizations.logo_key`, `reports.storage_key`) | Interna; Pública si el torneo es `PUBLIC` | No | No | Se conservan; reemplazar un logo no borra el anterior (`DEC-076`) |
| Claves de cifrado y de firma | Variables de entorno (`JWT_ACCESS_SECRET`, `TWO_FACTOR_ENCRYPTION_KEYS`, `METRICS_TOKEN`) | Secreto | No | No | Gestor de secretos; rotación de la clave TOTP con re-cifrado (`BR-AUTH-10`) |

No se recogen datos académicos, documentos de identidad ni fechas de nacimiento (`DEC-048`, `BR-PRIV-01`).

## 6. Riesgos residuales

| ID | Riesgo | Por qué queda | Qué lo reduciría |
|---|---|---|---|
| RR-1 | Una razón escrita en texto libre contiene datos personales y no se puede anonimizar, porque eventos y `audit_log` son inmutables | Inmutabilidad (`BR-AUD-01`, `DEC-077`) frente a supresión (`BR-PRIV-03`) | Solo la advertencia en la UI (`BR-AUD-06`); `INV-D-4` no cubre el texto libre de razones |
| RR-2 | Con el plan gratuito de Render, Redis no persiste: un reinicio puede perder trabajos en cola (emails, reportes, emparejamientos) | Capa gratuita (`SRC-21`) | Plan pago con persistencia, si se despliega |
| RR-3 | La seguridad de Redis y de la red en el despliegue (contraseña, acceso solo interno) no está especificada | El despliegue es opcional | Definirla al ejecutar el plan de despliegue (`ARCHITECTURE.md` §16.5) |
| RR-4 | Sin revisión jurídica de la política de tratamiento y los avisos | Proyecto académico (`DEC-065`) | Revisión legal antes de usar datos reales |
| RR-5 | Un dispositivo del árbitro perdido con la sesión abierta conserva hasta 7 días de comandos locales | Modo sin conexión (`DEC-030`) | Cerrar las sesiones del usuario desde otro dispositivo (`US-022`) |

## 7. Casos de abuso que se convierten en pruebas

Cada fila de §4 tiene su prueba en `TEST-PLAN.md`. Los casos de abuso de una historia nueva se escriben **antes** que su implementación (`TESTING.md`): "¿cómo usaría mal esto alguien que no debería poder?" es la primera prueba.

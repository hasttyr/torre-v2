# EP-06 — Suscripciones, emails y reportes PDF

> Fase F3. Comunicación a quienes se suscriban y documentos oficiales. Efectos secundarios **asíncronos** vía *outbox* + BullMQ (`ARCHITECTURE.md` §7.7, §11). Cumplimiento de datos personales: `BR-NOTIF-*`, `DEC-029`.

### US-060 — Suscripciones y consentimiento
- **Epic:** EP-06 · **Fase:** F3 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como espectador quiero seguir un torneo, equipo, jugador o institución y recibir resultados por email con mi consentimiento.
- **Referencias:** BR-NOTIF-01, BR-NOTIF-02, BR-NOTIF-04, BR-PRIV-01 · DEC-029 · INV-N-2
- **Criterios de aceptación:**
  1. `POST /subscriptions` (email, destino, idioma) con captcha o límite de tasa; sin cuenta de usuario obligatoria.
  2. **Doble confirmación**: se envía un email de confirmación; la suscripción solo se activa al confirmar (`BR-NOTIF-01`).
  3. Se guarda `consent_at`, `consent_text_version` y origen; sin consentimiento no se envía nada (`INV-N-2`).
  4. Destinos soportados: torneo, equipo, jugador, institución.
  5. Gestión de preferencias: qué eventos recibir (resultados de ronda, final, emparejamientos).
  6. Texto de consentimiento y política de privacidad versionados; sin revisión jurídica (riesgo aceptado, `DEC-065`).
- **Pruebas requeridas:** e2e con Mailpit: suscribir, confirmar, no confirmar, límites de tasa.
- **Depende de:** US-061, US-025
- **Fuera de alcance:** canales distintos de email (WhatsApp/push).

### US-061 — Infraestructura de email: puerto, cola, plantillas y reintentos
- **Epic:** EP-06 · **Fase:** F3 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** READY
- **Historia:** Como sistema quiero enviar emails de forma fiable, idempotente y traducible.
- **Referencias:** DEC-013, DEC-015 · BR-NOTIF-03, BR-NOTIF-05 · INV-N-1 · OQ-006
- **Criterios de aceptación:**
  1. Puerto `MailPort` con adaptador SMTP (Nodemailer) para desarrollo (Mailpit); el proveedor real queda tras la interfaz (`OQ-006`).
  2. Cola BullMQ `emails` con reintentos exponenciales y estado final `failed` visible.
  3. Plantillas con i18n (es primero) y *layout* común; vista previa en texto plano.
  4. Deduplicación: `UNIQUE(subscription_id, dedup_key)` en `notification_log`; un reintento no duplica (`INV-N-1`).
  5. Cabeceras de baja (`List-Unsubscribe`) y enlace de baja en cada correo transaccional de suscripción.
  6. Los emails nunca incluyen datos que la vista pública no mostraría.
  7. Usa el módulo genérico `jobs` de `US-117` (`ARCHITECTURE.md` §11).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) `MailPort` con Mailpit, cola `emails` y deduplicación — criterios 1, 2, 4, 7 · M
  - (b) Plantillas con i18n, baja y contenido solo público — criterios 3, 5, 6 · M
- **Pruebas requeridas:** integración con Mailpit; prueba de idempotencia con reintentos forzados; render de plantillas por idioma.
- **Depende de:** US-006, US-007, US-117
- **Fuera de alcance:** elección del proveedor definitivo, métricas de entregabilidad.

### US-062 — Emails de resultados al cerrar ronda y al finalizar
- **Epic:** EP-06 · **Fase:** F3 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como suscriptor quiero recibir los resultados cuando una ronda se cierra y la clasificación final al terminar.
- **Referencias:** BR-NOTIF-02, BR-NOTIF-03, BR-LIFE-04 · INV-N-1
- **Criterios de aceptación:**
  1. Un consumidor del *outbox* reacciona a `RoundClosed`, `RoundStandingsReissued` (aviso de corrección) y `TournamentClosed` (`BR-NOTIF-02`) y encola un trabajo por suscripción activa que coincida con el destino.
  2. `dedup_key = {tournamentId}:{kind}:{roundOrFinal}`: reabrir y volver a cerrar una ronda **no** reenvía el mismo aviso salvo que cambien datos (política explícita; si cambian, se envía "corrección").
  3. Contenido: resultados relevantes al destino seguido, clasificación resumida con enlace a la vista pública y adjunto PDF opcional (`US-064`).
  4. Se respeta el idioma del suscriptor y sus preferencias.
  5. Torneos privados no envían correos a suscriptores no autorizados.
- **Pruebas requeridas:** e2e: cerrar ronda → emails en Mailpit; reapertura; suscripciones pendientes no reciben.
- **Depende de:** US-039, US-060, US-061
- **Fuera de alcance:** resúmenes diarios (*digests*).

### US-063 — Baja y gestión de preferencias
- **Epic:** EP-06 · **Fase:** F3 · **Prioridad:** MUST · **Tamaño:** S · **Estado:** READY
- **Historia:** Como suscriptor quiero darme de baja con un clic y ajustar lo que recibo.
- **Referencias:** BR-NOTIF-04 · DEC-029
- **Criterios de aceptación:**
  1. Enlace con token firmado/aleatorio de un solo propósito; `GET /subscriptions/unsubscribe?token=` confirma la baja de forma inmediata (idempotente).
  2. Página de preferencias accesible sin iniciar sesión mediante el mismo token.
  3. La baja queda en `audit_log` y detiene envíos pendientes.
  4. El token no revela el email completo.
- **Pruebas requeridas:** e2e: baja, repetir baja, token inválido, envíos pendientes cancelados.
- **Depende de:** US-060
- **Fuera de alcance:** supresión definitiva de datos (`OQ-020`).

### US-064 — Generación de PDF y plantillas de reportes
- **Epic:** EP-06 · **Fase:** F3 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** READY
- **Historia:** Como director quiero reportes oficiales en PDF generados desde el estado del torneo.
- **Referencias:** BR-RPT-01..04 · DEC-014, DEC-076 · R6 · OQ-011 (resuelta: diseño neutro de Torre con espacio para el logo)
- **Criterios de aceptación:**
  1. Puerto `PdfPort` con implementación pdfmake; plan B documentado (Playwright→PDF) si la fidelidad no alcanza.
  2. Plantillas: emparejamientos de ronda, clasificación de ronda (con desempates y leyenda), cuadro cruzado, informe final, clasificación por equipos y hoja de resultados por jugador/equipo.
  3. Cumple `BR-RPT-03` (torneo, `RuleSet` y versión, leyenda de desempates, fecha/hora en `America/Bogota`, versión del flujo, espacio de aprobación).
  4. Tipografía y tokens de marca coherentes; soporte de tildes y caracteres especiales; saltos de página correctos con tablas largas.
  5. Generación **determinista** para los mismos datos (`sha256` estable, excluyendo metadatos de fecha incrustada de forma controlada).
  6. Rendimiento: informe final con 500 competidores en tiempo razonable (medido).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) `PdfPort` con pdfmake, tipografía y determinismo — criterios 1, 4, 5 · M
  - (b) Plantillas de ronda (emparejamientos y clasificación) con `BR-RPT-03` — criterios 2 (ronda), 3 · M
  - (c) Plantillas finales (cuadro cruzado, informe final, equipos, hoja por jugador) y rendimiento — criterios 2 (resto), 6 · M
- **Pruebas requeridas:** pruebas de instantánea de contenido (texto extraído) y de determinismo; revisión visual manual documentada con capturas.
- **Depende de:** US-046
- **Depende (parcial):** US-116 (logo de la organización en el encabezado)
- **Fuera de alcance:** diseño gráfico elaborado por cada organización.

### US-065 — Reportes asíncronos: cola, almacenamiento y descarga
- **Epic:** EP-06 · **Fase:** F3 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como director quiero solicitar un reporte y descargarlo cuando esté listo sin bloquear la pantalla.
- **Referencias:** BR-RPT-02, BR-RPT-04 · DEC-016 · `ARCHITECTURE.md` §11
- **Criterios de aceptación:**
  1. `POST /tournaments/{id}/reports { kind, params }` crea un registro `reports` y encola el trabajo; responde con el estado.
  2. El worker genera el PDF, lo sube a S3 (MinIO) y registra `storage_key`, `sha256` y `source_stream_version`.
  3. Reportes con los mismos `params_hash` y `source_stream_version` se reutilizan (no se regeneran innecesariamente).
  4. `GET /reports/{id}` devuelve estado y enlace de descarga con URL firmada de corta duración y autorización.
  5. El estado se refleja en vivo en la UI (por WS o sondeo).
  6. Fallos de generación quedan en `failed` con motivo y reintento manual.
- **Pruebas requeridas:** e2e con MinIO real; autorización de descarga entre organizaciones; idempotencia.
- **Depende de:** US-064, US-117, US-025
- **Fuera de alcance:** firma digital de documentos.

### US-112 — Centro de avisos en la app
- **Epic:** EP-06 · **Fase:** F3 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como usuario quiero ver en la app los avisos que me corresponden (solicitudes de rol, rondas `STALE`, reclamaciones, reportes listos) sin depender del email.
- **Contexto:** Varias reglas dicen "se avisa" (`BR-AUD-03`, `BR-ROLE-06`, `BR-AUD-07`, `BR-RPT-04`) y hasta ahora no había un mecanismo en la app.
- **Referencias:** BR-ROLE-04, BR-ROLE-06, BR-AUD-03, BR-AUD-07, BR-RPT-04 · INV-N-3
- **Criterios de aceptación:**
  1. Tabla `notifications` por destinatario con tipo, datos mínimos, enlace y `read_at`; RLS por usuario (`app.user_id`).
  2. Productores: solicitud de rol creada, resuelta o vencida; ronda marcada `STALE` (al director); reclamación presentada o resuelta; reporte listo; solicitud del titular por vencer.
  3. Campana con contador de no leídos, lista paginada y marcar como leído (uno o todos).
  4. En tiempo real por el canal del usuario cuando exista EP-05 (`user:{id}`); mientras tanto, se consulta al cargar la página y cada N segundos.
  5. Un aviso nunca expone datos que su destinatario no podría ver (`INV-N-3`).
  6. Un *job* marca como vencidas las solicitudes de rol (`BR-ROLE-04`) y emite el aviso correspondiente.
- **Pruebas requeridas:** `TEST-PLAN.md` TC-179.
- **Depende de:** US-024, US-025
- **Fuera de alcance:** notificaciones *push*.

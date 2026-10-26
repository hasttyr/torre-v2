# EP-05 — Tiempo real (salas en vivo)

> Fase F3. Marcadores y clasificaciones en vivo con garantías de orden y recuperación (`ARCHITECTURE.md` §10). Solo se difunde lo **publicado** (`BR-LIVE-02`).

### US-050 — Gateway WebSocket, salas y autorización
- **Epic:** EP-05 · **Fase:** F3 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** READY
- **Historia:** Como espectador quiero conectarme a la sala en vivo de un torneo para ver cambios sin recargar.
- **Referencias:** DEC-012 · BR-LIVE-01, BR-LIVE-02, BR-PRIV-02 · INV-L-2 · `ARCHITECTURE.md` §10 · OQ-010
- **Criterios de aceptación:**
  1. Gateway (Socket.IO en modo solo WebSocket) detrás de la interfaz `LiveTransport`.
  2. Salas `tournament:{id}`; torneos `PUBLIC` y `UNLISTED` (con enlace) permiten conexión anónima de solo lectura; `PRIVATE` exige token y membresía.
  3. Mensaje `subscribe { tournamentId, lastVersion? }` responde con la versión actual y, si el cliente está atrasado, una indicación de *resync*.
  4. El gateway **nunca** envía datos de borradores ni de torneos a los que el cliente no tiene acceso (`INV-L-2`).
  5. Límites (`DEC-075`): ≤ 10 salas por conexión; mensajes del cliente ≤ 4 KB y ≤ 30 por minuto por conexión.
  6. Adaptador Redis para varias instancias.
  7. Reautenticación en caliente (`DEC-074`): `auth.refresh { token }` antes de que venza el token; sin token válido a tiempo, el socket sale de las salas privadas. Revocar una membresía o cerrar una sesión desconecta al instante los sockets afectados (`INV-L-3`).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Gateway, salas, `subscribe` y nunca borradores — criterios 1–4 · M
  - (b) Límites, adaptador Redis y reautenticación en caliente — criterios 5, 6, 7 · M
- **Pruebas requeridas:** integración con cliente `socket.io-client`: acceso público, privado sin token (rechazo), borradores no emitidos, límites, token vencido y membresía revocada.
- **Depende de:** US-006, US-024
- **Fuera de alcance:** difusión desde eventos (US-051), cliente (US-052).

### US-051 — *Outbox relay* y difusión por Redis
- **Epic:** EP-05 · **Fase:** F3 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como sistema quiero publicar cada cambio confirmado a los clientes en tiempo real sin perder mensajes.
- **Referencias:** `ARCHITECTURE.md` §7.7, §10 · BR-LIVE-01, BR-LIVE-04 · INV-L-1
- **Criterios de aceptación:**
  1. Worker lee `outbox` con `FOR UPDATE SKIP LOCKED`, publica en Redis (`tournament:{id}`) y marca `published_at`; entrega al menos una vez.
  2. El mensaje `tournament.updated { tournamentId, version, kinds[] }` solo contiene `kinds` visibles al público; los borradores no generan `kinds` públicos.
  3. Coalescencia por torneo en ventana configurable (200 ms por defecto, `LIVE_COALESCE_MS`) sin reordenar versiones.
  4. Recuperación tras caída del relay: reanuda desde `outbox` sin pérdida ni duplicados dañinos.
  5. Métrica de retraso del relay (outbox pendiente).
- **Pruebas requeridas:** integración con Redis real: orden, coalescencia, caída y reanudación; duplicados tolerados por el cliente.
- **Depende de:** US-045, US-050
- **Fuera de alcance:** notificaciones por email (EP-06).

### US-052 — Biblioteca cliente en vivo (reconexión y resincronización)
- **Epic:** EP-05 · **Fase:** F3 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como usuario quiero que la pantalla se mantenga correcta aunque se corte mi conexión.
- **Referencias:** BR-LIVE-01 · INV-L-1 · `ARCHITECTURE.md` §13.3
- **Criterios de aceptación:**
  1. `shared/api/live.ts` conecta, se suscribe, maneja reconexión con retroceso exponencial y reenvía `subscribe` con `lastVersion`.
  2. Compara `version`: si hay salto, **resincroniza vía REST**; si es duplicado/antiguo, lo ignora.
  3. Invalida las *query keys* correspondientes de Vue Query según `kinds`.
  4. Expone estado de conexión (`connecting | live | stale | offline`) para la UI.
  5. Pruebas con servidor simulado que inyecta saltos, duplicados y desconexiones.
- **Pruebas requeridas:** unitarias con transporte falso; propiedad: tras cualquier secuencia de mensajes con pérdidas/duplicados, el estado converge al del servidor (`INV-L-1`).
- **Depende de:** US-009, US-050
- **Fuera de alcance:** pantallas (US-053).

### US-053 — Vistas en vivo: clasificación, mesas y modo proyector
- **Epic:** EP-05 · **Fase:** F3 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** READY
- **Historia:** Como espectador y como organizador quiero ver clasificación y mesas actualizadas, y proyectarlas en pantalla grande.
- **Referencias:** BR-LIVE-03 · `UI-UX.md` §5, §7
- **Criterios de aceptación:**
  1. Páginas públicas de clasificación y mesas por ronda que se actualizan sin recargar (usa US-052).
  2. Etiqueta **provisional/oficial** según estado de la ronda (`BR-LIVE-03`).
  3. Modo proyector: tipografía grande, alto contraste, sin elementos interactivos, auto-rotación entre vistas configurable.
  4. Indicador de conexión visible; si está desconectado, aviso claro y datos marcados como posiblemente desactualizados.
  5. Resalta cambios recientes (movimientos de puesto) con animación respetando *reduced motion*.
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Clasificación y mesas en vivo, provisional u oficial, indicador de conexión — criterios 1, 2, 4 · M
  - (b) Modo proyector y animaciones de cambio de puesto — criterios 3, 5 · M
- **Pruebas requeridas:** e2e Playwright con simulador de torneo: el resultado registrado en una pestaña aparece en la otra; accesibilidad de la vista.
- **Depende de:** US-052, US-069, US-071
- **Fuera de alcance:** transmisión de movimientos de partidas.

### US-054 — Prueba de carga y presupuesto de capacidad
- **Epic:** EP-05 · **Fase:** F3 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como responsable quiero evidencia numérica de cuántos espectadores soporta el sistema.
- **Referencias:** `ARCHITECTURE.md` §17 · PRODUCT S5
- **Criterios de aceptación:**
  1. Escenarios k6 (en `infra/k6`) con miles de conexiones WebSocket y actualizaciones simuladas por el simulador (`US-095`).
  2. Métricas: latencia commit→cliente p50/p95/p99, uso de CPU/memoria, mensajes perdidos (debe ser 0 tras *resync*).
  3. Informe publicado en `docs/reports/` con configuración del entorno, resultados y cuellos de botella.
  4. Objetivo de referencia: p95 ≤ 1 s con 2 000 conexiones por instancia (`DEC-064`; si no se cumple, el informe explica por qué y qué se haría).
- **Pruebas requeridas:** los scripts k6 son la entrega; repetibles con un comando.
- **Depende de:** US-051, US-095
- **Fuera de alcance:** pruebas en infraestructura de producción.

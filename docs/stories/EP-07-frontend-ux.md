# EP-07 — Frontend y experiencia de usuario

> Fases F0 (sistema de diseño) y F4 (pantallas). Principios y librerías en `UI-UX.md`. Regla central: **una sola capa de UI** (`shared/ui`), tokens como fuente de verdad y ninguna pantalla importa librerías de UI directamente (`ARCHITECTURE.md` §13.2).

### US-066 — Pantallas de autenticación y organización
- **Epic:** EP-07 · **Fase:** F4 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como usuario quiero registrarme, iniciar sesión, elegir mi organización y gestionar mi perfil.
- **Referencias:** DEC-010, DEC-019 · `UI-UX.md` §4, §8 (mostrar/ocultar contraseña)
- **Criterios de aceptación:**
  1. Páginas de registro, inicio de sesión, recuperación de contraseña, verificación de email e invitación aceptada.
  2. Refresh transparente: ante 401 se intenta un refresh; si falla, redirige al login conservando la ruta destino.
  3. Selector de organización activo; preferencias de idioma y tema persistidas en el perfil.
  4. Campo de contraseña con mostrar/ocultar accesible; mensajes de error por `code` traducidos.
  5. Guards de rutas por autenticación y permisos (`can()` solo para UI).
  6. **Infraestructura e2e** (primera historia con e2e): Playwright `webServer` levanta la API y la web compiladas; `globalSetup` migra y siembra la base `torre_e2e` con `pnpm seed:demo --seed 2026`; cada prueba crea su propia organización; trazas, capturas y video de las pruebas fallidas (`TEST-PLAN.md` §10).
- **Pruebas requeridas:** unitarias de guards y manejo 401; e2e Playwright del flujo de registro→login→logout; humo TC-082.
- **Depende de:** US-009, US-022, US-023, US-069
- **Fuera de alcance:** pantallas de 2FA y confirmación de contraseña (`US-107`), SSO.

### US-067 — Pantallas de gestión del torneo: crear, configurar, inscribir, equipos
- **Epic:** EP-07 · **Fase:** F4 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** READY
- **Historia:** Como director quiero crear y configurar un torneo, inscribir participantes o equipos y ver su estado.
- **Referencias:** BR-LIFE-01, BR-REG-01..04 · `UI-UX.md` §4, §8 (autoguardado)
- **Criterios de aceptación:**
  1. Asistente de creación con selección de `RuleSet` (mostrando su estado y fuente) y resumen de lo que implica (sistema, rondas, desempates).
  2. Formularios con VeeValidate + esquemas Zod de `contracts`; **autoguardado de borrador local** en formularios largos (`US-078`).
  3. Pantalla de inscripción: buscar/seleccionar jugadores, importación CSV con vista previa y errores por fila.
  4. Pantalla de equipos: plantilla, capitán, validaciones visibles.
  5. Indicador de estado del torneo y acciones disponibles según permisos y estado (iniciar, cerrar inscripción, cancelar…).
  6. Selectores de fecha y selección múltiple con los componentes de la capa de UI (`UI-UX.md` §2).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Asistente de creación, formularios con autoguardado y selectores — criterios 1, 2, 6 · M
  - (b) Inscripción e importación CSV — criterios 3 · M
  - (c) Equipos y acciones según estado y permisos — criterios 4, 5 · M
- **Pruebas requeridas:** componentes con Vue Test Utils; e2e Playwright: crear torneo → inscribir 8 jugadores → iniciar.
- **Depende de:** US-030, US-031, US-032, US-069
- **Depende (parcial):** US-033 (pantalla de equipos), US-071 (tablas avanzadas; mientras tanto se usa la tabla base de US-069)
- **Fuera de alcance:** diseño visual de plantillas de PDF.

### US-068 — Operación del árbitro: rondas y registro de resultados
- **Epic:** EP-07 · **Fase:** F4 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** READY
- **Historia:** Como árbitro quiero generar la ronda, revisar y publicar emparejamientos y registrar resultados rápidamente con el teclado.
- **Referencias:** BR-PAIR-08, BR-SCORE-05, BR-AUD-03 · `UI-UX.md` §6 · US-073
- **Criterios de aceptación:**
  1. Vista de ronda con borrador, `diagnostics` legibles (qué criterios se relajaron), ajuste manual (`US-041`) y publicación. Al generar, muestra el estado del trabajo (en cola, generando, listo o fallido con su diagnóstico) consultando `GET …/pairing-jobs/{jobId}` (`DEC-079`).
  2. Vista de resultados por ronda: lista navegable por teclado, estado por partida (`pendiente`, `registrado`, `corregido`).
  3. Registro con atajos (`UI-UX.md` §6): selección de resultado y confirmación explícita; confirmación en lote.
  4. Corrección de resultados con razón obligatoria y aviso de rondas `STALE`.
  5. Indicadores claros de conflicto de versión/concurrencia (otro árbitro registró antes) con resolución guiada.
  6. Cierre de ronda y reapertura con razón; acciones destructivas con confirmación.
  7. Primera versión: generar, publicar, registrar, corregir y cerrar con los atajos básicos de `UI-UX.md` §6 (`1`, `0`, `=`, `Enter`, `Esc`).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Primera versión: generar (con el estado del trabajo), publicar, registrar, corregir y cerrar con los atajos básicos — criterios 7 y lo básico de 1 · M
  - (b) `diagnostics` legibles y ajuste manual — criterios 1 (completo) · S
  - (c) Resultados por teclado con confirmación en lote — criterios 2, 3 · M
  - (d) Correcciones con `STALE`, conflictos de concurrencia, cierre y reapertura — criterios 4, 5, 6 · M
- **Pruebas requeridas:** e2e Playwright de una ronda completa solo con teclado; pruebas de accesibilidad.
- **Depende de:** US-035, US-036, US-039, US-069
- **Depende (parcial):** US-037 (corrección), US-041 (ajuste manual), US-073 (atajos completos y paleta)
- **Fuera de alcance:** modo offline (`US-091`).

### US-069 — Sistema de diseño: tokens, capa `shared/ui` y catálogo
- **Epic:** EP-07 · **Fase:** F0/F4 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** IN_PROGRESS
- **Historia:** Como equipo quiero una capa de UI homogénea para que nada parezca "pegado".
- **Referencias:** DEC-017, DEC-081, DEC-085 · `UI-UX.md` §2–§4
- **Criterios de aceptación:**
  1. Tailwind configurado con tokens (color, radio, sombras, espaciado, tipografía, duración de animaciones y vidrio `--glass-*`) como variables CSS con tema claro, oscuro y proyector. Todo el estilo sale de utilidades de Tailwind; el único CSS propio es la hoja de entrada (`@theme`, `@custom-variant`, variables de tema) (`DEC-085`).
  2. shadcn-vue inicializado; los componentes se copian al repo y se **envuelven/exponen** exclusivamente desde `shared/ui`.
  3. Componentes mínimos: Button, Input, Select, Combobox (múltiple), DatePicker/RangeCalendar, Checkbox, Switch, Dialog, Drawer, Tabs, Tooltip, Toast (Sonner), Table base, Badge, EmptyState, Skeleton, Form fields con etiqueta/ayuda/error.
  4. Un único set de iconos (Lucide) y una familia tipográfica.
  5. Storybook (o equivalente) con todos los componentes en los tres temas; pruebas de capturas con Playwright para detectar regresiones.
  6. Regla ESLint verificada: importar una librería de UI fuera de `shared/ui` falla el lint.
  7. Documento `UI-UX.md` actualizado con lo realmente implementado.
  8. Superficies de vidrio (`UI-UX.md` §3.3) en barras, diálogos, menús, toasts y tarjetas; tablas densas y proyector opacos; la variante `reduced-transparency:` (media `prefers-reduced-transparency`, `contrast-more:` y `data-transparency="reduced"`) las vuelve opacas; contraste AA medido sobre el peor fondo de `--backdrop` en claro y oscuro, y los valores de `--glass-*` escritos en `UI-UX.md` §3.3.
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Tokens y temas en Tailwind, iconos, tipografía y tokens de vidrio con su medición de contraste (requiere el sistema visual aprobado, `UI-UX.md` §3) — criterios 1, 4, 8 · M
  - (b) shadcn-vue envuelto en `shared/ui`, componentes mínimos y regla ESLint — criterios 2, 3, 6 · M. Se divide al empezar (2026-10-27, son 17 componentes): **(b1)** primitivas — Button, Badge, Input, Checkbox, Switch, Form field, Skeleton, EmptyState y Table base; **(b2)** capas flotantes y selectores — Dialog, Drawer, Tooltip, Toast, Tabs, Select, Combobox múltiple y DatePicker/RangeCalendar. La regla ESLint (criterio 6) ya la cerró `US-009c`.
  - (c) Catálogo con capturas en los tres temas y `UI-UX.md` actualizado — criterios 5, 7 · M
- **Pruebas requeridas:** capturas visuales; pruebas de accesibilidad automáticas (axe) por componente; contraste del texto sobre cada superficie de vidrio compuesta sobre el color más claro y el más oscuro del fondo; capturas con la transparencia reducida.
- **Depende de:** US-009
- **Fuera de alcance:** pantallas de negocio.
- **Implementación (a), 2026-10-27:** Tailwind 4.3.3 con `@tailwindcss/vite`; `apps/web/src/app/styles.css` es el único CSS propio (tokens de §3.1 en claro, oscuro —también por preferencia del sistema— y proyector; vidrio con los valores de `DEC-087`; respaldo opaco; variantes `dark:`, `projector:` y `reduced-transparency:`; transiciones de 150/200 ms anuladas con *reduced motion*); Fira Sans autoalojada con `@fontsource` y Lucide instalado (solo `shared/ui` puede importarlo, `US-009c`); `shared/ui` arranca con `glassSurface`, `glassSurfaceStrong` y `GlassPanel`; el *layout* y la portada usan el vidrio. El selector de tema y la preferencia "Reducir transparencia" son de `US-074`; los componentes de shadcn-vue, de (b).
- **Implementación (b1), 2026-10-27:** primitivas de shadcn-vue portadas a mano sobre Reka UI (`ADR-0005`: sin CLI, sin `vaul-vue` ni `tw-animate-css`): `Button` (variantes `default`, `secondary`, `outline`, `ghost`, `glass`, `destructive`; forma `pill` para la acción principal), `Badge` (con los estados de ajedrez), `Input`, `Checkbox`, `Switch`, `FormField` (etiqueta, ayuda y error unidos al control por `aria-*`), `Skeleton` (estático), `EmptyState` y `Table` (sobre tarjeta opaca, cifras tabulares). Todo se exporta desde `shared/ui/index.ts`.
- **Implementación (b2), 2026-10-27:** `Dialog` y `Drawer` (lado izquierdo, derecho o inferior) de vidrio sobre el `Dialog` de Reka UI, con título y descripción obligatorios para lectores y cierre etiquetado; `Tooltip` (también con foco de teclado); `Tabs` con lista etiquetada; `Select`; `Combobox` múltiple con etiquetas que se quitan una a una; `DatePicker` y `DateRangePicker` en `es-CO` (día primero, semana desde el lunes, valores `@internationalized/date` sin zona); `Toaster` de `vue-sonner` en modo `unstyled` con el vidrio (su hoja solo posiciona la lista y se importa en la hoja de entrada) y `toast` reexportado desde `shared/ui`; el *layout* monta el `Toaster`. **Hallazgo:** Reka UI etiqueta los segmentos de fecha en inglés (`day`, `month`, `year`) para los lectores de pantalla; se resuelve con la internacionalización (`US-075`) o en la revisión de accesibilidad (`US-079`).

### US-070 — Páginas públicas del torneo y enlaces compartibles
- **Epic:** EP-07 · **Fase:** F4 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como espectador quiero abrir un torneo por enlace, ver su información y compartirlo por WhatsApp con vista previa.
- **Referencias:** DEC-041, BR-PRIV-02 · `ARCHITECTURE.md` §13.4 · `UI-UX.md` §8 (compartir, copiar)
- **Criterios de aceptación:**
  1. Rutas públicas bajo `/t/:orgSlug/:tournamentSlug` (`DEC-083`, `SCREENS.md`): portada del torneo, clasificación, mesas, jugador, equipo, institución.
  2. `GET /share/tournaments/{orgSlug}/{slug}` sirve HTML mínimo con metaetiquetas Open Graph/Twitter (título, descripción, imagen) y redirige a la SPA; los botones de compartir usan ese enlace.
  3. Botón **Compartir** con Web Share API y alternativa de copiar enlace; botón **Copiar** reutilizable (enlace, código, etc.) con retroalimentación accesible.
  4. Solo muestra datos permitidos (`BR-PRIV-02`); torneos `UNLISTED` no aparecen en listados.
  5. Los estados de carga/error/torneo inexistente están cubiertos.
- **Pruebas requeridas:** e2e; prueba del endpoint de metadatos (contenido OG correcto y escapado).
- **Depende de:** US-046, US-069
- **Fuera de alcance:** SEO avanzado.

### US-071 — Tablas interactivas: orden, filtros, virtualización y estado en la URL
- **Epic:** EP-07 · **Fase:** F4 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** READY
- **Historia:** Como usuario quiero explorar clasificaciones y listas grandes fácilmente y compartir exactamente lo que veo.
- **Referencias:** DEC-040 · `UI-UX.md` §4, §8
- **Criterios de aceptación:**
  1. Componente de tabla (TanStack Table) con cabecera fija, ordenamiento por columnas, filtros (ronda, institución, categoría, estado), selección y columnas configurables.
  2. El estado (orden, filtros, página) vive en la URL y se restaura al recargar o compartir.
  3. Virtualización para listas de más de N filas (N configurable) sin perder accesibilidad (roles ARIA, navegación por teclado).
  4. Resalta jugadores/equipos seguidos y la fila propia.
  5. Explicación del puesto: al activar una fila muestra los valores de desempate y qué criterio la separó del vecino (`BR-TIE-07`).
  6. Vista móvil usable (tarjetas o scroll horizontal controlado).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Tabla base con orden, filtros y estado en la URL — criterios 1, 2 · M
  - (b) Virtualización accesible y vista móvil — criterios 3, 6 · M
  - (c) Resaltados y explicación del puesto — criterios 4, 5 · S
- **Pruebas requeridas:** unitarias del estado↔URL; e2e con 500 filas (rendimiento de scroll y orden); axe.
- **Depende de:** US-069, US-046
- **Fuera de alcance:** edición en línea en tabla.

### US-072 — Búsqueda inteligente
- **Epic:** EP-07 · **Fase:** F4 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como usuario quiero encontrar jugadores, equipos, instituciones y torneos aunque escriba sin tildes o con errores.
- **Referencias:** DEC-039 · `ARCHITECTURE.md` §8.2
- **Criterios de aceptación:**
  1. Extensiones `pg_trgm` y `unaccent` activas; índices GIN sobre nombres normalizados.
  2. `GET /search?q=&types=` con ranking por similitud, respetando visibilidad y tenant.
  3. Tolera tildes, mayúsculas, errores de una o dos letras y orden invertido de nombre/apellido.
  4. Barra de búsqueda global en la UI con resultados agrupados por tipo y navegación por teclado (`/` para enfocar).
  5. Debounce, estados de carga/vacío/error; no enumera datos privados.
- **Pruebas requeridas:** integración con casos de tildes, errores tipográficos y homónimos; rendimiento con 50 000 jugadores sintéticos.
- **Depende de:** US-031, US-069
- **Fuera de alcance:** búsqueda de texto completo en contenido libre.

### US-073 — Atajos de teclado y paleta de comandos
- **Epic:** EP-07 · **Fase:** F4 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como árbitro quiero operar sin ratón para registrar resultados con rapidez y menos errores.
- **Referencias:** `UI-UX.md` §6 · DEC-017
- **Criterios de aceptación:**
  1. Composable `useShortcuts` con registro/desregistro por contexto, prevención de conflictos y desactivación al escribir en campos de texto.
  2. Atajos de resultados (`UI-UX.md` §6): navegación entre partidas, selección de resultado, confirmación individual y en lote.
  3. Paleta de comandos (`Ctrl/Cmd+K`) para navegar y ejecutar acciones frecuentes.
  4. Ayuda de atajos visible (`?`), traducida, y ayuda contextual en tooltips.
  5. Compatibilidad con lectores de pantalla y sin colisiones con atajos del navegador; los atajos pueden desactivarse en preferencias.
- **Pruebas requeridas:** unitarias del registro de atajos; e2e que completa una ronda con teclado; prueba de no activación en inputs.
- **Depende de:** US-069
- **Fuera de alcance:** atajos configurables por el usuario.

### US-074 — Temas: modo oscuro y modo proyector
- **Epic:** EP-07 · **Fase:** F4 · **Prioridad:** SHOULD · **Tamaño:** S · **Estado:** READY
- **Historia:** Como usuario quiero cambiar entre claro y oscuro y usar un modo de alto contraste para proyectar.
- **Referencias:** `UI-UX.md` §7 · DEC-017
- **Criterios de aceptación:**
  1. Selector de tema (claro/oscuro/sistema) y preferencia "Reducir transparencia" (`data-transparency="reduced"`, `UI-UX.md` §3.3) persistidos (perfil si hay sesión; `localStorage` con `try/catch` si no).
  2. Respeta `prefers-color-scheme`; sin parpadeo inicial (aplicado antes del primer render).
  3. Modo proyector: variables de tipografía y espaciado ampliadas, contraste reforzado y sin vidrio (todo opaco), activable por URL/parámetro y por interruptor.
  4. Todos los componentes del catálogo verificados en los tres temas (capturas de `US-069`).
  5. Contraste conforme a AA en todos los temas.
- **Pruebas requeridas:** pruebas de capturas por tema; verificación automática de contraste.
- **Depende de:** US-069
- **Fuera de alcance:** temas por organización (marca blanca).

### US-075 — Internacionalización (es primero; en después; pt más tarde)
- **Epic:** EP-07 · **Fase:** F4 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como usuario quiero la aplicación en mi idioma.
- **Referencias:** DEC-019, DEC-025 · `CONVENTIONS.md` §7 · OQ-019
- **Criterios de aceptación:**
  1. Todos los textos de la UI en archivos de mensajes; claves jerárquicas; ninguna cadena literal visible en componentes (regla de lint o prueba que lo detecta).
  2. Selector de idioma con persistencia; `es` completo, `en` completo en esta historia; `pt` se difiere hasta confirmar `OQ-019`.
  3. Mensajes de error de API traducidos por `code`.
  4. Fechas, números y orden alfabético con `Intl` y zona `America/Bogota`; puntos formateados desde enteros en medios puntos (`½`).
  5. Emails y PDF reciben el idioma como parámetro (coordinado con EP-06).
  6. Prueba que falla si una clave existe en `es` y falta en `en`.
- **Pruebas requeridas:** prueba de paridad de claves; pruebas de formato con fechas límite (cambio de día en UTC vs Bogotá).
- **Depende de:** US-009
- **Fuera de alcance:** traducción de contenido ingresado por usuarios.

### US-076 — Seguir (guardar para después) jugadores, equipos y torneos
- **Epic:** EP-07 · **Fase:** F4 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como espectador quiero marcar lo que sigo para verlo destacado y recibir sus resultados.
- **Referencias:** BR-NOTIF-01, BR-NOTIF-02 · `UI-UX.md` §8
- **Criterios de aceptación:**
  1. Botón **Seguir** en torneo, equipo, jugador e institución; sin sesión se guarda localmente y puede convertirse en suscripción por email (`US-060`).
  2. Lo seguido se resalta en tablas y listados.
  3. Sección "Mis seguidos" con acceso rápido; con sesión se sincroniza con el servidor.
  4. "Vistos recientemente" simple en `localStorage` (con `try/catch`; puede estar vacío).
  5. Quitar un seguimiento actualiza de inmediato la UI y las preferencias de notificación.
- **Pruebas requeridas:** unitarias del almacenamiento local con fallo simulado; e2e de seguir/quitar.
- **Depende de:** US-060, US-071
- **Fuera de alcance:** notificaciones push.

### US-077 — Microinteracciones: notificaciones, copiar, compartir
- **Epic:** EP-07 · **Fase:** F4 · **Prioridad:** SHOULD · **Tamaño:** S · **Estado:** READY
- **Historia:** Como usuario quiero retroalimentación clara de mis acciones.
- **Referencias:** `UI-UX.md` §8
- **Criterios de aceptación:**
  1. Toasts accesibles (`aria-live`) para éxito, error y acciones deshacibles; no se apilan sin límite.
  2. Botón copiar con estado "copiado" y alternativa si el portapapeles no está disponible.
  3. Botón "ir arriba" solo en vistas largas.
  4. Todos respetan `prefers-reduced-motion`.
- **Pruebas requeridas:** unitarias y axe.
- **Depende de:** US-069
- **Fuera de alcance:** barra de progreso de lectura y tiempo estimado de lectura (descartados, `UI-UX.md` §8).

### US-078 — Autoguardado de borradores en formularios largos
- **Epic:** EP-07 · **Fase:** F4 · **Prioridad:** COULD · **Tamaño:** S · **Estado:** READY
- **Historia:** Como director no quiero perder lo que escribí si se cierra la pestaña.
- **Referencias:** `UI-UX.md` §8 · `ARCHITECTURE.md` §13.2 (regla 5)
- **Criterios de aceptación:**
  1. Composable `useDraftForm` guarda y restaura borradores por formulario y usuario en `localStorage` con `try/catch` y expiración.
  2. Aviso visible al restaurar con opción de descartar.
  3. **Nunca** se aplica a formularios de resultados de partidas ni a datos sensibles; la lista de formularios admitidos es explícita.
  4. Se limpia al enviar con éxito o al cerrar sesión.
- **Pruebas requeridas:** unitarias (restaurar, expirar, fallo de almacenamiento).
- **Depende de:** US-069
- **Fuera de alcance:** sincronización de borradores con el servidor.

### US-079 — Línea base de accesibilidad y compatibilidad de navegadores
- **Epic:** EP-07 · **Fase:** F4 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como usuario con distintas capacidades y dispositivos quiero poder usar la aplicación.
- **Referencias:** `ARCHITECTURE.md` §17 · `UI-UX.md` §9 · DEC-053 (WCAG 2.2 AA), DEC-066
- **Criterios de aceptación:**
  1. Auditoría automatizada (axe) en el flujo del árbitro y las páginas públicas sin violaciones críticas.
  2. Navegación completa por teclado, foco visible, orden lógico, etiquetas y roles correctos en tablas y diálogos.
  3. Contraste AA en los tres temas; objetivos táctiles adecuados en móvil.
  4. Navegadores soportados (`DEC-066`): últimas 2 versiones de Chrome, Edge, Firefox y Safari de escritorio, Safari de iOS y Chrome de Android; e2e con Playwright en Chromium, Firefox y WebKit, más los perfiles móviles de Playwright.
  5. Informe con hallazgos y correcciones.
- **Pruebas requeridas:** axe en CI (rama principal); Playwright multi-navegador.
- **Depende de:** US-068, US-070, US-071
- **Fuera de alcance:** certificación formal WCAG.

### US-113 — Directorio público de torneos
- **Epic:** EP-07 · **Fase:** F4 · **Prioridad:** SHOULD · **Tamaño:** S · **Estado:** READY
- **Historia:** Como espectador quiero encontrar torneos públicos por organización, fecha, rama y modalidad.
- **Referencias:** BR-PRIV-02, BR-DEL-06 · DEC-040
- **Criterios de aceptación:**
  1. `GET /public/tournaments` lista solo torneos `PUBLIC` no archivados, con filtros por organización, estado, fechas, rama y modalidad; orden y filtros en la URL.
  2. Los torneos `UNLISTED`, `PRIVATE`, demo y archivados nunca aparecen.
  3. Tarjetas con estado (próximo, en curso, finalizado) y enlace a las páginas de `US-070`.
  4. Estados de carga, vacío y error; accesible por teclado.
- **Pruebas requeridas:** `TEST-PLAN.md` TC-193.
- **Depende de:** US-070, US-071
- **Fuera de alcance:** SEO avanzado.

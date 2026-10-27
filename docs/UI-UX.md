# UI-UX.md — Librerías, diseño homogéneo y experiencia de usuario

> Estado: `[DECIDIDO]` (2026-10-26), sistema visual incluido (§3, `DEC-081`) y superficies de vidrio estilo *Liquid Glass* (§3.3, `DEC-085`, 2026-10-27). Pantallas y rutas: `SCREENS.md`. Decisión de librerías: `DEC-017`. Historias: `US-009`, `US-066..US-079`, `US-053`.
> Lo marcado "verificado" proviene de la documentación pública consultada al redactar; el resto es criterio de diseño. **Antes de instalar, confirmar versión y licencia.**

## 1. Principios

1. **Una sola voz visual.** Todo sale de tokens; nada se pinta con valores sueltos.
2. **El árbitro manda.** La operación del árbitro (resultados, rondas) es el flujo más cuidado: velocidad, teclado, claridad ante errores.
3. **Explicable.** Cada número importante (puesto, desempate) puede explicarse con un clic.
4. **Accesible por defecto.** Teclado, foco visible, contraste AA, `aria-live` para avisos.
5. **Honesto con el estado.** Provisional vs oficial; en línea vs sin conexión; guardado vs pendiente.
6. **Simple antes que vistoso.** Sin funciones de adorno (ver §8). El vidrio de §3.3 es el único recurso decorativo y se limita a las superficies flotantes; nunca va detrás de datos densos.

## 2. Librerías y capa de UI (`DEC-017`)

### 2.1 Elección: shadcn-vue + Tailwind

- **shadcn-vue** copia los componentes a tu repositorio (código propio) sobre **Reka UI** (primitivas accesibles sin estilo) y Tailwind. Verificado: su Calendar usa Reka UI y `@internationalized/date`; incluye Range Calendar, Date Picker (con rangos), Combobox, Command, Data Table (basada en TanStack Table) y Sonner.
- Desde febrero de 2025 la CLI instala Reka UI (reemplazó a Radix Vue); no seguir guías antiguas con Radix Vue.
- **Por qué:** homogeneidad por tokens, control total del código, buen soporte de accesibilidad, sin estilo "impuesto".
- **Sin el CLI** (`ADR-0005`): los componentes de shadcn-vue se portan a mano en `shared/ui`, con los tokens y el vidrio aprobados; el *Drawer* va sobre el `Dialog` de Reka UI.
- **Estilo 100 % Tailwind** (`DEC-085`): shadcn-vue y Reka UI aportan el comportamiento accesible (foco, teclado, ARIA); **todo** el estilo sale de utilidades de Tailwind v4 y de los tokens declarados en `@theme`. El único CSS escrito a mano es la hoja de entrada de Tailwind (`@import`, `@theme`, `@custom-variant` y las variables de los tres temas). Sin librerías de vidrio, sin filtros SVG y sin hojas `.css` por componente.

### 2.2 Alternativas evaluadas

| Opción | A favor | En contra |
|---|---|---|
| Nuxt UI | Más de 125 componentes accesibles con Tailwind; funciona en Vue sin Nuxt | Código dentro de `node_modules`; menos control fino |
| PrimeVue | Más de 80 componentes; temas prediseñados o sin estilo; tablas y selects muy completos | Sistema de temas propio que hay que alinear con Tailwind |
| Vuetify | Muy completa y popular | Atada a Material Design; difícil de personalizar a fondo |

### 2.3 Qué usar para cada necesidad

| Necesidad | Solución |
|---|---|
| Selector de fecha / rango | Calendar, Range Calendar, Date Picker de shadcn-vue |
| Selección múltiple / etiquetas | Combobox en modo múltiple + input de etiquetas |
| Formularios y validación | VeeValidate + esquemas Zod de `packages/contracts` |
| Tablas | TanStack Table (+ TanStack Virtual) |
| Notificaciones | Sonner |
| Paleta de comandos | Command |
| Iconos | Lucide (único set) |
| Atajos y utilidades | VueUse |
| Gráficas | Apache ECharts, tematizada con los tokens (`DEC-067`) |
| Vista de agenda/calendario de rondas | FullCalendar (wrapper Vue) o vista propia; el Calendar de shadcn **solo selecciona fechas** |
| Tablero de ajedrez | `cm-chessboard` (MIT); validación de jugadas con `chess.js` (BSD-2-Clause) (`SOURCES.md` §6) |

### 2.4 Reglas de homogeneidad (MUST)

1. Las vistas importan componentes **solo** desde `shared/ui`. Regla ESLint `no-restricted-imports` sobre las librerías de UI; un *fixture* demuestra que falla (implementada en `US-009c`: `packages/config/eslint.js`, lista `UI_LIBRARIES`; una librería de UI nueva se añade a esa lista en el mismo cambio que su ADR).
2. Un solo set de iconos, una familia tipográfica, una escala de espaciado.
3. Patrones únicos: campo de formulario (etiqueta, ayuda, error), tabla, estado vacío, estado de carga, diálogo de confirmación.
4. Catálogo visual en Storybook con los tres temas + capturas automáticas (`US-069`).
5. Adoptar una librería nueva exige un ADR.

## 3. Tokens de diseño (`DEC-081`)

Sistema visual aprobado el 2026-10-26: estilo minimalista y suizo, denso, pensado para datos (propuesta de la skill *ui-ux-pro-max*, ajustada a WCAG). Esta sección es la **única fuente** de los valores; `US-069` los copia a variables CSS y el catálogo verifica el contraste en los tres temas.

| Token | Ejemplos |
|---|---|
| Color semántico | `--background`, `--foreground`, `--primary`, `--muted`, `--accent`, `--destructive`, `--success`, `--warning`, `--border`, `--input`, `--ring` |
| Estado de ajedrez | `--result-win`, `--result-draw`, `--result-loss`, `--provisional`, `--official`, `--stale` |
| Forma y sombra | `--radius-*`, `--shadow-*` |
| Espaciado y tipografía | escala base 4 px; tamaños `--text-*`; tabular nums en tablas de puntos |
| Movimiento | `--duration-*`; se anulan con `prefers-reduced-motion` |
| Vidrio (§3.3) | `--glass-bg`, `--glass-bg-strong`, `--glass-border`, `--glass-highlight`, `--glass-shadow`, `--glass-blur`, `--backdrop` |

- Se definen como variables CSS con tres conjuntos: claro, oscuro y **proyector** (§7). Los nombres siguen los de shadcn-vue (`--primary-foreground`, `--input`…).
- Los puntos usan **numerales tabulares** y el símbolo `½`.

### 3.1 Colores

| Token | Claro | Oscuro | Proyector |
|---|---|---|---|
| `--background` | `#F8FAFC` | `#020617` | `#FFFFFF` |
| `--foreground` | `#1E3A8A` | `#F8FAFC` | `#0B1220` |
| `--card` / `--popover` | `#FFFFFF` | `#0E1223` | `#FFFFFF` |
| `--card-foreground` / `--popover-foreground` | `#1E3A8A` | `#F8FAFC` | `#0B1220` |
| `--muted` / `--secondary` | `#E9EEF6` | `#1A1E2F` | `#F1F5F9` |
| `--muted-foreground` | `#475569` | `#94A3B8` | `#1F2937` |
| `--secondary-foreground` | `#1E3A8A` | `#F8FAFC` | `#0B1220` |
| `--primary` | `#1E40AF` | `#60A5FA` | `#1E3A8A` |
| `--primary-foreground` | `#FFFFFF` | `#0F172A` | `#FFFFFF` |
| `--accent` | `#D97706` | `#F59E0B` | `#92400E` |
| `--accent-foreground` | `#000000` | `#0F172A` | `#FFFFFF` |
| `--destructive` | `#DC2626` | `#EF4444` | `#991B1B` |
| `--destructive-foreground` | `#FFFFFF` | `#000000` | `#FFFFFF` |
| `--success` | `#15803D` | `#22C55E` | `#166534` |
| `--success-foreground` | `#FFFFFF` | `#0F172A` | `#FFFFFF` |
| `--warning` | `#B45309` | `#F59E0B` | `#92400E` |
| `--warning-foreground` | `#FFFFFF` | `#0F172A` | `#FFFFFF` |
| `--border` (divisores, decorativo) | `#DBEAFE` | `#334155` | `#334155` |
| `--input` (borde de controles) | `#64748B` | `#64748B` | `#0B1220` |
| `--ring` (foco) | `#1E40AF` | `#93C5FD` | `#1E3A8A` |
| `--result-win` | `#15803D` | `#4ADE80` | `#166534` |
| `--result-draw` | `#475569` | `#CBD5E1` | `#1F2937` |
| `--result-loss` | `#B91C1C` | `#F87171` | `#991B1B` |
| `--provisional` | `#B45309` | `#FBBF24` | `#92400E` |
| `--official` | `#1E40AF` | `#93C5FD` | `#1E3A8A` |
| `--stale` | `#C2410C` | `#FB923C` | `#9A3412` |

Contraste verificado el 2026-10-26 (WCAG 2.x): texto ≥ 4.5:1 en claro y oscuro (mínimo 4.76 y 5.58) y ≥ 7:1 en proyector (mínimo 7.09); controles y foco ≥ 3:1 (`--input` 4.76 en claro y 3.91 en oscuro). `--border` es solo decorativo: los controles usan `--input`. El color **nunca** es el único canal: resultados y estados llevan texto o icono (§9).

### 3.2 Tipografía, iconos y movimiento

- **Fira Sans** (400, 500, 600 y 700) en todo el texto, con `font-variant-numeric: tabular-nums` en puntos, desempates y mesas. **Autoalojada** con `@fontsource` (sin llamadas a terceros y compatible con la CSP; `DEC-082`, versión en `ADR-0001`).
- Iconos: un solo set, **Lucide** (`US-069`).
- Movimiento: solo transiciones CSS de 150–200 ms en *hover*, foco y cambios de estado; sin librerías de animación; todo se anula con `prefers-reduced-motion`.
- Densidad alta: escala de espaciado de 4 px con pasos de 8 a 32 px en tablas y paneles; objetivos táctiles de 44 px en móvil (§9).
- Proyector: mismos tokens de color de su columna, tipografía y espaciado aumentados (§5, §7).

### 3.3 Superficies de vidrio (*Liquid Glass*, `DEC-085`)

Decidido el 2026-10-27 por el responsable: superficies translúcidas como en las últimas versiones de iOS, escritas solo con Tailwind. **Estado: implementado en `US-069a`** (`apps/web/src/app/styles.css` y `apps/web/src/shared/ui/glass.ts`), comprobado en el navegador en claro, oscuro, proyector y con la transparencia reducida.

**Dónde va el vidrio**

| Superficie | Vidrio | Por qué |
|---|---|---|
| Barra superior, navegación lateral y barra de pestañas móvil | Sí | Cromo de la app; el contenido pasa por debajo al desplazarse |
| Diálogos, *drawers*, *popovers*, menús, *tooltips*, paleta de comandos | Sí (`--glass-bg-strong`) | Flotan sobre el contenido; el desenfoque separa capas sin oscurecer todo |
| Toasts (Sonner) | Sí (`--glass-bg-strong`) | Flotan; llevan texto e icono |
| Tarjetas y paneles sobre el fondo de la página (portada del torneo, resumen, formularios cortos) | Sí | Muestran el fondo de marca |
| Tablas densas (clasificación, mesas, registro de resultados del árbitro) | **No**: `--card` opaco | Un fondo que se mueve detrás de números baja la legibilidad (principio 2) |
| Modo proyector (§7) | **No**: todo opaco | Alto contraste ≥ 7:1 a distancia |
| Campos de formulario | No: fondo `--background` opaco y borde `--input` | El contraste de controles (≥ 3:1) no depende del fondo |

**Receta con Tailwind** (sin CSS propio fuera de la hoja de entrada):

- Fondo de página (*layout*): `bg-background` más dos degradados radiales de `--backdrop-primary` y `--backdrop-accent` (el primario y el acento al 18 %), fijos (`bg-fixed`), para que el vidrio tenga algo que desenfocar.
- Superficie de vidrio (`glassSurface` / `glassSurfaceStrong` de `shared/ui`): `bg-glass` (o `bg-glass-strong`), `backdrop-blur-glass` (o `-strong`), `backdrop-saturate-150`, `border border-glass-border`, `shadow-glass` y un brillo superior con `inset-shadow-[0_1px_0_var(--glass-highlight)]`. `GlassPanel` es la tarjeta de vidrio.
- Sin soporte de `backdrop-filter`: el relleno semitransparente sigue siendo legible (el contraste se cumple incluso sin desenfoque, ver la medición).
- Movimiento: solo transiciones CSS de §3.2; el vidrio no anima el desenfoque.

**Accesibilidad (fallback opaco, obligatorio)**

- Variante propia `reduced-transparency:` declarada con `@custom-variant`: se activa con `@media (prefers-reduced-transparency: reduce)`, con `prefers-contrast: more` (variante `contrast-more:` de Tailwind) o con la preferencia "Reducir transparencia" del usuario (atributo `data-transparency="reduced"` en `<html>`, `US-074`). En los tres casos el vidrio pasa a `--card` / `--popover` opacos y el desenfoque se quita.
- El texto sobre vidrio usa los colores de primer plano de §3.1. El contraste se mide **sobre el peor fondo posible**: la superficie de vidrio compuesta sobre el color más claro y el más oscuro de `--backdrop` en cada tema; debe cumplir los mínimos de §3.1 (texto ≥ 4.5:1, controles y foco ≥ 3:1). Si no cumple, se sube la opacidad de `--glass-bg`, nunca se baja el umbral.
- El catálogo (`US-069c`) incluye una historia por superficie de vidrio sobre fondos claros, oscuros y con imagen, con axe y la verificación de contraste.

**Valores (`DEC-087`, aprobados por el responsable el 2026-10-27):**

| Token | Claro | Oscuro | Proyector |
|---|---|---|---|
| `--glass-bg` (tarjetas) | blanco al 35 % | `#0E1223` al 40 % | `--card` (opaco) |
| `--glass-bg-strong` (barras, diálogos, menús, toasts) | blanco al 55 % | `#0E1223` al 60 % | `--popover` (opaco) |
| `--glass-blur` / `--glass-blur-strong` | 24 px / 40 px (saturación 150 %) | igual | 0 |
| `--backdrop-primary` / `--backdrop-accent` | `--primary` / `--accent` al 18 % | igual con los colores oscuros | transparente |
| `--glass-border` | blanco al 60 % | blanco al 12 % | — |
| `--glass-highlight` | blanco al 70 % | blanco al 16 % | transparente |
| `--glass-shadow` | `0 8px 32px` pizarra al 12 % | `0 8px 32px` negro al 45 % | — |
| Radios (`rounded-control` / `-card` / `-panel`) | 12 / 16 / 24 px | igual | igual |

Borde, brillo y sombra no tienen efecto en el contraste y los propuso la IA dentro del estilo aprobado (el responsable puede ajustarlos).

**Medición de contraste** (`apps/web/src/app/tokens.spec.ts`, en cada ejecución): vidrio compuesto sobre el fondo liso, sobre el fondo teñido de primario y de acento, y sobre `--card` (lo que pasa bajo las barras). Mínimos: claro, texto 8,30:1, texto atenuado 6,07:1 y foco 6,99:1; oscuro, 16,19:1, 6,61:1 y 9,39:1. Incluso con el vidrio totalmente transparente se cumple AA (texto atenuado 5,35:1 en claro), así que la opacidad es una decisión estética.

**Verificado al implementar (`US-069a`):** Tailwind 4.3.3 compila `@custom-variant reduced-transparency` con sus tres ramas (las dos *media queries* y los atributos), `inset-shadow-*` y `backdrop-blur-*` con el espacio `--blur-*`. El soporte de `prefers-reduced-transparency` en los navegadores de `DEC-066` no es universal: por eso existe la preferencia manual (`US-074`).

## 4. Patrones de componentes y pantallas

- **Formulario:** etiqueta siempre visible; ayuda breve; error por campo y resumen; deshabilitar envío solo mientras envía; mostrar/ocultar contraseña accesible.
- **Tabla:** cabecera fija, orden, filtros en la URL (`DEC-040`), virtualización, fila seguida resaltada, "explicar puesto" (`BR-TIE-07`).
- **Estados vacíos/carga/error:** siempre definidos (esqueletos, mensajes accionables).
- **Confirmaciones:** acciones destructivas o irreversibles (cerrar ronda, reabrir) piden confirmación y, si aplica, razón.
- **Indicadores de estado:** insignias para estado del torneo/ronda/partida; "provisional/oficial"; "sin conexión".
- **Errores de API:** se traducen por `code`; el `correlationId` se muestra en un detalle copiable para soporte.
- **Solicitud de rol:** formulario con rol, alcance y razón (contador de caracteres, mínimo 30) y un aviso de no incluir datos personales sensibles. El estado se muestra con insignia y texto: pendiente, aprobada, rechazada (con la razón) o vencida. El revisor tiene una bandeja con contador; el cambio directo de rol abre un diálogo que exige la razón (`BR-ROLE-*`).
- **Acciones destructivas:** "Borrar" solo aparece para el `platform_admin`, se presenta como "mover a la papelera" y pide razón y confirmación de contraseña. La papelera muestra los lotes con su razón y permite restaurarlos.
- **Editor de roles y permisos:** casillas agrupadas por recurso; los permisos reservados aparecen bloqueados con su explicación; antes de guardar se muestra a cuántos usuarios afecta el cambio.
- **2FA y confirmación de contraseña:** QR más código de verificación; los códigos de recuperación se muestran una sola vez y se pueden descargar; el diálogo de confirmación aparece justo antes de la acción sensible y la reanuda al confirmar.
- **Centro de avisos:** campana con contador de no leídos en la barra superior, lista con enlace al recurso y "marcar todo como leído".

## 5. Vistas en vivo y proyección

- Clasificación y mesas por ronda con actualización automática (`US-053`).
- **Provisional vs oficial** visible (`BR-LIVE-03`).
- Indicador de conexión (`live | stale | offline`).
- **Modo proyector:** tipografía grande, alto contraste, sin controles interactivos, rotación automática de vistas, URL dedicada.
- Animaciones breves de cambio de puesto; desactivadas con *reduced motion*.

## 6. Atajos de teclado

Principio: **seleccionar y luego confirmar** (un resultado no se envía con una sola tecla, porque los eventos son inmutables y las correcciones dejan rastro).

| Contexto | Atajo | Acción |
|---|---|---|
| Global | `Ctrl/Cmd+K` | Paleta de comandos |
| Global | `?` | Ayuda de atajos |
| Global | `/` | Enfocar búsqueda |
| Global | `g` luego `s` / `p` / `r` | Ir a clasificación / mesas / resultados |
| Resultados | `↑` `↓` o `j` `k` | Moverse entre partidas |
| Resultados | `1` | Gana blancas (1-0) → queda **pendiente** |
| Resultados | `0` | Gana negras (0-1) → queda pendiente |
| Resultados | `=` o `5` | Tablas (½-½) → queda pendiente |
| Resultados | `f` | Menú de forfeit (luego `1`/`0` según quién gana) |
| Resultados | `Enter` | Confirmar la partida con resultado pendiente |
| Resultados | `Shift+Enter` | Confirmar **todas** las pendientes de la ronda |
| Resultados | `Esc` | Descartar el resultado pendiente |
| Resultados | `e` | Corregir un resultado registrado (pide razón) |

Reglas: los atajos se **desactivan** al escribir en campos de texto; no colisionan con atajos del navegador; se pueden desactivar en preferencias; ayuda traducida y visible. Estado pendiente claramente marcado (color + icono, no solo color).

## 7. Temas

- **Claro, oscuro, proyector.** El tema se aplica antes del primer render para evitar parpadeo. Respeta `prefers-color-scheme`.
- El vidrio (§3.3) existe en claro y oscuro; el proyector es siempre opaco. La preferencia "Reducir transparencia" se guarda junto al tema.
- Persistencia: perfil (con sesión) o `localStorage` con `try/catch` (puede venir vacío o lanzar).
- **Modo proyector** reemplaza al "tamaño de texto ajustable": cambia tamaños, espaciado y contraste mediante tokens.
- Contraste AA verificado por tema en el catálogo.

## 8. Funciones de UX evaluadas (lista de 20)

| # | Función | Decisión | Razón |
|---|---|---|---|
| 1 | Modo oscuro | **Sí** | Barato con tokens; útil en proyección |
| 2 | Cambio de idioma (es/en/pt) | **Sí, por fases** | i18n desde el día 1; es → en → pt |
| 3 | Botón "ir arriba" | Opcional | Solo en listas largas |
| 4 | Barra de progreso de lectura | **No** | No hay contenido largo para leer |
| 5 | Botón copiar | **Sí** | Enlaces, códigos, PGN/FEN |
| 6 | Guardar para después | **Replanteado: seguir** | Conecta con suscripciones/notificaciones |
| 7 | Vistos recientemente | Después | Bajo valor; `localStorage` |
| 8 | Atajos de teclado | **Sí, alta prioridad** | Mayor valor para el árbitro |
| 9 | Tamaño de texto ajustable | **Replanteado: modo proyector** | Se resuelve con `rem` + zoom del navegador |
| 10 | Tablas interactivas | **Sí, esencial** | Clasificaciones, mesas, partidas |
| 11 | FAQ con búsqueda | Después | Página estática de ayuda; sin historia por ahora |
| 12 | Autoguardado de formularios | **Sí, con límites** | Solo formularios largos; **nunca** resultados |
| 13 | Mostrar/ocultar contraseña | **Sí** | Trivial |
| 14 | Compartir página | **Sí** | WhatsApp; requiere endpoint de metadatos OG (`DEC-041`) |
| 15 | Tiempo estimado de lectura | **No** | No aplica |
| 16 | Filtrar y ordenar | **Sí, esencial** | Junto a tablas; estado en URL |
| 17 | Tabla de contenido | **No** | Solo útil en documentación |
| 18 | Búsqueda inteligente | **Sí** | `pg_trgm` + `unaccent` |
| 19 | Notificaciones de éxito | **Sí, esencial** | Toasts accesibles |
| 20 | Acceso sin conexión | **Sí, diferenciador** | Espectador: caché; árbitro: escritura offline (F6) |

## 9. Accesibilidad

- Objetivo: WCAG 2.2 AA en páginas públicas y en el flujo del árbitro (`US-079`, `DEC-053`).
- Navegación por teclado completa; foco visible; orden lógico; `aria-live` para toasts y cambios en vivo.
- Tablas con roles y encabezados correctos (también virtualizadas).
- Color nunca es el único canal de información (resultados, pendiente, provisional).
- Objetivos táctiles amplios; `prefers-reduced-motion`.
- Transparencia: `prefers-reduced-transparency`, `prefers-contrast: more` y la preferencia manual quitan el vidrio (§3.3).
- axe en CI; Playwright en Chromium, Firefox y WebKit, más perfiles móviles (`DEC-066`).

## 10. Idioma, formatos y zona horaria

- Textos solo por i18n (`DEC-019`); `es` primero, `en` después, `pt` más tarde (`OQ-019`).
- Fechas y números con `Intl`; zona `America/Bogota`; locale `es-CO`.
- Puntos: guardados como enteros en medios puntos, mostrados con `½` (`BR-NUM-01`).
- Nombres propios con tildes y ordenamiento sensible a diacríticos (`localeCompare`).

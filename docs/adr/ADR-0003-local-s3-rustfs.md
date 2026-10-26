# ADR-0003 — S3 local: RustFS en lugar de MinIO

- **Estado:** Aceptado (decidido por la IA durante `US-003`; el responsable puede vetarlo)
- **Fecha:** 2026-10-26
- **Decide:** IA, con la instrucción del responsable de continuar sin preguntar
- **Relacionado:** `DEC-016`, `US-003`, `US-065`, `US-116`

## Contexto

`DEC-016` fija "almacenamiento S3 compatible (MinIO local)". Al implementar `US-003` (2026-10-26) se comprobó que MinIO dejó de distribuir su edición comunitaria:

- `https://dl.min.io/server/minio/release/windows-amd64/minio.exe` responde **410 Gone**.
- La última versión de GitHub (`RELEASE.2025-10-15T17-29-55Z`) no publica binarios.

Hace falta un S3 compatible para el entorno local que tenga binarios y una imagen de Docker publicados, licencia permisiva y *checksums* verificables. La aplicación usa solo la API estándar de S3 detrás de un puerto (`storage`), así que cambiar de servidor local no toca el código.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| MinIO (última imagen publicada) | Era la decisión original | Sin versiones nuevas ni parches de la edición comunitaria |
| **RustFS 1.0.1** | Apache-2.0; pensado como reemplazo directo de MinIO (mismo modelo de claves y consola); binarios para Windows y Linux con `SHA256SUMS`; imagen `rustfs/rustfs` | Proyecto joven (1.0 publicada el 2026-09-16) |
| SeaweedFS 4.x | Apache-2.0, maduro | Solo publica MD5; la API S3 necesita un archivo de identidades |
| versitygw | Apache-2.0, binarios | Comunidad pequeña |

## Decisión

El S3 local es **RustFS 1.0.1** (publicado el 2026-10-03), imagen `rustfs/rustfs:1.0.1`, servicio `s3` del `docker-compose.yml`. El *bucket* `torre-dev` lo crea el servicio de un solo uso `s3-init` con la imagen oficial `amazon/aws-cli:2.38.3`. En producción, el proveedor S3 se elige al desplegar (`DEC-016`).

## Consecuencias

- **Positivas:** binarios e imagen mantenidos; mismo flujo de claves de acceso que MinIO.
- **Negativas / costos:** RustFS es joven. Si falla, se cambia la imagen del servicio `s3`; el código no se entera.
- **Riesgos y mitigación:** `US-065` prueba subida, descarga y URL firmada contra el S3 local. Si RustFS no cumple, se prueba SeaweedFS y se escribe un ADR nuevo.

## Verificación

- `pnpm dev:infra` y `pnpm infra:check` (servicio `s3`: `GET /health` y `head-bucket`). **Pendiente:** no se pudo ejecutar en la máquina de desarrollo porque no tiene Docker (`docs/PROGRESS.md`).

## Notas

- RustFS: [repositorio](https://github.com/rustfs/rustfs) (Apache-2.0, consultado el 2026-10-26); variables `RUSTFS_ACCESS_KEY`, `RUSTFS_SECRET_KEY`, `RUSTFS_ADDRESS`, `RUSTFS_CONSOLE_ADDRESS` y `RUSTFS_CONSOLE_ENABLE`, y comprobación `GET /health`, según [docs.rustfs.com](https://docs.rustfs.com/installation/docker/).
- Las etiquetas `rustfs/rustfs:1.0.1`, `valkey/valkey:8.1.10`, `axllent/mailpit:v1.31.5` y `postgres:18` existen en Docker Hub (consulta del 2026-10-26).

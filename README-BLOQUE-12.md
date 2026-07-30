# NEXUS AI Office — Bloque 12

## Robustez, seguridad, producción, Kimi y DeepSeek

Este bloque cierra la primera construcción integral de NEXUS AI Office. Agrega dos proveedores reales, controles de frecuencia, una postura de seguridad observable, cabeceras de producción, health check, páginas globales de error y una verificación local previa al despliegue.

## Funcionalidades

### Proveedores

- Kimi · Moonshot AI.
- DeepSeek.
- Claves cifradas con el mismo almacén seguro utilizado por los demás proveedores.
- Prueba de conexión.
- Sincronización de `/models`.
- Streaming de Chat Completions.
- Conversaciones individuales.
- Orquestación multiagente.
- Recomendador, preferencias y analítica.

### Seguridad y robustez

- Content Security Policy con nonce por solicitud.
- Cabeceras anti-clickjacking, MIME sniffing y filtración de referencia.
- HSTS en producción.
- Rate limiting persistente en PostgreSQL.
- Registro de eventos de seguridad sin secretos.
- Auditoría de RLS, Storage y grants sensibles.
- Página `/app/configuracion/seguridad`.
- Health check `/api/health`.
- Páginas globales para errores y rutas inexistentes.
- Script `npm run verify:production`.
- Prueba SQL de postura de seguridad.

## Migraciones

El paquete incluye:

- `202607260012_repository_storage_rls_fix.sql`: conserva en el repositorio el hotfix de Storage que ya se aplicó durante el Bloque 11.
- `202607260013_production_hardening.sql`: proveedores nuevos, rate limits, eventos y auditoría de seguridad.

En la base actual solo debes ejecutar la migración `013`. En instalaciones nuevas se ejecutan todas en orden.

## Límites iniciales

| Operación | Límite |
|---|---:|
| Conversación individual | 30 por minuto |
| Equipo coordinado | 6 por 5 minutos |
| Prueba de proveedor | 10 por 10 minutos |
| Sincronización de proveedor | 6 por 10 minutos |
| Importación/actualización de ZIP | 4 por 15 minutos |

Los límites se aplican por usuario y workspace.

## Documentación

- `docs/ADR-012-PRODUCTION-HARDENING.md`
- `docs/QA-BLOQUE-12.md`
- `docs/PRODUCTION-CHECKLIST.md`
- `supabase/tests/202607260013_security_audit.sql`

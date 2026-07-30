# QA — Bloque 12

## 1. Validación de código

```powershell
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run verify:production
```

## 2. Kimi

1. Abrir Modelos IA.
2. Configurar `Kimi · Moonshot AI`.
3. Guardar la clave.
4. Probar conexión.
5. Sincronizar modelos.
6. Crear una conversación individual con un modelo Kimi.
7. Confirmar streaming, persistencia, tokens y analítica.
8. Repetir en Equipo coordinado.

## 3. DeepSeek

Repetir las mismas pruebas con DeepSeek. Verificar que el contenido visible no incluya campos internos de razonamiento.

## 4. Seguridad

Abrir `/app/configuracion/seguridad`.

Esperado:

- 0 tablas públicas sin RLS.
- 0 buckets `nexus-*` públicos.
- 0 grants sensibles sobre `provider_credentials` y `request_rate_limits`.
- Clave maestra válida.
- Proveedores configurados sin errores de salud pendientes.

## 5. Rate limiting

- Ejecutar más de 6 solicitudes en modo equipo dentro de cinco minutos.
- La siguiente debe devolver HTTP 429 y un tiempo de espera.
- Confirmar un evento `rate_limit.chat_blocked` en Seguridad.
- Esperar el reset y confirmar que la conversación vuelve a funcionar.

## 6. CSP y cabeceras

En DevTools → Network, abrir el documento HTML y revisar:

- `content-security-policy`
- `x-content-type-options: nosniff`
- `x-frame-options: DENY`
- `referrer-policy`
- `permissions-policy`

Validar navegación, tema, formularios, streaming y carga de ZIP sin errores CSP.

## 7. Health check

Abrir `/api/health`.

Debe devolver 200 con `status: ok` cuando la configuración pública existe. No debe revelar valores de claves.

## 8. Errores globales

- Abrir una ruta inexistente y confirmar la pantalla NEXUS 404.
- Probar un error controlado en desarrollo y confirmar la pantalla global sin mostrar secretos.

## 9. SQL

Ejecutar `supabase/tests/202607260013_security_audit.sql` en un entorno de prueba. Las primeras tres consultas deben devolver cero filas.

# Checklist de despliegue de NEXUS

## Variables de Vercel

- `NEXT_PUBLIC_APP_URL` con la URL HTTPS definitiva.
- `NEXT_PUBLIC_SUPABASE_URL`.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `NEXUS_CREDENTIAL_ENCRYPTION_KEY` con exactamente el mismo valor usado localmente.

No configures claves de OpenAI, Gemini, Kimi, DeepSeek o Anthropic como variables públicas. Se administran cifradas dentro de NEXUS.

## Supabase

- Ejecutar todas las migraciones en orden.
- Revisar Authentication → URL Configuration.
- Agregar la URL de producción y callbacks permitidos.
- Configurar límites de Auth y protección anti-bot según el uso esperado.
- Verificar backups y recuperación del proyecto.
- Confirmar que los buckets `nexus-memory` y `nexus-repositories` sean privados.

## Aplicación

```powershell
npm ci
npm run validate
npm run verify:production
```

## Prueba mínima de producción

- Registro, confirmación y recuperación.
- Crear proyecto y tecnologías.
- Configurar al menos un proveedor.
- Conversación individual y multiagente.
- Memoria con fuentes.
- Importación de repositorio.
- Tarea, artefacto y feedback.
- Analítica.
- Tema claro y oscuro.
- Página de seguridad sin bloqueantes.

## Operación

- Revisar eventos de seguridad regularmente.
- Mantener precios y capacidades de modelos actualizados.
- Rotar claves de proveedores desde la interfaz cuando sea necesario.
- Conservar la clave maestra en un gestor de secretos.
- No cambiar la clave maestra sin volver a guardar todas las credenciales cifradas.

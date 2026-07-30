# ADR-012 — Endurecimiento para producción y proveedores compatibles

## Estado

Aceptado.

## Contexto

NEXUS ya ejecuta conversaciones, memoria, multiagentes, artefactos y análisis de repositorios. Antes de desplegarlo era necesario reducir riesgos de abuso, detectar configuraciones inseguras y añadir Kimi y DeepSeek sin duplicar la lógica de los agentes.

## Decisiones

1. Kimi y DeepSeek son tipos de proveedor propios, pero reutilizan el adaptador normalizado de Chat Completions compatible con OpenAI.
2. El catálogo de modelos se consulta desde el endpoint `/models` de cada proveedor y nunca se codifica permanentemente en el frontend.
3. La aplicación ignora campos de razonamiento privados como `reasoning_content`; solo entrega el contenido final normalizado.
4. El rate limiting se guarda en PostgreSQL para funcionar de forma consistente entre instancias serverless.
5. Las tablas internas de rate limiting y credenciales no conceden CRUD directo a usuarios autenticados.
6. Los eventos de seguridad guardan metadatos mínimos y no almacenan claves, prompts completos ni contenido de archivos.
7. La CSP utiliza un nonce por solicitud. El layout lee ese nonce desde el request y lo aplica al script inicial del tema.
8. La página de seguridad obtiene una postura resumida mediante una función `security definer` restringida a owner/admin.
9. La integración con proveedores sigue pasando por `AIProvider` y `ModelAdapter`; los agentes no dependen de SDKs concretos.

## Consecuencias

- Las rutas pasan a ser dinámicas por el nonce de CSP.
- Los límites necesitan la migración 013 antes de ejecutar chat, sincronizaciones o importaciones.
- Todos los equipos que compartan la misma base deben conservar la misma clave maestra de cifrado.
- Los precios y capacidades no publicados por Kimi o DeepSeek deben revisarse manualmente en el catálogo.

# ADR-007 — Memoria verificable y recuperación híbrida

## Estado

Aceptado.

## Decisión

NEXUS separa el archivo original, sus fragmentos, las memorias estructuradas, los embeddings y los registros de recuperación. La recuperación utiliza búsqueda semántica cuando existe un modelo de embeddings compatible y búsqueda textual como respaldo.

## Razones

- Evitar que la memoria sea una caja negra.
- Mantener aislamiento estricto por workspace y proyecto.
- Permitir desactivar o archivar fuentes sin destruir historial.
- Mostrar exactamente qué fragmentos se utilizaron.
- Evitar dependencia obligatoria de un proveedor de embeddings.
- Mantener el chat operativo si el proveedor de embeddings falla.

## Seguridad

Las funciones RPC `match_memory_context` y `search_memory_context` son `security definer`, pero verifican explícitamente `is_workspace_member`. Los documentos recuperados se incorporan al prompt como datos no confiables y no pueden reemplazar instrucciones del sistema.

## Consecuencias

- Los embeddings actuales se normalizan a 1536 dimensiones.
- Modelos con otra dimensión no se almacenan y se utiliza búsqueda textual.
- PDF y ZIP permanecen sin indexar hasta incorporar parsers binarios seguros.
- En una fase posterior se añadirá reindexación, extracción PDF y procesamiento asíncrono.

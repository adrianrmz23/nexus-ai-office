# NEXUS AI OFFICE — Bloque 07

## Memoria, documentos y recuperación de contexto

Este bloque habilita memoria verificable por workspace y proyecto. Los documentos de texto/código se almacenan en Supabase Storage, se fragmentan, se indexan y pueden recuperarse desde las conversaciones. Las decisiones y preferencias pueden guardarse como memorias estructuradas.

## Implementado

- Ruta `/app/memoria`.
- Documentos globales o por proyecto.
- Memorias globales o por proyecto.
- Supabase Storage privado (`nexus-memory`).
- Detección de `.env`, llaves privadas, tokens y contraseñas.
- Checksum SHA-256 y detección de duplicados.
- Fragmentación con solapamiento.
- Búsqueda textual mediante PostgreSQL Full Text Search.
- Embeddings de 1536 dimensiones cuando existe un modelo de embeddings configurado.
- Recuperación semántica con `pgvector` y respaldo textual.
- Registro de fuentes utilizadas por conversación.
- Visualización de fuentes debajo de cada respuesta.
- RLS por workspace y filtros por proyecto.
- Archivado y restauración sin eliminación destructiva.

## Límite actual deliberado

Los PDF y ZIP se guardan de forma privada, pero se marcan como `stored_unindexed`. No se presentan como documentos indexados porque este bloque no incorpora todavía un parser binario seguro. Los archivos UTF-8 de texto y código sí se indexan de extremo a extremo.

## Instalación

1. Ejecuta `supabase/migrations/202607260007_memory_context.sql` en Supabase SQL Editor.
2. Detén Next.js.
3. Elimina `.next`.
4. Ejecuta `npm run typecheck`, `npm run lint`, `npm run test:run` y `npm run build`.
5. Inicia `npm run dev`.
6. Abre `/app/memoria`.

## Embeddings opcionales

La búsqueda textual funciona desde el primer momento. Para activar recuperación semántica, conserva activo un modelo del catálogo con tipo `embedding` y una credencial configurada en OpenAI, OpenRouter o un endpoint compatible. NEXUS prioriza `text-embedding-3-small` y normaliza los vectores a 1536 dimensiones.

No se agregaron dependencias ni variables de entorno nuevas.

## Prueba recomendada

1. Crea una memoria para el proyecto `Tienda Shopify Integro` con el texto: `Cuando se modifique código, entregar archivos completos.`
2. Sube un `.md` o `.txt` con contexto técnico del proyecto.
3. Busca una frase del archivo desde `/app/memoria`.
4. Abre una conversación del proyecto y pregunta por esa información.
5. Expande `Fuentes utilizadas` debajo de la respuesta.

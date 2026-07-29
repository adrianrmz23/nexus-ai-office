# QA — Bloque 07

## Migración

- [ ] La extensión `vector` existe.
- [ ] Existen `documents`, `document_chunks`, `memories`, `memory_embeddings` y `memory_retrieval_logs`.
- [ ] Existe el bucket privado `nexus-memory`.
- [ ] RLS está habilitado en las cinco tablas.

## Documentos

- [ ] Un `.md` menor de 512 KB termina en `ready`.
- [ ] El documento registra uno o más fragmentos.
- [ ] El archivo original existe en Storage.
- [ ] Un segundo archivo idéntico es rechazado como duplicado.
- [ ] `.env.local` es bloqueado.
- [ ] Un texto con una llave privada es bloqueado.
- [ ] Un PDF se guarda como `stored_unindexed`, sin fingir extracción.
- [ ] Archivar impide que el documento se recupere.
- [ ] Restaurar conserva sus fragmentos.

## Memorias

- [ ] Se puede crear una memoria global.
- [ ] Se puede crear una memoria por proyecto.
- [ ] La memoria aparece en búsqueda textual.
- [ ] Desactivar impide que se recupere.
- [ ] Archivar conserva el registro.

## Conversaciones

- [ ] Una pregunta relevante recupera fuentes.
- [ ] La respuesta muestra `Fuentes utilizadas`.
- [ ] Al recargar, las fuentes siguen visibles.
- [ ] `memory_retrieval_logs` registra modo, latencia, consulta y fuentes.
- [ ] Una conversación de otro proyecto no recupera documentos ajenos.
- [ ] Si embeddings falla, el chat continúa con búsqueda textual.

## Seguridad

- [ ] Un usuario ajeno no puede listar documentos del workspace.
- [ ] Un RPC con un `workspace_id` ajeno no devuelve resultados.
- [ ] Los objetos de Storage están aislados por el primer segmento de la ruta.
- [ ] El prompt trata documentos recuperados como datos, no como instrucciones del sistema.

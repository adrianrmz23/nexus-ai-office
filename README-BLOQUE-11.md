# NEXUS AI OFFICE — Bloque 11

## Repositorios, archivos reales y propuestas de cambio

Este bloque permite incorporar una copia ZIP de un proyecto, explorar archivos reales, fijar versiones exactas como contexto de una conversación y revisar propuestas de archivos completos antes de convertirlas en nuevas versiones internas.

## Implementado

- Módulo `/app/repositorios`.
- Carga temporal de ZIP hacia Supabase Storage privado.
- Actualización posterior mediante un nuevo ZIP.
- Inventario de archivos con ruta, lenguaje, tamaño, checksum y estado.
- Exclusión de `.git`, `.next`, `node_modules`, `vendor`, binarios y contenido con posibles secretos.
- Límites operativos:
  - 12 MB por ZIP;
  - 800 entradas;
  - 500 archivos de texto o código;
  - 1 MB por archivo;
  - 20 MB de texto normalizado por importación.
- Versiones internas para cada archivo.
- Detección de archivos nuevos, modificados, sin cambios y retirados.
- Explorador con búsqueda por ruta o contenido.
- Comparación de versiones mediante diff.
- Propuestas de archivo completo con aprobación humana.
- Rechazo, solicitud de cambios, archivo y prevención de aprobación obsoleta.
- Selección de hasta ocho archivos reales dentro de una conversación.
- La conversación conserva el número exacto de versión seleccionado.
- Fuentes de tipo `project_file` visibles en las respuestas.
- Registro de accesos a archivos por agente y ejecución.
- Contratos validados para:
  - `list_project_files`;
  - `search_project_files`;
  - `read_project_file`;
  - `find_related_files`;
  - `compare_file_versions`;
  - `propose_file_change`.
- RLS por workspace y proyecto.
- Storage privado con validación de workspace, proyecto y rol.
- Inserción y actualización atómicas de archivo + versión mediante funciones PostgreSQL.

## Flujo de datos

```text
ZIP aprobado por el usuario
→ carga temporal en Storage privado
→ validación y extracción en servidor
→ normalización y checksum
→ inventario y versión inicial
→ selección de archivos en una conversación
→ contexto no confiable y delimitado
→ propuesta de archivo completo
→ diff
→ aprobación humana
→ nueva versión interna
```

## Alcance deliberado

- La URL de GitHub es una referencia descriptiva.
- NEXUS no clona repositorios privados ni utiliza credenciales de GitHub en este bloque.
- NEXUS no escribe commits, ramas ni pull requests.
- Aprobar una propuesta actualiza la versión interna almacenada en Supabase; no modifica archivos locales.
- Los ejecutores de herramientas están listos y registrados. La selección manual de contexto ya es funcional; el ciclo autónomo de tool calling se habilitará con límites y confirmaciones en un bloque posterior.
- ZIP64, archivos cifrados y ZIP multidisco se rechazan.

## Modelo de datos

La migración crea:

- `project_repositories`
- `project_files`
- `project_file_versions`
- `file_change_proposals`
- `conversation_file_contexts`
- `agent_file_access_logs`
- bucket privado `nexus-repositories`

También crea:

- `insert_repository_file_batch`
- `apply_repository_file_import_update`
- `approve_file_change_proposal`

## Instalación

1. Ejecuta `supabase/migrations/202607260011_repository_code_tools.sql` en Supabase SQL Editor.
2. Detén Next.js.
3. Elimina `.next`.
4. Ejecuta `npm run typecheck`.
5. Ejecuta `npm run lint`.
6. Ejecuta `npm run test:run`.
7. Ejecuta `npm run build`.
8. Inicia `npm run dev`.

No se agregaron dependencias ni variables de entorno.

## Prueba mínima

```text
Repositorios
→ importar ZIP
→ abrir inventario
→ abrir un archivo
→ importar una segunda versión
→ comparar versiones
→ seleccionar archivos en una conversación
→ consultar el contenido
→ crear una propuesta completa
→ revisar diff
→ aprobar
→ comprobar la nueva versión
```

Consulta `docs/QA-BLOQUE-11.md` para el recorrido completo.

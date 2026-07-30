# QA — Bloque 11

## 1. Validación técnica

Ejecuta:

```powershell
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Resultado esperado: cuatro comandos sin errores.

## 2. Migración y Storage

Ejecuta `202607260011_repository_code_tools.sql`.

Comprueba en Supabase:

- tablas nuevas visibles;
- RLS habilitado;
- bucket privado `nexus-repositories`;
- funciones RPC disponibles.

## 3. Importación inicial

Crea un ZIP pequeño del proyecto excluyendo `.git`, `.next`, `node_modules` y `.env.local`.

En `/app/repositorios/nuevo`:

1. selecciona un proyecto;
2. asigna nombre y rama;
3. carga el ZIP;
4. espera la redirección al explorador.

Verifica:

- estado `active`;
- contador de archivos;
- rutas y lenguajes correctos;
- una versión inicial por archivo;
- ausencia del ZIP temporal después de finalizar el procesamiento.

## 4. Exclusiones

Incluye deliberadamente en un ZIP de prueba:

- `node_modules/prueba.js`;
- `.env.local`;
- una imagen PNG;
- un archivo de texto mayor a 1 MB.

Todos deben aparecer como omitidos y ninguno debe crearse en `project_files`.

## 5. Explorador

- Busca por nombre de archivo.
- Busca una cadena contenida en el código.
- Filtra por lenguaje.
- Abre un archivo y revisa su contenido.

## 6. Actualización

Modifica un archivo, agrega otro y elimina uno del ZIP.

Vuelve a importar desde el detalle del repositorio.

Resultado esperado:

- nuevo: versión 1;
- modificado: versión siguiente;
- eliminado: estado `deleted`;
- sin cambios: no genera versión adicional;
- resumen de importación correcto.

## 7. Conversación

En una conversación del mismo proyecto:

1. busca archivos en el panel lateral;
2. selecciona uno o más;
3. pregunta por una función concreta;
4. comprueba que la respuesta muestre fuentes de archivo;
5. recarga la conversación.

La selección y la versión fijada deben persistir.

Prueba seleccionar nueve archivos. El noveno debe bloquearse.

## 8. Propuesta y diff

Desde el detalle del archivo:

1. modifica el contenido completo;
2. guarda la propuesta;
3. revisa el diff;
4. solicita cambios;
5. modifica o crea otra propuesta;
6. aprueba como owner/admin.

Debe crearse una nueva versión y actualizarse el contenido actual.

## 9. Protección contra propuesta obsoleta

1. crea una propuesta basada en v1;
2. importa otra versión del archivo, creando v2;
3. intenta aprobar la propuesta antigua.

Resultado esperado: PostgreSQL rechaza la aprobación porque la versión base ya no coincide.

## 10. Aislamiento

Con otro usuario o workspace, confirma que no puede:

- listar repositorios ajenos;
- leer o eliminar cargas temporales de otro proyecto;
- consultar archivos;
- fijarlos en conversaciones;
- aprobar propuestas.

## 11. Auditoría

Comprueba eventos como:

```text
repository.created
repository.active
project_file.created
project_file.updated
file_change_proposal.created
file_change_proposal.approved
```

Comprueba también registros en `agent_file_access_logs` al utilizar archivos como contexto.

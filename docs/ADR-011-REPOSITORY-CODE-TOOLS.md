# ADR-011 — Repositorios internos, contexto de código y propuestas aprobables

## Estado

Aceptado para el Bloque 11.

## Contexto

NEXUS podía recibir archivos adjuntos y documentos de memoria, pero no tenía un inventario versionado del código de un proyecto. Enviar un repositorio completo a cada modelo sería costoso, difícil de auditar y riesgoso. Es necesario seleccionar contexto pequeño y verificable, conservar versiones y impedir que un agente escriba cambios sin aprobación humana.

## Decisión

1. La primera fuente de código será un ZIP aprobado por el usuario.
2. El ZIP se carga temporalmente a un bucket privado, se procesa en el servidor y se elimina después de construir el inventario.
3. Solo se indexan archivos de texto o código que superan controles de ruta, tamaño, codificación y secretos.
4. Cada archivo mantiene una versión actual y un historial inmutable.
5. Una conversación puede fijar hasta ocho archivos y conserva la versión exacta seleccionada.
6. Los archivos recuperados se presentan al modelo como datos no confiables, no como instrucciones de sistema.
7. Los cambios propuestos se almacenan como archivos completos y requieren revisión humana.
8. La aprobación crea una nueva versión interna solo si la versión base todavía es la actual.
9. La escritura de commits o pull requests queda fuera de este bloque.
10. Los contratos de herramientas se mantienen desacoplados del proveedor de IA.

## Importación atómica

La creación de cada lote usa `insert_repository_file_batch`. Cada archivo y su versión inicial se insertan dentro de la misma transacción PostgreSQL. Las actualizaciones usan `apply_repository_file_import_update`, que crea la nueva versión y cambia el archivo actual de forma atómica.

Esto evita archivos sin historial o versiones sin archivo actual cuando una operación falla a mitad de camino.

## Seguridad

- RLS filtra todas las tablas por workspace.
- Los triggers verifican que repositorio, proyecto, conversación, archivo, agente, mensaje y run pertenezcan al mismo alcance.
- El bucket valida workspace y proyecto a partir de la ruta del objeto.
- Solo owner y admin importan o actualizan repositorios.
- Los miembros pueden leer archivos del workspace y crear propuestas; solo owner y admin aprueban.
- `.env`, llaves privadas, tokens y contenido potencialmente sensible se rechazan.
- Las rutas con `..`, ZIP64, archivos cifrados, binarios y archivos mayores al límite se excluyen.
- Los checksums y tamaños se validan también en PostgreSQL.

## Consecuencias

- El inventario representa la última copia ZIP importada, no el estado remoto en tiempo real.
- Los archivos retirados permanecen en historial con estado `deleted`.
- El almacenamiento de texto completo es adecuado para uso personal y volúmenes moderados; repositorios grandes requerirán procesamiento asíncrono y almacenamiento por objetos.
- El contexto conversacional está limitado deliberadamente para controlar tokens.
- La sincronización Git y la aplicación de cambios al repositorio serán capacidades separadas con permisos explícitos.

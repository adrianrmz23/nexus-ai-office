# ADR-009 — Trabajo estructurado y artefactos versionados

## Estado

Aceptado para el Bloque 09.

## Contexto

Las conversaciones y handoffs ya producen análisis útiles, pero una respuesta aislada no constituye una unidad de trabajo verificable. NEXUS necesita conservar responsables, dependencias, criterios de aceptación, entregables, versiones y aprobación sin convertir el chat en una base de datos opaca.

## Decisión

Se separan cuatro conceptos:

1. `tasks` representa trabajo operativo y verificable.
2. `artifacts` representa un entregable estable y su estado de revisión.
3. `artifact_versions` conserva el contenido completo de cada versión.
4. `project_decisions` y `error_solutions` conservan conocimiento técnico aceptado.

La creación de tarea y artefacto se realiza mediante funciones PostgreSQL `security definer` que validan membresía y dependen de triggers para comprobar el alcance del proyecto. La primera versión del artefacto se crea dentro de la misma transacción.

Las acciones desde la conversación abren formularios precargados. No se permite que un modelo escriba automáticamente en el backlog o apruebe un artefacto sin confirmación humana.

## Razones

- El contenido completo por versión coincide con la preferencia global de entregar archivos completos.
- La transacción evita artefactos sin versión inicial.
- Las dependencias permanecen dentro del proyecto y evitan filtraciones de contexto.
- La revisión explícita diferencia una propuesta del contenido aceptado.
- La trazabilidad hacia mensaje y agente permite auditar el origen.
- El registro técnico evita repetir errores y contradecir decisiones aceptadas.

## Consecuencias

- Guardar contenido completo consume más almacenamiento que guardar únicamente parches.
- El diff inicial es textual y no semántico.
- La aprobación todavía no aplica cambios a un repositorio.
- La integración futura con Git podrá generar parches a partir de versiones aprobadas sin cambiar el modelo de dominio.

# NEXUS AI OFFICE — Bloque 09

## Tareas, artefactos y registro técnico

Este bloque convierte las conversaciones y resultados de agentes en trabajo persistente, revisable y reutilizable. NEXUS ya no conserva únicamente mensajes: ahora permite transformar una respuesta en una tarea, guardar entregables versionados y documentar decisiones o soluciones aceptadas dentro del proyecto.

## Implementado

- Tablero de tareas con estados:
  - Backlog.
  - En progreso.
  - En revisión.
  - Completada.
  - Cancelada.
  - Archivada.
- Prioridad, progreso, fecha objetivo y agente responsable.
- Dependencias entre tareas del mismo proyecto.
- Creación de tareas desde respuestas de una conversación.
- Trazabilidad hacia conversación, mensaje y agente de origen.
- Artefactos persistentes para código, componentes, páginas, SQL, migraciones, ADR, planes, documentación, reportes, checklists, pruebas y prompts.
- Primera versión creada atómicamente junto con el artefacto.
- Nuevas versiones completas con resumen de cambios.
- Comparación por líneas entre versiones.
- Flujo de revisión humana o asistida por un agente:
  - En revisión.
  - Cambios solicitados.
  - Aprobado.
  - Rechazado.
- Registro técnico por proyecto:
  - Decisiones arquitectónicas.
  - Errores, causa raíz, solución y validación.
- Acciones rápidas dentro del chat para convertir una respuesta en:
  - Tarea.
  - Artefacto.
  - Decisión.
  - Error y solución.
- Contratos iniciales de herramientas internas `create_task` y `create_artifact` con validación Zod, permisos y confirmación humana obligatoria.
- Contadores reales en el dashboard y en cada proyecto.
- RLS, validación de alcance y auditoría por workspace.
- Navegación de Tareas y Artefactos en escritorio y móvil.

## Modelo de datos

La migración crea:

- `tasks`
- `task_dependencies`
- `artifacts`
- `artifact_versions`
- `project_decisions`
- `error_solutions`

También crea las funciones atómicas:

- `create_task_record`
- `update_task_record`
- `create_artifact_record`
- `create_artifact_version`

## Instalación

1. Ejecuta `supabase/migrations/202607260009_tasks_artifacts.sql` en Supabase SQL Editor.
2. Detén Next.js y elimina `.next`.
3. Ejecuta `npm run typecheck`.
4. Ejecuta `npm run lint`.
5. Ejecuta `npm run test:run`.
6. Ejecuta `npm run build`.
7. Inicia `npm run dev`.

No se agregaron dependencias ni variables de entorno nuevas.

## Flujo recomendado de prueba

```text
Conversación
→ Guardar respuesta como tarea
→ asignar agente y criterios de aceptación
→ crear artefacto relacionado
→ generar una segunda versión
→ comparar el diff
→ solicitar revisión
→ aprobar o pedir cambios
→ registrar la decisión o solución en el proyecto
```

## Aprobación humana

Los contratos de herramientas profesionales quedan preparados para el runtime de agentes, pero las escrituras sensibles continúan requiriendo confirmación humana. En este bloque, las acciones del chat abren formularios precargados; NEXUS no crea tareas ni artefactos silenciosamente a partir de una respuesta del modelo.

## Límite actual deliberado

El diff compara texto línea por línea y no intenta interpretar el AST de cada lenguaje. La futura integración con repositorios añadirá cambios por archivo, ramas, parches aplicables y validaciones automáticas antes de aceptar una modificación.

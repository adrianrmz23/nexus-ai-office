# QA — Bloque 09

## Migración y seguridad

- [ ] Existen `tasks`, `task_dependencies`, `artifacts`, `artifact_versions`, `project_decisions` y `error_solutions`.
- [ ] RLS está habilitado en las seis tablas.
- [ ] Un usuario no puede consultar registros de otro workspace.
- [ ] Una tarea no puede asignarse a un agente ajeno al proyecto.
- [ ] Una dependencia no puede relacionar tareas de proyectos diferentes.
- [ ] Un artefacto no puede vincularse con una tarea de otro proyecto.
- [ ] Conversación y mensaje de origen pertenecen al mismo proyecto.
- [ ] `audit_logs` registra creación, edición y cambios de estado.

## Tareas

- [ ] `/app/tareas` muestra el tablero y contadores reales.
- [ ] Crear una tarea manual conserva proyecto, prioridad, responsable y criterios.
- [ ] Editar una tarea conserva su proyecto y procedencia.
- [ ] Iniciar cambia el estado a `in_progress`.
- [ ] Enviar a revisión cambia el estado a `review`.
- [ ] Completar establece progreso en 100 y `completed_at`.
- [ ] Archivar conserva dependencias y artefactos.
- [ ] Las dependencias solo muestran tareas del mismo proyecto.
- [ ] La tarea muestra artefactos relacionados.

## Conversación a tarea

- [ ] Una respuesta de agente muestra `Crear tarea`.
- [ ] El formulario abre con proyecto, conversación, mensaje y agente precargados.
- [ ] El contenido de la respuesta se utiliza como descripción inicial.
- [ ] La tarea creada permite volver a la conversación de origen.

## Artefactos

- [ ] Crear un artefacto genera también la versión 1.
- [ ] El contenido completo permanece después de recargar.
- [ ] La ruta y el lenguaje son opcionales.
- [ ] Una nueva versión incrementa `current_version_number`.
- [ ] El historial conserva todas las versiones.
- [ ] El diff distingue líneas agregadas, eliminadas y sin cambios.
- [ ] Enviar a revisión actualiza estado y revisor.
- [ ] Solicitar cambios conserva la nota.
- [ ] Aprobar establece `approved_at`.
- [ ] Archivar no elimina las versiones.

## Conversación a artefacto

- [ ] Una respuesta de agente muestra `Guardar artefacto`.
- [ ] El contenido de la respuesta se precarga como versión 1.
- [ ] Proyecto, conversación, mensaje y agente quedan vinculados.
- [ ] El artefacto permite volver a la conversación.

## Registro técnico

- [ ] El dashboard del proyecto abre `Registro técnico`.
- [ ] Se puede registrar una decisión propuesta o aceptada.
- [ ] Se puede registrar error, firma, síntomas, causa raíz, solución y validación.
- [ ] Los registros muestran el agente relacionado cuando existe.
- [ ] Los accesos desde la conversación precargan conversación, mensaje y agente.

## Calidad

- [ ] `npm run typecheck` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `npm run test:run` termina sin errores.
- [ ] `npm run build` termina sin errores.
- [ ] Los estados vacíos, carga y error se muestran correctamente.
- [ ] El módulo es utilizable en escritorio y móvil.

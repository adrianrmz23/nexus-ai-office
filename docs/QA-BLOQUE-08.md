# QA — Bloque 08

## Migración

- [ ] Existen `team_executions` y `agent_handoffs`.
- [ ] `agent_runs` contiene los campos de jerarquía y resultados.
- [ ] RLS está habilitado en las dos tablas nuevas.
- [ ] El índice de ejecución activa permite runs hijos, pero solo una raíz activa por conversación.
- [ ] Un workspace no puede leer ejecuciones ni handoffs de otro workspace.

## Planificación

- [ ] El modo individual continúa realizando una sola llamada.
- [ ] El modo equipo muestra `Orquestador preparando el plan`.
- [ ] El plan contiene entre 1 y 3 especialistas.
- [ ] El líder nunca se selecciona como especialista.
- [ ] Un agente no asignado al proyecto no puede aparecer en el plan.
- [ ] Si existen reglas en `agent_collaborators`, solo se usan destinos habilitados.
- [ ] Un JSON inválido del plan activa el plan determinista de respaldo.

## Handoffs

- [ ] Cada especialista muestra inicio, modelo y objetivo.
- [ ] Cada handoff genera un registro en `agent_handoffs`.
- [ ] Cada llamada genera un run hijo en `agent_runs`.
- [ ] El resultado resumido aparece en tiempo real.
- [ ] Tokens, costo y duración se guardan cuando el proveedor los informa.
- [ ] Los resultados completos permanecen en `agent_runs.output_content` y `agent_handoffs.result_received`.
- [ ] Un especialista fallido no borra los resultados ya obtenidos.

## Consolidación

- [ ] El líder recibe las contribuciones reales y produce una única respuesta final.
- [ ] La respuesta final se transmite progresivamente.
- [ ] El mensaje final conserva el panel de colaboración al recargar.
- [ ] `team_executions.status` termina en `completed` o `partial`.
- [ ] El consumo total incluye planificación, especialistas y consolidación.
- [ ] `model_usage` tiene un registro por llamada completada.

## Cancelación y errores

- [ ] Cancelar durante el plan marca planificación y equipo como `cancelled`.
- [ ] Cancelar durante un especialista marca handoff, run y equipo como `cancelled`.
- [ ] Cancelar durante consolidación conserva los handoffs completados.
- [ ] No queda una ejecución raíz bloqueada en `running`.
- [ ] Una nueva solicitud puede comenzar después de la cancelación.

## Persistencia y dashboard

- [ ] Al recargar, el plan y los handoffs siguen visibles.
- [ ] El dashboard aumenta el contador de handoffs completados.
- [ ] El dashboard aumenta las ejecuciones de equipo completadas o parciales.
- [ ] `audit_logs` registra eventos `agent_handoff.*` y `team_execution.*`.

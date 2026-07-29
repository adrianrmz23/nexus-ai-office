# NEXUS AI OFFICE — Bloque 08

## Orquestación multiagente y handoffs reales

Este bloque reemplaza el modo equipo simulado por una ejecución coordinada y observable. El agente líder crea un plan, selecciona especialistas permitidos, delega subtareas mediante llamadas independientes al proveedor, registra cada handoff y finalmente consolida una respuesta única.

## Implementado

- Plan operativo generado por el agente líder.
- Respaldo determinista cuando el plan del modelo no puede validarse.
- Máximo de 3 handoffs por solicitud.
- Selección limitada a agentes activos, asignados al proyecto y autorizados como colaboradores.
- Llamada real e independiente por especialista.
- Consolidación final mediante el agente líder.
- Streaming de la respuesta consolidada.
- Actividad visible en tiempo real dentro del mensaje.
- Persistencia del plan, handoffs, resultados, modelo, tokens, costo y duración.
- Cancelación propagada a planificación, especialista o consolidación.
- Estado `partial` cuando la respuesta final se completa con uno o más especialistas fallidos.
- Contadores de handoffs y ejecuciones de equipo en el dashboard.
- RLS, validación de alcance y auditoría por workspace.
- Límite de una orquestación raíz activa por conversación.

## Flujo

```text
Solicitud del usuario
→ Nexus Orchestrator crea el plan
→ handoff al especialista 1
→ handoff al especialista 2
→ handoff al especialista 3 (cuando aporta valor)
→ Nexus Orchestrator consolida
→ respuesta final con actividad, fuentes y consumo visible
```

## Modelo de datos

La migración agrega:

- `team_executions`
- `agent_handoffs`
- Campos de jerarquía y resultado en `agent_runs`:
  - `parent_run_id`
  - `team_execution_id`
  - `run_kind`
  - `step_index`
  - `step_title`
  - `input_summary`
  - `output_content`
  - `output_summary`

## Instalación

1. Ejecuta `supabase/migrations/202607260008_multiagent_orchestration.sql` en Supabase SQL Editor.
2. Detén Next.js.
3. Elimina `.next`.
4. Ejecuta `npm run typecheck`, `npm run lint`, `npm run test:run` y `npm run build`.
5. Inicia `npm run dev`.
6. Abre una conversación con un proyecto que tenga líder y especialistas asignados.
7. Selecciona `Equipo coordinado` y envía una tarea suficientemente compleja.

## Control de costo y ciclos

- El líder puede seleccionar entre 1 y 3 especialistas.
- Un especialista no puede crear nuevos handoffs en este bloque.
- Los handoffs se ejecutan en secuencia para mantener trazabilidad y controlar rate limits.
- No existen ciclos entre agentes.
- El botón `Detener` cancela la cadena completa.
- La interfaz informa el consumo total del equipo, no únicamente la consolidación.

## Límite actual deliberado

Todos los pasos de una ejecución utilizan el modelo seleccionado o recomendado para la conversación. La selección de un modelo diferente por especialista ya está preparada en el catálogo, pero se habilitará después de incorporar presupuestos por paso y fallback entre proveedores.

Los agentes generan análisis y entregables de texto; todavía no ejecutan herramientas destructivas, comandos, despliegues ni escrituras sobre repositorios. Esas acciones requerirán permisos y aprobación humana explícita.

No se agregaron dependencias ni variables de entorno nuevas.

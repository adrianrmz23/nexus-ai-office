# ADR-010 — Analítica operacional y aprendizaje supervisado por el usuario

## Estado

Aceptado para el Bloque 10.

## Contexto

NEXUS ya registra ejecuciones, uso de modelos, handoffs, tareas y artefactos, pero esos datos estaban dispersos. Sin una capa analítica no es posible comparar proveedores, controlar costos ni saber si la recomendación de modelo produjo un resultado útil. Tampoco debe asumirse que una respuesta completada fue correcta.

## Decisión

Se incorpora una capa analítica basada en eventos y feedback explícito:

1. `model_recommendation_events` conserva la recomendación, alternativas, modelo utilizado y contexto de decisión.
2. `user_feedback` conserva veredicto, calificación, correcciones y tiempo ahorrado.
3. `usage_budgets` define límites mensuales globales o por proyecto.
4. `analytics_settings` define moneda visible, conversión manual y valores predeterminados para tiempo ahorrado.
5. El recomendador incorpora un puntaje histórico derivado de feedback de los últimos 180 días.
6. Los datos fuente continúan siendo `agent_runs`, `model_usage`, `agent_handoffs` y `team_executions`; no se duplican en tablas agregadas prematuramente.

## Fórmula histórica inicial

Cada evaluación se normaliza a un valor entre 0 y 100:

```text
rating × 20
+ 10 si fue aceptada
- 20 si fue rechazada
- 5 por cada corrección posterior
```

El promedio reciente se utiliza en la dimensión histórica del recomendador. Sin muestras, el valor permanece neutral en 50. Este mecanismo es explicable y reemplazable posteriormente por un modelo estadístico sin cambiar el contrato del recomendador.

## Costos

- La fuente de verdad es `model_usage.estimated_cost` y la moneda original.
- Un costo nulo permanece desconocido.
- La conversión solo admite pares soportados por la configuración manual.
- No se consulta una tasa externa en segundo plano.
- Un presupuesto con costos no convertibles se muestra como incompleto, no como cero.

## Seguridad

- Todas las tablas nuevas tienen RLS por workspace.
- Los eventos validan proyecto, conversación, mensaje, run y modelos.
- El feedback solo puede apuntar a respuestas completadas del asistente.
- La relación del feedback con el run raíz se deriva en PostgreSQL.
- Solo owner y admin administran configuración y presupuestos.
- Cada usuario edita únicamente su propio feedback.

## Consecuencias

- El dashboard agrega datos en tiempo de lectura; es suficiente para el volumen actual, pero requerirá vistas materializadas o rollups cuando crezca.
- El tipo de cambio debe mantenerse manualmente.
- El tiempo ahorrado es una estimación configurable, no una medición exacta.
- El aprendizaje depende de feedback humano y evita inferir calidad solo a partir de que una llamada terminó.

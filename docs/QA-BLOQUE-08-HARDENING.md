# QA — Endurecimiento del Bloque 08

## Caso principal

Usa modo `Equipo coordinado` y envía:

> Necesito planear una página de producto. Coordina al equipo para proponer una dirección visual, definir la estructura frontend, identificar riesgos técnicos y preparar criterios de validación y QA. No inventes archivos.

## Resultado esperado

- El plan selecciona hasta tres especialistas.
- Si están asignados, deben intervenir `Astra UI`, `Forge Frontend` y `Sentinel QA`.
- `Trace Debugger` no debe sustituir a QA únicamente por la palabra “riesgos”.
- La respuesta consolidada solo atribuye responsabilidades a handoffs completados.
- La sección `Participación verificada` muestra nombres reales y objetivos ejecutados.
- No deben aparecer participantes inventados como “Especialista en Seguridad” o “Ingeniero de Integración”.
- Los encabezados `##`, las listas y el texto `**negrita**` deben renderizarse visualmente.

## Regresión

- Modo individual continúa funcionando.
- Cancelación continúa dejando los runs en estado correcto.
- Las fuentes de memoria siguen visibles.
- Los handoffs persisten después de recargar.
- No se requiere ejecutar SQL.

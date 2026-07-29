# ADR-008 — Orquestación multiagente observable

## Estado

Aceptado para el Bloque 08.

## Contexto

El modo equipo anterior realizaba una sola llamada del líder con una descripción del equipo. Era transparente y no fingía colaboración, pero tampoco ejecutaba especialistas independientes. NEXUS necesita colaboración real sin introducir ciclos, costos incontrolables ni procesos ocultos.

## Decisión

La orquestación se implementa como una cadena acotada:

1. El líder produce un plan JSON validado.
2. El servidor limita el plan a agentes asignados y autorizados.
3. Se ejecutan hasta tres especialistas de forma secuencial.
4. Cada delegación se registra como handoff y run hijo.
5. El líder recibe los resultados como datos no confiables y consolida la respuesta.
6. El cliente recibe eventos NDJSON para observar el progreso.

`agent_runs` conserva cada llamada individual. `team_executions` agrega el estado y consumo de la cadena. `agent_handoffs` conserva origen, destino, motivo, contexto, resultado y métricas.

## Razones

- La secuencia es más fácil de cancelar y auditar que una red recursiva.
- El límite de tres especialistas contiene costo, latencia y rate limits.
- La validación del plan evita que el modelo seleccione agentes ajenos al proyecto.
- Mantener las contribuciones fuera del historial visible evita contaminar el chat, pero conserva evidencia completa.
- El streaming utiliza Web Streams desde un Route Handler y no expone credenciales al cliente.

## Consecuencias

- Una tarea de equipo consume varias llamadas y tarda más que el modo individual.
- Los especialistas usan inicialmente el mismo modelo de la ejecución.
- La ejecución depende todavía de la duración máxima del Route Handler.
- La futura cola asíncrona podrá reutilizar el mismo modelo de datos y eventos.

# ADR-004 — Agentes persistentes y recomendación determinista de equipos

## Estado

Aceptada — 26 de julio de 2026.

## Contexto

NEXUS necesita agentes configurables que puedan reutilizarse entre proyectos,
pero la lógica del agente no debe quedar acoplada a OpenAI, Anthropic, Gemini ni
otro proveedor. También necesitamos recomendar equipos antes de implementar la
ejecución multiagente y antes de disponer de suficiente historial para aprender
de resultados reales.

## Decisión

Los agentes se almacenan como entidades de dominio persistentes. Su registro
contiene identidad, rol, instrucciones, especialidades, herramientas permitidas,
preferencias de modelo y reglas de colaboración, pero no contiene credenciales
ni lógica específica de un proveedor.

Las relaciones principales son:

```text
agent_technologies  → especialización técnica
agent_collaborators → handoffs permitidos
project_agents      → equipo independiente por proyecto
```

La recomendación inicial es determinista y se ejecuta en la capa de aplicación.
Combina:

- rol del agente;
- tecnologías del proyecto;
- tecnologías dominadas por el agente;
- estado y disponibilidad;
- memoria habilitada;
- diversidad de roles;
- agentes ya asignados.

La recomendación no ejecuta IA, no consume tokens y siempre muestra razones
observables. Más adelante podrá complementarse con métricas históricas sin
cambiar el contrato del módulo.

Las escrituras compuestas usan funciones PostgreSQL `security definer` con
`search_path` fijo, validación explícita de membresía y permisos, y permisos de
ejecución restringidos.

## Consecuencias

- Los agentes pueden cambiar de proveedor o modelo sin reescribir su dominio.
- Cada proyecto conserva un equipo aislado.
- Las recomendaciones actuales son reproducibles y auditables.
- Los agentes iniciales pueden personalizarse, pero conservan su clasificación
  como agentes del sistema.
- La futura orquestación reutilizará estas entidades, permisos y relaciones.
- El historial de rendimiento podrá modificar puntajes en una fase posterior.

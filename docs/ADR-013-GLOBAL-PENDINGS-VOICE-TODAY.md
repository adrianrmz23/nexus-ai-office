# ADR-013 — Pendientes globales, voz y Centro Hoy

## Estado

Aceptada.

## Contexto

Las tareas existentes pertenecen obligatoriamente a proyectos y producen trabajo técnico. NEXUS también necesita administrar compromisos personales o laborales que no deben contaminar la memoria, métricas ni backlog de un proyecto.

La voz debe facilitar captura y consulta sin permitir mutaciones silenciosas. Además, la disponibilidad de reconocimiento de voz del navegador no es uniforme.

## Decisión

### Entidad independiente

Se crea `global_pendings`, sin `project_id`, identificada por:

- `workspace_id`
- `owner_user_id`

Los pendientes pueden conservar una referencia opcional a la conversación que los originó, pero no heredan el contexto de un proyecto.

### Separación de responsabilidades

- `tasks`: trabajo técnico ligado a un proyecto.
- `global_pendings`: compromisos del usuario.
- `/app/hoy`: lectura agregada, sin trasladar ni duplicar entidades.

### Voz

Se implementa una capa de contratos desacoplada:

- `SpeechToTextProvider`
- `TextToSpeechProvider`

La primera implementación usa Web Speech en el cliente:

- `SpeechRecognition` o `webkitSpeechRecognition` para dictado cuando existe.
- `SpeechSynthesis` para lectura.
- Entrada textual como respaldo obligatorio.

Las preferencias se guardan en PostgreSQL y se sincronizan con `localStorage` para que el runtime del navegador pueda aplicarlas inmediatamente.

### Seguridad de comandos

El endpoint de comandos usa un parser determinista para operaciones conocidas. Las consultas son de solo lectura. Crear, iniciar, completar o posponer genera una acción propuesta que el usuario debe confirmar.

No se envía audio a un LLM y no se guarda audio original.

### Recordatorios

Los recordatorios se consultan mientras NEXUS está abierto. El navegador puede emitir un toast, una notificación autorizada y una lectura hablada. No se promete ejecución en segundo plano cuando el navegador o el dispositivo están cerrados.

### Recurrencia

La siguiente ocurrencia se crea al completar el pendiente. Se previene la duplicación de una misma fecha y se conserva el registro original.

## Consecuencias

### Positivas

- Agenda personal separada de proyectos.
- Captura más rápida.
- Confirmación humana en acciones sensibles.
- Proveedor de voz reemplazable.
- Briefing verificable con fuentes internas estructuradas.

### Limitaciones

- El dictado depende de las capacidades del navegador.
- Las notificaciones y el briefing hablado requieren NEXUS abierto.
- No se integra todavía un proveedor de audio remoto ni telefonía.

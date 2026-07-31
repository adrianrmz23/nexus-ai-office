# NEXUS AI Office — Bloque 13

## Pendientes globales, Centro Hoy y voz

Este bloque agrega una agenda operativa independiente de los proyectos. Los registros de `global_pendings` pertenecen al usuario dentro de su workspace y no requieren `project_id`.

### Módulos nuevos

- `/app/hoy`: briefing y centro de atención.
- `/app/pendientes`: vistas Hoy, Bandeja, Calendario, Lista y Enfoque.
- `/app/pendientes/nuevo`: alta de pendientes.
- `/app/configuracion/voz`: voz, dictado, lectura y notificaciones.
- `/api/voice/commands`: interpretación segura de comandos de pendientes.
- `/api/pendings/reminders`: recordatorios cuando NEXUS está abierto.

### Capacidades

- Estados, prioridades, fecha y hora de entrega.
- Categorías, etiquetas, tiempo estimado y tiempo real.
- Recordatorios, posposición y recurrencia.
- Subpendientes con estado independiente.
- Puntuación operativa para ordenar qué atender primero.
- Calendario mensual y temporizador local de enfoque.
- Briefing diario que combina pendientes, tareas, artefactos y alertas.
- Lectura en voz alta de pendientes, tareas y respuestas.
- Dictado mediante las capacidades del navegador.
- Comandos para crear, consultar, iniciar, completar y posponer.
- Confirmación humana antes de modificar datos mediante voz.
- Transcripciones opcionales; el audio original no se guarda.
- Notificaciones del navegador mientras la aplicación está abierta.

## Instalación

1. Detén Next.js.
2. Extrae el paquete en la raíz del proyecto.
3. Ejecuta únicamente `supabase/migrations/202607260014_global_pendings_voice_today.sql`.
4. Elimina `.next`.
5. Ejecuta `npm run typecheck`, `npm run lint`, `npm run test:run` y `npm run build`.
6. Inicia con `npm run dev`.

## Alcance de voz

La implementación funcional inicial utiliza Web Speech del navegador. Los contratos `SpeechToTextProvider` y `TextToSpeechProvider` dejan preparado el reemplazo o complemento con OpenAI Audio, ElevenLabs u otro proveedor del lado servidor.

El reconocimiento puede variar por navegador. Aunque el micrófono no esté disponible, todos los comandos siguen funcionando mediante texto editable.

## Privacidad

- El audio original no se persiste.
- Las transcripciones solo se guardan cuando la preferencia está habilitada.
- Los cambios por voz requieren confirmación.
- Los pendientes están aislados por `workspace_id` y `owner_user_id` mediante RLS.

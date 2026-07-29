# NEXUS AI Office — Bloque 06

Este bloque inicia la Fase 3 y habilita conversaciones persistentes con
streaming real. La primera ejecución soportada utiliza OpenAI, OpenRouter o una
API compatible con OpenAI mediante el gateway desacoplado construido en el
Bloque 05.

## Incluye

- Catálogo de conversaciones por workspace y proyecto.
- Creación de sesiones en modo agente individual o equipo coordinado.
- Selector de proyecto, agente asignado, modelo y tipo de tarea.
- Selección automática basada en preferencias y recomendación ponderada.
- Ejecución real de OpenAI mediante Responses API.
- Ejecución de OpenRouter y APIs compatibles mediante Chat Completions.
- Streaming visible y cancelación desde la interfaz.
- Historial persistente de mensajes.
- Registro de agente, proveedor, modelo, tokens, costo estimado, duración y
  errores.
- Adjuntos básicos de texto y código.
- Detección de nombres y patrones asociados con credenciales antes de guardar o
  enviar adjuntos.
- Contexto permanente del proyecto y reglas del agente incluidos en el prompt.
- Protección explícita contra instrucciones maliciosas dentro de documentos.
- Límite del historial según la ventana de contexto conocida.
- Prevención de ejecuciones simultáneas dentro de la misma conversación.
- Optimización del recomendador del Bloque 05 para cargar solamente los datos
  necesarios al calcular una recomendación.
- RLS, validaciones cruzadas y auditoría.

## Comportamiento del modo equipo

En este bloque, el modo equipo realiza una sola ejecución con el agente líder.
El prompt incorpora las especialidades del equipo y solicita una respuesta
consolidada. No se simulan llamadas ocultas ni handoffs inexistentes.

La orquestación multiagente real, con subtareas y transferencias observables,
se implementará en el bloque correspondiente a multiagente.

## 1. Respaldo

```powershell
git add .
git commit -m "chore: checkpoint antes del bloque 06"
git push
```

## 2. Reemplazar archivos

Extrae el paquete en la raíz del proyecto y acepta reemplazar los archivos
existentes. El paquete no contiene:

```text
.env.local
node_modules
.next
.git
```

No se agregaron dependencias npm nuevas.

## 3. Ejecutar la migración

En Supabase abre `SQL Editor → New query` y ejecuta una sola vez:

```text
supabase/migrations/202607260006_conversation_runtime.sql
```

La migración depende de los Bloques 01 a 05. No vuelvas a ejecutar las
migraciones anteriores si ya están aplicadas.

## 4. Reiniciar y validar

Detén el servidor, elimina la caché y ejecuta:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run dev
```

## 5. Crear una conversación

Puedes iniciar desde:

```text
/app/conversaciones/nueva
```

O desde:

```text
Proyectos → Abrir proyecto → Iniciar conversación
```

Selecciona:

1. Proyecto.
2. Modo individual o equipo.
3. Agente asignado.
4. Selección automática o un modelo ejecutable.
5. Título de la conversación.

El proyecto debe tener al menos un agente activo asignado. El proveedor del
modelo debe tener credencial configurada.

## 6. Prueba de chat

1. Abre la conversación creada.
2. Conserva `Selección automática` o elige un modelo de chat que tu cuenta pueda
   ejecutar.
3. Selecciona el tipo de tarea.
4. Envía un mensaje sencillo.
5. Confirma que el texto aparece progresivamente.
6. Revisa agente, modelo, tokens, costo y duración.
7. Recarga la página y confirma que el historial permanece.
8. Envía una respuesta adicional para comprobar la continuidad.
9. Durante otra ejecución, pulsa `Detener` y confirma el estado cancelado.

## 7. Adjuntos

Se permiten hasta tres archivos de texto o código por mensaje:

- 256 KB por archivo.
- 512 KB en total.
- Sin archivos binarios en esta fase.

NEXUS bloquea nombres como `.env`, claves privadas y patrones evidentes de
tokens. La comprobación se realiza tanto en la interfaz como en el servidor.

Prueba con un archivo `.tsx`, `.sql`, `.liquid` o `.log` sin secretos. Después
intenta adjuntar un `.env.local`; debe ser rechazado.

## 8. Validación en Supabase

Deben existir estas tablas:

```text
conversations
conversation_participants
messages
message_attachments
agent_runs
model_usage
```

Después de enviar un mensaje, valida:

- Un mensaje `user` completado.
- Un mensaje `assistant` completado, fallido o cancelado.
- Una ejecución en `agent_runs`.
- Un registro en `model_usage` cuando la ejecución termina correctamente.
- Participantes vinculados a la conversación.

`audit_logs` debe registrar eventos como:

```text
conversation.created
conversation.updated
conversation.archived
agent_run.completed
agent_run.failed
agent_run.cancelled
```

## 9. Modelos habilitados en esta fase

La ejecución real está habilitada para:

```text
OpenAI
OpenRouter
API compatible con OpenAI
```

Anthropic y Gemini conservan conexión y catálogo, pero su runtime de chat se
habilitará mediante sus adaptadores correspondientes en un bloque posterior.
No se presentan como ejecutables en el selector actual.

## Límites deliberados

- El modo equipo todavía no crea subtareas ni handoffs reales.
- Los adjuntos son texto/código; Storage, PDF, imágenes y ZIP se implementarán
  en los bloques de documentos y memoria.
- No existen herramientas ejecutables ni modificaciones automáticas de código.
- El costo solo se calcula cuando el catálogo tiene precios revisados y el
  proveedor devuelve uso de tokens.
- Los límites de presupuesto configurables y rate limiting distribuido se
  completarán antes de producción.

## Resultado esperado

NEXUS ya puede mantener una conversación real dentro de un proyecto, aplicar su
contexto permanente, elegir un agente y modelo, transmitir la respuesta,
conservar el historial y registrar el uso técnico de cada ejecución.

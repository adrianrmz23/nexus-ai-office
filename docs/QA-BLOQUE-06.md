# QA — Bloque 06: conversaciones y streaming

## Preparación

- [ ] La migración `202607260006_conversation_runtime.sql` terminó sin errores.
- [ ] OpenAI, OpenRouter o un proveedor compatible tiene credencial configurada.
- [ ] Existe al menos un modelo de chat, razonamiento o multimodal activo.
- [ ] El proyecto de prueba tiene al menos un agente activo asignado.
- [ ] Se eliminó `.next` antes de reiniciar el servidor.

## Navegación

- [ ] `Conversaciones` aparece habilitado en escritorio y móvil.
- [ ] `/app/conversaciones` abre sin error de hidratación.
- [ ] El dashboard muestra conversaciones y ejecuciones completadas.
- [ ] El detalle del proyecto muestra `Iniciar conversación` cuando tiene equipo.

## Creación

- [ ] No permite crear una conversación individual sin agente.
- [ ] Solo muestra agentes asignados al proyecto seleccionado.
- [ ] Solo muestra modelos de proveedores con credencial configurada.
- [ ] No permite elegir un modelo de otro workspace.
- [ ] El modo equipo registra a los agentes del proyecto como participantes.
- [ ] El título rechaza menos de 2 o más de 140 caracteres.

## Ejecución y streaming

- [ ] El primer evento identifica agente, proveedor y modelo.
- [ ] La respuesta aparece progresivamente.
- [ ] El botón `Detener` cancela la solicitud.
- [ ] Una conversación no permite dos ejecuciones simultáneas.
- [ ] Un error del proveedor se presenta sin romper la pantalla.
- [ ] Una credencial inválida genera un mensaje controlado.
- [ ] Al terminar se muestran tokens y duración.
- [ ] El costo aparece cuando existen precios revisados.
- [ ] Recargar conserva mensajes y estados.
- [ ] El segundo mensaje utiliza el historial reciente.

## Contexto

- [ ] El prompt incluye nombre, descripción, stack e instrucciones del proyecto.
- [ ] Incluye instrucciones del agente activo.
- [ ] En modo equipo declara que responde el líder sin simular handoffs.
- [ ] Solicita archivos completos para cambios de programación.
- [ ] Los documentos se tratan como datos, no como instrucciones de sistema.
- [ ] Un contexto mayor al margen seguro del modelo produce un error legible.

## Adjuntos

- [ ] Permite archivos de texto y código compatibles.
- [ ] Rechaza más de tres archivos.
- [ ] Rechaza archivos mayores de 256 KB.
- [ ] Rechaza más de 512 KB acumulados.
- [ ] Rechaza `.env`, claves privadas y tokens reconocibles.
- [ ] La validación también ocurre en la API, no solo en el navegador.
- [ ] Los adjuntos aparecen en el historial después de recargar.

## Persistencia

- [ ] `messages` contiene el mensaje de usuario.
- [ ] `messages` contiene la respuesta del asistente y su estado.
- [ ] `agent_runs` conserva agente, modelo, proveedor, tarea y modo.
- [ ] `model_usage` conserva tokens, costo y duración cuando corresponde.
- [ ] Un error conserva `error_code` y `error_message`.
- [ ] Una cancelación queda como `cancelled`.

## Seguridad y RLS

- [ ] Otro workspace no puede leer conversaciones ni mensajes.
- [ ] Las relaciones cruzadas entre proyecto, conversación, agente y modelo fallan.
- [ ] Un agente seleccionado debe estar asignado al proyecto.
- [ ] Un modelo seleccionado debe pertenecer al workspace.
- [ ] Los adjuntos deben pertenecer al mensaje y conversación correctos.
- [ ] El frontend nunca recibe la clave API del proveedor.
- [ ] La llamada al proveedor se realiza únicamente desde el servidor.

## Recomendador

- [ ] La pantalla inicial abre sin consultar todo el catálogo evaluado.
- [ ] Al calcular solo recupera capacidades y puntuaciones necesarias.
- [ ] La recomendación responde en un tiempo razonable con el catálogo actual.
- [ ] No crea uso de tokens ni llamadas de generación.

## Validación técnica

```powershell
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Todos los comandos deben finalizar con código de salida 0.

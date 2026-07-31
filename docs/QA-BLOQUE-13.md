# QA — Bloque 13

## Migración

- [ ] La migración `014` termina sin errores.
- [ ] Existen `global_pendings`, `pending_subtasks`, `voice_settings` y `voice_command_logs`.
- [ ] RLS está habilitado en las cuatro tablas.
- [ ] Los RPC de creación y actualización solo son ejecutables por `authenticated`.

## Pendientes

- [ ] Crear un pendiente sin proyecto.
- [ ] Editar título, descripción, prioridad, categoría y etiquetas.
- [ ] Asignar fecha, hora y recordatorio.
- [ ] Agregar y completar subpendientes.
- [ ] Editar el pendiente y comprobar que los subpendientes conservan su estado cuando mantienen el mismo título.
- [ ] Iniciar, poner en espera, completar y archivar.
- [ ] Posponer y confirmar que aumenta el contador.
- [ ] Crear un pendiente recurrente, completarlo y comprobar que se crea una sola siguiente ocurrencia.
- [ ] Confirmar que no existe `project_id` en el registro.

## Vistas

- [ ] Hoy muestra vencidos y entregas del día.
- [ ] Bandeja muestra únicamente estado `inbox`.
- [ ] Calendario permite cambiar de mes y abrir un pendiente.
- [ ] Lista respeta búsqueda y filtros.
- [ ] Enfoque selecciona la prioridad más alta.
- [ ] El temporizador puede iniciar, pausar, persistir y reiniciar.

## Centro Hoy

- [ ] Combina pendientes globales, tareas, artefactos y ejecuciones fallidas.
- [ ] Los enlaces llevan a la entidad correcta.
- [ ] El briefing se escucha manualmente.
- [ ] La lectura automática respeta la hora configurada y solo ocurre una vez al día por navegador.

## Voz

- [ ] El micrófono aparece en un navegador compatible.
- [ ] La transcripción puede editarse antes de enviarse.
- [ ] “Agrega como pendiente enviar el reporte mañana a las diez, prioridad alta” solicita confirmación.
- [ ] Confirmar crea el registro con origen `voice`.
- [ ] “¿Qué pendientes urgentes tengo esta semana?” responde sin recargar la página.
- [ ] Completar, iniciar y posponer requieren confirmación.
- [ ] Desactivar reconocimiento oculta el micrófono.
- [ ] Desactivar síntesis oculta o inutiliza la lectura.
- [ ] La configuración se conserva tras recargar y en otra sesión del mismo usuario.
- [ ] El audio original no se guarda.

## Recordatorios

- [ ] Con NEXUS abierto, un recordatorio vencido genera toast.
- [ ] Con permiso, también genera notificación del navegador.
- [ ] No vuelve a notificarse hasta que cambie `reminder_at`.
- [ ] Cambiar `reminder_at` restablece `last_reminded_at`.

## Integración

- [ ] Una respuesta de conversación permite crear un pendiente.
- [ ] Una tarea de proyecto puede leerse en voz alta.
- [ ] Una respuesta del asistente puede leerse, pausarse y detenerse.
- [ ] El dashboard principal muestra el conteo real de pendientes.
- [ ] Navegación de escritorio y móvil incluye Hoy/Pendientes.

## Regresión

- [ ] Autenticación y onboarding siguen funcionando.
- [ ] Conversaciones individuales y multiagente siguen funcionando.
- [ ] Memoria, tareas, artefactos, analítica y repositorios siguen accesibles.
- [ ] Tema claro, oscuro y sistema conservan contraste correcto.
- [ ] `npm run typecheck`, `npm run lint`, `npm run test:run` y `npm run build` pasan.

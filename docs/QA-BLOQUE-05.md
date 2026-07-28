# QA — Bloque 05: proveedores y modelos

## Preparación

- [ ] La migración `202607260005_ai_provider_catalog.sql` terminó sin errores.
- [ ] `NEXUS_CREDENTIAL_ENCRYPTION_KEY` existe en `.env.local`.
- [ ] `.env.local` continúa ignorado por Git.
- [ ] El servidor fue reiniciado después de agregar la variable.

## Navegación y dashboard

- [ ] `Modelos IA` aparece habilitado en escritorio y móvil.
- [ ] `/app/modelos` abre sin error de hidratación.
- [ ] El dashboard muestra proveedores y modelos activos.
- [ ] Los cinco proveedores iniciales pertenecen al workspace actual.

## Proveedores

- [ ] Un miembro con rol `member` puede consultar, pero no modificar.
- [ ] Owner/admin puede editar nombre, endpoint, estado y notas.
- [ ] La clave se captura con un campo de contraseña.
- [ ] Después de guardar solo se muestra la terminación de la clave.
- [ ] La clave completa no aparece en HTML, logs ni respuestas del navegador.
- [ ] La prueba de conexión registra latencia, estado y cantidad de modelos.
- [ ] Una clave inválida produce un mensaje controlado.
- [ ] Eliminar la credencial limpia su estado y bloquea sincronización.

## Modelos

- [ ] La sincronización crea o actualiza modelos sin duplicar el identificador.
- [ ] Es posible agregar un modelo manual.
- [ ] Es posible editar nombre, identificador, tipo y estado.
- [ ] Contexto y costos rechazan valores negativos.
- [ ] Capacidades admiten `Desconocido`, `Compatible` y `No compatible`.
- [ ] Puntuaciones aceptan únicamente enteros de 0 a 100.
- [ ] Las puntuaciones por tecnología se conservan después de editar.
- [ ] Un modelo inactivo deja de aparecer en preferencias y recomendación.

## Preferencias

- [ ] El detalle de un agente permite elegir modelo principal.
- [ ] Se pueden seleccionar hasta cinco alternativas sin duplicados.
- [ ] El modelo principal no puede repetirse como alternativa.
- [ ] El detalle de un proyecto guarda presupuesto y velocidad.
- [ ] Ninguna preferencia puede referenciar modelos de otro workspace.

## Recomendador

- [ ] Sin modelos activos muestra un estado vacío.
- [ ] Excluye un modelo conocido como incompatible con visión/herramientas/etc.
- [ ] Excluye un modelo cuyo contexto conocido sea insuficiente.
- [ ] Muestra puntaje, confianza y razones observables.
- [ ] Muestra alternativa económica y alternativa de calidad cuando existen.
- [ ] No crea registros de uso ni consume tokens.

## Seguridad y RLS

- [ ] Un usuario de otro workspace no puede consultar proveedores ni modelos.
- [ ] `provider_credentials` no puede consultarse directamente desde el cliente.
- [ ] Las RPC de credenciales rechazan usuarios sin rol owner/admin.
- [ ] Cambiar el `workspace_id` de relaciones produce error.
- [ ] `created_by` y `updated_by` se conservan mediante triggers.
- [ ] Las acciones importantes aparecen en `audit_logs`.

## Validación técnica

```powershell
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Todos los comandos deben finalizar con código de salida 0.

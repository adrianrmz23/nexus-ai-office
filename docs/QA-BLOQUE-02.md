# QA — Bloque 02: catálogo de tecnologías

## Acceso

- [ ] Un usuario sin sesión es enviado a `/iniciar-sesion`.
- [ ] Un usuario con workspace puede abrir `/app/tecnologias`.
- [ ] El módulo aparece activo en escritorio y móvil.

## Creación

- [ ] Nombre vacío muestra validación.
- [ ] Color inválido es rechazado por servidor y base de datos.
- [ ] URL sin `http://` o `https://` es rechazada.
- [ ] Etiquetas repetidas se guardan una sola vez.
- [ ] No se guardan más de 12 etiquetas.
- [ ] Una tecnología duplicada muestra un mensaje comprensible.

## Edición y estados

- [ ] La edición conserva el mismo ID.
- [ ] Cambiar el nombre actualiza el slug.
- [ ] Desactivar conserva el registro.
- [ ] Archivar solicita confirmación.
- [ ] Restaurar elimina `archived_at` y vuelve a estado activo.
- [ ] Los filtros de estado muestran los registros correctos.

## Seguridad

- [ ] `workspace_id` no se recibe desde el formulario.
- [ ] Solo owner/admin puede crear o editar.
- [ ] Un miembro puede consultar, pero no modificar.
- [ ] Una tecnología no puede moverse a otro workspace.
- [ ] Una relación no puede mezclar tecnologías de workspaces distintos.
- [ ] Los cambios crean un registro de auditoría sin guardar secretos.

## Calidad

- [ ] `npm run typecheck` finaliza sin errores.
- [ ] `npm run lint` finaliza sin errores.
- [ ] `npm run test:run` finaliza sin errores.
- [ ] `npm run build` finaliza sin errores.
- [ ] No hay errores en la consola del navegador.

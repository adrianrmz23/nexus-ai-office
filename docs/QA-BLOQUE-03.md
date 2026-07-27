# QA — Bloque 03: gestión de proyectos

## Acceso

- [ ] Un usuario sin sesión es enviado a `/iniciar-sesion`.
- [ ] Un usuario con workspace puede abrir `/app/proyectos`.
- [ ] Proyectos aparece activo en escritorio y móvil.
- [ ] Un ID inválido devuelve una página 404.

## Creación

- [ ] Nombre menor a 2 caracteres muestra validación.
- [ ] URL sin `http://` o `https://` es rechazada.
- [ ] Presupuesto con más de dos decimales es rechazado.
- [ ] Un proyecto duplicado muestra un mensaje comprensible.
- [ ] Se puede crear un proyecto sin tecnologías.
- [ ] Se pueden asignar varias tecnologías no archivadas.
- [ ] No se aceptan más de 30 tecnologías.
- [ ] La creación guarda proyecto y stack dentro de una misma transacción.

## Edición y estados

- [ ] La edición conserva el mismo ID.
- [ ] Cambiar el nombre actualiza el slug.
- [ ] Cambiar tecnologías sincroniza únicamente las relaciones necesarias.
- [ ] Pausar conserva todo el contexto.
- [ ] Archivar solicita confirmación.
- [ ] Restaurar elimina `archived_at` y vuelve a estado activo.
- [ ] Los filtros de estado y prioridad funcionan.
- [ ] La búsqueda encuentra por nombre o cliente.

## Centro del proyecto

- [ ] Muestra descripción, cliente, prioridad y presupuesto reales.
- [ ] Muestra únicamente las tecnologías asignadas.
- [ ] Los enlaces externos abren en una pestaña nueva.
- [ ] Muestra instrucciones, reglas y convenciones.
- [ ] Los bloques vacíos no inventan contenido.

## Seguridad

- [ ] `workspace_id` no se recibe desde campos editables del formulario.
- [ ] Solo owner/admin puede crear, editar o cambiar estados.
- [ ] Un miembro puede consultar, pero no modificar.
- [ ] Un proyecto no puede moverse a otro workspace.
- [ ] No se pueden asignar tecnologías de otro workspace.
- [ ] No se pueden asignar tecnologías archivadas.
- [ ] Las escrituras completas se ejecutan mediante RPC con validación de rol.
- [ ] Las acciones generan auditoría sin guardar secretos.

## Calidad

- [ ] `npm run typecheck` finaliza sin errores.
- [ ] `npm run lint` finaliza sin errores.
- [ ] `npm run test:run` finaliza sin errores.
- [ ] `npm run build` finaliza sin errores.
- [ ] No hay errores en la consola del navegador.
- [ ] La vista funciona en escritorio y móvil.

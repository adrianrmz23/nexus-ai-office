# QA — Bloque 04: agentes y equipos

## Migración y datos iniciales

- [ ] La migración `202607260004_agent_management.sql` finaliza sin errores.
- [ ] Existen `agents`, `agent_technologies`, `agent_collaborators` y
      `project_agents`.
- [ ] Cada workspace existente recibe ocho agentes del sistema.
- [ ] Los agentes del sistema no se duplican al volver a sembrar datos.
- [ ] Las tecnologías existentes se relacionan únicamente con agentes del mismo
      workspace.

## Catálogo de agentes

- [ ] `/app/agentes` muestra contadores reales.
- [ ] La búsqueda por nombre funciona.
- [ ] Los filtros por rol y estado funcionan.
- [ ] La vista vacía no inventa agentes ni datos.
- [ ] Cada tarjeta muestra rol, estado, especialidades y proyectos activos.
- [ ] Un ID inválido devuelve una página 404.

## Creación y edición

- [ ] El nombre requiere entre 2 y 100 caracteres.
- [ ] Las instrucciones requieren entre 20 y 15 000 caracteres.
- [ ] El color debe tener formato hexadecimal.
- [ ] El avatar opcional debe comenzar con `http://` o `https://`.
- [ ] Se rechazan tecnologías archivadas o de otro workspace.
- [ ] Se rechazan colaboradores archivados o de otro workspace.
- [ ] Un agente no puede colaborar consigo mismo.
- [ ] No se aceptan herramientas fuera del catálogo permitido.
- [ ] La edición conserva el ID, asignaciones e historial.
- [ ] Los agentes del sistema conservan `agent_kind = system` después de editar.

## Estados

- [ ] Desactivar conserva relaciones y evita nuevas asignaciones activas.
- [ ] Archivar solicita confirmación.
- [ ] Archivar retira al agente de equipos activos.
- [ ] Restaurar vuelve a habilitar el agente sin restaurar asignaciones antiguas
      automáticamente.
- [ ] Los cambios generan auditoría.

## Equipo por proyecto

- [ ] El dashboard del proyecto muestra el equipo activo.
- [ ] `Administrar equipo` abre `/app/proyectos/[projectId]/agentes`.
- [ ] La recomendación excluye agentes ya asignados o inactivos.
- [ ] La recomendación explica rol, coincidencia técnica y confianza.
- [ ] La asignación sugerida no supera seis agentes desde la interfaz.
- [ ] Se puede asignar un agente individual con motivo opcional.
- [ ] Solo existe un líder activo por proyecto.
- [ ] Designar un nuevo líder retira el liderazgo anterior.
- [ ] Retirar un agente solicita confirmación.
- [ ] Un proyecto archivado no acepta nuevas asignaciones activas.

## Seguridad

- [ ] Todas las lecturas exigen membresía activa en el workspace.
- [ ] Solo owner/admin puede crear, editar, cambiar estados o administrar equipos.
- [ ] Un miembro puede consultar, pero no modificar.
- [ ] Ninguna relación puede cruzar workspaces.
- [ ] Las escrituras compuestas usan funciones PostgreSQL con validación de rol.
- [ ] Las funciones privadas no pueden ejecutarse desde `anon` o `authenticated`.
- [ ] Las claves de proveedores no se almacenan en agentes.
- [ ] La auditoría no guarda instrucciones completas ni secretos.

## Calidad

- [ ] `npm run typecheck` finaliza sin errores.
- [ ] `npm run lint` finaliza sin errores.
- [ ] `npm run test:run` finaliza sin errores.
- [ ] `npm run build` finaliza sin errores.
- [ ] No hay errores en la consola del navegador.
- [ ] El módulo funciona en escritorio y móvil.

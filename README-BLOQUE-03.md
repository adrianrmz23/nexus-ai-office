# NEXUS AI Office — Bloque 03

Este bloque agrega la gestión funcional de proyectos, la asignación de
tecnologías y un centro individual con contexto permanente por proyecto.

## Incluye

- Tabla `projects` protegida por workspace.
- Tabla `project_technologies` para asignar el stack técnico.
- Creación y edición atómica mediante funciones PostgreSQL.
- Búsqueda, filtros, prioridades y estados.
- Activación, pausa, archivo y restauración.
- URLs de repositorio, producción y staging.
- Presupuesto operativo opcional.
- Instrucciones permanentes, reglas y convenciones.
- Dashboard individual de cada proyecto.
- Contadores reales en el panel general.
- Auditoría de proyectos y asignaciones.
- Validación Zod y pruebas unitarias.
- Navegación responsive a `/app/proyectos`.

## 1. Respaldo

Antes de reemplazar archivos:

```powershell
git add .
git commit -m "chore: checkpoint antes del bloque 03"
```

## 2. Reemplazar archivos

Extrae el paquete en la raíz del proyecto y permite reemplazar los archivos
existentes. El paquete conserva autenticación, onboarding, workspaces y el
catálogo de tecnologías.

No reemplaces ni compartas `.env.local`.

## 3. Ejecutar la migración

En Supabase abre:

```text
SQL Editor → New query
```

Copia y ejecuta una sola vez el contenido completo de:

```text
supabase/migrations/202607260003_project_management.sql
```

La migración depende de los Bloques 01 y 02. No vuelvas a ejecutar las
migraciones anteriores si ya quedaron aplicadas.

## 4. Validación local

En la raíz del proyecto:

```powershell
npm install
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run dev
```

## 5. Prueba funcional

1. Inicia sesión.
2. Abre `Proyectos` en el menú lateral.
3. Crea un proyecto real.
4. Selecciona una o varias tecnologías existentes.
5. Agrega descripción, prioridad, URLs e instrucciones permanentes.
6. Comprueba que el proyecto abre su dashboard individual.
7. Edítalo y cambia su stack.
8. Pausa el proyecto y vuelve a activarlo.
9. Archívalo después de aceptar la confirmación.
10. Filtra por `Archivado` y restáuralo.
11. Regresa al panel general y revisa los contadores.

## 6. Validación en Supabase

En `Table Editor` deben existir:

```text
projects
project_technologies
```

Después de crear y editar un proyecto, `audit_logs` debe incluir acciones como:

```text
project.created
project.updated
project.activated
project.paused
project.archived
project.restored
project.technology_assigned
project.technology_removed
```

## Resultado esperado

Cada proyecto pertenece al workspace activo, conserva un stack aislado y puede
almacenar reglas e instrucciones que más adelante utilizarán agentes,
conversaciones y memoria semántica.

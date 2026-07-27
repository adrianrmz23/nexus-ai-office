# NEXUS AI Office — Bloque 04

Este bloque incorpora el catálogo funcional de agentes especializados y la
asignación de equipos a proyectos. Las recomendaciones se calculan mediante
reglas deterministas basadas en rol, stack y especialidades registradas; todavía
no ejecutan modelos de IA ni consumen tokens.

## Incluye

- Tablas `agents`, `agent_technologies`, `agent_collaborators` y
  `project_agents`.
- Ocho agentes iniciales del sistema por workspace.
- Creación y edición de agentes personalizados.
- Rol, alcance, instrucciones, creatividad, memoria y estado.
- Tecnologías dominadas y herramientas permitidas.
- Colaboradores autorizados para futuros handoffs.
- Modelo preferido y alternativas como preparación para el catálogo de modelos.
- Búsqueda y filtros por nombre, rol y estado.
- Activación, desactivación, archivo y restauración.
- Página individual con especialidades, herramientas, proyectos y colaboradores.
- Administración del equipo desde el dashboard individual de cada proyecto.
- Recomendación inicial de equipo por coincidencia entre stack y especialidad.
- Asignación individual, designación de líder y asignación masiva sugerida.
- RLS por workspace, funciones PostgreSQL protegidas y auditoría.
- Contadores reales en el panel general.
- Validaciones Zod y pruebas unitarias del formulario y recomendador.

## 1. Respaldo

Antes de reemplazar archivos:

```powershell
git add .
git commit -m "chore: checkpoint antes del bloque 04"
```

## 2. Reemplazar archivos

Extrae el paquete en la raíz del proyecto y permite reemplazar los archivos
existentes. El paquete no incluye `.env.local`, `node_modules`, `.next` ni
`.git`.

No se agregaron dependencias nuevas, por lo que no es necesario volver a
instalar paquetes si tu proyecto ya funciona.

## 3. Ejecutar la migración

En Supabase abre:

```text
SQL Editor → New query
```

Copia y ejecuta una sola vez el contenido completo de:

```text
supabase/migrations/202607260004_agent_management.sql
```

La migración depende de los Bloques 01, 02 y 03. No vuelvas a ejecutar las
migraciones anteriores si ya están aplicadas.

La migración crea ocho agentes iniciales en cada workspace existente y también
prepara la creación automática de esos agentes en nuevos workspaces.

## 4. Validación local

Ejecuta, en este orden:

```powershell
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run dev
```

## 5. Prueba funcional

1. Inicia sesión y abre `/app/agentes`.
2. Confirma que aparecen ocho agentes del sistema.
3. Abre un agente y revisa instrucciones, tecnologías y herramientas.
4. Edita un agente y guarda una modificación pequeña.
5. Crea un agente personalizado.
6. Desactívalo, actívalo, archívalo y restáuralo.
7. Abre un proyecto existente.
8. Presiona `Administrar equipo`.
9. Revisa la recomendación calculada para el stack del proyecto.
10. Asigna el equipo sugerido o agrega un agente manualmente.
11. Designa un líder y confirma que solo exista un líder activo por proyecto.
12. Retira un agente del equipo.
13. Regresa al panel general y revisa los contadores.

## 6. Validación en Supabase

En `Table Editor` deben existir:

```text
agents
agent_technologies
agent_collaborators
project_agents
```

Después de trabajar con agentes y equipos, `audit_logs` debe incluir acciones
como:

```text
agent.created
agent.updated
agent.activated
agent.deactivated
agent.archived
agent.restored
project.agent_assigned
project.agent_removed
```

## Resultado esperado

La oficina dispone de especialistas persistentes y configurables. Cada proyecto
puede tener un equipo independiente y observable, preparado para conectarse más
adelante con proveedores, modelos, conversaciones, memoria y ejecución
multiagente.

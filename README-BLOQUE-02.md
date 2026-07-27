# NEXUS AI Office — Bloque 02

Este bloque agrega el primer módulo funcional del catálogo técnico: tecnologías
administrables, protegidas por workspace y conectadas al dashboard.

## Incluye

- Tabla `technologies` con RLS.
- Tabla `technology_relations`, preparada para relaciones futuras.
- Tabla inicial `audit_logs`.
- Alta, edición, búsqueda, filtros y estados.
- Activación, desactivación, archivo y restauración.
- Documentación oficial, versión, etiquetas y prompt técnico base.
- Navegación real a `/app/tecnologias`.
- Validación Zod y pruebas unitarias.
- Auditoría automática de altas y cambios.

## 1. Respaldo

Antes de reemplazar archivos:

```powershell
git add .
git commit -m "chore: checkpoint antes del bloque 02"
```

Si todavía no utilizas Git, copia la carpeta completa como respaldo.

## 2. Reemplazar archivos

Extrae el paquete en la raíz del proyecto y permite reemplazar los archivos
existentes. El paquete conserva la autenticación y configuración del Bloque 01.

No reemplaces ni compartas `.env.local`.

## 3. Ejecutar la migración

En Supabase abre:

```text
SQL Editor → New query
```

Copia y ejecuta, una sola vez, el contenido completo de:

```text
supabase/migrations/202607260002_technology_catalog.sql
```

La migración es acumulativa. No vuelvas a ejecutar manualmente la migración
`202607260001_foundation.sql` si ya quedó aplicada.

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
2. Abre `Tecnologías` en el menú lateral.
3. Crea una tecnología real, por ejemplo la primera que utilizarás en Nexus.
4. Comprueba que aparece en el catálogo y en los contadores.
5. Edítala y cambia la versión.
6. Desactívala y vuelve a activarla.
7. Archívala después de aceptar la confirmación.
8. Filtra por `Archivada` y restáurala.
9. Regresa al panel general y comprueba los contadores.

## 6. Validación en Supabase

En `Table Editor` deben existir:

```text
technologies
technology_relations
audit_logs
```

Después de crear y editar una tecnología, `audit_logs` debe incluir acciones
como:

```text
technology.created
technology.updated
technology.activated
technology.deactivated
technology.archived
technology.restored
```

## Resultado esperado

El catálogo ya no es decorativo. Cada registro se guarda realmente en
PostgreSQL, pertenece al workspace activo y se protege mediante RLS.

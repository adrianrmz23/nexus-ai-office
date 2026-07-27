# ADR-003 — Escrituras atómicas para proyectos

## Estado

Aceptada — 26 de julio de 2026.

## Contexto

Crear o editar un proyecto también puede modificar su conjunto de tecnologías.
Ejecutar ambas escrituras desde el cliente en solicitudes independientes podría
dejar un proyecto guardado con un stack incompleto si una operación falla.

## Decisión

Las operaciones completas utilizan las funciones PostgreSQL:

```text
create_project_record
update_project_record
```

Cada función:

- valida la sesión;
- valida el rol dentro del workspace;
- valida que las tecnologías pertenezcan al mismo workspace;
- rechaza tecnologías archivadas;
- guarda proyecto y relaciones en una sola transacción;
- conserva RLS para todas las lecturas y cambios simples de estado.

## Consecuencias

- No existen estados parciales entre proyecto y stack.
- La lógica de seguridad crítica también vive en la base de datos.
- Los Server Actions permanecen pequeños y validan con Zod antes de invocar la
  función.
- Las funciones deben mantenerse junto con sus migraciones y pruebas de
  seguridad.

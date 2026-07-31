-- Auditoría estructural del Bloque 13.
-- Las primeras consultas deben devolver cuatro filas con RLS activo y las políticas esperadas.

select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('global_pendings', 'pending_subtasks', 'voice_settings', 'voice_command_logs')
order by c.relname;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('global_pendings', 'pending_subtasks', 'voice_settings', 'voice_command_logs')
order by tablename, policyname;

select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in ('create_global_pending_record', 'update_global_pending_record')
order by routine_name, grantee;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'global_pendings'
  and column_name = 'project_id';
-- Resultado esperado: cero filas; los pendientes globales no pertenecen a proyectos.

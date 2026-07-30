-- Ejecuta este archivo en un entorno de pruebas con un usuario autenticado.
-- Debe devolver arreglos vacíos para las tres primeras comprobaciones.

select
  c.relname as table_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity is false
order by c.relname;

select id as public_nexus_bucket
from storage.buckets
where id like 'nexus-%'
  and public is true
order by id;

select distinct table_name as exposed_sensitive_table
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in ('provider_credentials', 'request_rate_limits')
  and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
order by table_name;

select display_name, provider_type, base_url, status
from public.ai_providers
where provider_type in ('kimi', 'deepseek')
order by provider_type;

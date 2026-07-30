begin;

-- Kimi y DeepSeek son proveedores de primera clase. Ambos exponen APIs
-- compatibles con Chat Completions, pero se conservan como tipos propios
-- para analítica, recomendaciones, salud y configuración independiente.
alter table public.ai_providers
  drop constraint if exists ai_providers_type_allowed;

alter table public.ai_providers
  add constraint ai_providers_type_allowed
  check (
    provider_type in (
      'openai',
      'anthropic',
      'gemini',
      'kimi',
      'deepseek',
      'openrouter',
      'openai_compatible'
    )
  );

create or replace function public.seed_workspace_ai_providers(
  target_workspace_id uuid,
  actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.ai_providers (
    workspace_id,
    slug,
    display_name,
    provider_type,
    base_url,
    icon,
    color,
    status,
    created_by,
    updated_by
  ) values
    (target_workspace_id, 'openai', 'OpenAI', 'openai', 'https://api.openai.com/v1', 'sparkles', '#55E6C1', 'active', actor_id, actor_id),
    (target_workspace_id, 'anthropic', 'Anthropic', 'anthropic', 'https://api.anthropic.com/v1', 'brain', '#A78BFA', 'active', actor_id, actor_id),
    (target_workspace_id, 'gemini', 'Google Gemini', 'gemini', 'https://generativelanguage.googleapis.com/v1beta', 'gem', '#60A5FA', 'active', actor_id, actor_id),
    (target_workspace_id, 'kimi', 'Kimi · Moonshot AI', 'kimi', 'https://api.moonshot.ai/v1', 'moon', '#8B5CF6', 'active', actor_id, actor_id),
    (target_workspace_id, 'deepseek', 'DeepSeek', 'deepseek', 'https://api.deepseek.com', 'waves', '#3B82F6', 'active', actor_id, actor_id),
    (target_workspace_id, 'openrouter', 'OpenRouter', 'openrouter', 'https://openrouter.ai/api/v1', 'route', '#F59E0B', 'active', actor_id, actor_id),
    (target_workspace_id, 'openai-compatible', 'API compatible con OpenAI', 'openai_compatible', 'http://localhost:11434/v1', 'server', '#94A3B8', 'inactive', actor_id, actor_id)
  on conflict (workspace_id, slug) do update set
    display_name = excluded.display_name,
    provider_type = excluded.provider_type,
    base_url = case
      when public.ai_providers.credential_status = 'missing'
        then excluded.base_url
      else public.ai_providers.base_url
    end,
    icon = excluded.icon,
    color = excluded.color,
    updated_by = actor_id,
    updated_at = now();

  insert into public.model_recommendation_weights(
    workspace_id,
    created_by,
    updated_by
  ) values (
    target_workspace_id,
    actor_id,
    actor_id
  ) on conflict (workspace_id) do nothing;
end;
$$;

select public.seed_workspace_ai_providers(w.id, w.owner_id)
from public.workspaces as w;

-- Ventanas de rate limiting. No se exponen por la Data API: solo se accede
-- mediante consume_rate_limit(), que valida la membresía y serializa el conteo.
create table if not exists public.request_rate_limits (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action_key text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  last_seen_at timestamptz not null default now(),
  primary key (workspace_id, actor_id, action_key, window_started_at),
  constraint request_rate_limits_action_length
    check (char_length(action_key) between 2 and 100),
  constraint request_rate_limits_count_positive
    check (request_count >= 0)
);

create index if not exists request_rate_limits_cleanup_idx
  on public.request_rate_limits(last_seen_at);

alter table public.request_rate_limits enable row level security;
revoke all on public.request_rate_limits from anon, authenticated;

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  severity text not null default 'info',
  source text not null default 'application',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint security_events_type_length
    check (char_length(event_type) between 2 and 120),
  constraint security_events_source_length
    check (char_length(source) between 2 and 80),
  constraint security_events_severity_allowed
    check (severity in ('info', 'warning', 'high', 'critical')),
  constraint security_events_metadata_size
    check (octet_length(metadata::text) <= 32768)
);

create index if not exists security_events_workspace_created_idx
  on public.security_events(workspace_id, created_at desc);
create index if not exists security_events_workspace_severity_idx
  on public.security_events(workspace_id, severity, created_at desc);

alter table public.security_events enable row level security;

drop policy if exists "security_events_select_admin" on public.security_events;
create policy "security_events_select_admin"
on public.security_events
for select
to authenticated
using (
  public.has_workspace_role(
    workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  )
);

revoke all on public.security_events from anon, authenticated;
grant select on public.security_events to authenticated;

create or replace function public.consume_rate_limit(
  p_workspace_id uuid,
  p_action_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table(
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  bucket_start timestamptz;
  current_count integer := 0;
  normalized_key text := lower(trim(p_action_key));
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Insufficient permissions';
  end if;

  if p_limit < 1 or p_limit > 10000 then
    raise exception 'Invalid rate limit';
  end if;

  if p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate limit window';
  end if;

  if normalized_key !~ '^[a-z0-9][a-z0-9:._-]{1,99}$' then
    raise exception 'Invalid rate limit key';
  end if;

  bucket_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds)
    * p_window_seconds
  );

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_workspace_id::text || ':' || current_user_id::text || ':' || normalized_key || ':' || bucket_start::text,
      0
    )
  );

  select request_count
    into current_count
  from public.request_rate_limits
  where workspace_id = p_workspace_id
    and actor_id = current_user_id
    and action_key = normalized_key
    and window_started_at = bucket_start;

  if not found then
    current_count := 1;
    insert into public.request_rate_limits(
      workspace_id,
      actor_id,
      action_key,
      window_started_at,
      request_count,
      last_seen_at
    ) values (
      p_workspace_id,
      current_user_id,
      normalized_key,
      bucket_start,
      current_count,
      now()
    );
    allowed := true;
  elsif current_count >= p_limit then
    update public.request_rate_limits
      set last_seen_at = now()
    where workspace_id = p_workspace_id
      and actor_id = current_user_id
      and action_key = normalized_key
      and window_started_at = bucket_start;
    allowed := false;
  else
    current_count := current_count + 1;
    update public.request_rate_limits
      set request_count = current_count,
          last_seen_at = now()
    where workspace_id = p_workspace_id
      and actor_id = current_user_id
      and action_key = normalized_key
      and window_started_at = bucket_start;
    allowed := true;
  end if;

  remaining := greatest(p_limit - current_count, 0);
  reset_at := bucket_start + make_interval(secs => p_window_seconds);
  return next;
end;
$$;

create or replace function public.record_security_event(
  p_workspace_id uuid,
  p_event_type text,
  p_severity text default 'info',
  p_source text default 'application',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  event_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Insufficient permissions';
  end if;

  if p_severity not in ('info', 'warning', 'high', 'critical') then
    raise exception 'Invalid severity';
  end if;

  insert into public.security_events(
    workspace_id,
    actor_id,
    event_type,
    severity,
    source,
    metadata
  ) values (
    p_workspace_id,
    current_user_id,
    left(trim(p_event_type), 120),
    p_severity,
    left(trim(p_source), 80),
    coalesce(p_metadata, '{}'::jsonb)
  ) returning id into event_id;

  return event_id;
end;
$$;

create or replace function public.get_nexus_security_posture(
  p_workspace_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  disabled_rls_tables text[];
  public_nexus_buckets text[];
  exposed_sensitive_tables text[];
  recent_high_events integer;
  rate_limit_windows integer;
  provider_summary jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.has_workspace_role(
    p_workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  ) then
    raise exception 'Insufficient permissions';
  end if;

  select coalesce(array_agg(c.relname order by c.relname), '{}'::text[])
    into disabled_rls_tables
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname not like 'pg_%'
    and c.relrowsecurity is false;

  select coalesce(array_agg(b.id order by b.id), '{}'::text[])
    into public_nexus_buckets
  from storage.buckets b
  where b.id like 'nexus-%'
    and b.public is true;

  select coalesce(array_agg(distinct table_name order by table_name), '{}'::text[])
    into exposed_sensitive_tables
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated')
    and table_name in ('provider_credentials', 'request_rate_limits')
    and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE');

  select count(*)::integer
    into recent_high_events
  from public.security_events
  where workspace_id = p_workspace_id
    and severity in ('high', 'critical')
    and created_at >= now() - interval '30 days';

  select count(*)::integer
    into rate_limit_windows
  from public.request_rate_limits
  where workspace_id = p_workspace_id
    and last_seen_at >= now() - interval '24 hours';

  select jsonb_build_object(
    'total', count(*),
    'configured', count(*) filter (where credential_status = 'configured'),
    'healthy', count(*) filter (where health_status = 'healthy'),
    'errors', count(*) filter (where health_status = 'error')
  )
    into provider_summary
  from public.ai_providers
  where workspace_id = p_workspace_id
    and status <> 'archived';

  return jsonb_build_object(
    'rlsDisabledTables', to_jsonb(disabled_rls_tables),
    'publicNexusBuckets', to_jsonb(public_nexus_buckets),
    'exposedSensitiveTables', to_jsonb(exposed_sensitive_tables),
    'recentHighSeverityEvents', recent_high_events,
    'rateLimitWindows24h', rate_limit_windows,
    'providers', coalesce(provider_summary, '{}'::jsonb),
    'checkedAt', now()
  );
end;
$$;

create or replace function public.purge_expired_security_runtime()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
begin
  delete from public.request_rate_limits
  where last_seen_at < now() - interval '48 hours';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.consume_rate_limit(uuid,text,integer,integer) from public;
grant execute on function public.consume_rate_limit(uuid,text,integer,integer) to authenticated;

revoke all on function public.record_security_event(uuid,text,text,text,jsonb) from public;
grant execute on function public.record_security_event(uuid,text,text,text,jsonb) to authenticated;

revoke all on function public.get_nexus_security_posture(uuid) from public;
grant execute on function public.get_nexus_security_posture(uuid) to authenticated;

revoke all on function public.purge_expired_security_runtime() from public;
revoke all on function public.seed_workspace_ai_providers(uuid,uuid) from public;

commit;

begin;

create table if not exists public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  slug text not null,
  display_name text not null,
  provider_type text not null,
  base_url text not null,
  icon text not null default 'cpu',
  color text not null default '#55e6c1',
  status text not null default 'active',
  credential_status text not null default 'missing',
  credential_last_four text,
  health_status text not null default 'unchecked',
  last_checked_at timestamptz,
  last_error text,
  notes text not null default '',
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint ai_providers_type_allowed check (provider_type in ('openai','anthropic','gemini','openrouter','openai_compatible')),
  constraint ai_providers_status_allowed check (status in ('active','inactive','archived')),
  constraint ai_providers_credential_status_allowed check (credential_status in ('missing','configured')),
  constraint ai_providers_health_status_allowed check (health_status in ('unchecked','healthy','error')),
  constraint ai_providers_color_format check (color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint ai_providers_name_length check (char_length(trim(display_name)) between 2 and 100),
  constraint ai_providers_notes_length check (char_length(notes) <= 4000),
  unique (workspace_id, slug)
);
create index if not exists ai_providers_workspace_status_idx on public.ai_providers(workspace_id, status, updated_at desc);

create table if not exists public.provider_credentials (
  provider_id uuid primary key references public.ai_providers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  key_version smallint not null default 1,
  last_four text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_credentials_key_version_positive check (key_version > 0),
  constraint provider_credentials_last_four_length check (char_length(last_four) between 1 and 8)
);
create index if not exists provider_credentials_workspace_idx on public.provider_credentials(workspace_id, provider_id);

create table if not exists public.ai_models (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider_id uuid not null references public.ai_providers(id) on delete cascade,
  display_name text not null,
  api_identifier text not null,
  model_kind text not null default 'chat',
  status text not null default 'active',
  context_window integer,
  max_output_tokens integer,
  input_cost_per_million numeric(14,6),
  output_cost_per_million numeric(14,6),
  currency text not null default 'USD',
  pricing_notes text not null default '',
  last_reviewed_at date,
  last_synced_at timestamptz,
  source_metadata jsonb not null default '{}'::jsonb,
  notes text not null default '',
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint ai_models_kind_allowed check (model_kind in ('chat','reasoning','embedding','image','audio','multimodal','other')),
  constraint ai_models_status_allowed check (status in ('active','inactive','archived')),
  constraint ai_models_context_positive check (context_window is null or context_window > 0),
  constraint ai_models_output_positive check (max_output_tokens is null or max_output_tokens > 0),
  constraint ai_models_input_cost_positive check (input_cost_per_million is null or input_cost_per_million >= 0),
  constraint ai_models_output_cost_positive check (output_cost_per_million is null or output_cost_per_million >= 0),
  constraint ai_models_currency_length check (char_length(currency) = 3),
  unique (provider_id, api_identifier)
);
create index if not exists ai_models_workspace_status_idx on public.ai_models(workspace_id, status, updated_at desc);
create index if not exists ai_models_provider_status_idx on public.ai_models(provider_id, status, display_name);

create table if not exists public.model_capabilities (
  model_id uuid primary key references public.ai_models(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  supports_reasoning boolean,
  supports_tools boolean,
  supports_streaming boolean,
  supports_vision boolean,
  supports_files boolean,
  supports_structured_output boolean,
  supports_embeddings boolean,
  reasoning_score smallint,
  coding_score smallint,
  design_score smallint,
  vision_score smallint,
  sql_score smallint,
  long_context_score smallint,
  speed_score smallint,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_capabilities_scores check (
    (reasoning_score is null or reasoning_score between 0 and 100) and
    (coding_score is null or coding_score between 0 and 100) and
    (design_score is null or design_score between 0 and 100) and
    (vision_score is null or vision_score between 0 and 100) and
    (sql_score is null or sql_score between 0 and 100) and
    (long_context_score is null or long_context_score between 0 and 100) and
    (speed_score is null or speed_score between 0 and 100)
  )
);

create table if not exists public.model_task_scores (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  model_id uuid not null references public.ai_models(id) on delete cascade,
  task_type text not null,
  score smallint not null,
  notes text not null default '',
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (model_id, task_type),
  constraint model_task_scores_task_allowed check (task_type in ('general','coding','debugging','sql','design','architecture','qa','analysis','content')),
  constraint model_task_scores_score_range check (score between 0 and 100)
);
create index if not exists model_task_scores_workspace_idx on public.model_task_scores(workspace_id, task_type, score desc);

create table if not exists public.model_technology_scores (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  model_id uuid not null references public.ai_models(id) on delete cascade,
  technology_id uuid not null references public.technologies(id) on delete cascade,
  score smallint not null,
  notes text not null default '',
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (model_id, technology_id),
  constraint model_technology_scores_score_range check (score between 0 and 100)
);
create index if not exists model_technology_scores_workspace_idx on public.model_technology_scores(workspace_id, technology_id, score desc);

create table if not exists public.provider_health_checks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider_id uuid not null references public.ai_providers(id) on delete cascade,
  status text not null,
  response_time_ms integer,
  model_count integer,
  error_code text,
  error_message text,
  checked_by uuid not null references public.profiles(id) on delete restrict,
  checked_at timestamptz not null default now(),
  constraint provider_health_status_allowed check (status in ('healthy','error')),
  constraint provider_health_response_positive check (response_time_ms is null or response_time_ms >= 0),
  constraint provider_health_model_count_positive check (model_count is null or model_count >= 0)
);
create index if not exists provider_health_checks_provider_idx on public.provider_health_checks(workspace_id, provider_id, checked_at desc);

create table if not exists public.agent_model_preferences (
  agent_id uuid primary key references public.agents(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  preferred_model_id uuid references public.ai_models(id) on delete set null,
  alternative_model_ids uuid[] not null default '{}'::uuid[],
  selection_mode text not null default 'automatic',
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_model_preferences_mode_allowed check (selection_mode in ('automatic','fixed')),
  constraint agent_model_preferences_alternative_count check (cardinality(alternative_model_ids) <= 5)
);

create table if not exists public.project_model_preferences (
  project_id uuid primary key references public.projects(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  preferred_model_id uuid references public.ai_models(id) on delete set null,
  budget_profile text not null default 'balanced',
  speed_preference text not null default 'balanced',
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_model_preferences_budget_allowed check (budget_profile in ('economy','balanced','quality')),
  constraint project_model_preferences_speed_allowed check (speed_preference in ('fast','balanced','quality'))
);

create table if not exists public.model_recommendation_weights (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  task_weight smallint not null default 30,
  technology_weight smallint not null default 20,
  reasoning_weight smallint not null default 12,
  context_weight smallint not null default 10,
  capability_weight smallint not null default 8,
  history_weight smallint not null default 8,
  cost_weight smallint not null default 5,
  speed_weight smallint not null default 4,
  preference_weight smallint not null default 3,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_recommendation_weights_total check (
    task_weight + technology_weight + reasoning_weight + context_weight + capability_weight + history_weight + cost_weight + speed_weight + preference_weight = 100
  )
);

create or replace function public.seed_workspace_ai_providers(target_workspace_id uuid, actor_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.ai_providers (
    workspace_id, slug, display_name, provider_type, base_url, icon, color, status, created_by, updated_by
  ) values
    (target_workspace_id, 'openai', 'OpenAI', 'openai', 'https://api.openai.com/v1', 'sparkles', '#55E6C1', 'active', actor_id, actor_id),
    (target_workspace_id, 'anthropic', 'Anthropic', 'anthropic', 'https://api.anthropic.com/v1', 'brain', '#A78BFA', 'active', actor_id, actor_id),
    (target_workspace_id, 'gemini', 'Google Gemini', 'gemini', 'https://generativelanguage.googleapis.com/v1beta', 'gem', '#60A5FA', 'active', actor_id, actor_id),
    (target_workspace_id, 'openrouter', 'OpenRouter', 'openrouter', 'https://openrouter.ai/api/v1', 'route', '#F59E0B', 'active', actor_id, actor_id),
    (target_workspace_id, 'openai-compatible', 'API compatible con OpenAI', 'openai_compatible', 'http://localhost:11434/v1', 'server', '#94A3B8', 'inactive', actor_id, actor_id)
  on conflict (workspace_id, slug) do nothing;
  insert into public.model_recommendation_weights(workspace_id, created_by, updated_by)
  values (target_workspace_id, actor_id, actor_id)
  on conflict (workspace_id) do nothing;
end;
$$;

create or replace function public.seed_new_workspace_ai_providers()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.seed_workspace_ai_providers(new.id, new.owner_id);
  return new;
end;
$$;
drop trigger if exists workspaces_seed_ai_providers on public.workspaces;
create trigger workspaces_seed_ai_providers after insert on public.workspaces
for each row execute function public.seed_new_workspace_ai_providers();
select public.seed_workspace_ai_providers(w.id, w.owner_id)
from public.workspaces as w;

create or replace function public.prepare_ai_provider_record()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  new.display_name := trim(new.display_name);
  new.slug := public.slugify_text(coalesce(nullif(trim(new.slug), ''), new.display_name));
  new.base_url := regexp_replace(trim(new.base_url), '/+$', '');
  new.notes := trim(coalesce(new.notes, ''));
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  else
    if new.workspace_id <> old.workspace_id then raise exception 'Provider cannot move workspaces'; end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  if new.status = 'archived' and new.archived_at is null then new.archived_at := now();
  elsif new.status <> 'archived' then new.archived_at := null; end if;
  return new;
end;
$$;
drop trigger if exists ai_providers_prepare_record on public.ai_providers;
create trigger ai_providers_prepare_record before insert or update on public.ai_providers
for each row execute function public.prepare_ai_provider_record();

create or replace function public.prepare_ai_model_record()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
declare provider_workspace_id uuid;
begin
  select workspace_id into provider_workspace_id from public.ai_providers where id = new.provider_id;
  if provider_workspace_id is null or provider_workspace_id <> new.workspace_id then raise exception 'Provider and model must share workspace'; end if;
  new.display_name := trim(new.display_name);
  new.api_identifier := trim(new.api_identifier);
  new.currency := upper(trim(new.currency));
  new.notes := trim(coalesce(new.notes, ''));
  new.pricing_notes := trim(coalesce(new.pricing_notes, ''));
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  else
    if new.workspace_id <> old.workspace_id then raise exception 'Model cannot move workspaces'; end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  if new.status = 'archived' and new.archived_at is null then new.archived_at := now();
  elsif new.status <> 'archived' then new.archived_at := null; end if;
  return new;
end;
$$;
drop trigger if exists ai_models_prepare_record on public.ai_models;
create trigger ai_models_prepare_record before insert or update on public.ai_models
for each row execute function public.prepare_ai_model_record();

create or replace function public.validate_model_workspace()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
declare model_workspace_id uuid; technology_workspace_id uuid;
begin
  select workspace_id into model_workspace_id from public.ai_models where id = new.model_id;
  if model_workspace_id is null or model_workspace_id <> new.workspace_id then raise exception 'Model relation cannot cross workspaces'; end if;
  if tg_table_name = 'model_technology_scores' then
    select workspace_id into technology_workspace_id from public.technologies where id = new.technology_id;
    if technology_workspace_id is null or technology_workspace_id <> new.workspace_id then raise exception 'Technology relation cannot cross workspaces'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.validate_agent_model_preference()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
declare entity_workspace_id uuid; model_workspace_id uuid; alternative_id uuid;
begin
  select workspace_id into entity_workspace_id from public.agents where id = new.agent_id;
  if entity_workspace_id is null or entity_workspace_id <> new.workspace_id then raise exception 'Agent preference cannot cross workspaces'; end if;
  if new.preferred_model_id is not null then
    select workspace_id into model_workspace_id from public.ai_models where id = new.preferred_model_id;
    if model_workspace_id is null or model_workspace_id <> new.workspace_id then raise exception 'Preferred model cannot cross workspaces'; end if;
    if new.preferred_model_id = any(new.alternative_model_ids) then raise exception 'Preferred model cannot also be an alternative'; end if;
  end if;
  if cardinality(new.alternative_model_ids) <> (select count(distinct item) from unnest(new.alternative_model_ids) as item) then
    raise exception 'Alternative models cannot be duplicated';
  end if;
  foreach alternative_id in array new.alternative_model_ids loop
    select workspace_id into model_workspace_id from public.ai_models where id = alternative_id;
    if model_workspace_id is null or model_workspace_id <> new.workspace_id then raise exception 'Alternative model cannot cross workspaces'; end if;
  end loop;
  return new;
end;
$$;

create or replace function public.validate_project_model_preference()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
declare entity_workspace_id uuid; model_workspace_id uuid;
begin
  select workspace_id into entity_workspace_id from public.projects where id = new.project_id;
  if entity_workspace_id is null or entity_workspace_id <> new.workspace_id then raise exception 'Project preference cannot cross workspaces'; end if;
  if new.preferred_model_id is not null then
    select workspace_id into model_workspace_id from public.ai_models where id = new.preferred_model_id;
    if model_workspace_id is null or model_workspace_id <> new.workspace_id then raise exception 'Preferred model cannot cross workspaces'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists model_capabilities_validate_workspace on public.model_capabilities;
create trigger model_capabilities_validate_workspace before insert or update on public.model_capabilities for each row execute function public.validate_model_workspace();
drop trigger if exists model_task_scores_validate_workspace on public.model_task_scores;
create trigger model_task_scores_validate_workspace before insert or update on public.model_task_scores for each row execute function public.validate_model_workspace();
drop trigger if exists model_technology_scores_validate_workspace on public.model_technology_scores;
create trigger model_technology_scores_validate_workspace before insert or update on public.model_technology_scores for each row execute function public.validate_model_workspace();
drop trigger if exists agent_model_preferences_validate_workspace on public.agent_model_preferences;
create trigger agent_model_preferences_validate_workspace before insert or update on public.agent_model_preferences for each row execute function public.validate_agent_model_preference();
drop trigger if exists project_model_preferences_validate_workspace on public.project_model_preferences;
create trigger project_model_preferences_validate_workspace before insert or update on public.project_model_preferences for each row execute function public.validate_project_model_preference();

create or replace function public.prepare_ai_relation_actor()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  return new;
end;
$$;

drop trigger if exists model_capabilities_prepare_actor on public.model_capabilities;
create trigger model_capabilities_prepare_actor before insert or update on public.model_capabilities for each row execute function public.prepare_ai_relation_actor();
drop trigger if exists model_task_scores_prepare_actor on public.model_task_scores;
create trigger model_task_scores_prepare_actor before insert or update on public.model_task_scores for each row execute function public.prepare_ai_relation_actor();
drop trigger if exists model_technology_scores_prepare_actor on public.model_technology_scores;
create trigger model_technology_scores_prepare_actor before insert or update on public.model_technology_scores for each row execute function public.prepare_ai_relation_actor();
drop trigger if exists agent_model_preferences_prepare_actor on public.agent_model_preferences;
create trigger agent_model_preferences_prepare_actor before insert or update on public.agent_model_preferences for each row execute function public.prepare_ai_relation_actor();
drop trigger if exists project_model_preferences_prepare_actor on public.project_model_preferences;
create trigger project_model_preferences_prepare_actor before insert or update on public.project_model_preferences for each row execute function public.prepare_ai_relation_actor();
drop trigger if exists model_recommendation_weights_prepare_actor on public.model_recommendation_weights;
create trigger model_recommendation_weights_prepare_actor before insert or update on public.model_recommendation_weights for each row execute function public.prepare_ai_relation_actor();

create or replace function public.audit_ai_provider_change()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare event_action text;
begin
  if tg_op = 'INSERT' then event_action := 'ai_provider.created';
  elsif old.status <> new.status and new.status = 'archived' then event_action := 'ai_provider.archived';
  elsif old.status = 'archived' and new.status <> 'archived' then event_action := 'ai_provider.restored';
  elsif new.last_checked_at is distinct from old.last_checked_at then event_action := 'ai_provider.connection_checked';
  else event_action := 'ai_provider.updated'; end if;
  insert into public.audit_logs(workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values(new.workspace_id, auth.uid(), event_action, 'ai_provider', new.id,
    jsonb_build_object('display_name', new.display_name, 'status', new.status, 'credential_status', new.credential_status, 'health_status', new.health_status));
  return new;
end;
$$;
drop trigger if exists ai_providers_audit_change on public.ai_providers;
create trigger ai_providers_audit_change after insert or update on public.ai_providers for each row execute function public.audit_ai_provider_change();

create or replace function public.audit_ai_model_change()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare event_action text;
begin
  if tg_op = 'INSERT' then event_action := 'ai_model.created';
  elsif old.status <> new.status and new.status = 'archived' then event_action := 'ai_model.archived';
  elsif old.status = 'archived' and new.status <> 'archived' then event_action := 'ai_model.restored';
  elsif new.last_synced_at is distinct from old.last_synced_at then event_action := 'ai_model.synchronized';
  else event_action := 'ai_model.updated'; end if;
  insert into public.audit_logs(workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values(new.workspace_id, auth.uid(), event_action, 'ai_model', new.id,
    jsonb_build_object('provider_id', new.provider_id, 'display_name', new.display_name, 'api_identifier', new.api_identifier, 'status', new.status));
  return new;
end;
$$;
drop trigger if exists ai_models_audit_change on public.ai_models;
create trigger ai_models_audit_change after insert or update on public.ai_models for each row execute function public.audit_ai_model_change();

create or replace function public.audit_agent_model_preference()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.audit_logs(workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values(new.workspace_id, auth.uid(), 'agent.model_preference_updated', 'agent', new.agent_id,
    jsonb_build_object('preferred_model_id', new.preferred_model_id, 'selection_mode', new.selection_mode, 'alternative_count', cardinality(new.alternative_model_ids)));
  return new;
end;
$$;
drop trigger if exists agent_model_preferences_audit_change on public.agent_model_preferences;
create trigger agent_model_preferences_audit_change after insert or update on public.agent_model_preferences for each row execute function public.audit_agent_model_preference();

create or replace function public.audit_project_model_preference()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.audit_logs(workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values(new.workspace_id, auth.uid(), 'project.model_preference_updated', 'project', new.project_id,
    jsonb_build_object('preferred_model_id', new.preferred_model_id, 'budget_profile', new.budget_profile, 'speed_preference', new.speed_preference));
  return new;
end;
$$;
drop trigger if exists project_model_preferences_audit_change on public.project_model_preferences;
create trigger project_model_preferences_audit_change after insert or update on public.project_model_preferences for each row execute function public.audit_project_model_preference();

create or replace function public.save_provider_credential(
  p_provider_id uuid, p_ciphertext text, p_iv text, p_auth_tag text, p_last_four text, p_key_version smallint default 1
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare target_workspace_id uuid; current_user_id uuid := auth.uid();
begin
  select workspace_id into target_workspace_id from public.ai_providers where id = p_provider_id;
  if current_user_id is null or target_workspace_id is null then raise exception 'Authentication required'; end if;
  if not public.has_workspace_role(target_workspace_id, array['owner','admin']::public.workspace_member_role[]) then raise exception 'Insufficient permissions'; end if;
  insert into public.provider_credentials(provider_id, workspace_id, ciphertext, iv, auth_tag, key_version, last_four, created_by, updated_by)
  values(p_provider_id, target_workspace_id, p_ciphertext, p_iv, p_auth_tag, p_key_version, p_last_four, current_user_id, current_user_id)
  on conflict(provider_id) do update set ciphertext=excluded.ciphertext, iv=excluded.iv, auth_tag=excluded.auth_tag,
    key_version=excluded.key_version, last_four=excluded.last_four, updated_by=current_user_id, updated_at=now();
  update public.ai_providers set credential_status='configured', credential_last_four=p_last_four,
    health_status='unchecked', last_error=null, updated_by=current_user_id where id=p_provider_id;
  insert into public.audit_logs(workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values(target_workspace_id, current_user_id, 'ai_provider.credential_saved', 'ai_provider', p_provider_id, jsonb_build_object('last_four', p_last_four));
  return p_provider_id;
end;
$$;

create or replace function public.get_provider_credential(p_provider_id uuid)
returns table(ciphertext text, iv text, auth_tag text, key_version smallint)
language plpgsql security definer set search_path = public, pg_temp as $$
declare target_workspace_id uuid;
begin
  select workspace_id into target_workspace_id from public.ai_providers where id=p_provider_id;
  if auth.uid() is null or target_workspace_id is null then raise exception 'Authentication required'; end if;
  if not public.has_workspace_role(target_workspace_id, array['owner','admin']::public.workspace_member_role[]) then raise exception 'Insufficient permissions'; end if;
  return query select c.ciphertext, c.iv, c.auth_tag, c.key_version from public.provider_credentials c where c.provider_id=p_provider_id;
end;
$$;

create or replace function public.delete_provider_credential(p_provider_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare target_workspace_id uuid; current_user_id uuid := auth.uid();
begin
  select workspace_id into target_workspace_id from public.ai_providers where id=p_provider_id;
  if current_user_id is null or target_workspace_id is null then raise exception 'Authentication required'; end if;
  if not public.has_workspace_role(target_workspace_id, array['owner','admin']::public.workspace_member_role[]) then raise exception 'Insufficient permissions'; end if;
  delete from public.provider_credentials where provider_id=p_provider_id;
  update public.ai_providers set credential_status='missing', credential_last_four=null, health_status='unchecked', last_checked_at=null, last_error=null, updated_by=current_user_id where id=p_provider_id;
  insert into public.audit_logs(workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values(target_workspace_id, current_user_id, 'ai_provider.credential_deleted', 'ai_provider', p_provider_id, '{}'::jsonb);
  return p_provider_id;
end;
$$;

-- Updated-at triggers for relation tables.
drop trigger if exists provider_credentials_set_updated_at on public.provider_credentials;
create trigger provider_credentials_set_updated_at before update on public.provider_credentials for each row execute function public.set_updated_at();
drop trigger if exists model_capabilities_set_updated_at on public.model_capabilities;
create trigger model_capabilities_set_updated_at before update on public.model_capabilities for each row execute function public.set_updated_at();
drop trigger if exists model_task_scores_set_updated_at on public.model_task_scores;
create trigger model_task_scores_set_updated_at before update on public.model_task_scores for each row execute function public.set_updated_at();
drop trigger if exists model_technology_scores_set_updated_at on public.model_technology_scores;
create trigger model_technology_scores_set_updated_at before update on public.model_technology_scores for each row execute function public.set_updated_at();
drop trigger if exists agent_model_preferences_set_updated_at on public.agent_model_preferences;
create trigger agent_model_preferences_set_updated_at before update on public.agent_model_preferences for each row execute function public.set_updated_at();
drop trigger if exists project_model_preferences_set_updated_at on public.project_model_preferences;
create trigger project_model_preferences_set_updated_at before update on public.project_model_preferences for each row execute function public.set_updated_at();
drop trigger if exists model_recommendation_weights_set_updated_at on public.model_recommendation_weights;
create trigger model_recommendation_weights_set_updated_at before update on public.model_recommendation_weights for each row execute function public.set_updated_at();

alter table public.ai_providers enable row level security;
alter table public.provider_credentials enable row level security;
alter table public.ai_models enable row level security;
alter table public.model_capabilities enable row level security;
alter table public.model_task_scores enable row level security;
alter table public.model_technology_scores enable row level security;
alter table public.provider_health_checks enable row level security;
alter table public.agent_model_preferences enable row level security;
alter table public.project_model_preferences enable row level security;
alter table public.model_recommendation_weights enable row level security;

-- Provider policies. Credentials intentionally have no direct authenticated policy.
drop policy if exists "ai_providers_select_member" on public.ai_providers;
create policy "ai_providers_select_member" on public.ai_providers for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists "ai_providers_update_admin" on public.ai_providers;
create policy "ai_providers_update_admin" on public.ai_providers for update to authenticated
using(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]))
with check(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]) and updated_by=auth.uid());

drop policy if exists "ai_models_select_member" on public.ai_models;
create policy "ai_models_select_member" on public.ai_models for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists "ai_models_insert_admin" on public.ai_models;
create policy "ai_models_insert_admin" on public.ai_models for insert to authenticated with check(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]) and created_by=auth.uid() and updated_by=auth.uid());
drop policy if exists "ai_models_update_admin" on public.ai_models;
create policy "ai_models_update_admin" on public.ai_models for update to authenticated using(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[])) with check(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]) and updated_by=auth.uid());

-- Generic member-read/admin-write policies.
drop policy if exists "model_capabilities_select_member" on public.model_capabilities;
create policy "model_capabilities_select_member" on public.model_capabilities for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists "model_capabilities_write_admin" on public.model_capabilities;
create policy "model_capabilities_write_admin" on public.model_capabilities for all to authenticated using(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[])) with check(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]));
drop policy if exists "model_task_scores_select_member" on public.model_task_scores;
create policy "model_task_scores_select_member" on public.model_task_scores for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists "model_task_scores_write_admin" on public.model_task_scores;
create policy "model_task_scores_write_admin" on public.model_task_scores for all to authenticated using(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[])) with check(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]));
drop policy if exists "model_technology_scores_select_member" on public.model_technology_scores;
create policy "model_technology_scores_select_member" on public.model_technology_scores for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists "model_technology_scores_write_admin" on public.model_technology_scores;
create policy "model_technology_scores_write_admin" on public.model_technology_scores for all to authenticated using(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[])) with check(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]));

drop policy if exists "provider_health_checks_select_member" on public.provider_health_checks;
create policy "provider_health_checks_select_member" on public.provider_health_checks for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists "provider_health_checks_insert_admin" on public.provider_health_checks;
create policy "provider_health_checks_insert_admin" on public.provider_health_checks for insert to authenticated with check(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]) and checked_by=auth.uid());

drop policy if exists "agent_model_preferences_select_member" on public.agent_model_preferences;
create policy "agent_model_preferences_select_member" on public.agent_model_preferences for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists "agent_model_preferences_write_admin" on public.agent_model_preferences;
create policy "agent_model_preferences_write_admin" on public.agent_model_preferences for all to authenticated using(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[])) with check(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]));
drop policy if exists "project_model_preferences_select_member" on public.project_model_preferences;
create policy "project_model_preferences_select_member" on public.project_model_preferences for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists "project_model_preferences_write_admin" on public.project_model_preferences;
create policy "project_model_preferences_write_admin" on public.project_model_preferences for all to authenticated using(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[])) with check(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]));
drop policy if exists "model_recommendation_weights_select_member" on public.model_recommendation_weights;
create policy "model_recommendation_weights_select_member" on public.model_recommendation_weights for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists "model_recommendation_weights_update_admin" on public.model_recommendation_weights;
create policy "model_recommendation_weights_update_admin" on public.model_recommendation_weights for update to authenticated using(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[])) with check(public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]));

revoke all on public.provider_credentials from authenticated;
grant select, update on public.ai_providers to authenticated;
grant select, insert, update on public.ai_models to authenticated;
grant select, insert, update, delete on public.model_capabilities to authenticated;
grant select, insert, update, delete on public.model_task_scores to authenticated;
grant select, insert, update, delete on public.model_technology_scores to authenticated;
grant select, insert on public.provider_health_checks to authenticated;
grant select, insert, update, delete on public.agent_model_preferences to authenticated;
grant select, insert, update, delete on public.project_model_preferences to authenticated;
grant select, update on public.model_recommendation_weights to authenticated;

revoke all on function public.save_provider_credential(uuid,text,text,text,text,smallint) from public;
grant execute on function public.save_provider_credential(uuid,text,text,text,text,smallint) to authenticated;
revoke all on function public.get_provider_credential(uuid) from public;
grant execute on function public.get_provider_credential(uuid) to authenticated;
revoke all on function public.delete_provider_credential(uuid) from public;
grant execute on function public.delete_provider_credential(uuid) to authenticated;
revoke all on function public.seed_workspace_ai_providers(uuid,uuid) from public;
revoke all on function public.seed_new_workspace_ai_providers() from public;
revoke all on function public.prepare_ai_relation_actor() from public;

commit;

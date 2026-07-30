begin;

create table if not exists public.analytics_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  display_currency text not null default 'MXN',
  usd_to_display_rate numeric(14,6),
  accepted_minutes_saved smallint not null default 25,
  partial_minutes_saved smallint not null default 12,
  rejected_minutes_saved smallint not null default 0,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analytics_settings_currency_length check (char_length(display_currency) = 3),
  constraint analytics_settings_rate_positive check (usd_to_display_rate is null or usd_to_display_rate > 0),
  constraint analytics_settings_minutes_range check (
    accepted_minutes_saved between 0 and 1440 and
    partial_minutes_saved between 0 and 1440 and
    rejected_minutes_saved between 0 and 1440
  )
);

create table if not exists public.usage_budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  period text not null default 'monthly',
  limit_amount numeric(14,4) not null,
  currency text not null default 'USD',
  warning_threshold smallint not null default 80,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usage_budgets_period_allowed check (period in ('monthly')),
  constraint usage_budgets_limit_positive check (limit_amount > 0),
  constraint usage_budgets_currency_length check (char_length(currency) = 3),
  constraint usage_budgets_threshold_range check (warning_threshold between 1 and 100)
);
create index if not exists usage_budgets_workspace_idx
  on public.usage_budgets(workspace_id, is_active, updated_at desc);
create unique index if not exists usage_budgets_workspace_active_unique
  on public.usage_budgets(workspace_id)
  where project_id is null and is_active;
create unique index if not exists usage_budgets_project_active_unique
  on public.usage_budgets(workspace_id, project_id)
  where project_id is not null and is_active;

create table if not exists public.model_recommendation_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_message_id uuid references public.messages(id) on delete set null,
  run_id uuid references public.agent_runs(id) on delete set null,
  task_type text not null default 'general',
  source text not null default 'runtime',
  recommended_model_id uuid references public.ai_models(id) on delete set null,
  selected_model_id uuid references public.ai_models(id) on delete set null,
  alternative_economy_model_id uuid references public.ai_models(id) on delete set null,
  alternative_quality_model_id uuid references public.ai_models(id) on delete set null,
  recommendation_score numeric(6,2),
  confidence smallint,
  reasons jsonb not null default '[]'::jsonb,
  request_context jsonb not null default '{}'::jsonb,
  request_hash text,
  was_overridden boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint model_recommendation_task_allowed check (task_type in ('general','coding','debugging','sql','design','architecture','qa','analysis','content')),
  constraint model_recommendation_source_allowed check (source in ('runtime','manual')),
  constraint model_recommendation_score_range check (recommendation_score is null or recommendation_score between 0 and 100),
  constraint model_recommendation_confidence_range check (confidence is null or confidence between 0 and 100)
);
create index if not exists model_recommendation_events_workspace_created_idx
  on public.model_recommendation_events(workspace_id, created_at desc);
create index if not exists model_recommendation_events_project_created_idx
  on public.model_recommendation_events(workspace_id, project_id, created_at desc);
create index if not exists model_recommendation_events_model_idx
  on public.model_recommendation_events(workspace_id, recommended_model_id, selected_model_id, created_at desc);
create unique index if not exists model_recommendation_events_run_unique_idx
  on public.model_recommendation_events(run_id)
  where run_id is not null;
create unique index if not exists model_recommendation_events_request_hash_unique_idx
  on public.model_recommendation_events(workspace_id, source, request_hash);

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete set null,
  recommendation_event_id uuid references public.model_recommendation_events(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  model_id uuid references public.ai_models(id) on delete set null,
  provider_id uuid references public.ai_providers(id) on delete set null,
  verdict text not null,
  rating smallint not null,
  correction_count smallint not null default 0,
  notes text not null default '',
  estimated_minutes_saved smallint,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_feedback_verdict_allowed check (verdict in ('accepted','partial','rejected')),
  constraint user_feedback_rating_range check (rating between 1 and 5),
  constraint user_feedback_corrections_range check (correction_count between 0 and 99),
  constraint user_feedback_notes_length check (char_length(notes) <= 4000),
  constraint user_feedback_minutes_range check (estimated_minutes_saved is null or estimated_minutes_saved between 0 and 1440),
  unique (workspace_id, message_id, created_by)
);
create index if not exists user_feedback_workspace_created_idx
  on public.user_feedback(workspace_id, created_at desc);
create index if not exists user_feedback_model_idx
  on public.user_feedback(workspace_id, model_id, created_at desc);
create index if not exists user_feedback_agent_idx
  on public.user_feedback(workspace_id, agent_id, created_at desc);
create index if not exists user_feedback_project_idx
  on public.user_feedback(workspace_id, project_id, created_at desc);

create or replace function public.validate_analytics_setting_actor()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := coalesce(auth.uid(), new.updated_by);
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.validate_usage_budget_scope()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  project_workspace uuid;
begin
  if new.project_id is not null then
    select workspace_id into project_workspace from public.projects where id = new.project_id;
    if project_workspace is null or project_workspace <> new.workspace_id then
      raise exception 'Budget project does not belong to the selected workspace';
    end if;
  end if;
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  else
    if new.workspace_id <> old.workspace_id then
      raise exception 'Budgets cannot move between workspaces';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := coalesce(auth.uid(), new.updated_by);
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.validate_recommendation_event_scope()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  entity_workspace uuid;
  entity_project uuid;
  entity_conversation uuid;
  candidate uuid;
begin
  if new.project_id is not null then
    select workspace_id into entity_workspace from public.projects where id = new.project_id;
    if entity_workspace is null or entity_workspace <> new.workspace_id then
      raise exception 'Recommendation project does not belong to the selected workspace';
    end if;
  end if;
  if new.conversation_id is not null then
    select workspace_id, project_id into entity_workspace, entity_project
    from public.conversations where id = new.conversation_id;
    if entity_workspace is null or entity_workspace <> new.workspace_id
       or (new.project_id is not null and entity_project <> new.project_id) then
      raise exception 'Recommendation conversation does not belong to the selected scope';
    end if;
  end if;

  if new.user_message_id is not null then
    select workspace_id, project_id, conversation_id
    into entity_workspace, entity_project, entity_conversation
    from public.messages where id = new.user_message_id;
    if entity_workspace is null or entity_workspace <> new.workspace_id
       or (new.project_id is not null and entity_project <> new.project_id)
       or (new.conversation_id is not null and entity_conversation <> new.conversation_id) then
      raise exception 'Recommendation message does not belong to the selected scope';
    end if;
  end if;

  if new.run_id is not null then
    select workspace_id, project_id, conversation_id
    into entity_workspace, entity_project, entity_conversation
    from public.agent_runs where id = new.run_id;
    if entity_workspace is null or entity_workspace <> new.workspace_id
       or (new.project_id is not null and entity_project <> new.project_id)
       or (new.conversation_id is not null and entity_conversation <> new.conversation_id) then
      raise exception 'Recommendation run does not belong to the selected scope';
    end if;
  end if;

  foreach candidate in array array[
    new.recommended_model_id,
    new.selected_model_id,
    new.alternative_economy_model_id,
    new.alternative_quality_model_id
  ] loop
    if candidate is not null and not exists (
      select 1 from public.ai_models where id = candidate and workspace_id = new.workspace_id
    ) then
      raise exception 'Recommendation model does not belong to the selected workspace';
    end if;
  end loop;
  new.created_by := coalesce(auth.uid(), new.created_by);
  return new;
end;
$$;

create or replace function public.prepare_user_feedback()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  message_row record;
  run_row record;
  recommendation_id uuid;
begin
  select m.workspace_id, m.project_id, m.conversation_id, m.agent_id, m.model_id, m.role, m.status,
         am.provider_id
  into message_row
  from public.messages m
  left join public.ai_models am on am.id = m.model_id
  where m.id = new.message_id;

  if message_row.workspace_id is null or message_row.workspace_id <> new.workspace_id
     or message_row.role <> 'assistant' or message_row.status <> 'completed' then
    raise exception 'Feedback can only be attached to a completed assistant message in the same workspace';
  end if;

  select id, model_id, provider_id into run_row
  from public.agent_runs
  where assistant_message_id = new.message_id
    and workspace_id = new.workspace_id
  order by
    (parent_run_id is null) desc,
    (run_kind = 'consolidation') desc,
    created_at desc
  limit 1;

  select id into recommendation_id
  from public.model_recommendation_events
  where run_id = run_row.id
  order by created_at desc
  limit 1;

  new.project_id := message_row.project_id;
  new.conversation_id := message_row.conversation_id;
  new.run_id := run_row.id;
  new.recommendation_event_id := recommendation_id;
  new.agent_id := message_row.agent_id;
  new.model_id := coalesce(run_row.model_id, message_row.model_id);
  new.provider_id := coalesce(run_row.provider_id, message_row.provider_id);
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  else
    if new.workspace_id <> old.workspace_id or new.message_id <> old.message_id or new.created_by <> old.created_by then
      raise exception 'Feedback identity cannot be changed';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := coalesce(auth.uid(), new.updated_by);
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists analytics_settings_validate_actor on public.analytics_settings;
create trigger analytics_settings_validate_actor before insert or update on public.analytics_settings
for each row execute function public.validate_analytics_setting_actor();

drop trigger if exists usage_budgets_validate_scope on public.usage_budgets;
create trigger usage_budgets_validate_scope before insert or update on public.usage_budgets
for each row execute function public.validate_usage_budget_scope();

drop trigger if exists model_recommendation_events_validate_scope on public.model_recommendation_events;
create trigger model_recommendation_events_validate_scope before insert on public.model_recommendation_events
for each row execute function public.validate_recommendation_event_scope();

drop trigger if exists user_feedback_prepare on public.user_feedback;
create trigger user_feedback_prepare before insert or update on public.user_feedback
for each row execute function public.prepare_user_feedback();

create or replace function public.audit_analytics_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  entity_name text := tg_table_name;
  action_name text;
  entity_uuid uuid;
  row_data jsonb := to_jsonb(new);
  metadata_value jsonb;
  actor_uuid uuid;
begin
  action_name := case
    when entity_name = 'user_feedback' and tg_op = 'INSERT' then 'feedback.created'
    when entity_name = 'user_feedback' then 'feedback.updated'
    when entity_name = 'usage_budgets' and tg_op = 'INSERT' then 'budget.created'
    when entity_name = 'usage_budgets' then 'budget.updated'
    when entity_name = 'analytics_settings' then 'analytics.settings_updated'
    else 'model_recommendation.recorded'
  end;

  entity_uuid := nullif(row_data ->> 'id', '')::uuid;
  actor_uuid := coalesce(
    auth.uid(),
    nullif(row_data ->> 'updated_by', '')::uuid,
    nullif(row_data ->> 'created_by', '')::uuid
  );

  metadata_value := case
    when entity_name = 'user_feedback' then jsonb_build_object(
      'message_id', row_data ->> 'message_id',
      'verdict', row_data ->> 'verdict',
      'rating', row_data ->> 'rating'
    )
    when entity_name = 'usage_budgets' then jsonb_build_object(
      'project_id', row_data ->> 'project_id',
      'limit_amount', row_data ->> 'limit_amount',
      'currency', row_data ->> 'currency'
    )
    when entity_name = 'model_recommendation_events' then jsonb_build_object(
      'task_type', row_data ->> 'task_type',
      'recommended_model_id', row_data ->> 'recommended_model_id',
      'selected_model_id', row_data ->> 'selected_model_id'
    )
    else jsonb_build_object('display_currency', row_data ->> 'display_currency')
  end;

  insert into public.audit_logs(
    workspace_id, actor_id, action, entity_type, entity_id, metadata
  )
  values (
    nullif(row_data ->> 'workspace_id', '')::uuid,
    actor_uuid,
    action_name,
    entity_name,
    entity_uuid,
    metadata_value
  );
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['analytics_settings','usage_budgets','model_recommendation_events','user_feedback'] loop
    execute format('drop trigger if exists %I_audit_change on public.%I', table_name, table_name);
    execute format('create trigger %I_audit_change after insert or update on public.%I for each row execute function public.audit_analytics_change()', table_name, table_name);
  end loop;
end $$;

insert into public.analytics_settings (
  workspace_id, display_currency, created_by, updated_by
)
select w.id, 'MXN', w.owner_id, w.owner_id
from public.workspaces w
on conflict (workspace_id) do nothing;

alter table public.analytics_settings enable row level security;
alter table public.usage_budgets enable row level security;
alter table public.model_recommendation_events enable row level security;
alter table public.user_feedback enable row level security;

drop policy if exists "analytics_settings_select_member" on public.analytics_settings;
create policy "analytics_settings_select_member" on public.analytics_settings for select to authenticated
using (public.is_workspace_member(workspace_id));
drop policy if exists "analytics_settings_write_admin" on public.analytics_settings;
create policy "analytics_settings_write_admin" on public.analytics_settings for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]))
with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]) and updated_by = auth.uid());

drop policy if exists "usage_budgets_select_member" on public.usage_budgets;
create policy "usage_budgets_select_member" on public.usage_budgets for select to authenticated
using (public.is_workspace_member(workspace_id));
drop policy if exists "usage_budgets_write_admin" on public.usage_budgets;
create policy "usage_budgets_write_admin" on public.usage_budgets for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]))
with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]) and updated_by = auth.uid());

drop policy if exists "model_recommendation_events_select_member" on public.model_recommendation_events;
create policy "model_recommendation_events_select_member" on public.model_recommendation_events for select to authenticated
using (public.is_workspace_member(workspace_id));
drop policy if exists "model_recommendation_events_insert_member" on public.model_recommendation_events;
create policy "model_recommendation_events_insert_member" on public.model_recommendation_events for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

drop policy if exists "user_feedback_select_member" on public.user_feedback;
create policy "user_feedback_select_member" on public.user_feedback for select to authenticated
using (public.is_workspace_member(workspace_id));
drop policy if exists "user_feedback_insert_own" on public.user_feedback;
create policy "user_feedback_insert_own" on public.user_feedback for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid() and updated_by = auth.uid());
drop policy if exists "user_feedback_update_own" on public.user_feedback;
create policy "user_feedback_update_own" on public.user_feedback for update to authenticated
using (public.is_workspace_member(workspace_id) and created_by = auth.uid())
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid() and updated_by = auth.uid());

grant select, insert, update on public.analytics_settings to authenticated;
grant select, insert, update on public.usage_budgets to authenticated;
grant select, insert on public.model_recommendation_events to authenticated;
grant select, insert, update on public.user_feedback to authenticated;

revoke all on function public.validate_analytics_setting_actor() from public;
revoke all on function public.validate_usage_budget_scope() from public;
revoke all on function public.validate_recommendation_event_scope() from public;
revoke all on function public.prepare_user_feedback() from public;
revoke all on function public.audit_analytics_change() from public;

commit;

begin;

-- A team execution groups the leader, specialist calls and final consolidation
-- without pretending that a single provider request represented several agents.
create table if not exists public.team_executions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_message_id uuid references public.messages(id) on delete set null,
  assistant_message_id uuid references public.messages(id) on delete set null,
  root_run_id uuid not null references public.agent_runs(id) on delete cascade,
  leader_agent_id uuid references public.agents(id) on delete set null,
  status text not null default 'planning',
  task_type text not null default 'general',
  plan jsonb not null default '{}'::jsonb,
  max_handoffs smallint not null default 3,
  handoff_count smallint not null default 0,
  specialist_count smallint not null default 0,
  total_input_tokens integer,
  total_output_tokens integer,
  total_estimated_cost numeric(14,8),
  currency text not null default 'USD',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer,
  error_code text,
  error_message text,
  initiated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_executions_status_allowed check (
    status in ('planning', 'delegating', 'consolidating', 'completed', 'partial', 'failed', 'cancelled')
  ),
  constraint team_executions_task_allowed check (
    task_type in ('general','coding','debugging','sql','design','architecture','qa','analysis','content')
  ),
  constraint team_executions_handoff_limits check (
    max_handoffs between 1 and 5 and handoff_count between 0 and max_handoffs
  ),
  constraint team_executions_specialist_count check (specialist_count between 0 and 5),
  constraint team_executions_tokens_positive check (
    (total_input_tokens is null or total_input_tokens >= 0)
    and (total_output_tokens is null or total_output_tokens >= 0)
  ),
  constraint team_executions_cost_positive check (
    total_estimated_cost is null or total_estimated_cost >= 0
  ),
  constraint team_executions_duration_positive check (duration_ms is null or duration_ms >= 0),
  constraint team_executions_currency_length check (char_length(currency) = 3),
  constraint team_executions_error_length check (
    error_message is null or char_length(error_message) <= 4000
  )
);

create unique index if not exists team_executions_root_run_uidx
  on public.team_executions(root_run_id);
create index if not exists team_executions_conversation_created_idx
  on public.team_executions(workspace_id, conversation_id, created_at desc);
create index if not exists team_executions_status_idx
  on public.team_executions(workspace_id, status, created_at desc);

alter table public.agent_runs
  add column if not exists parent_run_id uuid references public.agent_runs(id) on delete cascade,
  add column if not exists team_execution_id uuid references public.team_executions(id) on delete set null,
  add column if not exists run_kind text not null default 'direct',
  add column if not exists step_index smallint,
  add column if not exists step_title text,
  add column if not exists input_summary text,
  add column if not exists output_content text,
  add column if not exists output_summary text;

alter table public.agent_runs
  drop constraint if exists agent_runs_run_kind_allowed;
alter table public.agent_runs
  add constraint agent_runs_run_kind_allowed check (
    run_kind in ('direct', 'planning', 'specialist', 'review', 'consolidation')
  );

alter table public.agent_runs
  drop constraint if exists agent_runs_step_index_positive;
alter table public.agent_runs
  add constraint agent_runs_step_index_positive check (
    step_index is null or step_index between 0 and 20
  );

alter table public.agent_runs
  drop constraint if exists agent_runs_step_title_length;
alter table public.agent_runs
  add constraint agent_runs_step_title_length check (
    step_title is null or char_length(step_title) <= 180
  );

alter table public.agent_runs
  drop constraint if exists agent_runs_input_summary_length;
alter table public.agent_runs
  add constraint agent_runs_input_summary_length check (
    input_summary is null or char_length(input_summary) <= 6000
  );

alter table public.agent_runs
  drop constraint if exists agent_runs_output_content_length;
alter table public.agent_runs
  add constraint agent_runs_output_content_length check (
    output_content is null or char_length(output_content) <= 200000
  );

alter table public.agent_runs
  drop constraint if exists agent_runs_output_summary_length;
alter table public.agent_runs
  add constraint agent_runs_output_summary_length check (
    output_summary is null or char_length(output_summary) <= 4000
  );

create index if not exists agent_runs_team_execution_idx
  on public.agent_runs(workspace_id, team_execution_id, step_index);
create index if not exists agent_runs_parent_idx
  on public.agent_runs(parent_run_id, created_at);

-- The old index prevented child specialist runs while the root orchestration was active.
drop index if exists public.agent_runs_one_active_per_conversation_idx;
create unique index if not exists agent_runs_one_root_active_per_conversation_idx
  on public.agent_runs(conversation_id)
  where status in ('queued', 'running') and parent_run_id is null;

create table if not exists public.agent_handoffs (
  id uuid primary key default gen_random_uuid(),
  team_execution_id uuid not null references public.team_executions(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sequence_number smallint not null,
  source_agent_id uuid references public.agents(id) on delete set null,
  target_agent_id uuid references public.agents(id) on delete set null,
  source_run_id uuid references public.agent_runs(id) on delete set null,
  target_run_id uuid references public.agent_runs(id) on delete set null,
  reason text not null,
  context_sent text not null default '',
  result_received text not null default '',
  status text not null default 'pending',
  model_id uuid references public.ai_models(id) on delete set null,
  provider_id uuid references public.ai_providers(id) on delete set null,
  input_tokens integer,
  output_tokens integer,
  estimated_cost numeric(14,8),
  currency text not null default 'USD',
  duration_ms integer,
  started_at timestamptz,
  completed_at timestamptz,
  approval_status text not null default 'not_required',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_handoffs_sequence_positive check (sequence_number between 1 and 20),
  constraint agent_handoffs_distinct_agents check (
    source_agent_id is null or target_agent_id is null or source_agent_id <> target_agent_id
  ),
  constraint agent_handoffs_reason_length check (char_length(trim(reason)) between 2 and 1800),
  constraint agent_handoffs_context_length check (char_length(context_sent) <= 30000),
  constraint agent_handoffs_result_length check (char_length(result_received) <= 200000),
  constraint agent_handoffs_status_allowed check (
    status in ('pending', 'running', 'completed', 'failed', 'cancelled', 'skipped')
  ),
  constraint agent_handoffs_approval_allowed check (
    approval_status in ('not_required', 'pending', 'approved', 'rejected')
  ),
  constraint agent_handoffs_tokens_positive check (
    (input_tokens is null or input_tokens >= 0)
    and (output_tokens is null or output_tokens >= 0)
  ),
  constraint agent_handoffs_cost_positive check (estimated_cost is null or estimated_cost >= 0),
  constraint agent_handoffs_duration_positive check (duration_ms is null or duration_ms >= 0),
  constraint agent_handoffs_currency_length check (char_length(currency) = 3)
);

create unique index if not exists agent_handoffs_sequence_uidx
  on public.agent_handoffs(team_execution_id, sequence_number);
create index if not exists agent_handoffs_conversation_created_idx
  on public.agent_handoffs(workspace_id, conversation_id, created_at);
create index if not exists agent_handoffs_target_agent_idx
  on public.agent_handoffs(workspace_id, target_agent_id, status, created_at desc);

create or replace function public.validate_team_execution_workspace()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  entity_workspace_id uuid;
  entity_project_id uuid;
  entity_conversation_id uuid;
begin
  select workspace_id, project_id, conversation_id
    into entity_workspace_id, entity_project_id, entity_conversation_id
  from public.agent_runs
  where id = new.root_run_id;

  if entity_workspace_id is null
     or entity_workspace_id <> new.workspace_id
     or entity_project_id <> new.project_id
     or entity_conversation_id <> new.conversation_id then
    raise exception 'Team execution root run does not belong to the same scope';
  end if;

  if new.leader_agent_id is not null and not exists (
    select 1 from public.project_agents
    where workspace_id = new.workspace_id
      and project_id = new.project_id
      and agent_id = new.leader_agent_id
      and status = 'active'
  ) then
    raise exception 'Team execution leader is not assigned to the project';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.validate_agent_handoff_workspace()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  execution_workspace_id uuid;
  execution_project_id uuid;
  execution_conversation_id uuid;
begin
  select workspace_id, project_id, conversation_id
    into execution_workspace_id, execution_project_id, execution_conversation_id
  from public.team_executions
  where id = new.team_execution_id;

  if execution_workspace_id is null
     or execution_workspace_id <> new.workspace_id
     or execution_project_id <> new.project_id
     or execution_conversation_id <> new.conversation_id then
    raise exception 'Handoff does not belong to the same team execution scope';
  end if;

  if new.source_agent_id is not null and not exists (
    select 1 from public.project_agents
    where workspace_id = new.workspace_id
      and project_id = new.project_id
      and agent_id = new.source_agent_id
      and status = 'active'
  ) then
    raise exception 'Handoff source agent is not assigned to the project';
  end if;

  if new.target_agent_id is not null and not exists (
    select 1 from public.project_agents
    where workspace_id = new.workspace_id
      and project_id = new.project_id
      and agent_id = new.target_agent_id
      and status = 'active'
  ) then
    raise exception 'Handoff target agent is not assigned to the project';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.audit_team_execution_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status
     and new.status in ('completed', 'partial', 'failed', 'cancelled') then
    insert into public.audit_logs(workspace_id, actor_id, action, entity_type, entity_id, metadata)
    values(
      new.workspace_id,
      auth.uid(),
      'team_execution.' || new.status,
      'team_execution',
      new.id,
      jsonb_build_object(
        'project_id', new.project_id,
        'conversation_id', new.conversation_id,
        'leader_agent_id', new.leader_agent_id,
        'handoff_count', new.handoff_count,
        'specialist_count', new.specialist_count,
        'duration_ms', new.duration_ms,
        'total_estimated_cost', new.total_estimated_cost
      )
    );
  end if;
  return new;
end;
$$;

create or replace function public.audit_agent_handoff_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status
     and new.status in ('completed', 'failed', 'cancelled') then
    insert into public.audit_logs(workspace_id, actor_id, action, entity_type, entity_id, metadata)
    values(
      new.workspace_id,
      auth.uid(),
      'agent_handoff.' || new.status,
      'agent_handoff',
      new.id,
      jsonb_build_object(
        'team_execution_id', new.team_execution_id,
        'source_agent_id', new.source_agent_id,
        'target_agent_id', new.target_agent_id,
        'sequence_number', new.sequence_number,
        'model_id', new.model_id,
        'duration_ms', new.duration_ms,
        'estimated_cost', new.estimated_cost
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists team_executions_validate_workspace on public.team_executions;
create trigger team_executions_validate_workspace
before insert or update on public.team_executions
for each row execute function public.validate_team_execution_workspace();

drop trigger if exists team_executions_set_updated_at on public.team_executions;
create trigger team_executions_set_updated_at
before update on public.team_executions
for each row execute function public.set_updated_at();

drop trigger if exists team_executions_audit_change on public.team_executions;
create trigger team_executions_audit_change
after update on public.team_executions
for each row execute function public.audit_team_execution_change();

drop trigger if exists agent_handoffs_validate_workspace on public.agent_handoffs;
create trigger agent_handoffs_validate_workspace
before insert or update on public.agent_handoffs
for each row execute function public.validate_agent_handoff_workspace();

drop trigger if exists agent_handoffs_set_updated_at on public.agent_handoffs;
create trigger agent_handoffs_set_updated_at
before update on public.agent_handoffs
for each row execute function public.set_updated_at();

drop trigger if exists agent_handoffs_audit_change on public.agent_handoffs;
create trigger agent_handoffs_audit_change
after update on public.agent_handoffs
for each row execute function public.audit_agent_handoff_change();

alter table public.team_executions enable row level security;
alter table public.agent_handoffs enable row level security;

drop policy if exists "team_executions_select_member" on public.team_executions;
create policy "team_executions_select_member"
on public.team_executions for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "team_executions_insert_member" on public.team_executions;
create policy "team_executions_insert_member"
on public.team_executions for insert to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and initiated_by = auth.uid()
);

drop policy if exists "team_executions_update_member" on public.team_executions;
create policy "team_executions_update_member"
on public.team_executions for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "agent_handoffs_select_member" on public.agent_handoffs;
create policy "agent_handoffs_select_member"
on public.agent_handoffs for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "agent_handoffs_insert_member" on public.agent_handoffs;
create policy "agent_handoffs_insert_member"
on public.agent_handoffs for insert to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "agent_handoffs_update_member" on public.agent_handoffs;
create policy "agent_handoffs_update_member"
on public.agent_handoffs for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

grant select, insert, update on public.team_executions to authenticated;
grant select, insert, update on public.agent_handoffs to authenticated;

commit;

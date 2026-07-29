begin;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  mode text not null default 'individual',
  status text not null default 'active',
  selected_agent_id uuid references public.agents(id) on delete set null,
  preferred_model_id uuid references public.ai_models(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint conversations_title_length check (char_length(trim(title)) between 2 and 140),
  constraint conversations_mode_allowed check (mode in ('individual', 'team')),
  constraint conversations_status_allowed check (status in ('active', 'archived'))
);
create index if not exists conversations_workspace_updated_idx
  on public.conversations(workspace_id, status, updated_at desc);
create index if not exists conversations_project_updated_idx
  on public.conversations(workspace_id, project_id, updated_at desc);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  participant_role text not null default 'specialist',
  status text not null default 'active',
  added_by uuid not null references public.profiles(id) on delete restrict,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (conversation_id, agent_id),
  constraint conversation_participants_role_allowed check (participant_role in ('lead', 'specialist')),
  constraint conversation_participants_status_allowed check (status in ('active', 'inactive'))
);
create index if not exists conversation_participants_workspace_idx
  on public.conversation_participants(workspace_id, conversation_id, status);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sequence_number bigint generated always as identity,
  role text not null,
  status text not null default 'completed',
  agent_id uuid references public.agents(id) on delete set null,
  model_id uuid references public.ai_models(id) on delete set null,
  content text not null default '',
  error_message text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint messages_role_allowed check (role in ('user', 'assistant', 'system', 'tool')),
  constraint messages_status_allowed check (status in ('queued', 'streaming', 'completed', 'failed', 'cancelled')),
  constraint messages_content_length check (char_length(content) <= 1000000),
  constraint messages_error_length check (error_message is null or char_length(error_message) <= 4000)
);
create unique index if not exists messages_sequence_unique_idx on public.messages(sequence_number);
create index if not exists messages_conversation_sequence_idx
  on public.messages(workspace_id, conversation_id, sequence_number);
create index if not exists messages_project_created_idx
  on public.messages(workspace_id, project_id, created_at desc);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  file_name text not null,
  mime_type text not null default 'text/plain',
  size_bytes integer not null,
  language text,
  content_text text not null,
  content_checksum text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint message_attachments_name_length check (char_length(trim(file_name)) between 1 and 240),
  constraint message_attachments_mime_length check (char_length(mime_type) between 1 and 120),
  constraint message_attachments_size_allowed check (size_bytes between 1 and 262144),
  constraint message_attachments_content_length check (char_length(content_text) <= 300000)
);
create index if not exists message_attachments_message_idx
  on public.message_attachments(workspace_id, message_id, created_at);
create index if not exists message_attachments_checksum_idx
  on public.message_attachments(workspace_id, content_checksum);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_message_id uuid references public.messages(id) on delete set null,
  assistant_message_id uuid references public.messages(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  model_id uuid references public.ai_models(id) on delete set null,
  provider_id uuid references public.ai_providers(id) on delete set null,
  mode text not null default 'individual',
  task_type text not null default 'general',
  status text not null default 'queued',
  input_tokens integer,
  output_tokens integer,
  estimated_cost numeric(14,8),
  currency text not null default 'USD',
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  initiated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint agent_runs_mode_allowed check (mode in ('individual', 'team')),
  constraint agent_runs_task_allowed check (task_type in ('general','coding','debugging','sql','design','architecture','qa','analysis','content')),
  constraint agent_runs_status_allowed check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  constraint agent_runs_tokens_positive check (
    (input_tokens is null or input_tokens >= 0) and
    (output_tokens is null or output_tokens >= 0)
  ),
  constraint agent_runs_cost_positive check (estimated_cost is null or estimated_cost >= 0),
  constraint agent_runs_duration_positive check (duration_ms is null or duration_ms >= 0),
  constraint agent_runs_currency_length check (char_length(currency) = 3)
);
create index if not exists agent_runs_conversation_created_idx
  on public.agent_runs(workspace_id, conversation_id, created_at desc);
create index if not exists agent_runs_status_idx
  on public.agent_runs(workspace_id, status, created_at desc);
create unique index if not exists agent_runs_one_active_per_conversation_idx
  on public.agent_runs(conversation_id)
  where status in ('queued', 'running');

create table if not exists public.model_usage (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  provider_id uuid references public.ai_providers(id) on delete set null,
  model_id uuid references public.ai_models(id) on delete set null,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  estimated_cost numeric(14,8),
  currency text not null default 'USD',
  duration_ms integer,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint model_usage_tokens_positive check (
    (input_tokens is null or input_tokens >= 0) and
    (output_tokens is null or output_tokens >= 0) and
    (total_tokens is null or total_tokens >= 0)
  ),
  constraint model_usage_cost_positive check (estimated_cost is null or estimated_cost >= 0),
  constraint model_usage_duration_positive check (duration_ms is null or duration_ms >= 0),
  constraint model_usage_currency_length check (char_length(currency) = 3)
);
create unique index if not exists model_usage_run_unique_idx on public.model_usage(run_id);
create index if not exists model_usage_workspace_created_idx
  on public.model_usage(workspace_id, created_at desc);
create index if not exists model_usage_project_created_idx
  on public.model_usage(workspace_id, project_id, created_at desc);

create or replace function public.validate_conversation_workspace()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  entity_workspace_id uuid;
  validate_agent_assignment boolean := tg_op = 'INSERT';
  validate_model_availability boolean := tg_op = 'INSERT';
begin
  if tg_op = 'UPDATE' then
    validate_agent_assignment :=
      old.selected_agent_id is distinct from new.selected_agent_id
      or old.project_id is distinct from new.project_id;
    validate_model_availability :=
      old.preferred_model_id is distinct from new.preferred_model_id;
  end if;
  select workspace_id into entity_workspace_id from public.projects where id = new.project_id;
  if entity_workspace_id is null or entity_workspace_id <> new.workspace_id then
    raise exception 'Conversation project cannot cross workspaces';
  end if;

  if new.selected_agent_id is not null then
    select workspace_id into entity_workspace_id from public.agents where id = new.selected_agent_id;
    if entity_workspace_id is null or entity_workspace_id <> new.workspace_id then
      raise exception 'Conversation agent cannot cross workspaces';
    end if;
    if validate_agent_assignment and not exists (
      select 1
      from public.project_agents
      where workspace_id = new.workspace_id
        and project_id = new.project_id
        and agent_id = new.selected_agent_id
        and status = 'active'
    ) then
      raise exception 'Conversation agent must be assigned to the project';
    end if;
  end if;

  if new.preferred_model_id is not null then
    select workspace_id into entity_workspace_id
    from public.ai_models
    where id = new.preferred_model_id;
    if entity_workspace_id is null or entity_workspace_id <> new.workspace_id then
      raise exception 'Conversation model cannot cross workspaces';
    end if;

    if validate_model_availability and not exists (
      select 1
      from public.ai_models m
      join public.ai_providers p on p.id = m.provider_id
      where m.id = new.preferred_model_id
        and m.workspace_id = new.workspace_id
        and m.status = 'active'
        and p.status = 'active'
        and p.credential_status = 'configured'
    ) then
      raise exception 'Conversation model is unavailable';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_conversation_child_workspace()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  conversation_workspace_id uuid;
  conversation_project_id uuid;
  entity_workspace_id uuid;
  entity_project_id uuid;
  entity_conversation_id uuid;
  row_data jsonb := to_jsonb(new);
  entity_id uuid;
begin
  select workspace_id, project_id
    into conversation_workspace_id, conversation_project_id
  from public.conversations
  where id = new.conversation_id;

  if conversation_workspace_id is null
    or conversation_workspace_id <> new.workspace_id
    or (
      row_data ? 'project_id'
      and nullif(row_data ->> 'project_id', '')::uuid <> conversation_project_id
    ) then
    raise exception 'Conversation child cannot cross workspaces or projects';
  end if;

  entity_id := nullif(row_data ->> 'agent_id', '')::uuid;
  if entity_id is not null then
    select workspace_id into entity_workspace_id from public.agents where id = entity_id;
    if entity_workspace_id is null or entity_workspace_id <> new.workspace_id then
      raise exception 'Agent cannot cross workspaces';
    end if;
  end if;

  entity_id := nullif(row_data ->> 'model_id', '')::uuid;
  if entity_id is not null then
    select workspace_id into entity_workspace_id from public.ai_models where id = entity_id;
    if entity_workspace_id is null or entity_workspace_id <> new.workspace_id then
      raise exception 'Model cannot cross workspaces';
    end if;
  end if;

  entity_id := nullif(row_data ->> 'provider_id', '')::uuid;
  if entity_id is not null then
    select workspace_id into entity_workspace_id from public.ai_providers where id = entity_id;
    if entity_workspace_id is null or entity_workspace_id <> new.workspace_id then
      raise exception 'Provider cannot cross workspaces';
    end if;
  end if;

  foreach entity_id in array array[
    nullif(row_data ->> 'user_message_id', '')::uuid,
    nullif(row_data ->> 'assistant_message_id', '')::uuid
  ] loop
    if entity_id is not null then
      select workspace_id, project_id, conversation_id
        into entity_workspace_id, entity_project_id, entity_conversation_id
      from public.messages
      where id = entity_id;
      if entity_workspace_id is null
        or entity_workspace_id <> new.workspace_id
        or entity_project_id <> conversation_project_id
        or entity_conversation_id <> new.conversation_id then
        raise exception 'Run message cannot cross conversations, projects or workspaces';
      end if;
    end if;
  end loop;

  entity_id := nullif(row_data ->> 'run_id', '')::uuid;
  if entity_id is not null then
    select workspace_id, project_id, conversation_id
      into entity_workspace_id, entity_project_id, entity_conversation_id
    from public.agent_runs
    where id = entity_id;
    if entity_workspace_id is null
      or entity_workspace_id <> new.workspace_id
      or entity_project_id <> conversation_project_id
      or entity_conversation_id <> new.conversation_id then
      raise exception 'Usage run cannot cross conversations, projects or workspaces';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_attachment_message()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  message_workspace_id uuid;
  message_project_id uuid;
  message_conversation_id uuid;
begin
  select workspace_id, project_id, conversation_id
    into message_workspace_id, message_project_id, message_conversation_id
  from public.messages
  where id = new.message_id;

  if message_workspace_id is null
    or message_workspace_id <> new.workspace_id
    or message_project_id <> new.project_id
    or message_conversation_id <> new.conversation_id then
    raise exception 'Attachment cannot cross messages, projects, conversations or workspaces';
  end if;

  return new;
end;
$$;

create or replace function public.create_conversation_record(
  p_project_id uuid,
  p_title text,
  p_mode text default 'individual',
  p_agent_id uuid default null,
  p_model_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_workspace_id uuid;
  clean_title text := trim(p_title);
  created_conversation_id uuid;
  lead_agent_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select workspace_id into target_workspace_id
  from public.projects
  where id = p_project_id and status <> 'archived';

  if target_workspace_id is null or not public.is_workspace_member(target_workspace_id) then
    raise exception 'Project unavailable';
  end if;

  if char_length(clean_title) < 2 or char_length(clean_title) > 140 then
    raise exception 'Conversation title must contain between 2 and 140 characters';
  end if;

  if p_mode not in ('individual', 'team') then
    raise exception 'Conversation mode is invalid';
  end if;

  if p_agent_id is not null and not exists (
    select 1 from public.project_agents
    where workspace_id = target_workspace_id
      and project_id = p_project_id
      and agent_id = p_agent_id
      and status = 'active'
  ) then
    raise exception 'Agent is not assigned to the project';
  end if;

  if p_model_id is not null and not exists (
    select 1 from public.ai_models m
    join public.ai_providers p on p.id = m.provider_id
    where m.id = p_model_id
      and m.workspace_id = target_workspace_id
      and m.status = 'active'
      and p.status = 'active'
      and p.credential_status = 'configured'
  ) then
    raise exception 'Model is not available for execution';
  end if;

  if p_mode = 'team' and p_agent_id is null then
    select agent_id into lead_agent_id
    from public.project_agents
    where workspace_id = target_workspace_id
      and project_id = p_project_id
      and status = 'active'
    order by is_lead desc, assigned_at asc
    limit 1;
  else
    lead_agent_id := p_agent_id;
  end if;

  insert into public.conversations(
    workspace_id, project_id, title, mode, selected_agent_id,
    preferred_model_id, created_by, updated_by
  ) values (
    target_workspace_id, p_project_id, clean_title, p_mode, lead_agent_id,
    p_model_id, current_user_id, current_user_id
  ) returning id into created_conversation_id;

  if lead_agent_id is not null then
    insert into public.conversation_participants(
      conversation_id, workspace_id, agent_id, participant_role, added_by
    ) values (
      created_conversation_id,
      target_workspace_id,
      lead_agent_id,
      'lead',
      current_user_id
    ) on conflict (conversation_id, agent_id) do update
      set participant_role = 'lead', status = 'active', updated_at = now();
  end if;

  if p_mode = 'team' then
    insert into public.conversation_participants(
      conversation_id, workspace_id, agent_id, participant_role, added_by
    )
    select
      created_conversation_id,
      target_workspace_id,
      pa.agent_id,
      case when pa.agent_id = lead_agent_id then 'lead' else 'specialist' end,
      current_user_id
    from public.project_agents pa
    where pa.workspace_id = target_workspace_id
      and pa.project_id = p_project_id
      and pa.status = 'active'
    on conflict (conversation_id, agent_id) do update
      set participant_role = excluded.participant_role,
          status = 'active',
          updated_at = now();
  end if;

  return created_conversation_id;
end;
$$;

create or replace function public.audit_conversation_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  event_action text;
begin
  if tg_op = 'INSERT' then
    event_action := 'conversation.created';
  elsif old.status <> new.status and new.status = 'archived' then
    event_action := 'conversation.archived';
  elsif old.status = 'archived' and new.status = 'active' then
    event_action := 'conversation.restored';
  else
    event_action := 'conversation.updated';
  end if;

  insert into public.audit_logs(workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values(
    new.workspace_id,
    auth.uid(),
    event_action,
    'conversation',
    new.id,
    jsonb_build_object('project_id', new.project_id, 'mode', new.mode, 'status', new.status)
  );

  return new;
end;
$$;

create or replace function public.audit_agent_run_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status and new.status in ('completed', 'failed', 'cancelled') then
    insert into public.audit_logs(workspace_id, actor_id, action, entity_type, entity_id, metadata)
    values(
      new.workspace_id,
      auth.uid(),
      'agent_run.' || new.status,
      'agent_run',
      new.id,
      jsonb_build_object(
        'project_id', new.project_id,
        'conversation_id', new.conversation_id,
        'model_id', new.model_id,
        'provider_id', new.provider_id,
        'duration_ms', new.duration_ms,
        'estimated_cost', new.estimated_cost
      )
    );
  end if;
  return new;
end;
$$;

-- Validation and timestamp triggers.
drop trigger if exists conversations_validate_workspace on public.conversations;
create trigger conversations_validate_workspace
before insert or update on public.conversations
for each row execute function public.validate_conversation_workspace();

drop trigger if exists conversation_participants_validate_workspace on public.conversation_participants;
create trigger conversation_participants_validate_workspace
before insert or update on public.conversation_participants
for each row execute function public.validate_conversation_child_workspace();

drop trigger if exists messages_validate_workspace on public.messages;
create trigger messages_validate_workspace
before insert or update on public.messages
for each row execute function public.validate_conversation_child_workspace();

drop trigger if exists message_attachments_validate_message on public.message_attachments;
create trigger message_attachments_validate_message
before insert or update on public.message_attachments
for each row execute function public.validate_attachment_message();

drop trigger if exists agent_runs_validate_workspace on public.agent_runs;
create trigger agent_runs_validate_workspace
before insert or update on public.agent_runs
for each row execute function public.validate_conversation_child_workspace();

drop trigger if exists model_usage_validate_workspace on public.model_usage;
create trigger model_usage_validate_workspace
before insert or update on public.model_usage
for each row execute function public.validate_conversation_child_workspace();

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists conversation_participants_set_updated_at on public.conversation_participants;
create trigger conversation_participants_set_updated_at
before update on public.conversation_participants
for each row execute function public.set_updated_at();

drop trigger if exists conversations_audit_change on public.conversations;
create trigger conversations_audit_change
after insert or update on public.conversations
for each row execute function public.audit_conversation_change();

drop trigger if exists agent_runs_audit_change on public.agent_runs;
create trigger agent_runs_audit_change
after update on public.agent_runs
for each row execute function public.audit_agent_run_change();

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.agent_runs enable row level security;
alter table public.model_usage enable row level security;

-- Conversations: every active member can read and create. The creator or an administrator can update.
drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member"
on public.conversations for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "conversations_insert_member" on public.conversations;
create policy "conversations_insert_member"
on public.conversations for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid() and updated_by = auth.uid());

drop policy if exists "conversations_update_creator_or_admin" on public.conversations;
create policy "conversations_update_creator_or_admin"
on public.conversations for update to authenticated
using (
  public.is_workspace_member(workspace_id)
  and (created_by = auth.uid() or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]))
)
with check (
  public.is_workspace_member(workspace_id)
  and (created_by = auth.uid() or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]))
  and updated_by = auth.uid()
);

-- Conversation children are available to workspace members. Writes are tied to the authenticated actor.
drop policy if exists "conversation_participants_select_member" on public.conversation_participants;
create policy "conversation_participants_select_member"
on public.conversation_participants for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "conversation_participants_write_member" on public.conversation_participants;
create policy "conversation_participants_write_member"
on public.conversation_participants for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id) and added_by = auth.uid());

drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member"
on public.messages for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "messages_insert_actor" on public.messages;
create policy "messages_insert_actor"
on public.messages for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

drop policy if exists "messages_update_actor" on public.messages;
create policy "messages_update_actor"
on public.messages for update to authenticated
using (public.is_workspace_member(workspace_id) and created_by = auth.uid())
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

drop policy if exists "message_attachments_select_member" on public.message_attachments;
create policy "message_attachments_select_member"
on public.message_attachments for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "message_attachments_insert_actor" on public.message_attachments;
create policy "message_attachments_insert_actor"
on public.message_attachments for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

drop policy if exists "agent_runs_select_member" on public.agent_runs;
create policy "agent_runs_select_member"
on public.agent_runs for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "agent_runs_insert_actor" on public.agent_runs;
create policy "agent_runs_insert_actor"
on public.agent_runs for insert to authenticated
with check (public.is_workspace_member(workspace_id) and initiated_by = auth.uid());

drop policy if exists "agent_runs_update_actor" on public.agent_runs;
create policy "agent_runs_update_actor"
on public.agent_runs for update to authenticated
using (public.is_workspace_member(workspace_id) and initiated_by = auth.uid())
with check (public.is_workspace_member(workspace_id) and initiated_by = auth.uid());

drop policy if exists "model_usage_select_member" on public.model_usage;
create policy "model_usage_select_member"
on public.model_usage for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "model_usage_insert_actor" on public.model_usage;
create policy "model_usage_insert_actor"
on public.model_usage for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

grant select, insert, update on public.conversations to authenticated;
grant select, insert, update, delete on public.conversation_participants to authenticated;
grant select, insert, update on public.messages to authenticated;
grant select, insert on public.message_attachments to authenticated;
grant select, insert, update on public.agent_runs to authenticated;
grant select, insert on public.model_usage to authenticated;

grant usage, select on sequence public.messages_sequence_number_seq to authenticated;

revoke all on function public.create_conversation_record(uuid,text,text,uuid,uuid) from public;
grant execute on function public.create_conversation_record(uuid,text,text,uuid,uuid) to authenticated;
revoke all on function public.validate_conversation_workspace() from public;
revoke all on function public.validate_conversation_child_workspace() from public;
revoke all on function public.validate_attachment_message() from public;
revoke all on function public.audit_conversation_change() from public;
revoke all on function public.audit_agent_run_change() from public;

commit;

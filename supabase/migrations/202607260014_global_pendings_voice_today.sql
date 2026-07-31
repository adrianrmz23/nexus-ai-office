begin;

create table if not exists public.global_pendings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  recurring_parent_id uuid references public.global_pendings(id) on delete set null,
  source_conversation_id uuid references public.conversations(id) on delete set null,
  title text not null,
  description text not null default '',
  notes text not null default '',
  status text not null default 'inbox',
  priority text not null default 'medium',
  category text not null default 'General',
  tags text[] not null default '{}',
  due_date date,
  due_time time,
  reminder_at timestamptz,
  last_reminded_at timestamptz,
  estimated_minutes integer,
  actual_minutes integer,
  recurrence_type text not null default 'none',
  recurrence_interval integer not null default 1,
  recurrence_end_date date,
  snoozed_until timestamptz,
  postponed_count integer not null default 0,
  origin text not null default 'manual',
  completed_at timestamptz,
  cancelled_at timestamptz,
  archived_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint global_pendings_title_length check (char_length(trim(title)) between 2 and 180),
  constraint global_pendings_description_length check (char_length(description) <= 16000),
  constraint global_pendings_notes_length check (char_length(notes) <= 16000),
  constraint global_pendings_status_allowed check (
    status in ('inbox', 'pending', 'in_progress', 'waiting', 'completed', 'cancelled', 'archived')
  ),
  constraint global_pendings_priority_allowed check (priority in ('low', 'medium', 'high', 'urgent')),
  constraint global_pendings_category_length check (char_length(category) between 1 and 80),
  constraint global_pendings_tags_limit check (cardinality(tags) <= 12),
  constraint global_pendings_estimated_minutes check (estimated_minutes is null or estimated_minutes between 1 and 10080),
  constraint global_pendings_actual_minutes check (actual_minutes is null or actual_minutes between 0 and 100000),
  constraint global_pendings_recurrence_allowed check (recurrence_type in ('none', 'daily', 'weekly', 'monthly', 'weekdays')),
  constraint global_pendings_recurrence_interval check (recurrence_interval between 1 and 365),
  constraint global_pendings_postponed_count check (postponed_count between 0 and 10000),
  constraint global_pendings_origin_allowed check (origin in ('manual', 'voice', 'briefing', 'conversation', 'recurrence')),
  constraint global_pendings_due_time_requires_date check (due_time is null or due_date is not null)
);

create index if not exists global_pendings_owner_status_idx
  on public.global_pendings(workspace_id, owner_user_id, status, priority, updated_at desc);
create index if not exists global_pendings_owner_due_idx
  on public.global_pendings(workspace_id, owner_user_id, due_date, due_time)
  where status not in ('completed', 'cancelled', 'archived');
create index if not exists global_pendings_reminder_idx
  on public.global_pendings(workspace_id, owner_user_id, reminder_at)
  where reminder_at is not null and status not in ('completed', 'cancelled', 'archived');

create table if not exists public.pending_subtasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  pending_id uuid not null references public.global_pendings(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pending_subtasks_title_length check (char_length(trim(title)) between 1 and 240),
  constraint pending_subtasks_position_nonnegative check (position >= 0)
);

create index if not exists pending_subtasks_pending_idx
  on public.pending_subtasks(workspace_id, pending_id, position);

create table if not exists public.voice_settings (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  recognition_provider text not null default 'browser',
  synthesis_provider text not null default 'browser',
  language text not null default 'es-MX',
  time_zone text not null default 'America/Mexico_City',
  voice_name text,
  speech_rate numeric(4,2) not null default 1,
  speech_pitch numeric(4,2) not null default 1,
  speech_volume numeric(4,2) not null default 1,
  auto_read_briefing boolean not null default false,
  auto_read_assistant boolean not null default false,
  confirmations_spoken boolean not null default true,
  save_transcripts boolean not null default true,
  save_audio boolean not null default false,
  browser_notifications boolean not null default false,
  daily_briefing_enabled boolean not null default true,
  daily_briefing_time time not null default '08:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id),
  constraint voice_settings_recognition_allowed check (recognition_provider in ('browser', 'disabled')),
  constraint voice_settings_synthesis_allowed check (synthesis_provider in ('browser', 'disabled')),
  constraint voice_settings_language_length check (char_length(language) between 2 and 16),
  constraint voice_settings_time_zone_length check (char_length(time_zone) between 3 and 80),
  constraint voice_settings_voice_name_length check (voice_name is null or char_length(voice_name) <= 160),
  constraint voice_settings_rate_range check (speech_rate between 0.5 and 2),
  constraint voice_settings_pitch_range check (speech_pitch between 0 and 2),
  constraint voice_settings_volume_range check (speech_volume between 0 and 1)
);

create table if not exists public.voice_command_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  transcript text not null,
  intent text not null,
  status text not null default 'parsed',
  response_text text not null default '',
  action_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint voice_command_logs_transcript_length check (char_length(transcript) between 1 and 4000),
  constraint voice_command_logs_intent_length check (char_length(intent) between 2 and 80),
  constraint voice_command_logs_status_allowed check (status in ('parsed', 'confirmed', 'completed', 'cancelled', 'failed')),
  constraint voice_command_logs_response_length check (char_length(response_text) <= 8000),
  constraint voice_command_logs_payload_size check (octet_length(action_payload::text) <= 32768)
);

create index if not exists voice_command_logs_user_created_idx
  on public.voice_command_logs(workspace_id, user_id, created_at desc);

create or replace function public.prepare_global_pending_record()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.title := trim(new.title);
  new.description := trim(coalesce(new.description, ''));
  new.notes := trim(coalesce(new.notes, ''));
  new.category := coalesce(nullif(trim(new.category), ''), 'General');
  new.tags := coalesce(
    array(
      select distinct trim(tag)
      from unnest(coalesce(new.tags, '{}'::text[])) as tag
      where trim(tag) <> ''
      limit 12
    ),
    '{}'::text[]
  );

  if not public.is_workspace_member(new.workspace_id) or new.owner_user_id <> auth.uid() then
    raise exception 'Pending item does not belong to the current user';
  end if;

  if new.source_conversation_id is not null and not exists (
    select 1 from public.conversations
    where id = new.source_conversation_id and workspace_id = new.workspace_id
  ) then
    raise exception 'Conversation does not belong to the selected workspace';
  end if;

  if new.recurring_parent_id is not null and not exists (
    select 1 from public.global_pendings parent
    where parent.id = new.recurring_parent_id
      and parent.workspace_id = new.workspace_id
      and parent.owner_user_id = auth.uid()
  ) then
    raise exception 'Recurring parent does not belong to the current user';
  end if;

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
  else
    if new.workspace_id <> old.workspace_id or new.owner_user_id <> old.owner_user_id then
      raise exception 'Pending items cannot move between users or workspaces';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := auth.uid();
    if new.reminder_at is distinct from old.reminder_at then
      new.last_reminded_at := null;
    end if;
  end if;

  new.updated_at := now();
  if new.status = 'completed' and new.completed_at is null then new.completed_at := now(); end if;
  if new.status <> 'completed' then new.completed_at := null; end if;
  if new.status = 'cancelled' and new.cancelled_at is null then new.cancelled_at := now(); end if;
  if new.status <> 'cancelled' then new.cancelled_at := null; end if;
  if new.status = 'archived' and new.archived_at is null then new.archived_at := now(); end if;
  if new.status <> 'archived' then new.archived_at := null; end if;

  return new;
end;
$$;

drop trigger if exists global_pendings_prepare on public.global_pendings;
create trigger global_pendings_prepare
before insert or update on public.global_pendings
for each row execute function public.prepare_global_pending_record();

create or replace function public.prepare_pending_subtask()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  pending_workspace uuid;
  pending_owner uuid;
begin
  select workspace_id, owner_user_id into pending_workspace, pending_owner
  from public.global_pendings where id = new.pending_id;

  if pending_workspace is null or pending_workspace <> new.workspace_id or pending_owner <> auth.uid() then
    raise exception 'Subtask does not belong to the current pending item';
  end if;

  new.title := trim(new.title);
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  else
    if new.workspace_id <> old.workspace_id or new.pending_id <> old.pending_id then
      raise exception 'Subtasks cannot move between pending items';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  if new.is_completed and new.completed_at is null then new.completed_at := now(); end if;
  if not new.is_completed then new.completed_at := null; end if;
  return new;
end;
$$;

drop trigger if exists pending_subtasks_prepare on public.pending_subtasks;
create trigger pending_subtasks_prepare
before insert or update on public.pending_subtasks
for each row execute function public.prepare_pending_subtask();

create or replace function public.create_global_pending_record(
  p_workspace_id uuid,
  p_title text,
  p_description text,
  p_notes text,
  p_status text,
  p_priority text,
  p_category text,
  p_tags text[],
  p_due_date date,
  p_due_time time,
  p_reminder_at timestamptz,
  p_estimated_minutes integer,
  p_recurrence_type text,
  p_recurrence_interval integer,
  p_recurrence_end_date date,
  p_origin text,
  p_source_conversation_id uuid,
  p_recurring_parent_id uuid,
  p_subtasks text[]
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  created_id uuid;
  subtask_title text;
  subtask_position integer := 0;
begin
  if current_user_id is null or not public.is_workspace_member(p_workspace_id) then
    raise exception 'Insufficient permissions';
  end if;

  insert into public.global_pendings (
    workspace_id, owner_user_id, recurring_parent_id, source_conversation_id,
    title, description, notes, status, priority, category, tags,
    due_date, due_time, reminder_at, estimated_minutes,
    recurrence_type, recurrence_interval, recurrence_end_date, origin,
    created_by, updated_by
  ) values (
    p_workspace_id, current_user_id, p_recurring_parent_id, p_source_conversation_id,
    p_title, coalesce(p_description, ''), coalesce(p_notes, ''), p_status, p_priority,
    coalesce(p_category, 'General'), coalesce(p_tags, '{}'::text[]),
    p_due_date, p_due_time, p_reminder_at, p_estimated_minutes,
    p_recurrence_type, p_recurrence_interval, p_recurrence_end_date, p_origin,
    current_user_id, current_user_id
  ) returning id into created_id;

  foreach subtask_title in array coalesce(p_subtasks, '{}'::text[]) loop
    if trim(subtask_title) <> '' then
      insert into public.pending_subtasks (
        workspace_id, pending_id, title, position, created_by
      ) values (
        p_workspace_id, created_id, trim(subtask_title), subtask_position, current_user_id
      );
      subtask_position := subtask_position + 1;
    end if;
  end loop;

  return created_id;
end;
$$;

create or replace function public.update_global_pending_record(
  p_pending_id uuid,
  p_title text,
  p_description text,
  p_notes text,
  p_status text,
  p_priority text,
  p_category text,
  p_tags text[],
  p_due_date date,
  p_due_time time,
  p_reminder_at timestamptz,
  p_estimated_minutes integer,
  p_actual_minutes integer,
  p_recurrence_type text,
  p_recurrence_interval integer,
  p_recurrence_end_date date,
  p_subtasks text[]
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_workspace uuid;
  subtask_title text;
  subtask_position integer := 0;
  completion_map jsonb := '{}'::jsonb;
  was_completed boolean;
  previous_completed_at timestamptz;
begin
  select workspace_id into target_workspace
  from public.global_pendings
  where id = p_pending_id and owner_user_id = current_user_id;

  if target_workspace is null or not public.is_workspace_member(target_workspace) then
    raise exception 'Pending item not found';
  end if;

  select coalesce(
    jsonb_object_agg(
      lower(trim(title)),
      jsonb_build_object('is_completed', is_completed, 'completed_at', completed_at)
    ),
    '{}'::jsonb
  ) into completion_map
  from public.pending_subtasks
  where pending_id = p_pending_id;

  update public.global_pendings set
    title = p_title,
    description = coalesce(p_description, ''),
    notes = coalesce(p_notes, ''),
    status = p_status,
    priority = p_priority,
    category = coalesce(p_category, 'General'),
    tags = coalesce(p_tags, '{}'::text[]),
    due_date = p_due_date,
    due_time = p_due_time,
    reminder_at = p_reminder_at,
    estimated_minutes = p_estimated_minutes,
    actual_minutes = p_actual_minutes,
    recurrence_type = p_recurrence_type,
    recurrence_interval = p_recurrence_interval,
    recurrence_end_date = p_recurrence_end_date,
    updated_by = current_user_id
  where id = p_pending_id;

  delete from public.pending_subtasks where pending_id = p_pending_id;
  foreach subtask_title in array coalesce(p_subtasks, '{}'::text[]) loop
    if trim(subtask_title) <> '' then
      was_completed := coalesce(
        (completion_map -> lower(trim(subtask_title)) ->> 'is_completed')::boolean,
        false
      );
      previous_completed_at := case
        when was_completed then nullif(
          completion_map -> lower(trim(subtask_title)) ->> 'completed_at',
          ''
        )::timestamptz
        else null
      end;
      insert into public.pending_subtasks (
        workspace_id, pending_id, title, position, is_completed, completed_at, created_by
      ) values (
        target_workspace, p_pending_id, trim(subtask_title), subtask_position,
        was_completed, previous_completed_at, current_user_id
      );
      subtask_position := subtask_position + 1;
    end if;
  end loop;

  return p_pending_id;
end;
$$;

create or replace function public.audit_global_pending_change()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  event_action text;
begin
  event_action := case
    when tg_op = 'INSERT' then 'pending.created'
    when new.status = 'completed' and old.status is distinct from 'completed' then 'pending.completed'
    when new.status = 'archived' and old.status is distinct from 'archived' then 'pending.archived'
    when new.snoozed_until is distinct from old.snoozed_until then 'pending.snoozed'
    else 'pending.updated'
  end;

  insert into public.audit_logs(workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    new.workspace_id,
    auth.uid(),
    event_action,
    'global_pending',
    new.id,
    jsonb_build_object('title', new.title, 'status', new.status, 'priority', new.priority, 'due_date', new.due_date)
  );
  return new;
end;
$$;

drop trigger if exists global_pendings_audit on public.global_pendings;
create trigger global_pendings_audit
after insert or update on public.global_pendings
for each row execute function public.audit_global_pending_change();

alter table public.global_pendings enable row level security;
alter table public.pending_subtasks enable row level security;
alter table public.voice_settings enable row level security;
alter table public.voice_command_logs enable row level security;

drop policy if exists "global_pendings_select_own" on public.global_pendings;
create policy "global_pendings_select_own" on public.global_pendings
for select to authenticated
using (owner_user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "global_pendings_insert_own" on public.global_pendings;
create policy "global_pendings_insert_own" on public.global_pendings
for insert to authenticated
with check (owner_user_id = auth.uid() and created_by = auth.uid() and updated_by = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "global_pendings_update_own" on public.global_pendings;
create policy "global_pendings_update_own" on public.global_pendings
for update to authenticated
using (owner_user_id = auth.uid() and public.is_workspace_member(workspace_id))
with check (owner_user_id = auth.uid() and updated_by = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "global_pendings_delete_own" on public.global_pendings;
create policy "global_pendings_delete_own" on public.global_pendings
for delete to authenticated
using (owner_user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "pending_subtasks_select_own" on public.pending_subtasks;
create policy "pending_subtasks_select_own" on public.pending_subtasks
for select to authenticated
using (exists (
  select 1 from public.global_pendings p
  where p.id = pending_subtasks.pending_id and p.owner_user_id = auth.uid() and p.workspace_id = pending_subtasks.workspace_id
));

drop policy if exists "pending_subtasks_write_own" on public.pending_subtasks;
create policy "pending_subtasks_write_own" on public.pending_subtasks
for all to authenticated
using (exists (
  select 1 from public.global_pendings p
  where p.id = pending_subtasks.pending_id and p.owner_user_id = auth.uid() and p.workspace_id = pending_subtasks.workspace_id
))
with check (exists (
  select 1 from public.global_pendings p
  where p.id = pending_subtasks.pending_id and p.owner_user_id = auth.uid() and p.workspace_id = pending_subtasks.workspace_id
));

drop policy if exists "voice_settings_select_own" on public.voice_settings;
create policy "voice_settings_select_own" on public.voice_settings
for select to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "voice_settings_insert_own" on public.voice_settings;
create policy "voice_settings_insert_own" on public.voice_settings
for insert to authenticated
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "voice_settings_update_own" on public.voice_settings;
create policy "voice_settings_update_own" on public.voice_settings
for update to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "voice_logs_select_own" on public.voice_command_logs;
create policy "voice_logs_select_own" on public.voice_command_logs
for select to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "voice_logs_insert_own" on public.voice_command_logs;
create policy "voice_logs_insert_own" on public.voice_command_logs
for insert to authenticated
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

revoke all on function public.create_global_pending_record(uuid, text, text, text, text, text, text, text[], date, time, timestamptz, integer, text, integer, date, text, uuid, uuid, text[]) from public;
revoke all on function public.update_global_pending_record(uuid, text, text, text, text, text, text, text[], date, time, timestamptz, integer, integer, text, integer, date, text[]) from public;
revoke all on function public.prepare_global_pending_record() from public;
revoke all on function public.prepare_pending_subtask() from public;
revoke all on function public.audit_global_pending_change() from public;

grant select, insert, update, delete on public.global_pendings to authenticated;
grant select, insert, update, delete on public.pending_subtasks to authenticated;
grant select, insert, update on public.voice_settings to authenticated;
grant select, insert on public.voice_command_logs to authenticated;
grant execute on function public.create_global_pending_record(uuid, text, text, text, text, text, text, text[], date, time, timestamptz, integer, text, integer, date, text, uuid, uuid, text[]) to authenticated;
grant execute on function public.update_global_pending_record(uuid, text, text, text, text, text, text, text[], date, time, timestamptz, integer, integer, text, integer, date, text[]) to authenticated;

commit;

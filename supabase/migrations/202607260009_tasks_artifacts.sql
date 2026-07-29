begin;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  source_message_id uuid references public.messages(id) on delete set null,
  assigned_agent_id uuid references public.agents(id) on delete set null,
  created_by_agent_id uuid references public.agents(id) on delete set null,
  title text not null,
  description text not null default '',
  acceptance_criteria text not null default '',
  status text not null default 'backlog',
  priority text not null default 'medium',
  progress smallint not null default 0,
  due_date date,
  completed_at timestamptz,
  archived_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_length check (char_length(trim(title)) between 3 and 180),
  constraint tasks_description_length check (char_length(description) <= 20000),
  constraint tasks_acceptance_length check (char_length(acceptance_criteria) <= 12000),
  constraint tasks_status_allowed check (
    status in ('backlog', 'in_progress', 'review', 'completed', 'cancelled', 'archived')
  ),
  constraint tasks_priority_allowed check (priority in ('low', 'medium', 'high', 'critical')),
  constraint tasks_progress_range check (progress between 0 and 100)
);

create index if not exists tasks_workspace_status_idx
  on public.tasks(workspace_id, status, priority, updated_at desc);
create index if not exists tasks_project_status_idx
  on public.tasks(workspace_id, project_id, status, updated_at desc);
create index if not exists tasks_assigned_agent_idx
  on public.tasks(workspace_id, assigned_agent_id, status, due_date);

create table if not exists public.task_dependencies (
  task_id uuid not null references public.tasks(id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  dependency_type text not null default 'blocks',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  constraint task_dependencies_distinct check (task_id <> depends_on_task_id),
  constraint task_dependencies_type_allowed check (dependency_type in ('blocks', 'relates_to'))
);

create index if not exists task_dependencies_reverse_idx
  on public.task_dependencies(workspace_id, depends_on_task_id);

create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  source_message_id uuid references public.messages(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  created_by_agent_id uuid references public.agents(id) on delete set null,
  reviewer_agent_id uuid references public.agents(id) on delete set null,
  title text not null,
  artifact_type text not null,
  language text,
  file_path text,
  status text not null default 'draft',
  current_version_number integer not null default 1,
  review_note text not null default '',
  approved_at timestamptz,
  archived_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artifacts_title_length check (char_length(trim(title)) between 3 and 180),
  constraint artifacts_type_allowed check (
    artifact_type in ('code', 'component', 'page', 'sql', 'migration', 'adr', 'plan', 'documentation', 'report', 'checklist', 'test_case', 'prompt', 'other')
  ),
  constraint artifacts_language_length check (language is null or char_length(language) <= 80),
  constraint artifacts_path_length check (file_path is null or char_length(file_path) <= 500),
  constraint artifacts_status_allowed check (
    status in ('draft', 'in_review', 'changes_requested', 'approved', 'rejected', 'archived')
  ),
  constraint artifacts_version_positive check (current_version_number >= 1),
  constraint artifacts_review_note_length check (char_length(review_note) <= 8000)
);

create index if not exists artifacts_workspace_status_idx
  on public.artifacts(workspace_id, status, updated_at desc);
create index if not exists artifacts_project_type_idx
  on public.artifacts(workspace_id, project_id, artifact_type, updated_at desc);
create index if not exists artifacts_task_idx
  on public.artifacts(workspace_id, task_id, updated_at desc);

create table if not exists public.artifact_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  version_number integer not null,
  content text not null,
  change_summary text not null default '',
  content_checksum text not null,
  source_message_id uuid references public.messages(id) on delete set null,
  created_by_agent_id uuid references public.agents(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint artifact_versions_number_positive check (version_number >= 1),
  constraint artifact_versions_content_length check (char_length(content) between 1 and 300000),
  constraint artifact_versions_summary_length check (char_length(change_summary) <= 4000),
  unique (artifact_id, version_number)
);

create index if not exists artifact_versions_artifact_idx
  on public.artifact_versions(workspace_id, artifact_id, version_number desc);

create table if not exists public.project_decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  source_message_id uuid references public.messages(id) on delete set null,
  decided_by_agent_id uuid references public.agents(id) on delete set null,
  title text not null,
  context text not null default '',
  decision text not null,
  consequences text not null default '',
  status text not null default 'proposed',
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_decisions_title_length check (char_length(trim(title)) between 3 and 180),
  constraint project_decisions_context_length check (char_length(context) <= 12000),
  constraint project_decisions_decision_length check (char_length(decision) between 3 and 16000),
  constraint project_decisions_consequences_length check (char_length(consequences) <= 12000),
  constraint project_decisions_status_allowed check (status in ('proposed', 'accepted', 'superseded', 'rejected'))
);

create index if not exists project_decisions_project_idx
  on public.project_decisions(workspace_id, project_id, status, updated_at desc);

create table if not exists public.error_solutions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  source_message_id uuid references public.messages(id) on delete set null,
  discovered_by_agent_id uuid references public.agents(id) on delete set null,
  title text not null,
  error_signature text not null default '',
  symptoms text not null default '',
  root_cause text not null default '',
  solution text not null,
  validation_steps text not null default '',
  status text not null default 'open',
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint error_solutions_title_length check (char_length(trim(title)) between 3 and 180),
  constraint error_solutions_signature_length check (char_length(error_signature) <= 4000),
  constraint error_solutions_symptoms_length check (char_length(symptoms) <= 12000),
  constraint error_solutions_root_length check (char_length(root_cause) <= 16000),
  constraint error_solutions_solution_length check (char_length(solution) between 3 and 24000),
  constraint error_solutions_validation_length check (char_length(validation_steps) <= 12000),
  constraint error_solutions_status_allowed check (status in ('open', 'resolved', 'verified', 'archived'))
);

create index if not exists error_solutions_project_idx
  on public.error_solutions(workspace_id, project_id, status, updated_at desc);

create or replace function public.validate_work_item_scope()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  ref_workspace uuid;
  ref_project uuid;
  assigned_agent uuid := coalesce(
    nullif(to_jsonb(new) ->> 'assigned_agent_id', '')::uuid,
    nullif(to_jsonb(new) ->> 'reviewer_agent_id', '')::uuid
  );
  creator_agent uuid := coalesce(
    nullif(to_jsonb(new) ->> 'created_by_agent_id', '')::uuid,
    nullif(to_jsonb(new) ->> 'decided_by_agent_id', '')::uuid,
    nullif(to_jsonb(new) ->> 'discovered_by_agent_id', '')::uuid
  );
  related_task uuid := nullif(to_jsonb(new) ->> 'task_id', '')::uuid;
begin
  select workspace_id into ref_workspace from public.projects where id = new.project_id;
  if ref_workspace is null or ref_workspace <> new.workspace_id then
    raise exception 'Project does not belong to the selected workspace';
  end if;

  if new.conversation_id is not null then
    select workspace_id, project_id into ref_workspace, ref_project
    from public.conversations where id = new.conversation_id;
    if ref_workspace <> new.workspace_id or ref_project <> new.project_id then
      raise exception 'Conversation does not belong to the selected project';
    end if;
  end if;

  if new.source_message_id is not null then
    select c.workspace_id, c.project_id into ref_workspace, ref_project
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = new.source_message_id;
    if ref_workspace <> new.workspace_id or ref_project <> new.project_id then
      raise exception 'Source message does not belong to the selected project';
    end if;
  end if;

  if tg_table_name = 'artifacts' and related_task is not null then
    select workspace_id, project_id into ref_workspace, ref_project
    from public.tasks where id = related_task;
    if ref_workspace <> new.workspace_id or ref_project <> new.project_id then
      raise exception 'Task does not belong to the selected project';
    end if;
  end if;

  if assigned_agent is not null and not exists (
    select 1 from public.project_agents
    where workspace_id = new.workspace_id
      and project_id = new.project_id
      and agent_id = assigned_agent
      and status = 'active'
  ) then
    raise exception 'Assigned agent is not active in the selected project';
  end if;

  if creator_agent is not null and not exists (
    select 1 from public.agents
    where workspace_id = new.workspace_id and id = creator_agent
  ) then
    raise exception 'Creator agent does not belong to the selected workspace';
  end if;

  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  else
    if new.workspace_id <> old.workspace_id or new.project_id <> old.project_id then
      raise exception 'Work items cannot move between workspaces or projects';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;

  if tg_table_name = 'tasks' then
    if new.status = 'completed' and new.completed_at is null then new.completed_at := now(); end if;
    if new.status <> 'completed' then new.completed_at := null; end if;
    if new.status = 'archived' and new.archived_at is null then new.archived_at := now(); end if;
    if new.status <> 'archived' then new.archived_at := null; end if;
    if new.status = 'completed' then new.progress := 100; end if;
  elsif tg_table_name = 'artifacts' then
    if new.status = 'approved' and new.approved_at is null then new.approved_at := now(); end if;
    if new.status <> 'approved' then new.approved_at := null; end if;
    if new.status = 'archived' and new.archived_at is null then new.archived_at := now(); end if;
    if new.status <> 'archived' then new.archived_at := null; end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_task_dependency()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  task_workspace uuid;
  task_project uuid;
  dependency_workspace uuid;
  dependency_project uuid;
begin
  select workspace_id, project_id into task_workspace, task_project from public.tasks where id = new.task_id;
  select workspace_id, project_id into dependency_workspace, dependency_project from public.tasks where id = new.depends_on_task_id;
  if task_workspace is null or dependency_workspace is null
     or task_workspace <> new.workspace_id
     or dependency_workspace <> new.workspace_id
     or task_project <> dependency_project then
    raise exception 'Task dependencies must remain inside the same project';
  end if;

  if exists (
    with recursive dependency_chain(task_id) as (
      select new.depends_on_task_id
      union
      select td.depends_on_task_id
      from public.task_dependencies td
      join dependency_chain chain on td.task_id = chain.task_id
      where td.workspace_id = new.workspace_id
    )
    select 1 from dependency_chain where task_id = new.task_id
  ) then
    raise exception 'Task dependency would create a cycle';
  end if;

  return new;
end;
$$;

create or replace function public.validate_artifact_version()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  artifact_workspace uuid;
begin
  select workspace_id into artifact_workspace from public.artifacts where id = new.artifact_id;
  if artifact_workspace is null or artifact_workspace <> new.workspace_id then
    raise exception 'Artifact version does not belong to the selected workspace';
  end if;
  new.created_by := coalesce(auth.uid(), new.created_by);
  return new;
end;
$$;

drop trigger if exists tasks_validate_scope on public.tasks;
create trigger tasks_validate_scope before insert or update on public.tasks
for each row execute function public.validate_work_item_scope();

drop trigger if exists artifacts_validate_scope on public.artifacts;
create trigger artifacts_validate_scope before insert or update on public.artifacts
for each row execute function public.validate_work_item_scope();

drop trigger if exists project_decisions_validate_scope on public.project_decisions;
create trigger project_decisions_validate_scope before insert or update on public.project_decisions
for each row execute function public.validate_work_item_scope();

drop trigger if exists error_solutions_validate_scope on public.error_solutions;
create trigger error_solutions_validate_scope before insert or update on public.error_solutions
for each row execute function public.validate_work_item_scope();

drop trigger if exists task_dependencies_validate_scope on public.task_dependencies;
create trigger task_dependencies_validate_scope before insert or update on public.task_dependencies
for each row execute function public.validate_task_dependency();

drop trigger if exists artifact_versions_validate_scope on public.artifact_versions;
create trigger artifact_versions_validate_scope before insert or update on public.artifact_versions
for each row execute function public.validate_artifact_version();

create or replace function public.create_task_record(
  p_workspace_id uuid,
  p_project_id uuid,
  p_title text,
  p_description text,
  p_acceptance_criteria text,
  p_status text,
  p_priority text,
  p_progress smallint,
  p_due_date date,
  p_assigned_agent_id uuid,
  p_conversation_id uuid,
  p_source_message_id uuid,
  p_created_by_agent_id uuid,
  p_dependency_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  created_task_id uuid;
  dependency_id uuid;
begin
  if current_user_id is null or not public.is_workspace_member(p_workspace_id) then
    raise exception 'Authentication required';
  end if;

  insert into public.tasks (
    workspace_id, project_id, title, description, acceptance_criteria, status, priority,
    progress, due_date, assigned_agent_id, conversation_id, source_message_id,
    created_by_agent_id, created_by, updated_by
  ) values (
    p_workspace_id, p_project_id, trim(p_title), coalesce(p_description, ''),
    coalesce(p_acceptance_criteria, ''), p_status, p_priority, p_progress,
    p_due_date, p_assigned_agent_id, p_conversation_id, p_source_message_id,
    p_created_by_agent_id, current_user_id, current_user_id
  ) returning id into created_task_id;

  foreach dependency_id in array coalesce(p_dependency_ids, '{}'::uuid[]) loop
    insert into public.task_dependencies(task_id, depends_on_task_id, workspace_id, created_by)
    values (created_task_id, dependency_id, p_workspace_id, current_user_id);
  end loop;

  return created_task_id;
end;
$$;

create or replace function public.update_task_record(
  p_task_id uuid,
  p_title text,
  p_description text,
  p_acceptance_criteria text,
  p_status text,
  p_priority text,
  p_progress smallint,
  p_due_date date,
  p_assigned_agent_id uuid,
  p_dependency_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_workspace uuid;
  dependency_id uuid;
begin
  select workspace_id into target_workspace from public.tasks where id = p_task_id;
  if current_user_id is null or target_workspace is null or not public.is_workspace_member(target_workspace) then
    raise exception 'Task unavailable';
  end if;

  update public.tasks set
    title = trim(p_title), description = coalesce(p_description, ''),
    acceptance_criteria = coalesce(p_acceptance_criteria, ''), status = p_status,
    priority = p_priority, progress = p_progress, due_date = p_due_date,
    assigned_agent_id = p_assigned_agent_id, updated_by = current_user_id
  where id = p_task_id;

  delete from public.task_dependencies where task_id = p_task_id;
  foreach dependency_id in array coalesce(p_dependency_ids, '{}'::uuid[]) loop
    insert into public.task_dependencies(task_id, depends_on_task_id, workspace_id, created_by)
    values (p_task_id, dependency_id, target_workspace, current_user_id);
  end loop;

  return p_task_id;
end;
$$;

create or replace function public.create_artifact_record(
  p_workspace_id uuid,
  p_project_id uuid,
  p_title text,
  p_artifact_type text,
  p_language text,
  p_file_path text,
  p_content text,
  p_change_summary text,
  p_task_id uuid,
  p_conversation_id uuid,
  p_source_message_id uuid,
  p_created_by_agent_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  created_artifact_id uuid;
  checksum text;
begin
  if current_user_id is null or not public.is_workspace_member(p_workspace_id) then
    raise exception 'Authentication required';
  end if;
  checksum := encode(digest(convert_to(p_content, 'UTF8'), 'sha256'), 'hex');
  insert into public.artifacts (
    workspace_id, project_id, title, artifact_type, language, file_path,
    task_id, conversation_id, source_message_id, created_by_agent_id,
    created_by, updated_by
  ) values (
    p_workspace_id, p_project_id, trim(p_title), p_artifact_type,
    nullif(trim(coalesce(p_language, '')), ''), nullif(trim(coalesce(p_file_path, '')), ''),
    p_task_id, p_conversation_id, p_source_message_id, p_created_by_agent_id,
    current_user_id, current_user_id
  ) returning id into created_artifact_id;

  insert into public.artifact_versions (
    workspace_id, artifact_id, version_number, content, change_summary,
    content_checksum, source_message_id, created_by_agent_id, created_by
  ) values (
    p_workspace_id, created_artifact_id, 1, p_content, coalesce(p_change_summary, ''),
    checksum, p_source_message_id, p_created_by_agent_id, current_user_id
  );
  return created_artifact_id;
end;
$$;

create or replace function public.create_artifact_version(
  p_artifact_id uuid,
  p_content text,
  p_change_summary text,
  p_source_message_id uuid,
  p_created_by_agent_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_workspace uuid;
  next_version integer;
  checksum text;
begin
  select workspace_id, current_version_number + 1 into target_workspace, next_version
  from public.artifacts where id = p_artifact_id for update;
  if current_user_id is null or target_workspace is null or not public.is_workspace_member(target_workspace) then
    raise exception 'Artifact unavailable';
  end if;
  checksum := encode(digest(convert_to(p_content, 'UTF8'), 'sha256'), 'hex');
  insert into public.artifact_versions (
    workspace_id, artifact_id, version_number, content, change_summary,
    content_checksum, source_message_id, created_by_agent_id, created_by
  ) values (
    target_workspace, p_artifact_id, next_version, p_content, coalesce(p_change_summary, ''),
    checksum, p_source_message_id, p_created_by_agent_id, current_user_id
  );
  update public.artifacts set
    current_version_number = next_version,
    status = 'draft',
    review_note = '',
    updated_by = current_user_id
  where id = p_artifact_id;
  return next_version;
end;
$$;

create or replace function public.audit_work_item_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  event_action text;
  entity_name text := tg_table_name;
begin
  if tg_op = 'INSERT' then
    event_action := rtrim(entity_name, 's') || '.created';
  elsif old.status is distinct from new.status then
    event_action := rtrim(entity_name, 's') || '.' || new.status;
  else
    event_action := rtrim(entity_name, 's') || '.updated';
  end if;
  insert into public.audit_logs(workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    new.workspace_id, auth.uid(), event_action, rtrim(entity_name, 's'), new.id,
    jsonb_build_object('project_id', new.project_id, 'title', new.title, 'status', new.status)
  );
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['tasks','artifacts','project_decisions','error_solutions'] loop
    execute format('drop trigger if exists %I_audit_change on public.%I', table_name, table_name);
    execute format('create trigger %I_audit_change after insert or update on public.%I for each row execute function public.audit_work_item_change()', table_name, table_name);
  end loop;
end $$;

alter table public.tasks enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.artifacts enable row level security;
alter table public.artifact_versions enable row level security;
alter table public.project_decisions enable row level security;
alter table public.error_solutions enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['tasks','task_dependencies','artifacts','artifact_versions','project_decisions','error_solutions'] loop
    execute format('drop policy if exists "%s_select_member" on public.%I', table_name, table_name);
    execute format('create policy "%s_select_member" on public.%I for select to authenticated using (public.is_workspace_member(workspace_id))', table_name, table_name);
    execute format('drop policy if exists "%s_insert_member" on public.%I', table_name, table_name);
    execute format('create policy "%s_insert_member" on public.%I for insert to authenticated with check (public.is_workspace_member(workspace_id) and created_by = auth.uid())', table_name, table_name);
  end loop;
end $$;

-- task_dependencies and artifact_versions have created_by but no updated_by.
drop policy if exists "tasks_update_member" on public.tasks;
create policy "tasks_update_member" on public.tasks for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id) and updated_by = auth.uid());

drop policy if exists "artifacts_update_member" on public.artifacts;
create policy "artifacts_update_member" on public.artifacts for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id) and updated_by = auth.uid());

drop policy if exists "project_decisions_update_member" on public.project_decisions;
create policy "project_decisions_update_member" on public.project_decisions for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id) and updated_by = auth.uid());

drop policy if exists "error_solutions_update_member" on public.error_solutions;
create policy "error_solutions_update_member" on public.error_solutions for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id) and updated_by = auth.uid());

drop policy if exists "task_dependencies_delete_member" on public.task_dependencies;
create policy "task_dependencies_delete_member" on public.task_dependencies for delete to authenticated
using (public.is_workspace_member(workspace_id));

grant select, insert, update on public.tasks to authenticated;
grant select, insert, delete on public.task_dependencies to authenticated;
grant select, insert, update on public.artifacts to authenticated;
grant select, insert on public.artifact_versions to authenticated;
grant select, insert, update on public.project_decisions to authenticated;
grant select, insert, update on public.error_solutions to authenticated;

revoke all on function public.create_task_record(uuid,uuid,text,text,text,text,text,smallint,date,uuid,uuid,uuid,uuid,uuid[]) from public;
grant execute on function public.create_task_record(uuid,uuid,text,text,text,text,text,smallint,date,uuid,uuid,uuid,uuid,uuid[]) to authenticated;
revoke all on function public.update_task_record(uuid,text,text,text,text,text,smallint,date,uuid,uuid[]) from public;
grant execute on function public.update_task_record(uuid,text,text,text,text,text,smallint,date,uuid,uuid[]) to authenticated;
revoke all on function public.create_artifact_record(uuid,uuid,text,text,text,text,text,text,uuid,uuid,uuid,uuid) from public;
grant execute on function public.create_artifact_record(uuid,uuid,text,text,text,text,text,text,uuid,uuid,uuid,uuid) to authenticated;
revoke all on function public.create_artifact_version(uuid,text,text,uuid,uuid) from public;
grant execute on function public.create_artifact_version(uuid,text,text,uuid,uuid) to authenticated;

commit;

begin;

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  role text not null default 'custom',
  agent_kind text not null default 'custom',
  scope text not null default 'global',
  icon text not null default 'bot',
  color text not null default '#55e6c1',
  avatar_url text,
  instructions text not null,
  preferred_model_key text,
  alternative_model_keys text[] not null default '{}',
  creativity smallint not null default 20,
  memory_enabled boolean not null default true,
  allowed_tools text[] not null default '{}',
  escalation_rules text not null default '',
  status text not null default 'active',
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint agents_name_length
    check (char_length(trim(name)) between 2 and 100),
  constraint agents_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint agents_description_length
    check (char_length(description) <= 1800),
  constraint agents_role_allowed
    check (
      role in (
        'orchestrator',
        'design',
        'frontend',
        'backend',
        'commerce',
        'debugging',
        'architecture',
        'qa',
        'custom'
      )
    ),
  constraint agents_kind_allowed
    check (agent_kind in ('system', 'custom')),
  constraint agents_scope_allowed
    check (scope in ('global', 'project')),
  constraint agents_icon_allowed
    check (
      icon in (
        'network',
        'palette',
        'code-2',
        'server-cog',
        'shopping-bag',
        'bug',
        'blocks-3',
        'shield-check',
        'bot',
        'sparkles',
        'database',
        'search-code'
      )
    ),
  constraint agents_color_format
    check (color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint agents_avatar_url_valid
    check (
      avatar_url is null
      or (
        char_length(avatar_url) <= 500
        and avatar_url ~* '^https?://'
      )
    ),
  constraint agents_instructions_length
    check (char_length(trim(instructions)) between 20 and 15000),
  constraint agents_preferred_model_key_length
    check (
      preferred_model_key is null
      or char_length(preferred_model_key) <= 150
    ),
  constraint agents_alternative_models_count
    check (cardinality(alternative_model_keys) <= 5),
  constraint agents_creativity_range
    check (creativity between 0 and 100),
  constraint agents_allowed_tools_values
    check (
      allowed_tools <@ array[
        'search_project_files',
        'read_files',
        'create_artifacts',
        'consult_memory',
        'save_memory',
        'analyze_errors',
        'compare_versions',
        'search_documentation',
        'query_database',
        'generate_sql',
        'analyze_images',
        'create_tasks',
        'handoff_task',
        'request_review',
        'register_decision'
      ]::text[]
    ),
  constraint agents_escalation_rules_length
    check (char_length(escalation_rules) <= 5000),
  constraint agents_status_allowed
    check (status in ('active', 'inactive', 'archived'))
);

create unique index if not exists agents_workspace_slug_uidx
  on public.agents(workspace_id, slug);

create index if not exists agents_workspace_status_idx
  on public.agents(workspace_id, status, updated_at desc);

create index if not exists agents_workspace_role_idx
  on public.agents(workspace_id, role, status);

create table if not exists public.agent_technologies (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  technology_id uuid not null references public.technologies(id) on delete restrict,
  proficiency smallint not null default 3,
  is_primary boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (agent_id, technology_id),
  constraint agent_technologies_proficiency_range
    check (proficiency between 1 and 5)
);

create index if not exists agent_technologies_workspace_idx
  on public.agent_technologies(workspace_id, agent_id);

create index if not exists agent_technologies_technology_idx
  on public.agent_technologies(workspace_id, technology_id);

create table if not exists public.agent_collaborators (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_agent_id uuid not null references public.agents(id) on delete cascade,
  target_agent_id uuid not null references public.agents(id) on delete cascade,
  enabled boolean not null default true,
  notes text not null default '',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source_agent_id, target_agent_id),
  constraint agent_collaborators_not_self
    check (source_agent_id <> target_agent_id),
  constraint agent_collaborators_notes_length
    check (char_length(notes) <= 1200)
);

create index if not exists agent_collaborators_workspace_idx
  on public.agent_collaborators(workspace_id, source_agent_id);

create table if not exists public.project_agents (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  is_lead boolean not null default false,
  status text not null default 'active',
  assignment_reason text not null default '',
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (project_id, agent_id),
  constraint project_agents_status_allowed
    check (status in ('active', 'inactive')),
  constraint project_agents_reason_length
    check (char_length(assignment_reason) <= 1200)
);

create index if not exists project_agents_workspace_idx
  on public.project_agents(workspace_id, project_id, status);

create index if not exists project_agents_agent_idx
  on public.project_agents(workspace_id, agent_id, status);

create unique index if not exists project_agents_single_active_lead_uidx
  on public.project_agents(project_id)
  where is_lead = true and status = 'active';

create or replace function public.prepare_agent_record()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.name := trim(new.name);
  new.slug := public.slugify_text(coalesce(nullif(trim(new.slug), ''), new.name));

  if new.slug = '' then
    new.slug := 'agent-' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  new.description := trim(coalesce(new.description, ''));
  new.avatar_url := nullif(trim(coalesce(new.avatar_url, '')), '');
  new.instructions := trim(coalesce(new.instructions, ''));
  new.preferred_model_key := nullif(trim(coalesce(new.preferred_model_key, '')), '');
  new.alternative_model_keys := coalesce(new.alternative_model_keys, '{}'::text[]);
  new.allowed_tools := coalesce(new.allowed_tools, '{}'::text[]);
  new.escalation_rules := trim(coalesce(new.escalation_rules, ''));
  new.updated_at := now();

  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  else
    if new.workspace_id <> old.workspace_id then
      raise exception 'Agent cannot be moved to another workspace';
    end if;

    new.agent_kind := old.agent_kind;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;

  if new.status = 'archived' and new.archived_at is null then
    new.archived_at := now();
  elsif new.status <> 'archived' then
    new.archived_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists agents_prepare_record on public.agents;
create trigger agents_prepare_record
before insert or update on public.agents
for each row execute function public.prepare_agent_record();

drop trigger if exists agent_technologies_set_updated_at
  on public.agent_technologies;
create trigger agent_technologies_set_updated_at
before update on public.agent_technologies
for each row execute function public.set_updated_at();

drop trigger if exists agent_collaborators_set_updated_at
  on public.agent_collaborators;
create trigger agent_collaborators_set_updated_at
before update on public.agent_collaborators
for each row execute function public.set_updated_at();

drop trigger if exists project_agents_set_updated_at
  on public.project_agents;
create trigger project_agents_set_updated_at
before update on public.project_agents
for each row execute function public.set_updated_at();

create or replace function public.validate_agent_technology_workspace()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  agent_workspace_id uuid;
  technology_workspace_id uuid;
  technology_status text;
begin
  select workspace_id
  into agent_workspace_id
  from public.agents
  where id = new.agent_id;

  select workspace_id, status
  into technology_workspace_id, technology_status
  from public.technologies
  where id = new.technology_id;

  if agent_workspace_id is null or technology_workspace_id is null then
    raise exception 'Agent technology references an unavailable record';
  end if;

  if agent_workspace_id <> new.workspace_id
    or technology_workspace_id <> new.workspace_id then
    raise exception 'Agent technologies cannot cross workspace boundaries';
  end if;

  if technology_status = 'archived' then
    raise exception 'Archived technologies cannot be assigned to agents';
  end if;

  return new;
end;
$$;

drop trigger if exists agent_technologies_validate_workspace
  on public.agent_technologies;
create trigger agent_technologies_validate_workspace
before insert or update on public.agent_technologies
for each row execute function public.validate_agent_technology_workspace();

create or replace function public.validate_agent_collaborator_workspace()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  source_workspace_id uuid;
  target_workspace_id uuid;
  target_status text;
begin
  select workspace_id
  into source_workspace_id
  from public.agents
  where id = new.source_agent_id;

  select workspace_id, status
  into target_workspace_id, target_status
  from public.agents
  where id = new.target_agent_id;

  if source_workspace_id is null or target_workspace_id is null then
    raise exception 'Agent collaborator references an unavailable record';
  end if;

  if source_workspace_id <> new.workspace_id
    or target_workspace_id <> new.workspace_id then
    raise exception 'Agent collaborators cannot cross workspace boundaries';
  end if;

  if target_status = 'archived' then
    raise exception 'Archived agents cannot be collaborators';
  end if;

  return new;
end;
$$;

drop trigger if exists agent_collaborators_validate_workspace
  on public.agent_collaborators;
create trigger agent_collaborators_validate_workspace
before insert or update on public.agent_collaborators
for each row execute function public.validate_agent_collaborator_workspace();

create or replace function public.validate_project_agent_workspace()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  project_workspace_id uuid;
  project_status text;
  agent_workspace_id uuid;
  agent_status text;
begin
  select workspace_id, status
  into project_workspace_id, project_status
  from public.projects
  where id = new.project_id;

  select workspace_id, status
  into agent_workspace_id, agent_status
  from public.agents
  where id = new.agent_id;

  if project_workspace_id is null or agent_workspace_id is null then
    raise exception 'Project agent references an unavailable record';
  end if;

  if project_workspace_id <> new.workspace_id
    or agent_workspace_id <> new.workspace_id then
    raise exception 'Project agents cannot cross workspace boundaries';
  end if;

  if new.status = 'active' and project_status = 'archived' then
    raise exception 'Archived projects cannot receive active agents';
  end if;

  if new.status = 'active' and agent_status <> 'active' then
    raise exception 'Only active agents can be assigned to projects';
  end if;

  return new;
end;
$$;

drop trigger if exists project_agents_validate_workspace
  on public.project_agents;
create trigger project_agents_validate_workspace
before insert or update on public.project_agents
for each row execute function public.validate_project_agent_workspace();

create or replace function public.deactivate_archived_agent_assignments()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status <> 'archived' and new.status = 'archived' then
    update public.project_agents
    set
      status = 'inactive',
      is_lead = false,
      updated_by = coalesce(auth.uid(), new.updated_by)
    where agent_id = new.id
      and status = 'active';
  end if;

  return new;
end;
$$;

drop trigger if exists agents_deactivate_assignments on public.agents;
create trigger agents_deactivate_assignments
after update of status on public.agents
for each row execute function public.deactivate_archived_agent_assignments();

create or replace function public.audit_agent_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  event_action text;
begin
  if tg_op = 'INSERT' then
    event_action := 'agent.created';
  elsif old.status <> new.status and new.status = 'archived' then
    event_action := 'agent.archived';
  elsif old.status = 'archived' and new.status <> 'archived' then
    event_action := 'agent.restored';
  elsif old.status <> new.status and new.status = 'inactive' then
    event_action := 'agent.deactivated';
  elsif old.status <> new.status and new.status = 'active' then
    event_action := 'agent.activated';
  else
    event_action := 'agent.updated';
  end if;

  insert into public.audit_logs (
    workspace_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    new.workspace_id,
    auth.uid(),
    event_action,
    'agent',
    new.id,
    jsonb_build_object(
      'name', new.name,
      'role', new.role,
      'status', new.status,
      'kind', new.agent_kind
    )
  );

  return new;
end;
$$;

drop trigger if exists agents_audit_change on public.agents;
create trigger agents_audit_change
after insert or update on public.agents
for each row execute function public.audit_agent_change();

create or replace function public.audit_project_agent_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  row_workspace_id uuid;
  row_project_id uuid;
  row_agent_id uuid;
  event_action text;
begin
  if tg_op = 'DELETE' then
    row_workspace_id := old.workspace_id;
    row_project_id := old.project_id;
    row_agent_id := old.agent_id;
    event_action := 'project.agent_removed';
  else
    row_workspace_id := new.workspace_id;
    row_project_id := new.project_id;
    row_agent_id := new.agent_id;
    event_action := case
      when tg_op = 'INSERT' then 'project.agent_assigned'
      when old.status <> new.status and new.status = 'inactive'
        then 'project.agent_deactivated'
      else 'project.agent_updated'
    end;
  end if;

  insert into public.audit_logs (
    workspace_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    row_workspace_id,
    auth.uid(),
    event_action,
    'project',
    row_project_id,
    jsonb_build_object('agent_id', row_agent_id)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists project_agents_audit_change on public.project_agents;
create trigger project_agents_audit_change
after insert or update or delete on public.project_agents
for each row execute function public.audit_project_agent_change();

create or replace function public.validate_agent_relation_ids(
  target_workspace_id uuid,
  technology_ids uuid[],
  collaborator_ids uuid[],
  excluded_agent_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_technologies integer := coalesce(cardinality(technology_ids), 0);
  requested_collaborators integer := coalesce(cardinality(collaborator_ids), 0);
  available_count integer;
begin
  if requested_technologies > 30 then
    raise exception 'An agent cannot contain more than 30 technologies';
  end if;

  if requested_collaborators > 20 then
    raise exception 'An agent cannot contain more than 20 collaborators';
  end if;

  if requested_technologies <> (
    select count(distinct selected.id)
    from unnest(coalesce(technology_ids, '{}'::uuid[])) as selected(id)
  ) then
    raise exception 'Agent technology selection contains duplicates';
  end if;

  if requested_collaborators <> (
    select count(distinct selected.id)
    from unnest(coalesce(collaborator_ids, '{}'::uuid[])) as selected(id)
  ) then
    raise exception 'Agent collaborator selection contains duplicates';
  end if;

  if excluded_agent_id is not null
    and excluded_agent_id = any(coalesce(collaborator_ids, '{}'::uuid[])) then
    raise exception 'An agent cannot collaborate with itself';
  end if;

  if requested_technologies > 0 then
    select count(*)
    into available_count
    from public.technologies
    where workspace_id = target_workspace_id
      and id = any(technology_ids)
      and status <> 'archived';

    if available_count <> requested_technologies then
      raise exception 'One or more agent technologies are unavailable';
    end if;
  end if;

  if requested_collaborators > 0 then
    select count(*)
    into available_count
    from public.agents
    where workspace_id = target_workspace_id
      and id = any(collaborator_ids)
      and status <> 'archived';

    if available_count <> requested_collaborators then
      raise exception 'One or more agent collaborators are unavailable';
    end if;
  end if;
end;
$$;

create or replace function public.create_agent_record(
  p_workspace_id uuid,
  p_name text,
  p_description text,
  p_role text,
  p_scope text,
  p_icon text,
  p_color text,
  p_avatar_url text,
  p_instructions text,
  p_preferred_model_key text,
  p_alternative_model_keys text[],
  p_creativity smallint,
  p_memory_enabled boolean,
  p_allowed_tools text[],
  p_escalation_rules text,
  p_status text,
  p_technology_ids uuid[],
  p_collaborator_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  created_agent_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.has_workspace_role(
    p_workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  ) then
    raise exception 'Insufficient agent permissions';
  end if;

  perform public.validate_agent_relation_ids(
    p_workspace_id,
    coalesce(p_technology_ids, '{}'::uuid[]),
    coalesce(p_collaborator_ids, '{}'::uuid[]),
    null
  );

  insert into public.agents (
    workspace_id,
    name,
    slug,
    description,
    role,
    agent_kind,
    scope,
    icon,
    color,
    avatar_url,
    instructions,
    preferred_model_key,
    alternative_model_keys,
    creativity,
    memory_enabled,
    allowed_tools,
    escalation_rules,
    status,
    created_by,
    updated_by
  )
  values (
    p_workspace_id,
    p_name,
    p_name,
    p_description,
    p_role,
    'custom',
    p_scope,
    p_icon,
    p_color,
    p_avatar_url,
    p_instructions,
    p_preferred_model_key,
    coalesce(p_alternative_model_keys, '{}'::text[]),
    p_creativity,
    p_memory_enabled,
    coalesce(p_allowed_tools, '{}'::text[]),
    p_escalation_rules,
    p_status,
    current_user_id,
    current_user_id
  )
  returning id into created_agent_id;

  insert into public.agent_technologies (
    workspace_id,
    agent_id,
    technology_id,
    proficiency,
    is_primary,
    created_by
  )
  select
    p_workspace_id,
    created_agent_id,
    selected.id,
    4,
    false,
    current_user_id
  from unnest(coalesce(p_technology_ids, '{}'::uuid[])) as selected(id);

  insert into public.agent_collaborators (
    workspace_id,
    source_agent_id,
    target_agent_id,
    created_by
  )
  select
    p_workspace_id,
    created_agent_id,
    selected.id,
    current_user_id
  from unnest(coalesce(p_collaborator_ids, '{}'::uuid[])) as selected(id);

  return created_agent_id;
end;
$$;

create or replace function public.update_agent_record(
  p_agent_id uuid,
  p_name text,
  p_description text,
  p_role text,
  p_scope text,
  p_icon text,
  p_color text,
  p_avatar_url text,
  p_instructions text,
  p_preferred_model_key text,
  p_alternative_model_keys text[],
  p_creativity smallint,
  p_memory_enabled boolean,
  p_allowed_tools text[],
  p_escalation_rules text,
  p_status text,
  p_technology_ids uuid[],
  p_collaborator_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_workspace_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select workspace_id
  into target_workspace_id
  from public.agents
  where id = p_agent_id;

  if target_workspace_id is null then
    raise exception 'Agent not found';
  end if;

  if not public.has_workspace_role(
    target_workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  ) then
    raise exception 'Insufficient agent permissions';
  end if;

  perform public.validate_agent_relation_ids(
    target_workspace_id,
    coalesce(p_technology_ids, '{}'::uuid[]),
    coalesce(p_collaborator_ids, '{}'::uuid[]),
    p_agent_id
  );

  update public.agents
  set
    name = p_name,
    slug = p_name,
    description = p_description,
    role = p_role,
    scope = p_scope,
    icon = p_icon,
    color = p_color,
    avatar_url = p_avatar_url,
    instructions = p_instructions,
    preferred_model_key = p_preferred_model_key,
    alternative_model_keys = coalesce(p_alternative_model_keys, '{}'::text[]),
    creativity = p_creativity,
    memory_enabled = p_memory_enabled,
    allowed_tools = coalesce(p_allowed_tools, '{}'::text[]),
    escalation_rules = p_escalation_rules,
    status = p_status,
    updated_by = current_user_id
  where id = p_agent_id;

  delete from public.agent_technologies
  where agent_id = p_agent_id
    and not (
      technology_id = any(coalesce(p_technology_ids, '{}'::uuid[]))
    );

  insert into public.agent_technologies (
    workspace_id,
    agent_id,
    technology_id,
    proficiency,
    is_primary,
    created_by
  )
  select
    target_workspace_id,
    p_agent_id,
    selected.id,
    4,
    false,
    current_user_id
  from unnest(coalesce(p_technology_ids, '{}'::uuid[])) as selected(id)
  on conflict (agent_id, technology_id) do nothing;

  delete from public.agent_collaborators
  where source_agent_id = p_agent_id
    and not (
      target_agent_id = any(coalesce(p_collaborator_ids, '{}'::uuid[]))
    );

  insert into public.agent_collaborators (
    workspace_id,
    source_agent_id,
    target_agent_id,
    created_by
  )
  select
    target_workspace_id,
    p_agent_id,
    selected.id,
    current_user_id
  from unnest(coalesce(p_collaborator_ids, '{}'::uuid[])) as selected(id)
  on conflict (source_agent_id, target_agent_id)
  do update set enabled = true;

  return p_agent_id;
end;
$$;

create or replace function public.assign_project_agent(
  p_project_id uuid,
  p_agent_id uuid,
  p_is_lead boolean,
  p_assignment_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_workspace_id uuid;
  agent_workspace_id uuid;
  agent_status text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select workspace_id
  into target_workspace_id
  from public.projects
  where id = p_project_id
    and status <> 'archived';

  select workspace_id, status
  into agent_workspace_id, agent_status
  from public.agents
  where id = p_agent_id;

  if target_workspace_id is null or agent_workspace_id is null then
    raise exception 'Project or agent not found';
  end if;

  if target_workspace_id <> agent_workspace_id or agent_status <> 'active' then
    raise exception 'Project agent is unavailable';
  end if;

  if not public.has_workspace_role(
    target_workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  ) then
    raise exception 'Insufficient project agent permissions';
  end if;

  if p_is_lead then
    update public.project_agents
    set
      is_lead = false,
      updated_by = current_user_id
    where project_id = p_project_id
      and is_lead = true;
  end if;

  insert into public.project_agents (
    workspace_id,
    project_id,
    agent_id,
    is_lead,
    status,
    assignment_reason,
    assigned_by,
    updated_by
  )
  values (
    target_workspace_id,
    p_project_id,
    p_agent_id,
    coalesce(p_is_lead, false),
    'active',
    trim(coalesce(p_assignment_reason, '')),
    current_user_id,
    current_user_id
  )
  on conflict (project_id, agent_id)
  do update set
    is_lead = excluded.is_lead,
    status = 'active',
    assignment_reason = excluded.assignment_reason,
    updated_by = current_user_id;

  return p_agent_id;
end;
$$;

create or replace function public.remove_project_agent(
  p_project_id uuid,
  p_agent_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_workspace_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select workspace_id
  into target_workspace_id
  from public.projects
  where id = p_project_id;

  if target_workspace_id is null then
    raise exception 'Project not found';
  end if;

  if not public.has_workspace_role(
    target_workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  ) then
    raise exception 'Insufficient project agent permissions';
  end if;

  delete from public.project_agents
  where project_id = p_project_id
    and agent_id = p_agent_id;

  return p_agent_id;
end;
$$;

create or replace function public.assign_project_agents(
  p_project_id uuid,
  p_agent_ids uuid[],
  p_assignment_reason text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_workspace_id uuid;
  requested_count integer := coalesce(cardinality(p_agent_ids), 0);
  available_count integer;
  existing_count integer;
  lead_agent_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if requested_count = 0 or requested_count > 12 then
    raise exception 'Suggested team must contain between 1 and 12 agents';
  end if;

  if requested_count <> (
    select count(distinct selected.id)
    from unnest(p_agent_ids) as selected(id)
  ) then
    raise exception 'Suggested team contains duplicate agents';
  end if;

  select workspace_id
  into target_workspace_id
  from public.projects
  where id = p_project_id
    and status <> 'archived';

  if target_workspace_id is null then
    raise exception 'Project not found';
  end if;

  if not public.has_workspace_role(
    target_workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  ) then
    raise exception 'Insufficient project agent permissions';
  end if;

  select count(*)
  into available_count
  from public.agents
  where workspace_id = target_workspace_id
    and id = any(p_agent_ids)
    and status = 'active';

  if available_count <> requested_count then
    raise exception 'One or more suggested agents are unavailable';
  end if;

  select count(*)
  into existing_count
  from public.project_agents
  where project_id = p_project_id
    and agent_id = any(p_agent_ids)
    and status = 'active';

  insert into public.project_agents (
    workspace_id,
    project_id,
    agent_id,
    is_lead,
    status,
    assignment_reason,
    assigned_by,
    updated_by
  )
  select
    target_workspace_id,
    p_project_id,
    selected.id,
    false,
    'active',
    trim(coalesce(p_assignment_reason, '')),
    current_user_id,
    current_user_id
  from unnest(p_agent_ids) as selected(id)
  on conflict (project_id, agent_id)
  do update set
    status = 'active',
    assignment_reason = excluded.assignment_reason,
    updated_by = current_user_id;

  if not exists (
    select 1
    from public.project_agents
    where project_id = p_project_id
      and status = 'active'
      and is_lead = true
  ) then
    select id
    into lead_agent_id
    from public.agents
    where workspace_id = target_workspace_id
      and id = any(p_agent_ids)
      and role = 'orchestrator'
      and status = 'active'
    order by created_at
    limit 1;

    if lead_agent_id is not null then
      update public.project_agents
      set
        is_lead = true,
        updated_by = current_user_id
      where project_id = p_project_id
        and agent_id = lead_agent_id;
    end if;
  end if;

  return greatest(requested_count - existing_count, 0);
end;
$$;

create or replace function public.sync_system_agent_technologies(
  p_workspace_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.agent_technologies as agent_technology
  using public.agents as agent, public.technologies as technology
  where agent_technology.agent_id = agent.id
    and agent_technology.technology_id = technology.id
    and agent.agent_kind = 'system'
    and agent.workspace_id = p_workspace_id
    and technology.workspace_id = p_workspace_id
    and technology.status = 'archived';

  insert into public.agent_technologies (
    workspace_id,
    agent_id,
    technology_id,
    proficiency,
    is_primary,
    created_by
  )
  select
    p_workspace_id,
    agent.id,
    technology.id,
    case
      when agent.role in ('frontend', 'backend', 'commerce') then 5
      when agent.role in ('design', 'debugging', 'architecture') then 4
      else 3
    end,
    agent.role in ('frontend', 'backend', 'commerce'),
    p_actor_id
  from public.agents as agent
  cross join public.technologies as technology
  where agent.workspace_id = p_workspace_id
    and agent.agent_kind = 'system'
    and technology.workspace_id = p_workspace_id
    and technology.status <> 'archived'
    and (
      agent.role in ('orchestrator', 'debugging', 'architecture', 'qa')
      or (
        agent.role = 'design'
        and (
          technology.category = 'design'
          or lower(technology.name) ~ '(react|next|css|html|tailwind|elementor|figma|ui|ux)'
        )
      )
      or (
        agent.role = 'frontend'
        and lower(technology.name) ~ '(react|next|javascript|typescript|html|css|tailwind|vue|angular|svelte|vite)'
      )
      or (
        agent.role = 'backend'
        and (
          technology.category in ('database', 'api', 'infrastructure')
          or lower(technology.name) ~ '(node|php|laravel|python|java|ruby|sql|supabase|postgres|mysql|redis|api)'
        )
      )
      or (
        agent.role = 'commerce'
        and (
          technology.category in ('cms', 'ecommerce')
          or lower(technology.name) ~ '(shopify|liquid|wordpress|woocommerce|elementor|storefront|checkout)'
        )
      )
    )
  on conflict (agent_id, technology_id) do nothing;
end;
$$;

create or replace function public.seed_default_agents_for_workspace(
  p_workspace_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.agents (
    workspace_id,
    name,
    slug,
    description,
    role,
    agent_kind,
    scope,
    icon,
    color,
    instructions,
    creativity,
    memory_enabled,
    allowed_tools,
    escalation_rules,
    status,
    created_by,
    updated_by
  )
  values
    (
      p_workspace_id,
      'Nexus Orchestrator',
      'nexus-orchestrator',
      'Coordina solicitudes, selecciona especialistas, evita trabajo duplicado y consolida resultados.',
      'orchestrator',
      'system',
      'global',
      'network',
      '#55e6c1',
      'Interpreta la solicitud, clasifica la tarea y crea un plan operativo breve. Selecciona únicamente los agentes necesarios, limita los handoffs y consolida una entrega verificable. Solicita aprobación humana antes de acciones sensibles y nunca expongas cadenas privadas de pensamiento.',
      20,
      true,
      array['search_project_files', 'read_files', 'consult_memory', 'create_tasks', 'handoff_task', 'request_review', 'register_decision'],
      'Detén la ejecución cuando falte contexto crítico, exista una contradicción no resuelta o se alcance el límite operativo.',
      'active',
      p_actor_id,
      p_actor_id
    ),
    (
      p_workspace_id,
      'Astra UI',
      'astra-ui',
      'Diseña interfaces originales, accesibles, responsive y coherentes con el producto.',
      'design',
      'system',
      'global',
      'palette',
      '#9b8cff',
      'Analiza el producto y la intención visual antes de diseñar. Propón jerarquía, sistema de componentes y comportamiento responsive. Evita plantillas genéricas, texto excesivamente grande, efectos sin propósito y código visual desconectado del contexto existente.',
      58,
      true,
      array['read_files', 'create_artifacts', 'analyze_images', 'compare_versions', 'request_review'],
      'Solicita revisión cuando una decisión visual afecte accesibilidad, navegación crítica o identidad de marca.',
      'active',
      p_actor_id,
      p_actor_id
    ),
    (
      p_workspace_id,
      'Forge Frontend',
      'forge-frontend',
      'Implementa interfaces con React, Next.js, TypeScript, CSS y componentes reutilizables.',
      'frontend',
      'system',
      'global',
      'code-2',
      '#49c6f2',
      'Revisa los archivos existentes antes de modificar código. Mantén TypeScript estricto, accesibilidad y responsive design. Entrega archivos completos cuando sean modificados, explica riesgos y proporciona pasos concretos de validación.',
      30,
      true,
      array['search_project_files', 'read_files', 'create_artifacts', 'compare_versions', 'search_documentation', 'handoff_task', 'request_review'],
      'Escala cambios de autenticación, pagos, permisos o arquitectura al agente correspondiente antes de implementarlos.',
      'active',
      p_actor_id,
      p_actor_id
    ),
    (
      p_workspace_id,
      'Core Backend',
      'core-backend',
      'Especialista en APIs, Supabase, PostgreSQL, autenticación, seguridad e integraciones.',
      'backend',
      'system',
      'global',
      'server-cog',
      '#39d8a0',
      'Diseña servicios seguros, valida entradas en servidor y protege los datos mediante autorización explícita. Revisa RLS, transacciones, restricciones e índices. No expongas secretos y documenta migraciones, variables requeridas y pruebas de integración.',
      18,
      true,
      array['search_project_files', 'read_files', 'create_artifacts', 'query_database', 'generate_sql', 'search_documentation', 'register_decision', 'request_review'],
      'Exige aprobación humana antes de operaciones destructivas, cambios de producción o manipulación de credenciales.',
      'active',
      p_actor_id,
      p_actor_id
    ),
    (
      p_workspace_id,
      'Commerce Specialist',
      'commerce-specialist',
      'Especialista en Shopify, Liquid, WordPress, WooCommerce, Elementor y comercio electrónico.',
      'commerce',
      'system',
      'global',
      'shopping-bag',
      '#f2b84b',
      'Trabaja sobre la estructura real del tema, plugin o app. Respeta inventario, catálogos, checkout, metafields, hooks y limitaciones de la plataforma. Evita inventar archivos no proporcionados y entrega código completo cuando modifiques plantillas o componentes.',
      28,
      true,
      array['search_project_files', 'read_files', 'create_artifacts', 'compare_versions', 'search_documentation', 'analyze_errors', 'request_review'],
      'Escala cualquier cambio que pueda afectar pagos, pedidos, clientes, inventario o checkout.',
      'active',
      p_actor_id,
      p_actor_id
    ),
    (
      p_workspace_id,
      'Trace Debugger',
      'trace-debugger',
      'Encuentra causas raíz en errores, logs y comportamientos inesperados.',
      'debugging',
      'system',
      'global',
      'bug',
      '#fb7185',
      'Reproduce mentalmente el flujo, identifica la causa raíz y evita parches superficiales. Solicita los archivos estrictamente necesarios, propone la corrección mínima segura y prepara una lista de pruebas para detectar efectos secundarios y regresiones.',
      12,
      true,
      array['search_project_files', 'read_files', 'analyze_errors', 'compare_versions', 'search_documentation', 'create_tasks', 'save_memory', 'request_review'],
      'Escala cuando el error implique seguridad, pérdida de datos, producción o múltiples módulos sin una causa verificable.',
      'active',
      p_actor_id,
      p_actor_id
    ),
    (
      p_workspace_id,
      'Atlas Architect',
      'atlas-architect',
      'Define módulos, integraciones, decisiones técnicas, seguridad y escalabilidad.',
      'architecture',
      'system',
      'global',
      'blocks-3',
      '#818cf8',
      'Evalúa el sistema completo antes de proponer cambios estructurales. Reduce acoplamiento, define límites de módulo, registra decisiones y considera seguridad, rendimiento, mantenibilidad, costos y estrategia de evolución.',
      15,
      true,
      array['search_project_files', 'read_files', 'create_artifacts', 'compare_versions', 'consult_memory', 'create_tasks', 'register_decision', 'request_review'],
      'Solicita validación humana cuando una decisión cambie el stack, el modelo de datos, los proveedores o la estrategia de despliegue.',
      'active',
      p_actor_id,
      p_actor_id
    ),
    (
      p_workspace_id,
      'Sentinel QA',
      'sentinel-qa',
      'Diseña casos de prueba, criterios de aceptación y revisiones de regresión y accesibilidad.',
      'qa',
      'system',
      'global',
      'shield-check',
      '#35d399',
      'Convierte requisitos en pruebas observables. Revisa flujos críticos, estados vacíos, errores, responsive, accesibilidad y permisos. Distingue claramente entre pruebas ejecutadas y pruebas propuestas.',
      10,
      true,
      array['search_project_files', 'read_files', 'compare_versions', 'create_artifacts', 'create_tasks', 'request_review'],
      'Bloquea la aprobación cuando falten criterios de aceptación, existan regresiones críticas o las pruebas no sean reproducibles.',
      'active',
      p_actor_id,
      p_actor_id
    )
  on conflict (workspace_id, slug) do nothing;

  perform public.sync_system_agent_technologies(p_workspace_id, p_actor_id);

  insert into public.agent_collaborators (
    workspace_id,
    source_agent_id,
    target_agent_id,
    created_by
  )
  select
    p_workspace_id,
    source_agent.id,
    target_agent.id,
    p_actor_id
  from public.agents as source_agent
  join public.agents as target_agent
    on target_agent.workspace_id = source_agent.workspace_id
    and target_agent.id <> source_agent.id
  where source_agent.workspace_id = p_workspace_id
    and source_agent.agent_kind = 'system'
    and target_agent.agent_kind = 'system'
    and (
      source_agent.role = 'orchestrator'
      or target_agent.role = 'orchestrator'
      or (source_agent.role = 'design' and target_agent.role = 'frontend')
      or (source_agent.role = 'frontend' and target_agent.role in ('design', 'backend', 'commerce', 'qa'))
      or (source_agent.role = 'backend' and target_agent.role in ('frontend', 'architecture', 'qa'))
      or (source_agent.role = 'commerce' and target_agent.role in ('frontend', 'debugging', 'qa'))
      or (source_agent.role = 'debugging' and target_agent.role in ('frontend', 'backend', 'commerce', 'qa'))
      or (source_agent.role = 'architecture' and target_agent.role in ('frontend', 'backend', 'qa'))
      or (source_agent.role = 'qa' and target_agent.role in ('frontend', 'backend', 'commerce', 'debugging'))
    )
  on conflict (source_agent_id, target_agent_id) do nothing;
end;
$$;

create or replace function public.seed_agents_after_workspace_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.seed_default_agents_for_workspace(new.id, new.owner_id);
  return new;
end;
$$;

drop trigger if exists workspaces_seed_default_agents on public.workspaces;
create trigger workspaces_seed_default_agents
after insert on public.workspaces
for each row execute function public.seed_agents_after_workspace_insert();

create or replace function public.sync_agents_after_technology_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid;
begin
  select owner_id
  into actor_id
  from public.workspaces
  where id = new.workspace_id;

  if tg_op = 'INSERT' and new.status <> 'archived' then
    insert into public.agent_technologies (
      workspace_id,
      agent_id,
      technology_id,
      proficiency,
      is_primary,
      created_by
    )
    select
      new.workspace_id,
      agent.id,
      new.id,
      case
        when agent.role in ('frontend', 'backend', 'commerce') then 5
        when agent.role in ('design', 'debugging', 'architecture') then 4
        else 3
      end,
      agent.role in ('frontend', 'backend', 'commerce'),
      coalesce(auth.uid(), actor_id)
    from public.agents as agent
    where agent.workspace_id = new.workspace_id
      and agent.agent_kind = 'system'
      and (
        agent.role in ('orchestrator', 'debugging', 'architecture', 'qa')
        or (
          agent.role = 'design'
          and (
            new.category = 'design'
            or lower(new.name) ~ '(react|next|css|html|tailwind|elementor|figma|ui|ux)'
          )
        )
        or (
          agent.role = 'frontend'
          and lower(new.name) ~ '(react|next|javascript|typescript|html|css|tailwind|vue|angular|svelte|vite)'
        )
        or (
          agent.role = 'backend'
          and (
            new.category in ('database', 'api', 'infrastructure')
            or lower(new.name) ~ '(node|php|laravel|python|java|ruby|sql|supabase|postgres|mysql|redis|api)'
          )
        )
        or (
          agent.role = 'commerce'
          and (
            new.category in ('cms', 'ecommerce')
            or lower(new.name) ~ '(shopify|liquid|wordpress|woocommerce|elementor|storefront|checkout)'
          )
        )
      )
    on conflict (agent_id, technology_id) do nothing;
  elsif tg_op = 'UPDATE'
    and old.status <> 'archived'
    and new.status = 'archived' then
    delete from public.agent_technologies
    where technology_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists technologies_sync_system_agents on public.technologies;
create trigger technologies_sync_system_agents
after insert or update of status on public.technologies
for each row execute function public.sync_agents_after_technology_change();

-- Crea los agentes iniciales en las oficinas existentes.
do $$
declare
  workspace_record record;
begin
  for workspace_record in
    select id, owner_id
    from public.workspaces
  loop
    perform public.seed_default_agents_for_workspace(
      workspace_record.id,
      workspace_record.owner_id
    );
  end loop;
end;
$$;

alter table public.agents enable row level security;
alter table public.agent_technologies enable row level security;
alter table public.agent_collaborators enable row level security;
alter table public.project_agents enable row level security;

drop policy if exists "agents_select_member" on public.agents;
create policy "agents_select_member"
on public.agents
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "agents_update_admin" on public.agents;
create policy "agents_update_admin"
on public.agents
for update
to authenticated
using (
  public.has_workspace_role(
    workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  )
)
with check (
  public.has_workspace_role(
    workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  )
  and updated_by = auth.uid()
);

drop policy if exists "agent_technologies_select_member"
  on public.agent_technologies;
create policy "agent_technologies_select_member"
on public.agent_technologies
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "agent_collaborators_select_member"
  on public.agent_collaborators;
create policy "agent_collaborators_select_member"
on public.agent_collaborators
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "project_agents_select_member"
  on public.project_agents;
create policy "project_agents_select_member"
on public.project_agents
for select
to authenticated
using (public.is_workspace_member(workspace_id));

grant select on public.agents to authenticated;
revoke insert, update, delete on public.agents from authenticated;
grant update (status, updated_by) on public.agents to authenticated;

grant select on public.agent_technologies to authenticated;
revoke insert, update, delete on public.agent_technologies from authenticated;

grant select on public.agent_collaborators to authenticated;
revoke insert, update, delete on public.agent_collaborators from authenticated;

grant select on public.project_agents to authenticated;
revoke insert, update, delete on public.project_agents from authenticated;

revoke all on function public.validate_agent_relation_ids(uuid, uuid[], uuid[], uuid)
  from public, anon, authenticated;
revoke all on function public.sync_system_agent_technologies(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.seed_default_agents_for_workspace(uuid, uuid)
  from public, anon, authenticated;

revoke all on function public.create_agent_record(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  smallint,
  boolean,
  text[],
  text,
  text,
  uuid[],
  uuid[]
) from public, anon, authenticated;

revoke all on function public.update_agent_record(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  smallint,
  boolean,
  text[],
  text,
  text,
  uuid[],
  uuid[]
) from public, anon, authenticated;

revoke all on function public.assign_project_agent(uuid, uuid, boolean, text)
  from public, anon, authenticated;
revoke all on function public.remove_project_agent(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.assign_project_agents(uuid, uuid[], text)
  from public, anon, authenticated;

grant execute on function public.create_agent_record(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  smallint,
  boolean,
  text[],
  text,
  text,
  uuid[],
  uuid[]
) to authenticated;

grant execute on function public.update_agent_record(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  smallint,
  boolean,
  text[],
  text,
  text,
  uuid[],
  uuid[]
) to authenticated;

grant execute on function public.assign_project_agent(uuid, uuid, boolean, text)
  to authenticated;
grant execute on function public.remove_project_agent(uuid, uuid)
  to authenticated;
grant execute on function public.assign_project_agents(uuid, uuid[], text)
  to authenticated;

commit;

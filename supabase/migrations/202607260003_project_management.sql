begin;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  client_name text,
  description text not null default '',
  icon text not null default 'folder-kanban',
  color text not null default '#55e6c1',
  status text not null default 'planning',
  priority text not null default 'medium',
  repository_url text,
  production_url text,
  staging_url text,
  permanent_instructions text not null default '',
  project_rules text not null default '',
  conventions text not null default '',
  budget_amount numeric(12, 2),
  budget_currency text not null default 'MXN',
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint projects_name_length
    check (char_length(trim(name)) between 2 and 120),
  constraint projects_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint projects_client_name_length
    check (client_name is null or char_length(client_name) <= 120),
  constraint projects_description_length
    check (char_length(description) <= 3000),
  constraint projects_icon_allowed
    check (
      icon in (
        'folder-kanban',
        'rocket',
        'shopping-bag',
        'globe-2',
        'code-2',
        'database',
        'shield-check',
        'sparkles'
      )
    ),
  constraint projects_color_format
    check (color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint projects_status_allowed
    check (status in ('planning', 'active', 'paused', 'completed', 'archived')),
  constraint projects_priority_allowed
    check (priority in ('low', 'medium', 'high', 'critical')),
  constraint projects_repository_url_valid
    check (
      repository_url is null
      or (
        char_length(repository_url) <= 500
        and repository_url ~* '^https?://'
      )
    ),
  constraint projects_production_url_valid
    check (
      production_url is null
      or (
        char_length(production_url) <= 500
        and production_url ~* '^https?://'
      )
    ),
  constraint projects_staging_url_valid
    check (
      staging_url is null
      or (
        char_length(staging_url) <= 500
        and staging_url ~* '^https?://'
      )
    ),
  constraint projects_permanent_instructions_length
    check (char_length(permanent_instructions) <= 10000),
  constraint projects_rules_length
    check (char_length(project_rules) <= 10000),
  constraint projects_conventions_length
    check (char_length(conventions) <= 10000),
  constraint projects_budget_amount_valid
    check (budget_amount is null or budget_amount between 0 and 9999999999.99),
  constraint projects_budget_currency_format
    check (budget_currency ~ '^[A-Z]{3}$')
);

create unique index if not exists projects_workspace_slug_uidx
  on public.projects(workspace_id, slug);

create index if not exists projects_workspace_status_idx
  on public.projects(workspace_id, status, updated_at desc);

create index if not exists projects_workspace_priority_idx
  on public.projects(workspace_id, priority, updated_at desc);

create index if not exists projects_workspace_name_idx
  on public.projects(workspace_id, lower(name));

create table if not exists public.project_technologies (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  technology_id uuid not null references public.technologies(id) on delete restrict,
  version_override text,
  notes text not null default '',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, technology_id),
  constraint project_technologies_version_length
    check (version_override is null or char_length(version_override) <= 40),
  constraint project_technologies_notes_length
    check (char_length(notes) <= 1200)
);

create index if not exists project_technologies_workspace_idx
  on public.project_technologies(workspace_id, project_id);

create index if not exists project_technologies_technology_idx
  on public.project_technologies(workspace_id, technology_id);

create or replace function public.prepare_project_record()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.name := trim(new.name);
  new.slug := public.slugify_text(coalesce(nullif(trim(new.slug), ''), new.name));

  if new.slug = '' then
    new.slug := 'project-' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  new.client_name := nullif(trim(coalesce(new.client_name, '')), '');
  new.description := trim(coalesce(new.description, ''));
  new.repository_url := nullif(trim(coalesce(new.repository_url, '')), '');
  new.production_url := nullif(trim(coalesce(new.production_url, '')), '');
  new.staging_url := nullif(trim(coalesce(new.staging_url, '')), '');
  new.permanent_instructions := trim(coalesce(new.permanent_instructions, ''));
  new.project_rules := trim(coalesce(new.project_rules, ''));
  new.conventions := trim(coalesce(new.conventions, ''));
  new.budget_currency := upper(trim(coalesce(new.budget_currency, 'MXN')));
  new.updated_at := now();

  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  else
    if new.workspace_id <> old.workspace_id then
      raise exception 'Project cannot be moved to another workspace';
    end if;

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

drop trigger if exists projects_prepare_record on public.projects;
create trigger projects_prepare_record
before insert or update on public.projects
for each row execute function public.prepare_project_record();

drop trigger if exists project_technologies_set_updated_at
  on public.project_technologies;
create trigger project_technologies_set_updated_at
before update on public.project_technologies
for each row execute function public.set_updated_at();

create or replace function public.validate_project_technology_workspace()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  project_workspace_id uuid;
  technology_workspace_id uuid;
  technology_status text;
begin
  select workspace_id
  into project_workspace_id
  from public.projects
  where id = new.project_id;

  select workspace_id, status
  into technology_workspace_id, technology_status
  from public.technologies
  where id = new.technology_id;

  if project_workspace_id is null or technology_workspace_id is null then
    raise exception 'Project technology references an unavailable record';
  end if;

  if project_workspace_id <> new.workspace_id
    or technology_workspace_id <> new.workspace_id then
    raise exception 'Project technologies cannot cross workspace boundaries';
  end if;

  if technology_status = 'archived' then
    raise exception 'Archived technologies cannot be assigned to projects';
  end if;

  return new;
end;
$$;

drop trigger if exists project_technologies_validate_workspace
  on public.project_technologies;
create trigger project_technologies_validate_workspace
before insert or update on public.project_technologies
for each row execute function public.validate_project_technology_workspace();

create or replace function public.audit_project_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  event_action text;
begin
  if tg_op = 'INSERT' then
    event_action := 'project.created';
  elsif old.status <> new.status and new.status = 'archived' then
    event_action := 'project.archived';
  elsif old.status = 'archived' and new.status <> 'archived' then
    event_action := 'project.restored';
  elsif old.status <> new.status and new.status = 'paused' then
    event_action := 'project.paused';
  elsif old.status <> new.status and new.status = 'completed' then
    event_action := 'project.completed';
  elsif old.status <> new.status and new.status = 'active' then
    event_action := 'project.activated';
  else
    event_action := 'project.updated';
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
    'project',
    new.id,
    jsonb_build_object(
      'name', new.name,
      'status', new.status,
      'priority', new.priority
    )
  );

  return new;
end;
$$;

drop trigger if exists projects_audit_change on public.projects;
create trigger projects_audit_change
after insert or update on public.projects
for each row execute function public.audit_project_change();

create or replace function public.audit_project_technology_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  row_workspace_id uuid;
  row_project_id uuid;
  row_technology_id uuid;
  event_action text;
begin
  if tg_op = 'DELETE' then
    row_workspace_id := old.workspace_id;
    row_project_id := old.project_id;
    row_technology_id := old.technology_id;
    event_action := 'project.technology_removed';
  else
    row_workspace_id := new.workspace_id;
    row_project_id := new.project_id;
    row_technology_id := new.technology_id;
    event_action := 'project.technology_assigned';
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
    jsonb_build_object('technology_id', row_technology_id)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists project_technologies_audit_change
  on public.project_technologies;
create trigger project_technologies_audit_change
after insert or delete on public.project_technologies
for each row execute function public.audit_project_technology_change();

create or replace function public.validate_project_technology_ids(
  target_workspace_id uuid,
  technology_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_count integer;
  available_count integer;
begin
  requested_count := coalesce(cardinality(technology_ids), 0);

  if requested_count > 30 then
    raise exception 'A project cannot contain more than 30 technologies';
  end if;

  if requested_count = 0 then
    return;
  end if;

  if requested_count <> (
    select count(distinct selected.technology_id)
    from unnest(technology_ids) as selected(technology_id)
  ) then
    raise exception 'Technology selection contains duplicates';
  end if;

  select count(*)
  into available_count
  from public.technologies
  where workspace_id = target_workspace_id
    and id = any(technology_ids)
    and status <> 'archived';

  if available_count <> requested_count then
    raise exception 'One or more technologies are unavailable in this workspace';
  end if;
end;
$$;

create or replace function public.create_project_record(
  p_workspace_id uuid,
  p_name text,
  p_client_name text,
  p_description text,
  p_icon text,
  p_color text,
  p_status text,
  p_priority text,
  p_repository_url text,
  p_production_url text,
  p_staging_url text,
  p_permanent_instructions text,
  p_project_rules text,
  p_conventions text,
  p_budget_amount numeric,
  p_budget_currency text,
  p_technology_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  created_project_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.has_workspace_role(
    p_workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  ) then
    raise exception 'Insufficient project permissions';
  end if;

  perform public.validate_project_technology_ids(
    p_workspace_id,
    coalesce(p_technology_ids, '{}'::uuid[])
  );

  insert into public.projects (
    workspace_id,
    name,
    slug,
    client_name,
    description,
    icon,
    color,
    status,
    priority,
    repository_url,
    production_url,
    staging_url,
    permanent_instructions,
    project_rules,
    conventions,
    budget_amount,
    budget_currency,
    created_by,
    updated_by
  )
  values (
    p_workspace_id,
    p_name,
    p_name,
    p_client_name,
    p_description,
    p_icon,
    p_color,
    p_status,
    p_priority,
    p_repository_url,
    p_production_url,
    p_staging_url,
    p_permanent_instructions,
    p_project_rules,
    p_conventions,
    p_budget_amount,
    p_budget_currency,
    current_user_id,
    current_user_id
  )
  returning id into created_project_id;

  insert into public.project_technologies (
    workspace_id,
    project_id,
    technology_id,
    created_by
  )
  select
    p_workspace_id,
    created_project_id,
    selected.technology_id,
    current_user_id
  from unnest(coalesce(p_technology_ids, '{}'::uuid[])) as selected(technology_id);

  return created_project_id;
end;
$$;

create or replace function public.update_project_record(
  p_project_id uuid,
  p_name text,
  p_client_name text,
  p_description text,
  p_icon text,
  p_color text,
  p_status text,
  p_priority text,
  p_repository_url text,
  p_production_url text,
  p_staging_url text,
  p_permanent_instructions text,
  p_project_rules text,
  p_conventions text,
  p_budget_amount numeric,
  p_budget_currency text,
  p_technology_ids uuid[]
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
    raise exception 'Insufficient project permissions';
  end if;

  perform public.validate_project_technology_ids(
    target_workspace_id,
    coalesce(p_technology_ids, '{}'::uuid[])
  );

  update public.projects
  set
    name = p_name,
    slug = p_name,
    client_name = p_client_name,
    description = p_description,
    icon = p_icon,
    color = p_color,
    status = p_status,
    priority = p_priority,
    repository_url = p_repository_url,
    production_url = p_production_url,
    staging_url = p_staging_url,
    permanent_instructions = p_permanent_instructions,
    project_rules = p_project_rules,
    conventions = p_conventions,
    budget_amount = p_budget_amount,
    budget_currency = p_budget_currency,
    updated_by = current_user_id
  where id = p_project_id;

  delete from public.project_technologies
  where project_id = p_project_id
    and not (
      technology_id = any(coalesce(p_technology_ids, '{}'::uuid[]))
    );

  insert into public.project_technologies (
    workspace_id,
    project_id,
    technology_id,
    created_by
  )
  select
    target_workspace_id,
    p_project_id,
    selected.technology_id,
    current_user_id
  from unnest(coalesce(p_technology_ids, '{}'::uuid[])) as selected(technology_id)
  on conflict (project_id, technology_id) do nothing;

  return p_project_id;
end;
$$;

alter table public.projects enable row level security;
alter table public.project_technologies enable row level security;

drop policy if exists "projects_select_member" on public.projects;
create policy "projects_select_member"
on public.projects
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "projects_update_admin" on public.projects;
create policy "projects_update_admin"
on public.projects
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

drop policy if exists "project_technologies_select_member"
  on public.project_technologies;
create policy "project_technologies_select_member"
on public.project_technologies
for select
to authenticated
using (public.is_workspace_member(workspace_id));

grant select on public.projects to authenticated;
revoke insert, update, delete on public.projects from authenticated;
grant update (status, updated_by) on public.projects to authenticated;

grant select on public.project_technologies to authenticated;
revoke insert, update, delete on public.project_technologies from authenticated;

revoke all on function public.validate_project_technology_ids(uuid, uuid[])
  from public, anon, authenticated;
revoke all on function public.create_project_record(
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
  text,
  text,
  text,
  text,
  numeric,
  text,
  uuid[]
) from public, anon, authenticated;
revoke all on function public.update_project_record(
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
  text,
  text,
  text,
  text,
  numeric,
  text,
  uuid[]
) from public, anon, authenticated;

grant execute on function public.create_project_record(
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
  text,
  text,
  text,
  text,
  numeric,
  text,
  uuid[]
) to authenticated;

grant execute on function public.update_project_record(
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
  text,
  text,
  text,
  text,
  numeric,
  text,
  uuid[]
) to authenticated;

commit;

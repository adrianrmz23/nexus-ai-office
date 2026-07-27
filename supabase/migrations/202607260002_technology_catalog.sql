begin;

create table if not exists public.technologies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  category text not null,
  description text not null default '',
  icon text not null default 'code-2',
  color text not null default '#55e6c1',
  version text,
  official_docs_url text,
  related_languages text[] not null default '{}',
  related_frameworks text[] not null default '{}',
  related_cms text[] not null default '{}',
  tags text[] not null default '{}',
  technical_prompt text not null default '',
  status text not null default 'active',
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint technologies_name_length
    check (char_length(trim(name)) between 1 and 80),
  constraint technologies_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint technologies_category_allowed
    check (
      category in (
        'language',
        'framework',
        'library',
        'cms',
        'ecommerce',
        'database',
        'infrastructure',
        'tool',
        'design',
        'analytics',
        'seo',
        'api',
        'other'
      )
    ),
  constraint technologies_icon_allowed
    check (
      icon in (
        'code-2',
        'braces',
        'boxes',
        'database',
        'layout-template',
        'shopping-bag',
        'cloud-cog',
        'wrench',
        'palette',
        'gauge',
        'search-check',
        'plug-zap',
        'package',
        'globe-2'
      )
    ),
  constraint technologies_color_format
    check (color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint technologies_status_allowed
    check (status in ('active', 'inactive', 'archived')),
  constraint technologies_description_length
    check (char_length(description) <= 1200),
  constraint technologies_version_length
    check (version is null or char_length(version) <= 40),
  constraint technologies_docs_url_valid
    check (
      official_docs_url is null
      or (
        char_length(official_docs_url) <= 500
        and official_docs_url ~* '^https?://'
      )
    ),
  constraint technologies_prompt_length
    check (char_length(technical_prompt) <= 5000),
  constraint technologies_tags_limit
    check (
      cardinality(tags) <= 12
      and char_length(array_to_string(tags, ',')) <= 400
    ),
  constraint technologies_related_languages_limit
    check (
      cardinality(related_languages) <= 24
      and char_length(array_to_string(related_languages, ',')) <= 1000
    ),
  constraint technologies_related_frameworks_limit
    check (
      cardinality(related_frameworks) <= 24
      and char_length(array_to_string(related_frameworks, ',')) <= 1000
    ),
  constraint technologies_related_cms_limit
    check (
      cardinality(related_cms) <= 24
      and char_length(array_to_string(related_cms, ',')) <= 1000
    )
);

create unique index if not exists technologies_workspace_slug_uidx
  on public.technologies(workspace_id, slug);

create index if not exists technologies_workspace_status_idx
  on public.technologies(workspace_id, status, updated_at desc);

create index if not exists technologies_workspace_name_idx
  on public.technologies(workspace_id, lower(name));

create table if not exists public.technology_relations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_technology_id uuid not null references public.technologies(id) on delete cascade,
  target_technology_id uuid not null references public.technologies(id) on delete cascade,
  relation_type text not null,
  notes text not null default '',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint technology_relations_distinct
    check (source_technology_id <> target_technology_id),
  constraint technology_relations_type_allowed
    check (
      relation_type in (
        'uses',
        'extends',
        'integrates_with',
        'alternative_to',
        'commonly_used_with',
        'depends_on'
      )
    ),
  constraint technology_relations_notes_length
    check (char_length(notes) <= 1000),
  unique (workspace_id, source_technology_id, target_technology_id, relation_type)
);

create index if not exists technology_relations_source_idx
  on public.technology_relations(workspace_id, source_technology_id);

create index if not exists technology_relations_target_idx
  on public.technology_relations(workspace_id, target_technology_id);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_length
    check (char_length(action) between 3 and 120),
  constraint audit_logs_entity_type_length
    check (char_length(entity_type) between 2 and 80)
);

create index if not exists audit_logs_workspace_created_idx
  on public.audit_logs(workspace_id, created_at desc);

create index if not exists audit_logs_entity_idx
  on public.audit_logs(workspace_id, entity_type, entity_id);

create or replace function public.slugify_text(input_text text)
returns text
language sql
immutable
strict
set search_path = public, pg_temp
as $$
  select trim(
    both '-'
    from regexp_replace(
      replace(
        replace(
          replace(
            replace(
              lower(
                translate(
                  trim(input_text),
                  'ÁÉÍÓÚÜÑáéíóúüñ',
                  'AEIOUUNaeiouun'
                )
              ),
              'c++',
              'cpp'
            ),
            'c#',
            'csharp'
          ),
          '+',
          'plus'
        ),
        '#',
        'sharp'
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  );
$$;

create or replace function public.prepare_technology_record()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.name := trim(new.name);
  new.slug := public.slugify_text(coalesce(nullif(trim(new.slug), ''), new.name));
  new.description := trim(coalesce(new.description, ''));
  new.technical_prompt := trim(coalesce(new.technical_prompt, ''));
  new.version := nullif(trim(coalesce(new.version, '')), '');
  new.official_docs_url := nullif(trim(coalesce(new.official_docs_url, '')), '');
  new.updated_at := now();

  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  else
    if new.workspace_id <> old.workspace_id then
      raise exception 'Technology cannot be moved to another workspace';
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

drop trigger if exists technologies_prepare_record on public.technologies;
create trigger technologies_prepare_record
before insert or update on public.technologies
for each row execute function public.prepare_technology_record();

drop trigger if exists technology_relations_set_updated_at
  on public.technology_relations;
create trigger technology_relations_set_updated_at
before update on public.technology_relations
for each row execute function public.set_updated_at();

create or replace function public.validate_technology_relation_workspace()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  source_workspace_id uuid;
  target_workspace_id uuid;
begin
  select workspace_id
  into source_workspace_id
  from public.technologies
  where id = new.source_technology_id;

  select workspace_id
  into target_workspace_id
  from public.technologies
  where id = new.target_technology_id;

  if source_workspace_id is null or target_workspace_id is null then
    raise exception 'Technology relation references an unavailable technology';
  end if;

  if source_workspace_id <> new.workspace_id
    or target_workspace_id <> new.workspace_id then
    raise exception 'Technology relation cannot cross workspace boundaries';
  end if;

  return new;
end;
$$;

drop trigger if exists technology_relations_validate_workspace
  on public.technology_relations;
create trigger technology_relations_validate_workspace
before insert or update on public.technology_relations
for each row execute function public.validate_technology_relation_workspace();

create or replace function public.audit_technology_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  event_action text;
begin
  if tg_op = 'INSERT' then
    event_action := 'technology.created';
  elsif old.status <> new.status and new.status = 'archived' then
    event_action := 'technology.archived';
  elsif old.status = 'archived' and new.status <> 'archived' then
    event_action := 'technology.restored';
  elsif old.status <> new.status and new.status = 'inactive' then
    event_action := 'technology.deactivated';
  elsif old.status <> new.status and new.status = 'active' then
    event_action := 'technology.activated';
  else
    event_action := 'technology.updated';
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
    'technology',
    new.id,
    jsonb_build_object(
      'name', new.name,
      'category', new.category,
      'status', new.status
    )
  );

  return new;
end;
$$;

drop trigger if exists technologies_audit_change on public.technologies;
create trigger technologies_audit_change
after insert or update on public.technologies
for each row execute function public.audit_technology_change();

alter table public.technologies enable row level security;
alter table public.technology_relations enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "technologies_select_member" on public.technologies;
create policy "technologies_select_member"
on public.technologies
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "technologies_insert_admin" on public.technologies;
create policy "technologies_insert_admin"
on public.technologies
for insert
to authenticated
with check (
  public.has_workspace_role(
    workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  )
  and created_by = auth.uid()
  and updated_by = auth.uid()
);

drop policy if exists "technologies_update_admin" on public.technologies;
create policy "technologies_update_admin"
on public.technologies
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

drop policy if exists "technology_relations_select_member"
  on public.technology_relations;
create policy "technology_relations_select_member"
on public.technology_relations
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "technology_relations_insert_admin"
  on public.technology_relations;
create policy "technology_relations_insert_admin"
on public.technology_relations
for insert
to authenticated
with check (
  public.has_workspace_role(
    workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  )
  and created_by = auth.uid()
);

drop policy if exists "technology_relations_update_admin"
  on public.technology_relations;
create policy "technology_relations_update_admin"
on public.technology_relations
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
);

drop policy if exists "technology_relations_delete_admin"
  on public.technology_relations;
create policy "technology_relations_delete_admin"
on public.technology_relations
for delete
to authenticated
using (
  public.has_workspace_role(
    workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  )
);

drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin"
on public.audit_logs
for select
to authenticated
using (
  public.has_workspace_role(
    workspace_id,
    array['owner', 'admin']::public.workspace_member_role[]
  )
);

grant select on public.technologies to authenticated;
revoke insert, update on public.technologies from authenticated;
grant insert (
  workspace_id,
  name,
  slug,
  category,
  description,
  icon,
  color,
  version,
  official_docs_url,
  related_languages,
  related_frameworks,
  related_cms,
  tags,
  technical_prompt,
  status,
  created_by,
  updated_by
) on public.technologies to authenticated;

grant update (
  name,
  slug,
  category,
  description,
  icon,
  color,
  version,
  official_docs_url,
  related_languages,
  related_frameworks,
  related_cms,
  tags,
  technical_prompt,
  status,
  updated_by
) on public.technologies to authenticated;

grant select, insert, update, delete on public.technology_relations to authenticated;
grant select on public.audit_logs to authenticated;

revoke all on function public.slugify_text(text) from public;
grant execute on function public.slugify_text(text) to authenticated;

commit;

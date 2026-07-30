begin;

create table if not exists public.project_repositories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  source_type text not null default 'zip',
  repository_url text,
  default_branch text not null default 'main',
  status text not null default 'processing',
  file_count integer not null default 0,
  indexed_file_count integer not null default 0,
  total_bytes bigint not null default 0,
  source_checksum text,
  storage_bucket text,
  storage_path text,
  import_summary jsonb not null default '{}'::jsonb,
  error_message text,
  last_import_at timestamptz,
  archived_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_repositories_name_length check (char_length(trim(name)) between 2 and 180),
  constraint project_repositories_source_allowed check (source_type in ('zip', 'manual', 'github_reference')),
  constraint project_repositories_status_allowed check (status in ('processing', 'active', 'failed', 'archived')),
  constraint project_repositories_branch_length check (char_length(default_branch) between 1 and 120),
  constraint project_repositories_counts_positive check (file_count >= 0 and indexed_file_count >= 0 and total_bytes >= 0),
  constraint project_repositories_checksum_format check (source_checksum is null or source_checksum ~ '^[a-f0-9]{64}$'),
  unique (workspace_id, project_id, name)
);

create index if not exists project_repositories_project_idx
  on public.project_repositories(workspace_id, project_id, status, updated_at desc);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  repository_id uuid not null references public.project_repositories(id) on delete cascade,
  path text not null,
  directory_path text not null default '',
  file_name text not null,
  extension text,
  mime_type text not null default 'text/plain',
  language text,
  size_bytes integer not null default 0,
  checksum text not null,
  content_text text,
  is_binary boolean not null default false,
  is_indexed boolean not null default true,
  status text not null default 'active',
  current_version_number integer not null default 1,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_files_path_length check (char_length(path) between 1 and 700),
  constraint project_files_name_length check (char_length(file_name) between 1 and 255),
  constraint project_files_extension_length check (extension is null or char_length(extension) <= 32),
  constraint project_files_language_length check (language is null or char_length(language) <= 80),
  constraint project_files_size_range check (size_bytes >= 0 and size_bytes <= 1048576),
  constraint project_files_checksum_format check (checksum ~ '^[a-f0-9]{64}$'),
  constraint project_files_status_allowed check (status in ('active', 'deleted', 'archived')),
  constraint project_files_version_positive check (current_version_number >= 1),
  constraint project_files_content_length check (content_text is null or char_length(content_text) <= 1100000),
  constraint project_files_content_size_match check (content_text is null or size_bytes = octet_length(convert_to(content_text, 'UTF8'))),
  unique (repository_id, path)
);

create index if not exists project_files_repository_path_idx
  on public.project_files(workspace_id, repository_id, status, path);
create index if not exists project_files_project_language_idx
  on public.project_files(workspace_id, project_id, status, language, updated_at desc);
create index if not exists project_files_name_search_idx
  on public.project_files using gin (to_tsvector('simple', coalesce(path, '') || ' ' || coalesce(file_name, '') || ' ' || coalesce(content_text, '')));

create table if not exists public.project_file_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  repository_id uuid not null references public.project_repositories(id) on delete cascade,
  file_id uuid not null references public.project_files(id) on delete cascade,
  version_number integer not null,
  content_text text not null,
  checksum text not null,
  size_bytes integer not null,
  source_type text not null default 'import',
  change_summary text not null default '',
  proposal_id uuid,
  created_by_agent_id uuid references public.agents(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint project_file_versions_number_positive check (version_number >= 1),
  constraint project_file_versions_content_length check (char_length(content_text) <= 1100000),
  constraint project_file_versions_content_size_match check (size_bytes = octet_length(convert_to(content_text, 'UTF8'))),
  constraint project_file_versions_checksum_format check (checksum ~ '^[a-f0-9]{64}$'),
  constraint project_file_versions_size_range check (size_bytes >= 0 and size_bytes <= 1048576),
  constraint project_file_versions_source_allowed check (source_type in ('import', 'proposal', 'manual')),
  constraint project_file_versions_summary_length check (char_length(change_summary) <= 4000),
  unique (file_id, version_number)
);

create index if not exists project_file_versions_file_idx
  on public.project_file_versions(workspace_id, file_id, version_number desc);

create table if not exists public.file_change_proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  repository_id uuid not null references public.project_repositories(id) on delete cascade,
  file_id uuid not null references public.project_files(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  source_message_id uuid references public.messages(id) on delete set null,
  proposed_by_agent_id uuid references public.agents(id) on delete set null,
  title text not null,
  summary text not null default '',
  proposed_content text not null,
  proposed_checksum text not null,
  base_version_number integer not null,
  status text not null default 'proposed',
  review_note text not null default '',
  approved_at timestamptz,
  archived_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint file_change_proposals_title_length check (char_length(trim(title)) between 3 and 180),
  constraint file_change_proposals_summary_length check (char_length(summary) <= 8000),
  constraint file_change_proposals_content_length check (char_length(proposed_content) between 1 and 1100000),
  constraint file_change_proposals_content_bytes check (octet_length(convert_to(proposed_content, 'UTF8')) <= 1048576),
  constraint file_change_proposals_checksum_format check (proposed_checksum ~ '^[a-f0-9]{64}$'),
  constraint file_change_proposals_base_version_positive check (base_version_number >= 1),
  constraint file_change_proposals_status_allowed check (status in ('proposed', 'changes_requested', 'approved', 'rejected', 'archived')),
  constraint file_change_proposals_review_length check (char_length(review_note) <= 8000)
);

alter table public.project_file_versions
  drop constraint if exists project_file_versions_proposal_fkey;
alter table public.project_file_versions
  add constraint project_file_versions_proposal_fkey
  foreign key (proposal_id) references public.file_change_proposals(id) on delete set null;

create index if not exists file_change_proposals_file_idx
  on public.file_change_proposals(workspace_id, file_id, status, updated_at desc);
create index if not exists file_change_proposals_project_idx
  on public.file_change_proposals(workspace_id, project_id, status, updated_at desc);

create table if not exists public.conversation_file_contexts (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  project_file_id uuid not null references public.project_files(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  version_number integer not null,
  added_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (conversation_id, project_file_id),
  constraint conversation_file_contexts_version_positive check (version_number >= 1)
);

create index if not exists conversation_file_contexts_project_idx
  on public.conversation_file_contexts(workspace_id, project_id, conversation_id);

create table if not exists public.agent_file_access_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  repository_id uuid references public.project_repositories(id) on delete set null,
  file_id uuid references public.project_files(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  run_id uuid references public.agent_runs(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  access_type text not null,
  query_text text,
  result_summary jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint agent_file_access_type_allowed check (access_type in ('list', 'search', 'read', 'related', 'compare', 'propose', 'context')),
  constraint agent_file_access_query_length check (query_text is null or char_length(query_text) <= 12000)
);

create index if not exists agent_file_access_logs_conversation_idx
  on public.agent_file_access_logs(workspace_id, conversation_id, created_at desc);
create index if not exists agent_file_access_logs_file_idx
  on public.agent_file_access_logs(workspace_id, file_id, created_at desc);

create or replace function public.validate_repository_scope()
returns trigger
language plpgsql
security invoker
set search_path = public, extensions, pg_temp
as $$
declare
  expected_workspace uuid;
  repository_workspace uuid;
  repository_project uuid;
  file_workspace uuid;
  file_project uuid;
  file_repository uuid;
  conversation_workspace uuid;
  conversation_project uuid;
  message_workspace uuid;
  message_project uuid;
  run_workspace uuid;
  run_project uuid;
  agent_workspace uuid;
  proposal_workspace uuid;
  proposal_project uuid;
  proposal_file uuid;
begin
  if tg_table_name = 'project_repositories' then
    select workspace_id into expected_workspace
    from public.projects
    where id = new.project_id;

    if expected_workspace is null or expected_workspace <> new.workspace_id then
      raise exception 'Repository project cannot cross workspaces';
    end if;

  elsif tg_table_name = 'project_files' then
    select workspace_id, project_id
      into repository_workspace, repository_project
    from public.project_repositories
    where id = new.repository_id;

    if repository_workspace is null
      or repository_workspace <> new.workspace_id
      or repository_project <> new.project_id then
      raise exception 'Repository reference is outside the selected project';
    end if;

    if new.content_text is not null
      and new.checksum <> encode(digest(convert_to(new.content_text, 'UTF8'), 'sha256'), 'hex') then
      raise exception 'Repository file checksum does not match its content';
    end if;

    if tg_op = 'UPDATE' and (
      new.current_version_number is distinct from old.current_version_number
      or new.checksum is distinct from old.checksum
      or new.content_text is distinct from old.content_text
    ) then
      perform 1
      from public.project_file_versions
      where file_id = new.id
        and version_number = new.current_version_number
        and checksum = new.checksum;
      if not found then
        raise exception 'Repository file updates require a matching immutable version';
      end if;
    end if;

  elsif tg_table_name in ('project_file_versions', 'file_change_proposals') then
    select workspace_id, project_id
      into repository_workspace, repository_project
    from public.project_repositories
    where id = new.repository_id;

    select workspace_id, project_id, repository_id
      into file_workspace, file_project, file_repository
    from public.project_files
    where id = new.file_id;

    if repository_workspace is null
      or file_workspace is null
      or repository_workspace <> new.workspace_id
      or file_workspace <> new.workspace_id
      or repository_project <> new.project_id
      or file_project <> new.project_id
      or file_repository <> new.repository_id then
      raise exception 'File or repository reference is outside the selected project';
    end if;

    if tg_table_name = 'project_file_versions' then
      if new.checksum <> encode(digest(convert_to(new.content_text, 'UTF8'), 'sha256'), 'hex') then
        raise exception 'File version checksum does not match its content';
      end if;

      if new.proposal_id is not null then
        select workspace_id, project_id, file_id
          into proposal_workspace, proposal_project, proposal_file
        from public.file_change_proposals
        where id = new.proposal_id;

        if proposal_workspace is null
          or proposal_workspace <> new.workspace_id
          or proposal_project <> new.project_id
          or proposal_file <> new.file_id then
          raise exception 'File version proposal is outside the selected file';
        end if;
      end if;
    else
      if tg_op = 'UPDATE' and (
        new.workspace_id is distinct from old.workspace_id
        or new.project_id is distinct from old.project_id
        or new.repository_id is distinct from old.repository_id
        or new.file_id is distinct from old.file_id
        or new.conversation_id is distinct from old.conversation_id
        or new.source_message_id is distinct from old.source_message_id
        or new.proposed_by_agent_id is distinct from old.proposed_by_agent_id
        or new.title is distinct from old.title
        or new.summary is distinct from old.summary
        or new.proposed_content is distinct from old.proposed_content
        or new.proposed_checksum is distinct from old.proposed_checksum
        or new.base_version_number is distinct from old.base_version_number
        or new.created_by is distinct from old.created_by
        or new.created_at is distinct from old.created_at
      ) then
        raise exception 'A submitted file proposal is immutable; create a new proposal instead';
      end if;

      if new.proposed_checksum <> encode(digest(convert_to(new.proposed_content, 'UTF8'), 'sha256'), 'hex') then
        raise exception 'Proposal checksum does not match its content';
      end if;

      if new.conversation_id is not null then
        select workspace_id, project_id
          into conversation_workspace, conversation_project
        from public.conversations
        where id = new.conversation_id;

        if conversation_workspace is null
          or conversation_workspace <> new.workspace_id
          or conversation_project <> new.project_id then
          raise exception 'Proposal conversation is outside the selected project';
        end if;
      end if;

      if new.source_message_id is not null then
        select m.workspace_id, c.project_id
          into message_workspace, message_project
        from public.messages m
        join public.conversations c on c.id = m.conversation_id
        where m.id = new.source_message_id
          and (new.conversation_id is null or m.conversation_id = new.conversation_id);

        if message_workspace is null
          or message_workspace <> new.workspace_id
          or message_project <> new.project_id then
          raise exception 'Proposal source message is outside the selected project or conversation';
        end if;
      end if;

      if new.proposed_by_agent_id is not null then
        select workspace_id into agent_workspace
        from public.agents
        where id = new.proposed_by_agent_id;

        if agent_workspace is null or agent_workspace <> new.workspace_id then
          raise exception 'Proposal agent is outside the selected workspace';
        end if;
      end if;
    end if;

  elsif tg_table_name = 'conversation_file_contexts' then
    select workspace_id, project_id
      into conversation_workspace, conversation_project
    from public.conversations
    where id = new.conversation_id;

    select workspace_id, project_id
      into file_workspace, file_project
    from public.project_files
    where id = new.project_file_id;

    if conversation_workspace is null
      or file_workspace is null
      or conversation_workspace <> new.workspace_id
      or file_workspace <> new.workspace_id
      or conversation_project <> new.project_id
      or file_project <> new.project_id then
      raise exception 'Conversation file context cannot cross projects or workspaces';
    end if;

    perform 1
    from public.project_file_versions
    where file_id = new.project_file_id
      and version_number = new.version_number;
    if not found then
      raise exception 'The selected file version does not exist';
    end if;

  elsif tg_table_name = 'agent_file_access_logs' then
    select workspace_id into expected_workspace
    from public.projects
    where id = new.project_id;

    if expected_workspace is null or expected_workspace <> new.workspace_id then
      raise exception 'File access log project cannot cross workspaces';
    end if;

    if new.repository_id is not null then
      select workspace_id, project_id
        into repository_workspace, repository_project
      from public.project_repositories
      where id = new.repository_id;

      if repository_workspace is null
        or repository_workspace <> new.workspace_id
        or repository_project <> new.project_id then
        raise exception 'File access repository is outside the selected project';
      end if;
    end if;

    if new.file_id is not null then
      select workspace_id, project_id
        into file_workspace, file_project
      from public.project_files
      where id = new.file_id;

      if file_workspace is null
        or file_workspace <> new.workspace_id
        or file_project <> new.project_id then
        raise exception 'File access target is outside the selected project';
      end if;
    end if;

    if new.conversation_id is not null then
      select workspace_id, project_id
        into conversation_workspace, conversation_project
      from public.conversations
      where id = new.conversation_id;

      if conversation_workspace is null
        or conversation_workspace <> new.workspace_id
        or conversation_project <> new.project_id then
        raise exception 'File access conversation is outside the selected project';
      end if;
    end if;

    if new.message_id is not null then
      select m.workspace_id, c.project_id
        into message_workspace, message_project
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = new.message_id;

      if message_workspace is null
        or message_workspace <> new.workspace_id
        or message_project <> new.project_id then
        raise exception 'File access message is outside the selected project';
      end if;
    end if;

    if new.run_id is not null then
      select workspace_id, project_id
        into run_workspace, run_project
      from public.agent_runs
      where id = new.run_id;

      if run_workspace is null
        or run_workspace <> new.workspace_id
        or run_project <> new.project_id then
        raise exception 'File access run is outside the selected project';
      end if;
    end if;

    if new.agent_id is not null then
      select workspace_id into agent_workspace
      from public.agents
      where id = new.agent_id;

      if agent_workspace is null or agent_workspace <> new.workspace_id then
        raise exception 'File access agent is outside the selected workspace';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.insert_repository_file_batch(
  p_repository_id uuid,
  p_files jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  repository_row public.project_repositories%rowtype;
  current_user_id uuid := auth.uid();
  item jsonb;
  file_id uuid;
  file_content text;
  file_checksum text;
  file_size integer;
  inserted_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into repository_row
  from public.project_repositories
  where id = p_repository_id
  for update;

  if repository_row.id is null then
    raise exception 'Repository not found';
  end if;
  if not public.has_workspace_role(
    repository_row.workspace_id,
    array['owner','admin']::public.workspace_member_role[]
  ) then
    raise exception 'Insufficient permissions';
  end if;
  if repository_row.status = 'archived' then
    raise exception 'Archived repositories cannot receive files';
  end if;
  if p_files is null
    or jsonb_typeof(p_files) is distinct from 'array'
    or jsonb_array_length(p_files) < 1
    or jsonb_array_length(p_files) > 20 then
    raise exception 'A repository batch must contain between 1 and 20 files';
  end if;

  for item in select value from jsonb_array_elements(p_files)
  loop
    file_id := (item ->> 'id')::uuid;
    file_content := coalesce(item ->> 'content', '');
    file_checksum := lower(coalesce(item ->> 'checksum', ''));
    file_size := octet_length(convert_to(file_content, 'UTF8'));

    if file_size > 1048576 then
      raise exception 'A repository file exceeds the 1 MB limit';
    end if;
    if file_checksum !~ '^[a-f0-9]{64}$' then
      raise exception 'Repository file checksum is invalid';
    end if;
    if file_checksum <> encode(digest(convert_to(file_content, 'UTF8'), 'sha256'), 'hex') then
      raise exception 'Repository file checksum does not match its content';
    end if;
    if coalesce((item ->> 'sizeBytes')::integer, -1) <> file_size then
      raise exception 'Repository file size does not match its normalized content';
    end if;

    insert into public.project_files (
      id, workspace_id, project_id, repository_id, path, directory_path,
      file_name, extension, mime_type, language, size_bytes, checksum,
      content_text, is_binary, is_indexed, status, current_version_number,
      created_by, updated_by
    ) values (
      file_id,
      repository_row.workspace_id,
      repository_row.project_id,
      repository_row.id,
      item ->> 'path',
      coalesce(item ->> 'directoryPath', ''),
      item ->> 'fileName',
      nullif(item ->> 'extension', ''),
      coalesce(nullif(item ->> 'mimeType', ''), 'text/plain'),
      nullif(item ->> 'language', ''),
      file_size,
      file_checksum,
      file_content,
      false,
      true,
      'active',
      1,
      current_user_id,
      current_user_id
    );

    insert into public.project_file_versions (
      workspace_id, project_id, repository_id, file_id, version_number,
      content_text, checksum, size_bytes, source_type, change_summary,
      proposal_id, created_by_agent_id, created_by
    ) values (
      repository_row.workspace_id,
      repository_row.project_id,
      repository_row.id,
      file_id,
      1,
      file_content,
      file_checksum,
      file_size,
      'import',
      'Versión inicial importada desde ZIP.',
      null,
      null,
      current_user_id
    );

    inserted_count := inserted_count + 1;
  end loop;

  return inserted_count;
end;
$$;

create or replace function public.apply_repository_file_import_update(
  p_file_id uuid,
  p_payload jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  file_row public.project_files%rowtype;
  current_user_id uuid := auth.uid();
  file_content text;
  file_checksum text;
  file_size integer;
  next_version integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into file_row
  from public.project_files
  where id = p_file_id
  for update;

  if file_row.id is null then
    raise exception 'File not found';
  end if;
  if not public.has_workspace_role(
    file_row.workspace_id,
    array['owner','admin']::public.workspace_member_role[]
  ) then
    raise exception 'Insufficient permissions';
  end if;

  file_content := coalesce(p_payload ->> 'content', '');
  file_checksum := lower(coalesce(p_payload ->> 'checksum', ''));
  file_size := octet_length(convert_to(file_content, 'UTF8'));

  if file_size > 1048576 then
    raise exception 'The repository file exceeds the 1 MB limit';
  end if;
  if file_checksum !~ '^[a-f0-9]{64}$' then
    raise exception 'Repository file checksum is invalid';
  end if;
  if file_checksum <> encode(digest(convert_to(file_content, 'UTF8'), 'sha256'), 'hex') then
    raise exception 'Repository file checksum does not match its content';
  end if;
  if coalesce((p_payload ->> 'sizeBytes')::integer, -1) <> file_size then
    raise exception 'Repository file size does not match its normalized content';
  end if;

  next_version := file_row.current_version_number + 1;

  insert into public.project_file_versions (
    workspace_id, project_id, repository_id, file_id, version_number,
    content_text, checksum, size_bytes, source_type, change_summary,
    proposal_id, created_by_agent_id, created_by
  ) values (
    file_row.workspace_id,
    file_row.project_id,
    file_row.repository_id,
    file_row.id,
    next_version,
    file_content,
    file_checksum,
    file_size,
    'import',
    'Archivo actualizado mediante una nueva importación ZIP.',
    null,
    null,
    current_user_id
  );

  update public.project_files set
    directory_path = coalesce(p_payload ->> 'directoryPath', ''),
    file_name = p_payload ->> 'fileName',
    extension = nullif(p_payload ->> 'extension', ''),
    mime_type = coalesce(nullif(p_payload ->> 'mimeType', ''), 'text/plain'),
    language = nullif(p_payload ->> 'language', ''),
    size_bytes = file_size,
    checksum = file_checksum,
    content_text = file_content,
    status = 'active',
    current_version_number = next_version,
    updated_by = current_user_id
  where id = file_row.id;

  return next_version;
end;
$$;

create or replace function public.approve_file_change_proposal(p_proposal_id uuid, p_review_note text default '')
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  proposal public.file_change_proposals%rowtype;
  file_row public.project_files%rowtype;
  current_user_id uuid := auth.uid();
  next_version integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select * into proposal from public.file_change_proposals where id = p_proposal_id for update;
  if proposal.id is null then raise exception 'Proposal not found'; end if;
  if not public.has_workspace_role(
    proposal.workspace_id,
    array['owner','admin']::public.workspace_member_role[]
  ) then raise exception 'Insufficient permissions'; end if;
  if proposal.status not in ('proposed', 'changes_requested') then raise exception 'Proposal cannot be approved from its current status'; end if;

  select * into file_row from public.project_files where id = proposal.file_id for update;
  if file_row.id is null then raise exception 'File not found'; end if;
  if file_row.current_version_number <> proposal.base_version_number then
    raise exception 'The file changed after this proposal was created';
  end if;

  next_version := file_row.current_version_number + 1;

  if octet_length(convert_to(proposal.proposed_content, 'UTF8')) > 1048576 then
    raise exception 'Proposed file exceeds the 1 MB limit';
  end if;
  if proposal.proposed_checksum <> encode(digest(convert_to(proposal.proposed_content, 'UTF8'), 'sha256'), 'hex') then
    raise exception 'Proposal checksum does not match its content';
  end if;

  insert into public.project_file_versions (
    workspace_id, project_id, repository_id, file_id, version_number,
    content_text, checksum, size_bytes, source_type, change_summary,
    proposal_id, created_by_agent_id, created_by
  ) values (
    proposal.workspace_id, proposal.project_id, proposal.repository_id, proposal.file_id, next_version,
    proposal.proposed_content, proposal.proposed_checksum, octet_length(convert_to(proposal.proposed_content, 'UTF8')),
    'proposal', coalesce(proposal.summary, ''), proposal.id, proposal.proposed_by_agent_id, current_user_id
  );

  update public.project_files set
    content_text = proposal.proposed_content,
    checksum = proposal.proposed_checksum,
    size_bytes = octet_length(convert_to(proposal.proposed_content, 'UTF8')),
    current_version_number = next_version,
    status = 'active',
    updated_by = current_user_id
  where id = proposal.file_id;

  update public.file_change_proposals set
    status = 'approved',
    review_note = coalesce(p_review_note, ''),
    approved_at = now(),
    updated_by = current_user_id
  where id = proposal.id;

  return next_version;
end;
$$;

create or replace function public.audit_repository_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  event_action text;
  entity_name text := case tg_table_name
    when 'project_repositories' then 'repository'
    when 'project_files' then 'project_file'
    when 'file_change_proposals' then 'file_change_proposal'
    else tg_table_name
  end;
begin
  if tg_op = 'INSERT' then
    event_action := entity_name || '.created';
  elsif to_jsonb(old) ->> 'status' is distinct from to_jsonb(new) ->> 'status' then
    event_action := entity_name || '.' || coalesce(to_jsonb(new) ->> 'status', 'updated');
  else
    event_action := entity_name || '.updated';
  end if;

  insert into public.audit_logs(workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    new.workspace_id,
    auth.uid(),
    event_action,
    entity_name,
    new.id,
    jsonb_build_object(
      'project_id', to_jsonb(new) ->> 'project_id',
      'repository_id', to_jsonb(new) ->> 'repository_id',
      'file_id', to_jsonb(new) ->> 'file_id',
      'path', to_jsonb(new) ->> 'path',
      'status', to_jsonb(new) ->> 'status'
    )
  );
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['project_repositories','project_files','file_change_proposals'] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
    execute format('drop trigger if exists %I_validate_scope on public.%I', table_name, table_name);
    execute format('create trigger %I_validate_scope before insert or update on public.%I for each row execute function public.validate_repository_scope()', table_name, table_name);
    execute format('drop trigger if exists %I_audit_change on public.%I', table_name, table_name);
    execute format('create trigger %I_audit_change after insert or update on public.%I for each row execute function public.audit_repository_change()', table_name, table_name);
  end loop;
end $$;

drop trigger if exists project_file_versions_validate_scope on public.project_file_versions;
create trigger project_file_versions_validate_scope before insert or update on public.project_file_versions
for each row execute function public.validate_repository_scope();

drop trigger if exists conversation_file_contexts_validate_scope on public.conversation_file_contexts;
create trigger conversation_file_contexts_validate_scope before insert or update on public.conversation_file_contexts
for each row execute function public.validate_repository_scope();

drop trigger if exists agent_file_access_logs_validate_scope on public.agent_file_access_logs;
create trigger agent_file_access_logs_validate_scope before insert or update on public.agent_file_access_logs
for each row execute function public.validate_repository_scope();

alter table public.project_repositories enable row level security;
alter table public.project_files enable row level security;
alter table public.project_file_versions enable row level security;
alter table public.file_change_proposals enable row level security;
alter table public.conversation_file_contexts enable row level security;
alter table public.agent_file_access_logs enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'project_repositories','project_files','project_file_versions',
    'file_change_proposals','conversation_file_contexts','agent_file_access_logs'
  ] loop
    execute format('drop policy if exists "%s_select_member" on public.%I', table_name, table_name);
    execute format('create policy "%s_select_member" on public.%I for select to authenticated using (public.is_workspace_member(workspace_id))', table_name, table_name);
  end loop;
end $$;

drop policy if exists "project_repositories_insert_admin" on public.project_repositories;
create policy "project_repositories_insert_admin" on public.project_repositories for insert to authenticated
with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]) and created_by = auth.uid() and updated_by = auth.uid());
drop policy if exists "project_repositories_update_admin" on public.project_repositories;
create policy "project_repositories_update_admin" on public.project_repositories for update to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]))
with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]) and updated_by = auth.uid());

drop policy if exists "project_files_insert_admin" on public.project_files;
create policy "project_files_insert_admin" on public.project_files for insert to authenticated
with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]) and created_by = auth.uid() and updated_by = auth.uid());
drop policy if exists "project_files_update_admin" on public.project_files;
create policy "project_files_update_admin" on public.project_files for update to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]))
with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]) and updated_by = auth.uid());

drop policy if exists "project_file_versions_insert_member" on public.project_file_versions;
drop policy if exists "project_file_versions_insert_admin" on public.project_file_versions;
create policy "project_file_versions_insert_admin" on public.project_file_versions for insert to authenticated
with check (
  public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[])
  and created_by = auth.uid()
);

drop policy if exists "file_change_proposals_insert_member" on public.file_change_proposals;
create policy "file_change_proposals_insert_member" on public.file_change_proposals for insert to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
  and updated_by = auth.uid()
  and status = 'proposed'
  and approved_at is null
  and archived_at is null
);
drop policy if exists "file_change_proposals_update_member" on public.file_change_proposals;
create policy "file_change_proposals_update_member" on public.file_change_proposals for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (
  public.is_workspace_member(workspace_id)
  and updated_by = auth.uid()
  and status in ('proposed', 'changes_requested', 'rejected', 'archived')
);

drop policy if exists "conversation_file_contexts_insert_member" on public.conversation_file_contexts;
create policy "conversation_file_contexts_insert_member" on public.conversation_file_contexts for insert to authenticated
with check (public.is_workspace_member(workspace_id) and added_by = auth.uid());
drop policy if exists "conversation_file_contexts_update_member" on public.conversation_file_contexts;
create policy "conversation_file_contexts_update_member" on public.conversation_file_contexts for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id) and added_by = auth.uid());
drop policy if exists "conversation_file_contexts_delete_member" on public.conversation_file_contexts;
create policy "conversation_file_contexts_delete_member" on public.conversation_file_contexts for delete to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "agent_file_access_logs_insert_actor" on public.agent_file_access_logs;
create policy "agent_file_access_logs_insert_actor" on public.agent_file_access_logs for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'nexus-repositories',
  'nexus-repositories',
  false,
  12582912,
  array['application/zip', 'application/x-zip-compressed', 'application/octet-stream']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "nexus_repositories_objects_select" on storage.objects;
create policy "nexus_repositories_objects_select" on storage.objects for select to authenticated
using (
  bucket_id = 'nexus-repositories'
  and exists (
    select 1
    from public.workspace_members wm
    join public.projects p on p.workspace_id = wm.workspace_id
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.workspace_id::text = split_part(name, '/', 1)
      and p.id::text = split_part(name, '/', 2)
      and split_part(name, '/', 3) = 'uploads'
  )
);
drop policy if exists "nexus_repositories_objects_insert" on storage.objects;
create policy "nexus_repositories_objects_insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'nexus-repositories'
  and exists (
    select 1
    from public.workspace_members wm
    join public.projects p on p.workspace_id = wm.workspace_id
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('owner', 'admin')
      and wm.workspace_id::text = split_part(name, '/', 1)
      and p.id::text = split_part(name, '/', 2)
      and split_part(name, '/', 3) = 'uploads'
  )
);
drop policy if exists "nexus_repositories_objects_update" on storage.objects;
create policy "nexus_repositories_objects_update" on storage.objects for update to authenticated
using (
  bucket_id = 'nexus-repositories'
  and exists (
    select 1
    from public.workspace_members wm
    join public.projects p on p.workspace_id = wm.workspace_id
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('owner', 'admin')
      and wm.workspace_id::text = split_part(name, '/', 1)
      and p.id::text = split_part(name, '/', 2)
      and split_part(name, '/', 3) = 'uploads'
  )
)
with check (
  bucket_id = 'nexus-repositories'
  and exists (
    select 1
    from public.workspace_members wm
    join public.projects p on p.workspace_id = wm.workspace_id
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('owner', 'admin')
      and wm.workspace_id::text = split_part(name, '/', 1)
      and p.id::text = split_part(name, '/', 2)
      and split_part(name, '/', 3) = 'uploads'
  )
);
drop policy if exists "nexus_repositories_objects_delete" on storage.objects;
create policy "nexus_repositories_objects_delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'nexus-repositories'
  and exists (
    select 1
    from public.workspace_members wm
    join public.projects p on p.workspace_id = wm.workspace_id
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('owner', 'admin')
      and wm.workspace_id::text = split_part(name, '/', 1)
      and p.id::text = split_part(name, '/', 2)
      and split_part(name, '/', 3) = 'uploads'
  )
);

grant select, insert, update on public.project_repositories to authenticated;
grant select, insert, update on public.project_files to authenticated;
grant select, insert on public.project_file_versions to authenticated;
grant select, insert, update on public.file_change_proposals to authenticated;
grant select, insert, update, delete on public.conversation_file_contexts to authenticated;
grant select, insert on public.agent_file_access_logs to authenticated;

revoke all on function public.insert_repository_file_batch(uuid,jsonb) from public;
grant execute on function public.insert_repository_file_batch(uuid,jsonb) to authenticated;
revoke all on function public.apply_repository_file_import_update(uuid,jsonb) from public;
grant execute on function public.apply_repository_file_import_update(uuid,jsonb) to authenticated;
revoke all on function public.approve_file_change_proposal(uuid,text) from public;
grant execute on function public.approve_file_change_proposal(uuid,text) to authenticated;
revoke all on function public.validate_repository_scope() from public;
revoke all on function public.audit_repository_change() from public;

commit;

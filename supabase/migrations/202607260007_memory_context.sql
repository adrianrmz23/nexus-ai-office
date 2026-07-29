begin;

create extension if not exists vector with schema extensions;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  scope_type text not null default 'project',
  title text not null,
  source_type text not null default 'upload',
  file_name text,
  mime_type text,
  file_extension text,
  size_bytes integer not null default 0,
  storage_bucket text,
  storage_path text,
  language text,
  checksum text not null,
  status text not null default 'processing',
  extraction_status text not null default 'pending',
  embedding_status text not null default 'pending',
  chunk_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint documents_scope_allowed check (scope_type in ('global', 'project', 'agent', 'conversation')),
  constraint documents_source_allowed check (source_type in ('upload', 'text', 'url', 'repository', 'conversation')),
  constraint documents_status_allowed check (status in ('processing', 'ready', 'stored_unindexed', 'failed', 'archived')),
  constraint documents_extraction_status_allowed check (extraction_status in ('pending', 'completed', 'skipped', 'failed')),
  constraint documents_embedding_status_allowed check (embedding_status in ('pending', 'completed', 'skipped', 'failed')),
  constraint documents_title_length check (char_length(trim(title)) between 1 and 180),
  constraint documents_file_name_length check (file_name is null or char_length(file_name) <= 255),
  constraint documents_size_positive check (size_bytes >= 0 and size_bytes <= 786432),
  constraint documents_checksum_format check (checksum ~ '^[a-f0-9]{64}$'),
  constraint documents_chunk_count_positive check (chunk_count >= 0),
  constraint documents_scope_shape check (
    (scope_type = 'global' and project_id is null and agent_id is null and conversation_id is null)
    or (scope_type = 'project' and project_id is not null and agent_id is null and conversation_id is null)
    or (scope_type = 'agent' and agent_id is not null and conversation_id is null)
    or (scope_type = 'conversation' and conversation_id is not null)
  )
);

create index if not exists documents_workspace_status_idx
  on public.documents(workspace_id, status, updated_at desc);
create index if not exists documents_project_status_idx
  on public.documents(workspace_id, project_id, status, updated_at desc);
create unique index if not exists documents_workspace_scope_checksum_uidx
  on public.documents(
    workspace_id,
    scope_type,
    coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(agent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(conversation_id, '00000000-0000-0000-0000-000000000000'::uuid),
    checksum
  )
  where archived_at is null;

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_estimate integer not null default 0,
  checksum text not null,
  metadata jsonb not null default '{}'::jsonb,
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(content, ''))
  ) stored,
  created_at timestamptz not null default now(),
  constraint document_chunks_index_positive check (chunk_index >= 0),
  constraint document_chunks_content_length check (char_length(content) between 1 and 12000),
  constraint document_chunks_token_positive check (token_estimate >= 0),
  constraint document_chunks_checksum_format check (checksum ~ '^[a-f0-9]{64}$'),
  unique (document_id, chunk_index)
);

create index if not exists document_chunks_workspace_document_idx
  on public.document_chunks(workspace_id, document_id, chunk_index);
create index if not exists document_chunks_project_idx
  on public.document_chunks(workspace_id, project_id, created_at desc);
create index if not exists document_chunks_search_idx
  on public.document_chunks using gin(search_vector);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  scope_type text not null default 'project',
  memory_type text not null default 'custom',
  title text not null,
  content text not null,
  importance smallint not null default 50,
  status text not null default 'active',
  source_document_id uuid references public.documents(id) on delete set null,
  source_chunk_id uuid references public.document_chunks(id) on delete set null,
  source_message_id uuid references public.messages(id) on delete set null,
  checksum text not null,
  metadata jsonb not null default '{}'::jsonb,
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) stored,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint memories_scope_allowed check (scope_type in ('global', 'project', 'agent', 'conversation')),
  constraint memories_type_allowed check (memory_type in ('preference', 'decision', 'fact', 'error_solution', 'instruction', 'summary', 'custom')),
  constraint memories_status_allowed check (status in ('active', 'inactive', 'archived')),
  constraint memories_title_length check (char_length(trim(title)) between 1 and 180),
  constraint memories_content_length check (char_length(content) between 1 and 12000),
  constraint memories_importance_range check (importance between 1 and 100),
  constraint memories_checksum_format check (checksum ~ '^[a-f0-9]{64}$'),
  constraint memories_scope_shape check (
    (scope_type = 'global' and project_id is null and agent_id is null and conversation_id is null)
    or (scope_type = 'project' and project_id is not null and agent_id is null and conversation_id is null)
    or (scope_type = 'agent' and agent_id is not null and conversation_id is null)
    or (scope_type = 'conversation' and conversation_id is not null)
  )
);

create index if not exists memories_workspace_status_idx
  on public.memories(workspace_id, status, updated_at desc);
create index if not exists memories_project_status_idx
  on public.memories(workspace_id, project_id, status, updated_at desc);
create index if not exists memories_search_idx
  on public.memories using gin(search_vector);
create unique index if not exists memories_workspace_scope_checksum_uidx
  on public.memories(
    workspace_id,
    scope_type,
    coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(agent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(conversation_id, '00000000-0000-0000-0000-000000000000'::uuid),
    checksum
  )
  where status <> 'archived';

create table if not exists public.memory_embeddings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  document_chunk_id uuid references public.document_chunks(id) on delete cascade,
  memory_id uuid references public.memories(id) on delete cascade,
  provider_id uuid references public.ai_providers(id) on delete set null,
  model_id uuid references public.ai_models(id) on delete set null,
  dimensions integer not null default 1536,
  embedding extensions.vector(1536) not null,
  content_checksum text not null,
  created_at timestamptz not null default now(),
  constraint memory_embeddings_source_exactly_one check (
    (document_chunk_id is not null and memory_id is null)
    or (document_chunk_id is null and memory_id is not null)
  ),
  constraint memory_embeddings_dimensions check (dimensions = 1536),
  constraint memory_embeddings_checksum_format check (content_checksum ~ '^[a-f0-9]{64}$')
);

create unique index if not exists memory_embeddings_chunk_uidx
  on public.memory_embeddings(document_chunk_id)
  where document_chunk_id is not null;
create unique index if not exists memory_embeddings_memory_uidx
  on public.memory_embeddings(memory_id)
  where memory_id is not null;
create index if not exists memory_embeddings_workspace_project_idx
  on public.memory_embeddings(workspace_id, project_id, created_at desc);

create table if not exists public.memory_retrieval_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  run_id uuid references public.agent_runs(id) on delete set null,
  query_text text not null,
  retrieval_mode text not null default 'none',
  result_count integer not null default 0,
  latency_ms integer not null default 0,
  sources jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint memory_retrieval_mode_allowed check (retrieval_mode in ('semantic', 'text', 'hybrid', 'none')),
  constraint memory_retrieval_count_positive check (result_count >= 0),
  constraint memory_retrieval_latency_positive check (latency_ms >= 0),
  constraint memory_retrieval_query_length check (char_length(query_text) between 1 and 12000)
);

create index if not exists memory_retrieval_logs_conversation_idx
  on public.memory_retrieval_logs(workspace_id, conversation_id, created_at desc);
create index if not exists memory_retrieval_logs_run_idx
  on public.memory_retrieval_logs(run_id);

create or replace function public.validate_memory_scope()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  entity_workspace_id uuid;
  entity_project_id uuid;
begin
  if new.project_id is not null then
    select workspace_id into entity_workspace_id from public.projects where id = new.project_id;
    if entity_workspace_id is null or entity_workspace_id <> new.workspace_id then
      raise exception 'Memory project cannot cross workspaces';
    end if;
  end if;

  if new.agent_id is not null then
    select workspace_id into entity_workspace_id from public.agents where id = new.agent_id;
    if entity_workspace_id is null or entity_workspace_id <> new.workspace_id then
      raise exception 'Memory agent cannot cross workspaces';
    end if;
  end if;

  if new.conversation_id is not null then
    select workspace_id, project_id into entity_workspace_id, entity_project_id
    from public.conversations where id = new.conversation_id;
    if entity_workspace_id is null or entity_workspace_id <> new.workspace_id then
      raise exception 'Memory conversation cannot cross workspaces';
    end if;
    if new.project_id is null then
      new.project_id := entity_project_id;
    elsif new.project_id <> entity_project_id then
      raise exception 'Memory conversation cannot cross projects';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_document_chunk_scope()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  parent public.documents%rowtype;
begin
  select * into parent from public.documents where id = new.document_id;
  if parent.id is null
    or parent.workspace_id <> new.workspace_id
    or parent.project_id is distinct from new.project_id
    or parent.agent_id is distinct from new.agent_id
    or parent.conversation_id is distinct from new.conversation_id then
    raise exception 'Document chunk cannot cross document scope';
  end if;
  return new;
end;
$$;

create or replace function public.validate_memory_embedding_scope()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  entity_workspace_id uuid;
  entity_project_id uuid;
begin
  if new.document_chunk_id is not null then
    select workspace_id, project_id into entity_workspace_id, entity_project_id
    from public.document_chunks where id = new.document_chunk_id;
  else
    select workspace_id, project_id into entity_workspace_id, entity_project_id
    from public.memories where id = new.memory_id;
  end if;

  if entity_workspace_id is null or entity_workspace_id <> new.workspace_id then
    raise exception 'Embedding source cannot cross workspaces';
  end if;
  if new.project_id is distinct from entity_project_id then
    raise exception 'Embedding source cannot cross projects';
  end if;
  return new;
end;
$$;

create or replace function public.match_memory_context(
  p_workspace_id uuid,
  p_project_id uuid,
  p_agent_id uuid,
  p_conversation_id uuid,
  p_query_embedding extensions.vector(1536),
  p_limit integer default 8
)
returns table (
  source_type text,
  source_id uuid,
  title text,
  content text,
  score double precision,
  document_id uuid,
  metadata jsonb
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with candidates as (
    select
      'document_chunk'::text as source_type,
      dc.id as source_id,
      d.title,
      dc.content,
      1 - (me.embedding <=> p_query_embedding) as score,
      d.id as document_id,
      jsonb_build_object(
        'fileName', d.file_name,
        'scopeType', d.scope_type,
        'chunkIndex', dc.chunk_index,
        'language', d.language
      ) || dc.metadata as metadata
    from public.memory_embeddings me
    join public.document_chunks dc on dc.id = me.document_chunk_id
    join public.documents d on d.id = dc.document_id
    where me.workspace_id = p_workspace_id
      and public.is_workspace_member(p_workspace_id)
      and d.status = 'ready'
      and (
        d.scope_type = 'global'
        or (d.scope_type = 'project' and d.project_id = p_project_id)
        or (d.scope_type = 'agent' and d.agent_id = p_agent_id and (d.project_id is null or d.project_id = p_project_id))
        or (d.scope_type = 'conversation' and d.conversation_id = p_conversation_id)
      )

    union all

    select
      'memory'::text as source_type,
      m.id as source_id,
      m.title,
      m.content,
      (1 - (me.embedding <=> p_query_embedding)) * (0.75 + (m.importance::double precision / 400.0)) as score,
      m.source_document_id as document_id,
      jsonb_build_object(
        'scopeType', m.scope_type,
        'memoryType', m.memory_type,
        'importance', m.importance
      ) || m.metadata as metadata
    from public.memory_embeddings me
    join public.memories m on m.id = me.memory_id
    where me.workspace_id = p_workspace_id
      and public.is_workspace_member(p_workspace_id)
      and m.status = 'active'
      and (
        m.scope_type = 'global'
        or (m.scope_type = 'project' and m.project_id = p_project_id)
        or (m.scope_type = 'agent' and m.agent_id = p_agent_id and (m.project_id is null or m.project_id = p_project_id))
        or (m.scope_type = 'conversation' and m.conversation_id = p_conversation_id)
      )
  )
  select * from candidates
  order by score desc
  limit least(greatest(p_limit, 1), 20);
$$;

create or replace function public.search_memory_context(
  p_workspace_id uuid,
  p_project_id uuid,
  p_agent_id uuid,
  p_conversation_id uuid,
  p_query text,
  p_limit integer default 8
)
returns table (
  source_type text,
  source_id uuid,
  title text,
  content text,
  score double precision,
  document_id uuid,
  metadata jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with query as (
    select plainto_tsquery('simple', trim(p_query)) as value
  ), candidates as (
    select
      'document_chunk'::text as source_type,
      dc.id as source_id,
      d.title,
      dc.content,
      greatest(
        ts_rank_cd(dc.search_vector, query.value)::double precision,
        case when position(lower(trim(p_query)) in lower(dc.content)) > 0 then 0.45 else 0 end
      ) as score,
      d.id as document_id,
      jsonb_build_object(
        'fileName', d.file_name,
        'scopeType', d.scope_type,
        'chunkIndex', dc.chunk_index,
        'language', d.language
      ) || dc.metadata as metadata
    from public.document_chunks dc
    join public.documents d on d.id = dc.document_id
    cross join query
    where dc.workspace_id = p_workspace_id
      and public.is_workspace_member(p_workspace_id)
      and d.status = 'ready'
      and (
        dc.search_vector @@ query.value
        or position(lower(trim(p_query)) in lower(dc.content)) > 0
      )
      and (
        d.scope_type = 'global'
        or (d.scope_type = 'project' and d.project_id = p_project_id)
        or (d.scope_type = 'agent' and d.agent_id = p_agent_id and (d.project_id is null or d.project_id = p_project_id))
        or (d.scope_type = 'conversation' and d.conversation_id = p_conversation_id)
      )

    union all

    select
      'memory'::text as source_type,
      m.id as source_id,
      m.title,
      m.content,
      greatest(
        ts_rank_cd(m.search_vector, query.value)::double precision,
        case when position(lower(trim(p_query)) in lower(m.title || ' ' || m.content)) > 0 then 0.5 else 0 end
      ) * (0.75 + (m.importance::double precision / 400.0)) as score,
      m.source_document_id as document_id,
      jsonb_build_object(
        'scopeType', m.scope_type,
        'memoryType', m.memory_type,
        'importance', m.importance
      ) || m.metadata as metadata
    from public.memories m
    cross join query
    where m.workspace_id = p_workspace_id
      and public.is_workspace_member(p_workspace_id)
      and m.status = 'active'
      and (
        m.search_vector @@ query.value
        or position(lower(trim(p_query)) in lower(m.title || ' ' || m.content)) > 0
      )
      and (
        m.scope_type = 'global'
        or (m.scope_type = 'project' and m.project_id = p_project_id)
        or (m.scope_type = 'agent' and m.agent_id = p_agent_id and (m.project_id is null or m.project_id = p_project_id))
        or (m.scope_type = 'conversation' and m.conversation_id = p_conversation_id)
      )
  )
  select * from candidates
  where score > 0
  order by score desc
  limit least(greatest(p_limit, 1), 20);
$$;

create or replace function public.audit_memory_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  action_name text;
begin
  if tg_op = 'INSERT' then
    action_name := lower(tg_table_name) || '.created';
  elsif old.status is distinct from new.status then
    action_name := lower(tg_table_name) || '.status_changed';
  else
    action_name := lower(tg_table_name) || '.updated';
  end if;

  insert into public.audit_logs(workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    new.workspace_id,
    auth.uid(),
    action_name,
    tg_table_name,
    new.id,
    jsonb_build_object('status', new.status, 'scopeType', new.scope_type)
  );
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at before update on public.documents
for each row execute function public.set_updated_at();
drop trigger if exists memories_set_updated_at on public.memories;
create trigger memories_set_updated_at before update on public.memories
for each row execute function public.set_updated_at();

drop trigger if exists documents_validate_scope on public.documents;
create trigger documents_validate_scope before insert or update on public.documents
for each row execute function public.validate_memory_scope();
drop trigger if exists memories_validate_scope on public.memories;
create trigger memories_validate_scope before insert or update on public.memories
for each row execute function public.validate_memory_scope();
drop trigger if exists document_chunks_validate_scope on public.document_chunks;
create trigger document_chunks_validate_scope before insert or update on public.document_chunks
for each row execute function public.validate_document_chunk_scope();
drop trigger if exists memory_embeddings_validate_scope on public.memory_embeddings;
create trigger memory_embeddings_validate_scope before insert or update on public.memory_embeddings
for each row execute function public.validate_memory_embedding_scope();

drop trigger if exists documents_audit_change on public.documents;
create trigger documents_audit_change after insert or update on public.documents
for each row execute function public.audit_memory_change();
drop trigger if exists memories_audit_change on public.memories;
create trigger memories_audit_change after insert or update on public.memories
for each row execute function public.audit_memory_change();

alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.memories enable row level security;
alter table public.memory_embeddings enable row level security;
alter table public.memory_retrieval_logs enable row level security;

drop policy if exists "documents_select_member" on public.documents;
create policy "documents_select_member" on public.documents for select to authenticated
using (public.is_workspace_member(workspace_id));
drop policy if exists "documents_insert_member" on public.documents;
create policy "documents_insert_member" on public.documents for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid() and updated_by = auth.uid());
drop policy if exists "documents_update_creator_or_admin" on public.documents;
create policy "documents_update_creator_or_admin" on public.documents for update to authenticated
using (created_by = auth.uid() or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "document_chunks_select_member" on public.document_chunks;
create policy "document_chunks_select_member" on public.document_chunks for select to authenticated
using (public.is_workspace_member(workspace_id));
drop policy if exists "document_chunks_insert_member" on public.document_chunks;
create policy "document_chunks_insert_member" on public.document_chunks for insert to authenticated
with check (public.is_workspace_member(workspace_id));

drop policy if exists "memories_select_member" on public.memories;
create policy "memories_select_member" on public.memories for select to authenticated
using (public.is_workspace_member(workspace_id));
drop policy if exists "memories_insert_member" on public.memories;
create policy "memories_insert_member" on public.memories for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid() and updated_by = auth.uid());
drop policy if exists "memories_update_creator_or_admin" on public.memories;
create policy "memories_update_creator_or_admin" on public.memories for update to authenticated
using (created_by = auth.uid() or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_member_role[]))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "memory_embeddings_select_member" on public.memory_embeddings;
create policy "memory_embeddings_select_member" on public.memory_embeddings for select to authenticated
using (public.is_workspace_member(workspace_id));
drop policy if exists "memory_embeddings_insert_member" on public.memory_embeddings;
create policy "memory_embeddings_insert_member" on public.memory_embeddings for insert to authenticated
with check (public.is_workspace_member(workspace_id));

drop policy if exists "memory_retrieval_logs_select_member" on public.memory_retrieval_logs;
create policy "memory_retrieval_logs_select_member" on public.memory_retrieval_logs for select to authenticated
using (public.is_workspace_member(workspace_id));
drop policy if exists "memory_retrieval_logs_insert_actor" on public.memory_retrieval_logs;
create policy "memory_retrieval_logs_insert_actor" on public.memory_retrieval_logs for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'nexus-memory',
  'nexus-memory',
  false,
  786432,
  array[
    'text/plain', 'text/markdown', 'text/csv', 'text/html', 'text/css',
    'text/javascript', 'text/typescript', 'text/yaml', 'text/x-python',
    'text/x-java-source', 'text/x-c', 'text/x-c++src', 'text/x-go', 'text/x-ruby',
    'application/json', 'application/xml', 'application/sql', 'application/pdf',
    'application/javascript', 'application/typescript', 'application/x-typescript',
    'application/x-httpd-php', 'application/x-sh', 'application/yaml',
    'application/x-liquid', 'application/zip', 'application/octet-stream', 'video/mp2t'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "nexus_memory_objects_select" on storage.objects;
create policy "nexus_memory_objects_select" on storage.objects for select to authenticated
using (
  bucket_id = 'nexus-memory'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);
drop policy if exists "nexus_memory_objects_insert" on storage.objects;
create policy "nexus_memory_objects_insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'nexus-memory'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);
drop policy if exists "nexus_memory_objects_update" on storage.objects;
create policy "nexus_memory_objects_update" on storage.objects for update to authenticated
using (
  bucket_id = 'nexus-memory'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'nexus-memory'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);
drop policy if exists "nexus_memory_objects_delete" on storage.objects;
create policy "nexus_memory_objects_delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'nexus-memory'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);

grant select, insert, update on public.documents to authenticated;
grant select, insert on public.document_chunks to authenticated;
grant select, insert, update on public.memories to authenticated;
grant select, insert on public.memory_embeddings to authenticated;
grant select, insert on public.memory_retrieval_logs to authenticated;

revoke all on function public.match_memory_context(uuid,uuid,uuid,uuid,extensions.vector,integer) from public;
grant execute on function public.match_memory_context(uuid,uuid,uuid,uuid,extensions.vector,integer) to authenticated;
revoke all on function public.search_memory_context(uuid,uuid,uuid,uuid,text,integer) from public;
grant execute on function public.search_memory_context(uuid,uuid,uuid,uuid,text,integer) to authenticated;
revoke all on function public.validate_memory_scope() from public;
revoke all on function public.validate_document_chunk_scope() from public;
revoke all on function public.validate_memory_embedding_scope() from public;
revoke all on function public.audit_memory_change() from public;

commit;

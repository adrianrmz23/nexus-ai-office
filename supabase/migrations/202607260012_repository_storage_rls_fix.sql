begin;

-- Corrige la resolución ambigua de "name" en storage.objects. El nombre
-- de la ruta debe leerse explícitamente desde storage.objects.name.
drop policy if exists "nexus_repositories_objects_select" on storage.objects;
create policy "nexus_repositories_objects_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'nexus-repositories'
  and exists (
    select 1
    from public.workspace_members wm
    join public.projects p on p.workspace_id = wm.workspace_id
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.workspace_id::text = split_part(storage.objects.name, '/', 1)
      and p.id::text = split_part(storage.objects.name, '/', 2)
      and split_part(storage.objects.name, '/', 3) = 'uploads'
  )
);

drop policy if exists "nexus_repositories_objects_insert" on storage.objects;
create policy "nexus_repositories_objects_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'nexus-repositories'
  and exists (
    select 1
    from public.workspace_members wm
    join public.projects p on p.workspace_id = wm.workspace_id
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('owner', 'admin')
      and wm.workspace_id::text = split_part(storage.objects.name, '/', 1)
      and p.id::text = split_part(storage.objects.name, '/', 2)
      and split_part(storage.objects.name, '/', 3) = 'uploads'
  )
);

drop policy if exists "nexus_repositories_objects_update" on storage.objects;
create policy "nexus_repositories_objects_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'nexus-repositories'
  and exists (
    select 1
    from public.workspace_members wm
    join public.projects p on p.workspace_id = wm.workspace_id
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('owner', 'admin')
      and wm.workspace_id::text = split_part(storage.objects.name, '/', 1)
      and p.id::text = split_part(storage.objects.name, '/', 2)
      and split_part(storage.objects.name, '/', 3) = 'uploads'
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
      and wm.workspace_id::text = split_part(storage.objects.name, '/', 1)
      and p.id::text = split_part(storage.objects.name, '/', 2)
      and split_part(storage.objects.name, '/', 3) = 'uploads'
  )
);

drop policy if exists "nexus_repositories_objects_delete" on storage.objects;
create policy "nexus_repositories_objects_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'nexus-repositories'
  and exists (
    select 1
    from public.workspace_members wm
    join public.projects p on p.workspace_id = wm.workspace_id
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('owner', 'admin')
      and wm.workspace_id::text = split_part(storage.objects.name, '/', 1)
      and p.id::text = split_part(storage.objects.name, '/', 2)
      and split_part(storage.objects.name, '/', 3) = 'uploads'
  )
);

commit;

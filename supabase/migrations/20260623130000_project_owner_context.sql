begin;

create table if not exists public.project_owner_context (
  project_id uuid primary key references public.projects(id) on delete cascade,
  owner_name text not null,
  known_lot_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_owner_context_owner_name_not_blank check (
    length(trim(owner_name)) > 0
  ),
  constraint project_owner_context_known_lot_number_not_blank check (
    known_lot_number is null or length(trim(known_lot_number)) > 0
  )
);

create trigger project_owner_context_set_updated_at
before update on public.project_owner_context
for each row execute function public.set_updated_at();

alter table public.project_owner_context enable row level security;

grant select, insert, update, delete
on public.project_owner_context
to service_role;

comment on table public.project_owner_context is
  'Contexte propriétaire vendeur saisi manuellement pour rattacher les informations au bon copropriétaire.';

comment on column public.project_owner_context.owner_name is
  'Nom du propriétaire vendeur, compatible personne physique, SCI ou indivision.';

comment on column public.project_owner_context.known_lot_number is
  'Numéro de lot connu optionnel, saisi manuellement.';

commit;

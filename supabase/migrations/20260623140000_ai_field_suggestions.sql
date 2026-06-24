begin;

create table if not exists public.ai_field_suggestions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  field_id text not null,
  value jsonb,
  normalized_value text,
  confidence numeric(5, 2) not null,
  should_apply boolean not null default false,
  source_document_id uuid references public.documents(id) on delete set null,
  source_document_filename text,
  source_page integer,
  source_excerpt text,
  reasoning text,
  model text not null,
  prompt_version text not null,
  status text not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_field_suggestions_field_id_not_blank check (length(trim(field_id)) > 0),
  constraint ai_field_suggestions_confidence_range check (confidence between 0 and 100),
  constraint ai_field_suggestions_source_page_positive check (
    source_page is null or source_page > 0
  ),
  constraint ai_field_suggestions_source_excerpt_length check (
    source_excerpt is null or length(source_excerpt) <= 200
  ),
  constraint ai_field_suggestions_reasoning_length check (
    reasoning is null or length(reasoning) <= 500
  ),
  constraint ai_field_suggestions_status_allowed check (
    status in ('proposed', 'applied', 'rejected', 'obsolete')
  )
);

create index if not exists ai_field_suggestions_project_id_idx
  on public.ai_field_suggestions(project_id);

create index if not exists ai_field_suggestions_project_field_idx
  on public.ai_field_suggestions(project_id, field_id);

create unique index if not exists ai_field_suggestions_active_prompt_idx
  on public.ai_field_suggestions(project_id, field_id, prompt_version)
  where status = 'proposed';

create trigger ai_field_suggestions_set_updated_at
before update on public.ai_field_suggestions
for each row execute function public.set_updated_at();

alter table public.ai_field_suggestions enable row level security;

grant select, insert, update, delete
on public.ai_field_suggestions
to service_role;

comment on table public.ai_field_suggestions is
  'Propositions IA séparées des champs extraits. Elles ne sont jamais appliquées automatiquement.';

comment on column public.ai_field_suggestions.source_excerpt is
  'Court extrait justificatif limité à 200 caractères. Le texte complet envoyé à l’IA n’est jamais stocké.';

commit;

begin;

create type public.classification_status as enum (
  'pending',
  'processing',
  'classified',
  'uncertain',
  'insufficient_text',
  'failed'
);

alter type public.document_type add value if not exists 'fiche_synthetique' before 'other';
alter type public.document_type add value if not exists 'dtg' before 'other';
alter type public.document_type add value if not exists 'ppt' before 'other';
alter type public.document_type add value if not exists 'dpe_collectif' before 'other';

alter table public.documents
  add column classification_status public.classification_status not null default 'pending',
  add column classification_version text,
  add column classification_details jsonb,
  add column classified_at timestamptz;

create index documents_classification_status_idx
  on public.documents(classification_status);

comment on column public.documents.classification_details is
  'Scores et identifiants de signaux uniquement. Le texte extrait du PDF ne doit jamais y etre stocke.';

commit;

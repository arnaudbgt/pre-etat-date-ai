begin;

create schema if not exists extensions;
create extension if not exists citext with schema extensions;

create type public.project_status as enum (
  'draft',
  'processing',
  'review',
  'awaiting_payment',
  'completed',
  'failed',
  'expired'
);

create type public.document_type as enum (
  'unknown',
  'appel_de_fonds',
  'releve_coproprietaire',
  'pv_ag',
  'annexe_comptable',
  'reglement_copropriete',
  'other'
);

create type public.document_processing_status as enum (
  'pending',
  'processing',
  'processed',
  'failed',
  'deleted'
);

create type public.field_status as enum (
  'confirmed',
  'uncertain',
  'missing',
  'inconsistent'
);

create type public.report_status as enum (
  'draft',
  'preview',
  'ready',
  'expired',
  'failed'
);

create type public.payment_status as enum (
  'pending',
  'paid',
  'failed',
  'refunded',
  'expired'
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  email extensions.citext not null,
  property_address text not null,
  status public.project_status not null default 'draft',
  download_token_hash text,
  download_token_expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_email_not_blank check (length(trim(email::text)) > 0),
  constraint projects_property_address_not_blank check (length(trim(property_address)) > 0),
  constraint projects_download_token_pair check (
    (download_token_hash is null and download_token_expires_at is null)
    or (download_token_hash is not null and download_token_expires_at is not null)
  )
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  filename text not null,
  storage_path text,
  mime_type text not null default 'application/pdf',
  size_bytes bigint,
  document_type public.document_type not null default 'unknown',
  classification_confidence numeric(5, 2),
  detected_syndic text,
  processing_status public.document_processing_status not null default 'pending',
  error_message text,
  auto_delete_after timestamptz,
  deleted_at timestamptz,
  deleted_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_filename_not_blank check (length(trim(filename)) > 0),
  constraint documents_size_bytes_non_negative check (size_bytes is null or size_bytes >= 0),
  constraint documents_classification_confidence_range check (
    classification_confidence is null
    or classification_confidence between 0 and 100
  ),
  constraint documents_deleted_metadata check (
    (deleted_at is null and deleted_reason is null)
    or (deleted_at is not null and deleted_reason is not null)
  )
);

create table public.extracted_fields (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  field_id text not null,
  label text not null,
  section text not null,
  value jsonb,
  normalized_value text,
  confidence numeric(5, 2),
  status public.field_status not null default 'missing',
  source_document_id uuid references public.documents(id) on delete set null,
  manually_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint extracted_fields_project_field_unique unique (project_id, field_id),
  constraint extracted_fields_field_id_not_blank check (length(trim(field_id)) > 0),
  constraint extracted_fields_label_not_blank check (length(trim(label)) > 0),
  constraint extracted_fields_section_not_blank check (length(trim(section)) > 0),
  constraint extracted_fields_confidence_range check (
    confidence is null or confidence between 0 and 100
  )
);

create table public.extracted_field_sources (
  extracted_field_id uuid not null references public.extracted_fields(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  source_value jsonb,
  confidence numeric(5, 2),
  source_locator jsonb,
  source_page integer,
  source_excerpt text,
  created_at timestamptz not null default now(),
  primary key (extracted_field_id, document_id),
  constraint extracted_field_sources_confidence_range check (
    confidence is null or confidence between 0 and 100
  ),
  constraint extracted_field_sources_page_positive check (
    source_page is null or source_page > 0
  ),
  constraint extracted_field_sources_excerpt_length check (
    source_excerpt is null or length(source_excerpt) <= 2000
  )
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  report_type text not null default 'pre_etat_date',
  completion_rate numeric(5, 2) not null default 0,
  confidence_score numeric(5, 2) not null default 0,
  status public.report_status not null default 'draft',
  pdf_storage_path text,
  is_watermarked boolean not null default true,
  user_validated boolean not null default false,
  user_validation_checkbox_label text,
  validated_at timestamptz,
  validation_ip inet,
  final_pdf_generated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_report_type_not_blank check (length(trim(report_type)) > 0),
  constraint reports_completion_rate_range check (completion_rate between 0 and 100),
  constraint reports_confidence_score_range check (confidence_score between 0 and 100),
  constraint reports_validation_consistency check (
    (user_validated = false and validated_at is null and validation_ip is null)
    or (user_validated = true and validated_at is not null)
  )
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stripe_session_id text,
  amount integer not null,
  currency text not null default 'EUR',
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amount_non_negative check (amount >= 0),
  constraint payments_currency_iso_length check (currency ~ '^[A-Z]{3}$')
);

create index projects_email_idx on public.projects(email);
create index projects_status_idx on public.projects(status);
create index documents_project_id_idx on public.documents(project_id);
create index documents_processing_status_idx on public.documents(processing_status);
create index documents_auto_delete_after_idx
  on public.documents(auto_delete_after)
  where auto_delete_after is not null;
create index extracted_fields_project_id_idx on public.extracted_fields(project_id);
create index extracted_fields_status_idx on public.extracted_fields(status);
create index extracted_field_sources_document_id_idx
  on public.extracted_field_sources(document_id);
create index reports_expires_at_idx
  on public.reports(expires_at)
  where expires_at is not null;
create index payments_project_id_idx on public.payments(project_id);
create unique index payments_stripe_session_id_idx
  on public.payments(stripe_session_id)
  where stripe_session_id is not null;

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create trigger extracted_fields_set_updated_at
before update on public.extracted_fields
for each row execute function public.set_updated_at();

create trigger reports_set_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.documents enable row level security;
alter table public.extracted_fields enable row level security;
alter table public.extracted_field_sources enable row level security;
alter table public.reports enable row level security;
alter table public.payments enable row level security;

comment on table public.documents is
  'Metadonnees documentaires uniquement. Les fichiers PDF sources ne sont jamais stockes dans PostgreSQL.';
comment on column public.documents.storage_path is
  'Chemin temporaire reserve au stockage objet prive du Sprint 2.';
comment on column public.extracted_field_sources.source_excerpt is
  'Court extrait justificatif uniquement (2000 caracteres maximum), jamais le texte OCR complet.';
comment on column public.reports.pdf_storage_path is
  'Chemin dans un stockage objet prive ; une URL signee devra etre generee a la demande.';

commit;

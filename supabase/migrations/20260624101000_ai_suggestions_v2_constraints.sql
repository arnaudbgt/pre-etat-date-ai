alter table public.documents
  drop constraint if exists documents_document_type_override_allowed;

alter table public.documents
  add constraint documents_document_type_override_allowed check (
    document_type_override is null
    or document_type_override in (
      'appel_de_fonds',
      'releve_coproprietaire',
      'pv_ag',
      'annexe_comptable',
      'reglement_copropriete',
      'fiche_synthetique',
      'dtg',
      'ppt',
      'dpe_collectif',
      'titre_propriete',
      'other'
    )
  );

alter table public.ai_field_suggestions
  drop constraint if exists ai_field_suggestions_status_allowed;

alter table public.ai_field_suggestions
  add constraint ai_field_suggestions_status_allowed check (
    status in (
      'proposed',
      'proposed_review',
      'proposed_conflict',
      'rejected',
      'obsolete'
    )
  );

alter table public.ai_field_suggestions
  add column if not exists suggestion_origin text not null default 'ai';

alter table public.ai_field_suggestions
  drop constraint if exists ai_field_suggestions_origin_allowed;

alter table public.ai_field_suggestions
  add constraint ai_field_suggestions_origin_allowed check (
    suggestion_origin in ('ai')
  );

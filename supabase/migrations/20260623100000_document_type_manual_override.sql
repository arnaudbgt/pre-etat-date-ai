begin;

alter table public.documents
  add column if not exists document_type_override public.document_type,
  add column if not exists is_document_type_manual boolean not null default false;

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
      'other'
    )
  );

comment on column public.documents.document_type_override is
  'Correction manuelle du type documentaire. Le type automatique reste conserve dans document_type.';

comment on column public.documents.is_document_type_manual is
  'Indique si le type effectif du document provient d’une correction manuelle.';

commit;

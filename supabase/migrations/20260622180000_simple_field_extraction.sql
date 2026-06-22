begin;

alter table public.extracted_fields
  add column extraction_version text not null default 'unversioned';

alter table public.extracted_field_sources
  add column matched_rule text;

update public.extracted_field_sources
set source_excerpt = left(source_excerpt, 200)
where length(source_excerpt) > 200;

alter table public.extracted_field_sources
  drop constraint extracted_field_sources_excerpt_length;

alter table public.extracted_field_sources
  add constraint extracted_field_sources_excerpt_length check (
    source_excerpt is null or length(source_excerpt) <= 200
  );

comment on column public.extracted_fields.extraction_version is
  'Version du moteur ayant produit ou recalcule la valeur canonique.';

comment on column public.extracted_field_sources.matched_rule is
  'Identifiant stable de la regle deterministe ayant produit la source.';

commit;

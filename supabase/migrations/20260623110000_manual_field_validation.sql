begin;

alter table public.extracted_fields
  add column if not exists edited_by_user_at timestamptz,
  add column if not exists field_origin text not null default 'automatic';

alter table public.extracted_fields
  drop constraint if exists extracted_fields_field_origin_allowed;

alter table public.extracted_fields
  add constraint extracted_fields_field_origin_allowed check (
    field_origin in ('automatic', 'manual', 'validated')
  );

comment on column public.extracted_fields.field_origin is
  'Origine UX du champ : automatic, manual ou validated.';

comment on column public.extracted_fields.edited_by_user_at is
  'Date de validation ou correction manuelle par l’utilisateur.';

commit;

export const SIMPLE_EXTRACTION_VERSION = "simple-rules-v1";

export const SIMPLE_FIELD_DEFINITIONS = [
  { fieldId: "syndic_name", label: "Nom du syndic", section: "syndic" },
  {
    fieldId: "syndic_manager",
    label: "Gestionnaire de copropriété",
    section: "syndic",
  },
  { fieldId: "syndic_address", label: "Adresse du syndic", section: "syndic" },
  { fieldId: "syndic_phone", label: "Téléphone du syndic", section: "syndic" },
  { fieldId: "syndic_email", label: "Email du syndic", section: "syndic" },
  {
    fieldId: "property_address",
    label: "Adresse de la copropriété",
    section: "identification_immeuble",
  },
  {
    fieldId: "approval_date",
    label: "Date d’approbation des comptes",
    section: "charges_copropriete",
  },
  {
    fieldId: "last_ago_date",
    label: "Date de la dernière AG ordinaire",
    section: "informations_complementaires",
  },
  {
    fieldId: "last_age_date",
    label: "Date de la dernière AG extraordinaire",
    section: "informations_complementaires",
  },
  {
    fieldId: "syndic_mandate_start",
    label: "Début du mandat du syndic",
    section: "syndic",
  },
  {
    fieldId: "syndic_mandate_end",
    label: "Fin du mandat du syndic",
    section: "syndic",
  },
] as const;

export type SimpleFieldId =
  (typeof SIMPLE_FIELD_DEFINITIONS)[number]["fieldId"];

export const SIMPLE_FIELD_BY_ID = Object.fromEntries(
  SIMPLE_FIELD_DEFINITIONS.map((field) => [field.fieldId, field]),
) as Record<SimpleFieldId, (typeof SIMPLE_FIELD_DEFINITIONS)[number]>;

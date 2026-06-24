import type { TextPage } from "@/lib/classification/types";

export type OwnerReference = {
  confidence: number;
  lot_descriptions: string[];
  lot_numbers: string[];
  lot_tantiemes: string[];
  owner_name: string | null;
  owner_type: "personne_morale" | "personne_physique" | "inconnu";
  property_address: string | null;
  source_document_filename: string;
  source_document_id: string;
  source_excerpt: string | null;
  source_page: number | null;
};

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    pattern.lastIndex = 0;
    if (match?.[1]) return compact(match[1]);
  }

  return null;
}

function ownerType(ownerName: string | null): OwnerReference["owner_type"] {
  if (!ownerName) return "inconnu";

  if (/\b(?:SCI|SAS|SARL|SOCI[ÉE]T[ÉE]|INDIVISION|SCM|SNC)\b/i.test(ownerName)) {
    return "personne_morale";
  }

  return "personne_physique";
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map(compact).filter(Boolean))];
}

function bestSourcePage(pages: TextPage[], patterns: RegExp[]) {
  return (
    pages.find((page) =>
      patterns.some((pattern) => {
        const matched = pattern.test(page.text);
        pattern.lastIndex = 0;
        return matched;
      }),
    ) ?? pages[0]
  );
}

export function buildOwnerReferenceFromTitle(input: {
  document: { filename: string; id: string };
  pages: TextPage[];
}): OwnerReference | null {
  const joined = input.pages
    .slice(0, 12)
    .map((page) => `PAGE ${page.pageNumber}\n${page.text}`)
    .join("\n\n");

  const ownerName = firstMatch(joined, [
    /(?:acqu[ée]reur|propri[ée]taire)\s*[:\-]\s*([^\n]{3,140})/i,
    /(?:vendu\s+[àa]|attribu[ée]\s+[àa]|appartenant\s+[àa])\s+([A-ZÀ-Ÿ][^\n]{3,140})/i,
    /(?:la\s+soci[ée]t[ée]|la\s+SCI|l'indivision)\s+([A-ZÀ-Ÿ][^\n]{3,140})/i,
  ]);
  const propertyAddress = firstMatch(joined, [
    /(?:immeuble\s+sis|bien\s+sis|adresse\s+du\s+bien)\s*[:\-]?\s*([^\n]{8,200})/i,
    /d[ée]signation\s+(?:du\s+)?bien\s*[:\-]?\s*([^\n]{8,200})/i,
  ]);
  const lotNumbers = uniqueValues(
    [...joined.matchAll(/(?:lot|lots?)\s*(?:n[°o])?\s*([A-Z0-9][A-Z0-9.-]{0,12})/gi)]
      .map((match) => match[1])
      .slice(0, 12),
  );
  const lotDescriptions = uniqueValues(
    [...joined.matchAll(/(?:lot|lots?)\s*(?:n[°o])?\s*[A-Z0-9.-]+\s*[:\-]?\s*([^\n]{4,80})/gi)]
      .map((match) => match[1])
      .filter((value) => /appartement|garage|cave|parking|grenier|local/i.test(value))
      .slice(0, 8),
  );
  const lotTantiemes = uniqueValues(
    [...joined.matchAll(/(\d{1,7}\s*\/\s*\d{2,10})\s*(?:tanti[èe]mes|milli[èe]mes)?/gi)]
      .map((match) => match[1].replace(/\s+/g, ""))
      .slice(0, 12),
  );

  if (
    !ownerName &&
    !propertyAddress &&
    lotNumbers.length === 0 &&
    lotTantiemes.length === 0
  ) {
    return null;
  }

  const sourcePage = bestSourcePage(input.pages, [
    /acqu[ée]reur|propri[ée]taire|SCI|indivision/i,
    /lot|tanti[èe]mes|milli[èe]mes/i,
    /immeuble\s+sis|bien\s+sis|d[ée]signation/i,
  ]);
  const confidence =
    ownerName && lotNumbers.length > 0 && propertyAddress
      ? 97
      : ownerName || lotNumbers.length > 0
        ? 88
        : 72;

  return {
    confidence,
    lot_descriptions: lotDescriptions,
    lot_numbers: lotNumbers,
    lot_tantiemes: lotTantiemes,
    owner_name: ownerName,
    owner_type: ownerType(ownerName),
    property_address: propertyAddress,
    source_document_filename: input.document.filename,
    source_document_id: input.document.id,
    source_excerpt:
      compact(sourcePage?.text ?? joined).slice(0, 200) || null,
    source_page: sourcePage?.pageNumber ?? null,
  };
}

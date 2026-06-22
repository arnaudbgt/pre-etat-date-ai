import type { TextPage } from "@/lib/classification/types";

import {
  findDates,
  normalizeComparable,
  normalizePhone,
  sourceExcerpt,
} from "./normalization";
import type { SimpleExtractionContext, SimpleFieldCandidate } from "./types";

const CONTACT_DOCUMENT_TYPES = new Set([
  "appel_de_fonds",
  "releve_coproprietaire",
  "pv_ag",
  "fiche_synthetique",
]);

const PROPERTY_DOCUMENT_TYPES = new Set([
  "appel_de_fonds",
  "releve_coproprietaire",
  "pv_ag",
  "fiche_synthetique",
  "reglement_copropriete",
]);

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?:\+33|0033|0)[1-9](?:[\s.()\-]*\d{2}){4}\b/g;
const ADDRESS_PATTERN =
  /\b\d{1,4}(?:\s*(?:bis|ter))?\s+(?:rue|avenue|av\.?|boulevard|bd\.?|chemin|impasse|allee|allée|place|route|quai|cours|square)\s+[^\n,;]{2,70}(?:(?:,|\s)+\d{5}\s+[A-Za-zÀ-ÿ'’\- ]{2,50})?/i;

function adjustedConfidence(
  confidence: number,
  context: SimpleExtractionContext,
) {
  if (context.classificationStatus === "uncertain") {
    return Math.min(84, Math.max(0, confidence - 15));
  }

  return confidence;
}

function cleanValue(value: string, maximumLength = 160) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^(?:[:\-–—]|\s)+/, "")
    .replace(
      /\s+(?:adresse|t[ée]l(?:[ée]phone)?|email|courriel)\s*[:\-].*$/i,
      "",
    )
    .trim()
    .slice(0, maximumLength);
}

function candidate(
  context: SimpleExtractionContext,
  page: TextPage,
  fieldId: SimpleFieldCandidate["fieldId"],
  value: string,
  confidence: number,
  matchedRule: string,
  start: number,
  end: number,
  normalize: (input: string) => string = normalizeComparable,
): SimpleFieldCandidate | null {
  const cleaned = cleanValue(value);

  if (!cleaned) {
    return null;
  }

  return {
    confidence: adjustedConfidence(confidence, context),
    excerpt: sourceExcerpt(page.text, start, end),
    fieldId,
    matchedRule,
    normalizedValue: normalize(cleaned),
    page: page.pageNumber,
    value: cleaned,
  };
}

function addLabeledCandidate(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
  fieldId: SimpleFieldCandidate["fieldId"],
  pattern: RegExp,
  confidence: number,
  matchedRule: string,
) {
  for (const page of context.pages) {
    const match = pattern.exec(page.text);
    pattern.lastIndex = 0;

    if (!match || match.index === undefined || !match[1]) {
      continue;
    }

    const found = candidate(
      context,
      page,
      fieldId,
      match[1],
      confidence,
      matchedRule,
      match.index,
      match.index + match[0].length,
    );

    if (found) {
      candidates.push(found);
      return;
    }
  }
}

function addAddressNearMarker(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
  fieldId: "property_address" | "syndic_address",
  marker: RegExp,
  confidence: number,
  matchedRule: string,
) {
  for (const page of context.pages) {
    const markerMatch = marker.exec(page.text);
    marker.lastIndex = 0;

    if (!markerMatch || markerMatch.index === undefined) {
      continue;
    }

    const window = page.text.slice(markerMatch.index, markerMatch.index + 350);
    const addressMatch = ADDRESS_PATTERN.exec(window);
    ADDRESS_PATTERN.lastIndex = 0;

    if (!addressMatch || addressMatch.index === undefined) {
      continue;
    }

    const start = markerMatch.index + addressMatch.index;
    const found = candidate(
      context,
      page,
      fieldId,
      addressMatch[0],
      confidence,
      matchedRule,
      start,
      start + addressMatch[0].length,
    );

    if (found) {
      candidates.push(found);
      return;
    }
  }
}

function addContactCandidates(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
) {
  addLabeledCandidate(
    candidates,
    context,
    "syndic_name",
    /(?:^|\n)\s*(?:syndic(?:\s+de\s+copropri[ée]t[ée])?|repr[ée]sentant\s+l[ée]gal(?:\s+de\s+la\s+copropri[ée]t[ée])?)\s*[:\-–]\s*([^\n|]{2,120})/gim,
    94,
    "syndic.explicit_label",
  );
  addLabeledCandidate(
    candidates,
    context,
    "syndic_manager",
    /(?:^|\n)\s*(?:gestionnaire(?:\s+de\s+copropri[ée]t[ée])?|principal(?:e)?\s+de\s+copropri[ée]t[ée])\s*[:\-–]\s*([^\n|]{2,100})/gim,
    94,
    "syndic.manager_label",
  );
  addLabeledCandidate(
    candidates,
    context,
    "syndic_name",
    /(?:d[ée]signe|nomme|renouvelle)\s+(?:la\s+)?(?:soci[ée]t[ée]|cabinet)?\s*([^\n,.]{2,100}?)\s+(?:en\s+qualit[ée]\s+de|comme)\s+syndic/i,
    92,
    "syndic.designation_phrase",
  );
  addAddressNearMarker(
    candidates,
    context,
    "syndic_address",
    /(?:adresse\s+du\s+syndic|coordonn[ée]es\s+du\s+syndic)/i,
    94,
    "syndic.address_label",
  );

  for (const page of context.pages.slice(0, 3)) {
    for (const match of page.text.matchAll(EMAIL_PATTERN)) {
      if (match.index === undefined) {
        continue;
      }

      const nearby = normalizeComparable(
        page.text.slice(
          Math.max(0, match.index - 450),
          match.index + match[0].length + 80,
        ),
      );

      if (
        !/(syndic|gestionnaire|agence|contact|administrateur de biens)/.test(
          nearby,
        )
      ) {
        continue;
      }

      const found = candidate(
        context,
        page,
        "syndic_email",
        match[0],
        92,
        "syndic.email_near_contact_block",
        match.index,
        match.index + match[0].length,
        (value) => value.toLowerCase(),
      );

      if (found) {
        candidates.push(found);
        break;
      }
    }

    for (const match of page.text.matchAll(PHONE_PATTERN)) {
      if (match.index === undefined) {
        continue;
      }

      const nearby = normalizeComparable(
        page.text.slice(
          Math.max(0, match.index - 450),
          match.index + match[0].length + 80,
        ),
      );

      if (!/(syndic|gestionnaire|agence|contact|telephone|tel)/.test(nearby)) {
        continue;
      }

      const found = candidate(
        context,
        page,
        "syndic_phone",
        match[0],
        90,
        "syndic.phone_near_contact_block",
        match.index,
        match.index + match[0].length,
        normalizePhone,
      );

      if (found) {
        candidates.push(found);
        break;
      }
    }
  }
}

function addPropertyAddress(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
) {
  addAddressNearMarker(
    candidates,
    context,
    "property_address",
    /(?:adresse\s+(?:de\s+la\s+)?copropri[ée]t[ée]|copropri[ée]t[ée]\s*[:\-]|r[ée]sidence\s*[:\-]|immeuble\s+sis)/i,
    context.documentType === "fiche_synthetique" ||
      context.documentType === "reglement_copropriete"
      ? 95
      : 88,
    "property.address_near_property_marker",
  );
}

function findAgDate(page: TextPage, kind?: "ordinary" | "extraordinary") {
  const kindPattern =
    kind === "ordinary"
      ? "(?:assembl[ée]e\\s+g[ée]n[ée]rale\\s+ordinaire|a\\.?g\\.?o\\.?)"
      : kind === "extraordinary"
        ? "(?:assembl[ée]e\\s+g[ée]n[ée]rale\\s+(?:extraordinaire|sp[ée]ciale)|a\\.?g\\.?e\\.?)"
        : "(?:assembl[ée]e\\s+g[ée]n[ée]rale(?:\\s+(?:ordinaire|extraordinaire|sp[ée]ciale))?|a\\.?g\\.?[oe]?\\.?)";
  const anchor = new RegExp(kindPattern, "i").exec(page.text);

  if (!anchor || anchor.index === undefined) {
    return null;
  }

  const originalWindow = page.text.slice(anchor.index, anchor.index + 350);
  const date = findDates(originalWindow)[0];

  if (!date) {
    return null;
  }

  return {
    ...date,
    end: anchor.index + date.end,
    start: anchor.index + date.start,
  };
}

function addAgCandidates(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
) {
  if (context.documentType !== "pv_ag") {
    return;
  }

  for (const page of context.pages.slice(0, 3)) {
    const ordinaryDate = findAgDate(page, "ordinary");

    if (ordinaryDate) {
      const found = candidate(
        context,
        page,
        "last_ago_date",
        ordinaryDate.iso,
        96,
        "ag.ordinary_title_date",
        ordinaryDate.start,
        ordinaryDate.end,
        (value) => value,
      );
      if (found) candidates.push(found);
    }

    const extraordinaryDate = findAgDate(page, "extraordinary");

    if (extraordinaryDate) {
      const found = candidate(
        context,
        page,
        "last_age_date",
        extraordinaryDate.iso,
        96,
        "ag.extraordinary_title_date",
        extraordinaryDate.start,
        extraordinaryDate.end,
        (value) => value,
      );
      if (found) candidates.push(found);
    }
  }

  const agDate = context.pages
    .slice(0, 3)
    .map((page) => ({ date: findAgDate(page), page }))
    .find((entry) => entry.date);
  const approvalPage = context.pages.find((page) => {
    const normalized = normalizeComparable(page.text);
    const approvalIndex = normalized.indexOf("approbation des comptes");

    if (approvalIndex < 0) return false;
    const window = normalized.slice(approvalIndex, approvalIndex + 700);
    return (
      /(adoptee|adopte|resultat du vote|votes pour)/.test(window) &&
      !/resolution rejetee/.test(window)
    );
  });

  if (agDate?.date && approvalPage) {
    const found = candidate(
      context,
      agDate.page,
      "approval_date",
      agDate.date.iso,
      95,
      "ag.approved_accounts_session_date",
      agDate.date.start,
      agDate.date.end,
      (value) => value,
    );
    if (found) candidates.push(found);
  }
}

function addMandateCandidates(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
) {
  if (context.documentType !== "pv_ag") {
    return;
  }

  for (const page of context.pages) {
    const anchor =
      /(?:mandat\s+du\s+syndic|d[ée]signation\s+du\s+syndic|renouvellement[^\n.]{0,80}syndic|syndic[^\n.]{0,40}prend\s+effet)/i.exec(
        page.text,
      );

    if (!anchor || anchor.index === undefined) {
      continue;
    }

    const window = page.text.slice(anchor.index, anchor.index + 900);
    const dates = findDates(window);

    if (dates.length >= 2) {
      const startDate = dates[0];
      const endDate = dates[1];
      const start = candidate(
        context,
        page,
        "syndic_mandate_start",
        startDate.iso,
        94,
        "syndic.mandate_date_range_start",
        anchor.index + startDate.start,
        anchor.index + startDate.end,
        (value) => value,
      );
      const end = candidate(
        context,
        page,
        "syndic_mandate_end",
        endDate.iso,
        94,
        "syndic.mandate_date_range_end",
        anchor.index + endDate.start,
        anchor.index + endDate.end,
        (value) => value,
      );
      if (start) candidates.push(start);
      if (end) candidates.push(end);
      return;
    }

    if (dates.length === 1) {
      const date = dates[0];
      const beforeDate = normalizeComparable(window.slice(0, date.start));
      const isEnd = /(prendra fin|jusqu'au|echeance|fin du mandat)/.test(
        beforeDate,
      );
      const isStart =
        /(prend effet|a compter du|mandat du syndic du|designation du syndic)/.test(
          beforeDate,
        );

      if (!isEnd && !isStart) {
        return;
      }

      const found = candidate(
        context,
        page,
        isEnd ? "syndic_mandate_end" : "syndic_mandate_start",
        date.iso,
        76,
        isEnd ? "syndic.single_mandate_end" : "syndic.single_mandate_start",
        anchor.index + date.start,
        anchor.index + date.end,
        (value) => value,
      );

      if (found) candidates.push(found);
      return;
    }
  }
}

export function extractSimpleFields(context: SimpleExtractionContext) {
  if (context.classificationStatus === "insufficient_text") {
    return [];
  }

  const candidates: SimpleFieldCandidate[] = [];

  if (CONTACT_DOCUMENT_TYPES.has(context.documentType)) {
    addContactCandidates(candidates, context);
  }

  if (PROPERTY_DOCUMENT_TYPES.has(context.documentType)) {
    addPropertyAddress(candidates, context);
  }

  addAgCandidates(candidates, context);
  addMandateCandidates(candidates, context);

  const bestByField = new Map<
    SimpleFieldCandidate["fieldId"],
    SimpleFieldCandidate
  >();

  for (const item of candidates) {
    const existing = bestByField.get(item.fieldId);

    if (!existing || item.confidence > existing.confidence) {
      bestByField.set(item.fieldId, item);
    }
  }

  return [...bestByField.values()];
}

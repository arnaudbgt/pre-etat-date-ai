import type { TextPage } from "@/lib/classification/types";

import { SIMPLE_EXTRACTION_VERSION } from "./catalog";
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
const EMAIL_NEGATIVE_CONTEXT =
  /\b(?:identifiant\s+myfoncia|espace\s+client|num[ée]ro\s+client|r[ée]f[ée]rences?\s+client|compte\s+client|mon\s+compte|copropri[ée]taire|propri[ée]taire)\b/;
const EMAIL_POSITIVE_CONTEXT =
  /\b(?:votre\s+agence|agence|syndic|cabinet|gestionnaire|votre\s+gestionnaire|contact|contactez\s+nous|contactez-nous|administrateur\s+de\s+biens)\b/;
const PHONE_PATTERN = /(?:\+33|0033|0)[1-9](?:[\s.()\-]*\d{2}){4}\b/g;
const ADDRESS_PATTERN =
  /\b\d{1,4}(?:\s*(?:bis|ter))?\s+(?:rue|avenue|av\.?|boulevard|bd\.?|chemin|impasse|allee|allée|place|route|quai|cours|square)\s+[^\n,;]{2,70}(?:(?:,|\s)+\d{5}\s+[A-Za-zÀ-ÿ'’\- ]{2,50})?/i;
const FONCIA_PROPERTY_ADDRESS_PATTERN =
  /\b[A-ZÀ-Ÿ0-9][A-ZÀ-Ÿ0-9'’\- ]{2,60}\s+\d{1,4}(?:\s*(?:bis|ter))?\s+(?:RUE|AVENUE|AV\.?|BOULEVARD|BD\.?|CHEMIN|IMPASSE|ALLEE|ALLÉE|PLACE|ROUTE|QUAI|COURS|SQUARE)\s+[A-ZÀ-Ÿ0-9'’\- ]{2,80}\s+\d{5}\s+[A-ZÀ-Ÿ'’\- ]{2,60}\b/g;
const PV_LETTER_DATE_CONTEXT =
  /\b(?:courrier|convocation|notification|lettre|recommand[ée]|accus[ée]\s+de\s+r[ée]ception)\b/i;
const VOTE_TANTIEMES_CONTEXT =
  /\b(?:r[ée]sultat\s+du\s+vote|votes?\s+pour|contre|abstention|majorit[ée]|voix|tanti[èe]mes\s+de\s+vote)\b/;

function normalizePvComparable(value: string) {
  return normalizeComparable(value).replace(
    /\b(?:[a-z]\s+){2,}[a-z]\b/g,
    (match) => match.replace(/\s+/g, ""),
  );
}

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
    extractionVersion: SIMPLE_EXTRACTION_VERSION,
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

export type SyndicEmailCandidateDiagnostic = {
  confidence: number | null;
  excerpt: string;
  matchedRule: string | null;
  page: number;
  rejected: boolean;
  rejectionReason: string | null;
  value: string;
};

export function analyzeSyndicEmailCandidates(
  context: SimpleExtractionContext,
) {
  const candidates: SyndicEmailCandidateDiagnostic[] = [];
  const accepted: Array<
    SyndicEmailCandidateDiagnostic & {
      priority: number;
      start: number;
      pageRef: TextPage;
    }
  > = [];

  for (const page of context.pages.slice(0, 3)) {
    for (const match of page.text.matchAll(EMAIL_PATTERN)) {
      if (match.index === undefined) {
        continue;
      }

      const negativeContext = normalizeComparable(
        page.text.slice(
          Math.max(0, match.index - 160),
          match.index + match[0].length + 80,
        ),
      );
      const positiveContext = normalizeComparable(
        page.text.slice(
          Math.max(0, match.index - 450),
          match.index + match[0].length + 180,
        ),
      );
      const immediatePositiveContext = normalizeComparable(
        page.text.slice(
          Math.max(0, match.index - 120),
          match.index + match[0].length + 80,
        ),
      );
      const excerpt = sourceExcerpt(
        page.text,
        match.index,
        match.index + match[0].length,
      );

      if (
        EMAIL_NEGATIVE_CONTEXT.test(negativeContext) &&
        !EMAIL_POSITIVE_CONTEXT.test(immediatePositiveContext)
      ) {
        candidates.push({
          confidence: null,
          excerpt,
          matchedRule: null,
          page: page.pageNumber,
          rejected: true,
          rejectionReason: "client_context",
          value: match[0].toLowerCase(),
        });
        continue;
      }

      if (!EMAIL_POSITIVE_CONTEXT.test(positiveContext)) {
        candidates.push({
          confidence: null,
          excerpt,
          matchedRule: null,
          page: page.pageNumber,
          rejected: true,
          rejectionReason: "weak_context",
          value: match[0].toLowerCase(),
        });
        continue;
      }

      const priority = /votre\s+gestionnaire|gestionnaire/.test(
        positiveContext,
      )
        ? 3
        : /votre\s+agence|agence|syndic|cabinet/.test(positiveContext)
          ? 2
          : 1;
      const acceptedCandidate = {
        confidence: adjustedConfidence(92, context),
        excerpt,
        matchedRule: "syndic.email_near_contact_block",
        page: page.pageNumber,
        pageRef: page,
        priority,
        rejected: false,
        rejectionReason: null,
        start: match.index,
        value: match[0].toLowerCase(),
      };
      candidates.push(acceptedCandidate);
      accepted.push(acceptedCandidate);
    }
  }

  const clientContextEmails = new Set(
    candidates
      .filter((candidate) => candidate.rejectionReason === "client_context")
      .map((candidate) => candidate.value),
  );

  for (const candidate of candidates) {
    if (!candidate.rejected && clientContextEmails.has(candidate.value)) {
      candidate.rejected = true;
      candidate.rejectionReason = "duplicate_client_context";
      candidate.confidence = null;
      candidate.matchedRule = null;
    }
  }

  const selected =
    accepted
      .filter((candidate) => !candidate.rejected)
      .sort(
      (left, right) =>
        right.priority - left.priority ||
        (right.confidence ?? 0) - (left.confidence ?? 0) ||
        left.start - right.start,
      )[0] ?? null;

  return {
    candidates,
    rejectedCandidates: candidates.filter((candidate) => candidate.rejected),
    selectedCandidate: selected,
  };
}

function addContactCandidates(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
) {
  addLabeledCandidate(
    candidates,
    context,
    "syndic_name",
    /VOTRE\s+AGENCE\s+FONCIA\s+(Foncia\s+[A-Za-zÀ-ÿ'’\- ]+(?:\s+-\s+[A-Za-zÀ-ÿ'’\- ]+)?)(?=\s+\d|\s+VOTRE\s+GESTIONNAIRE|\s*$)/i,
    92,
    "syndic.foncia_agency_block",
  );
  addLabeledCandidate(
    candidates,
    context,
    "syndic_manager",
    /VOTRE\s+GESTIONNAIRE\s+([A-ZÀ-Ÿ][A-Za-zÀ-ÿ'’\- ]{2,80}?)(?=\s+(?:VOTRE\s+MODE|VOTRE\s+ESPACE|Paiement|\+?\d|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})|$)/i,
    92,
    "syndic.foncia_manager_block",
  );
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

  const emailDiagnostics = analyzeSyndicEmailCandidates(context);
  const selectedEmail = emailDiagnostics.selectedCandidate;

  if (selectedEmail) {
    const found = candidate(
      context,
      selectedEmail.pageRef,
      "syndic_email",
      selectedEmail.value,
      selectedEmail.confidence ?? 92,
      selectedEmail.matchedRule ?? "syndic.email_near_contact_block",
      selectedEmail.start,
      selectedEmail.start + selectedEmail.value.length,
      (value) => value.toLowerCase(),
    );

    if (found) {
      candidates.push(found);
    }
  }

  for (const page of context.pages.slice(0, 3)) {
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
  for (const page of context.pages.slice(0, 3)) {
    for (const match of page.text.matchAll(FONCIA_PROPERTY_ADDRESS_PATTERN)) {
      if (match.index === undefined) {
        continue;
      }

      if (/\b(?:FONCIA|RCS|CARTE|GARANT|CAPITAL)\b/.test(match[0])) {
        continue;
      }

      const found = candidate(
        context,
        page,
        "property_address",
        match[0],
        90,
        "property.foncia_residence_address_block",
        match.index,
        match.index + match[0].length,
      );

      if (found) {
        candidates.push(found);
        return;
      }
    }
  }

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
  const titleKindPattern =
    kind === "ordinary"
      ? "(?:ordinaire|a\\.?g\\.?o\\.?)"
      : kind === "extraordinary"
        ? "(?:(?:extraordinaire|sp[ée]ciale|a\\.?g\\.?s\\.?|a\\.?g\\.?e\\.?)\\s+)?"
        : "(?:ordinaire|extraordinaire|sp[ée]ciale|a\\.?g\\.?[ose]?\\.?)?";
  const titlePattern = new RegExp(
    `(?:proc[èée]s[-\\s]?verbal\\s+de\\s+l(?:['’]|9)assembl[ée]e\\s+g[ée]n[ée]rale|assembl[ée]e\\s+g[ée]n[ée]rale)\\s+${titleKindPattern}[\\s\\S]{0,260}`,
    "i",
  );
  const titleMatch = titlePattern.exec(page.text);

  if (titleMatch?.index !== undefined) {
    const titleDate = findDates(titleMatch[0]).find((date) => {
      const beforeDate = titleMatch[0].slice(Math.max(0, date.start - 120), date.start);
      return !PV_LETTER_DATE_CONTEXT.test(beforeDate);
    });

    if (titleDate) {
      return {
        ...titleDate,
        end: titleMatch.index + titleDate.end,
        start: titleMatch.index + titleDate.start,
      };
    }
  }

  const anchor = new RegExp(kindPattern, "i").exec(page.text);

  if (!anchor || anchor.index === undefined) {
    return null;
  }

  const originalWindow = page.text.slice(anchor.index, anchor.index + 450);
  const date = findDates(originalWindow).find((item) => {
    const before = originalWindow.slice(Math.max(0, item.start - 140), item.start);
    const around = originalWindow.slice(Math.max(0, item.start - 140), item.end + 80);
    return (
      !PV_LETTER_DATE_CONTEXT.test(before) &&
      !/\ble\s+\d{1,2}\s+[a-zéû]+\s+\d{4},?\s+(?:m\.|mme|monsieur|madame)\b/i.test(
        around,
      )
    );
  });

  if (!date) {
    return null;
  }

  return {
    ...date,
    end: anchor.index + date.end,
    start: anchor.index + date.start,
  };
}

function pvBlocks(page: TextPage) {
  const starts = new Set<number>([0]);
  const boundary =
    /(?:^|\n)\s*(?=(?:r[ée]solution\s*(?:n[°o]|num[ée]ro)?\s*\d+(?:\.\d+)*|\d+(?:\.\d+)*\s*[.)-]?\s+))/gim;

  for (const match of page.text.matchAll(boundary)) {
    if (match.index !== undefined) starts.add(match.index + match[0].length);
  }

  if (starts.size === 1) {
    const paragraph = /\n\s*\n+/g;
    for (const match of page.text.matchAll(paragraph)) {
      if (match.index !== undefined) starts.add(match.index + match[0].length);
    }
  }

  const ordered = [...starts].sort((left, right) => left - right);
  return ordered
    .map((start, index) => {
      const end = ordered[index + 1] ?? page.text.length;
      return { end, page, start, text: page.text.slice(start, end).trim() };
    })
    .filter((block) => block.text.length > 0);
}

function addLotCandidates(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
) {
  if (context.documentType !== "pv_ag" && context.documentType !== "fiche_synthetique") {
    return;
  }

  for (const page of context.pages.slice(0, 5)) {
    for (const block of pvBlocks(page)) {
      const normalized = normalizePvComparable(block.text);
      const hasExplicitOwnerAssociation =
        /\b(vos lots?|vos tantiemes|reference coproprietaire|references coproprietaire|numero coproprietaire|compte coproprietaire|coproprietaire vendeur|vendeur)\b/.test(
          normalized,
        );

      if (!hasExplicitOwnerAssociation || VOTE_TANTIEMES_CONTEXT.test(normalized)) {
        continue;
      }

      const lotMatch =
        /(?:lots?\s*(?:n[°o]|num[ée]ro)?|n[°o]\s+de\s+lot)\s*[:\-]?\s*([A-Z0-9][A-Z0-9, /.-]{0,80})/i.exec(
          block.text,
        );

      if (lotMatch?.index !== undefined) {
        const value = lotMatch[1]
          .replace(/\s+/g, " ")
          .replace(/[.;:]+$/, "")
          .trim();
        const found = candidate(
          context,
          page,
          "lot_number",
          value,
          88,
          "lot.explicit_owner_associated_lot",
          block.start + lotMatch.index,
          block.start + lotMatch.index + lotMatch[0].length,
        );
        if (found) candidates.push(found);
      }

      const tantiemesMatch =
        /(?:vos\s+tanti[èe]mes|tanti[èe]mes(?:\s+(?:du|des)\s+lots?)?)\s*[:\-]?\s*([0-9][0-9\s.,/]{2,40})/i.exec(
          block.text,
        );

      if (tantiemesMatch?.index !== undefined) {
        const value = tantiemesMatch[1].replace(/\s+/g, "").replace(/[.;]+$/, "");
        const found = candidate(
          context,
          page,
          "lot_tantiemes",
          value,
          88,
          "lot.explicit_owner_associated_tantiemes",
          block.start + tantiemesMatch.index,
          block.start + tantiemesMatch.index + tantiemesMatch[0].length,
          (input) => input.replace(/\s+/g, ""),
        );
        if (found) candidates.push(found);
      }

      if (lotMatch || tantiemesMatch) {
        return;
      }
    }
  }
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
  addLotCandidates(candidates, context);

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

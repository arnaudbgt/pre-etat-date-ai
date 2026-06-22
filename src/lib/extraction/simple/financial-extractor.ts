import type { TextPage } from "@/lib/classification/types";

import { FINANCIAL_EXTRACTION_VERSION, type FinancialFieldId } from "./catalog";
import {
  findMoneyAmounts,
  findPercentages,
  normalizedDecimal,
  type ParsedMoney,
} from "./money";
import { findDates, normalizeComparable, sourceExcerpt } from "./normalization";
import type { SimpleExtractionContext, SimpleFieldCandidate } from "./types";

const FINANCIAL_DOCUMENT_TYPES = new Set([
  "appel_de_fonds",
  "releve_coproprietaire",
  "pv_ag",
  "annexe_comptable",
  "fiche_synthetique",
]);

type DetectedAmount = {
  amount: ParsedMoney;
  ambiguous: boolean;
  labelEnd: number;
  labelStart: number;
  page: TextPage;
  window: string;
};

function adjustedConfidence(
  confidence: number,
  context: SimpleExtractionContext,
) {
  if (context.classificationStatus === "uncertain") {
    return Math.min(84, Math.max(0, confidence - 15));
  }

  return confidence;
}

function detectAmountAfterLabel(
  context: SimpleExtractionContext,
  label: RegExp,
  rejectWindow?: RegExp,
): DetectedAmount | null {
  for (const page of context.pages) {
    const match = label.exec(page.text);
    label.lastIndex = 0;

    if (!match || match.index === undefined) continue;
    const window = page.text.slice(match.index, match.index + 320);

    if (rejectWindow?.test(window)) {
      rejectWindow.lastIndex = 0;
      continue;
    }
    if (rejectWindow) rejectWindow.lastIndex = 0;

    const amounts = findMoneyAmounts(window);

    if (amounts.length === 0) continue;

    return {
      amount: {
        ...amounts[0],
        end: match.index + amounts[0].end,
        start: match.index + amounts[0].start,
      },
      ambiguous: amounts.length > 1,
      labelEnd: match.index + match[0].length,
      labelStart: match.index,
      page,
      window,
    };
  }

  return null;
}

function amountCandidate(
  context: SimpleExtractionContext,
  detected: DetectedAmount,
  fieldId: FinancialFieldId,
  confidence: number,
  matchedRule: string,
): SimpleFieldCandidate {
  const value = Math.abs(detected.amount.amount);
  const score = detected.ambiguous ? Math.min(84, confidence) : confidence;

  return {
    confidence: adjustedConfidence(score, context),
    excerpt: sourceExcerpt(
      detected.page.text,
      detected.labelStart,
      detected.amount.end,
    ),
    extractionVersion: FINANCIAL_EXTRACTION_VERSION,
    fieldId,
    matchKey: `${detected.page.pageNumber}:${detected.amount.start}:${detected.amount.end}`,
    matchedRule,
    normalizedValue: normalizedDecimal(value),
    page: detected.page.pageNumber,
    value,
  };
}

function textCandidate(
  context: SimpleExtractionContext,
  page: TextPage,
  fieldId: FinancialFieldId,
  value: string,
  normalizedValue: string,
  confidence: number,
  matchedRule: string,
  start: number,
  end: number,
): SimpleFieldCandidate {
  return {
    confidence: adjustedConfidence(confidence, context),
    excerpt: sourceExcerpt(page.text, start, end),
    extractionVersion: FINANCIAL_EXTRACTION_VERSION,
    fieldId,
    matchedRule,
    normalizedValue,
    page: page.pageNumber,
    value,
  };
}

function addAccountStatementDate(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
) {
  if (context.documentType !== "releve_coproprietaire") return;

  for (const page of context.pages.slice(0, 3)) {
    const label =
      /(?:relev[ée]\s+(?:de\s+compte\s+)?(?:au|arr[êe]t[ée]\s+au)|situation\s+(?:du\s+compte\s+)?au|solde\s+arr[êe]t[ée]\s+au)/i.exec(
        page.text,
      );
    if (!label || label.index === undefined) continue;
    const window = page.text.slice(label.index, label.index + 220);
    const date = findDates(window)[0];
    if (!date) continue;

    candidates.push(
      textCandidate(
        context,
        page,
        "account_statement_date",
        date.iso,
        date.iso,
        95,
        "financial.account_statement_date",
        label.index + date.start,
        label.index + date.end,
      ),
    );
    return;
  }
}

function addCurrentBalance(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
) {
  if (
    context.documentType !== "releve_coproprietaire" &&
    context.documentType !== "appel_de_fonds"
  ) {
    return;
  }

  const detected = detectAmountAfterLabel(
    context,
    /(?:solde\s+(?:de\s+votre\s+compte|du\s+compte|[àa]\s+ce\s+jour|actuel|apr[èe]s\s+appel)|nouveau\s+solde)(?:\s+(?:d[ée]biteur|cr[ée]diteur))?\s*[:\-]?/i,
  );
  if (!detected) return;

  const semanticWindow = normalizeComparable(
    detected.page.text.slice(
      Math.max(0, detected.labelStart - 80),
      Math.min(detected.page.text.length, detected.amount.end + 100),
    ),
  );
  const isDebtor = /\b(debiteur|a payer|somme due)\b/.test(semanticWindow);
  const isCreditor = /\b(crediteur|en votre faveur|a votre credit)\b/.test(
    semanticWindow,
  );
  const isZero = Math.abs(detected.amount.amount) === 0;
  const explicitSemantic =
    (isDebtor ? 1 : 0) + (isCreditor ? 1 : 0) + (isZero ? 1 : 0) === 1;
  const amountConfidence = explicitSemantic ? 95 : 72;
  const amount = amountCandidate(
    context,
    detected,
    "current_balance_amount",
    amountConfidence,
    explicitSemantic
      ? "financial.balance_explicit_semantic"
      : "financial.balance_ambiguous_semantic",
  );
  candidates.push(amount);

  const label = explicitSemantic
    ? isZero
      ? "nul"
      : isDebtor
        ? "debiteur"
        : "crediteur"
    : "uncertain";
  candidates.push(
    textCandidate(
      context,
      detected.page,
      "current_balance_label",
      label,
      label,
      explicitSemantic ? 96 : 60,
      explicitSemantic
        ? "financial.balance_label_explicit"
        : "financial.balance_label_ambiguous",
      detected.labelStart,
      detected.amount.end,
    ),
  );
}

function addLabeledAmount(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
  options: {
    confidence: number;
    fieldId: FinancialFieldId;
    label: RegExp;
    matchedRule: string;
    rejectWindow?: RegExp;
  },
) {
  const detected = detectAmountAfterLabel(
    context,
    options.label,
    options.rejectWindow,
  );
  if (!detected) return null;
  const item = amountCandidate(
    context,
    detected,
    options.fieldId,
    options.confidence,
    options.matchedRule,
  );
  candidates.push(item);
  return { detected, item };
}

function addCurrentQuarter(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
) {
  if (context.documentType !== "appel_de_fonds") return;

  for (const page of context.pages.slice(0, 3)) {
    const first =
      /\b(?:t|trimestre\s*)([1-4])(?:\s*[\-/]?\s*((?:19|20)\d{2}))?\b/i.exec(
        page.text,
      );
    const second =
      /\b([1-4])(?:er|e|eme|ème)?\s+trimestre(?:\s+((?:19|20)\d{2}))?\b/i.exec(
        page.text,
      );
    const match = first ?? second;
    if (!match || match.index === undefined) continue;
    const value = `T${match[1]}${match[2] ? ` ${match[2]}` : ""}`;
    candidates.push(
      textCandidate(
        context,
        page,
        "current_quarter",
        value,
        value,
        92,
        "financial.explicit_quarter",
        match.index,
        match.index + match[0].length,
      ),
    );
    return;
  }
}

function findAgSessionDate(pages: TextPage[]) {
  for (const page of pages.slice(0, 3)) {
    const anchor = /assembl[ée]e\s+g[ée]n[ée]rale[^\n]{0,120}/i.exec(page.text);
    if (!anchor || anchor.index === undefined) continue;
    const date = findDates(
      page.text.slice(anchor.index, anchor.index + 260),
    )[0];
    if (!date) continue;
    return {
      date,
      end: anchor.index + date.end,
      page,
      start: anchor.index + date.start,
    };
  }
  return null;
}

function addBudgetVoteDate(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
) {
  if (context.documentType !== "pv_ag") return;
  const budgetDecision = context.pages.find((page) => {
    const normalized = normalizeComparable(page.text);
    const index = normalized.indexOf("budget previsionnel");
    if (index < 0) return false;
    const window = normalized.slice(index, index + 700);
    return (
      /(adoptee|adopte|vote favorable|votes pour)/.test(window) &&
      !/resolution rejetee/.test(window)
    );
  });
  const sessionDate = findAgSessionDate(context.pages);
  if (!budgetDecision || !sessionDate) return;

  candidates.push(
    textCandidate(
      context,
      sessionDate.page,
      "budget_vote_date",
      sessionDate.date.iso,
      sessionDate.date.iso,
      95,
      "financial.adopted_budget_ag_date",
      sessionDate.start,
      sessionDate.end,
    ),
  );
}

function addFinancialComment(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
) {
  if (
    context.documentType !== "releve_coproprietaire" &&
    context.documentType !== "appel_de_fonds"
  ) {
    return;
  }

  for (const page of context.pages) {
    const match =
      /(?:^|\n)\s*(?:observation|commentaire\s+financier)\s*[:\-]\s*([^\n]{3,160})/im.exec(
        page.text,
      );
    if (!match || match.index === undefined) continue;
    const value = match[1].replace(/\s+/g, " ").trim();
    candidates.push(
      textCandidate(
        context,
        page,
        "seller_financial_comment",
        value,
        normalizeComparable(value),
        88,
        "financial.explicit_comment",
        match.index,
        match.index + match[0].length,
      ),
    );
    return;
  }
}

function addWorksFundShareDate(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
  share: DetectedAmount | null,
) {
  if (!share) return;
  const date = findDates(share.window)[0];
  if (!date) return;

  candidates.push(
    textCandidate(
      context,
      share.page,
      "works_fund_seller_share_date",
      date.iso,
      date.iso,
      90,
      "financial.works_fund_share_date",
      share.labelStart + date.start,
      share.labelStart + date.end,
    ),
  );
}

function addWorksFundPercentage(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
) {
  if (
    context.documentType !== "pv_ag" &&
    context.documentType !== "annexe_comptable"
  )
    return;

  for (const page of context.pages) {
    const label =
      /(?:fonds\s+(?:de\s+)?travaux|cotisation\s+fonds\s+travaux)[^\n]{0,160}?(?:budget\s+pr[ée]visionnel|pourcentage)/i.exec(
        page.text,
      );
    if (!label || label.index === undefined) continue;
    const window = page.text.slice(label.index, label.index + 260);
    const values = findPercentages(window);
    if (values.length === 0) continue;
    const value = values[0];
    const confidence = values.length > 1 ? 84 : 94;
    candidates.push({
      confidence: adjustedConfidence(confidence, context),
      excerpt: sourceExcerpt(page.text, label.index, label.index + value.end),
      extractionVersion: FINANCIAL_EXTRACTION_VERSION,
      fieldId: "works_fund_budget_percentage",
      matchKey: `${page.pageNumber}:percentage:${label.index + value.start}:${label.index + value.end}`,
      matchedRule: "financial.works_fund_budget_percentage",
      normalizedValue: value.normalizedValue,
      page: page.pageNumber,
      value: value.value,
    });
    return;
  }
}

function markSharedAmountsUncertain(candidates: SimpleFieldCandidate[]) {
  const groups = new Map<string, SimpleFieldCandidate[]>();

  for (const item of candidates) {
    if (!item.matchKey || typeof item.value !== "number") continue;
    const current = groups.get(item.matchKey) ?? [];
    current.push(item);
    groups.set(item.matchKey, current);
  }

  for (const items of groups.values()) {
    if (new Set(items.map((item) => item.fieldId)).size <= 1) continue;
    for (const item of items) {
      item.confidence = Math.min(84, item.confidence);
    }
  }
}

export function extractFinancialFields(context: SimpleExtractionContext) {
  if (
    context.classificationStatus === "insufficient_text" ||
    !FINANCIAL_DOCUMENT_TYPES.has(context.documentType)
  ) {
    return [];
  }

  const candidates: SimpleFieldCandidate[] = [];
  addAccountStatementDate(candidates, context);
  addCurrentBalance(candidates, context);

  if (
    context.documentType === "releve_coproprietaire" ||
    context.documentType === "appel_de_fonds"
  ) {
    addLabeledAmount(candidates, context, {
      confidence: 94,
      fieldId: "unpaid_charges_amount",
      label:
        /(?:charges\s+impay[ée]es?|montant\s+des\s+impay[ée]s|arri[ée]r[ée]s?\s+de\s+charges)\s*[:\-]?/i,
      matchedRule: "financial.explicit_unpaid_charges",
    });
    addLabeledAmount(candidates, context, {
      confidence: 92,
      fieldId: "treasury_advance_amount",
      label: /(?:avance\s+de\s+tr[ée]sorerie|avance\s+permanente)\s*[:\-]?/i,
      matchedRule: "financial.explicit_treasury_advance",
    });
    addFinancialComment(candidates, context);
  }

  addCurrentQuarter(candidates, context);

  if (
    context.documentType === "annexe_comptable" ||
    context.documentType === "pv_ag" ||
    context.documentType === "appel_de_fonds"
  ) {
    addLabeledAmount(candidates, context, {
      confidence: context.documentType === "appel_de_fonds" ? 86 : 95,
      fieldId: "annual_budget_amount",
      label:
        /(?:budget\s+pr[ée]visionnel\s+annuel|budget\s+annuel|budget\s+pr[ée]visionnel\s+de\s+l['’]exercice)\s*[:\-]?/i,
      matchedRule: "financial.explicit_annual_budget",
      rejectWindow: /(?:votre\s+quote[\s-]*part|quote[\s-]*part\s+vendeur)/i,
    });
  }
  addBudgetVoteDate(candidates, context);

  if (
    context.documentType === "appel_de_fonds" ||
    context.documentType === "releve_coproprietaire"
  ) {
    addLabeledAmount(candidates, context, {
      confidence: 94,
      fieldId: "works_fund_quarterly_contribution",
      label:
        /(?:(?:cotisation|contribution|provision)[^\n]{0,60}(?:trimestrielle|du\s+trimestre)[^\n]{0,60}fonds\s+(?:de\s+)?travaux|fonds\s+(?:de\s+)?travaux[^\n]{0,60}(?:cotisation|contribution|provision)\s+trimestrielle)\s*[:\-]?/i,
      matchedRule: "financial.explicit_quarterly_works_fund",
    });
    const share = addLabeledAmount(candidates, context, {
      confidence: 95,
      fieldId: "works_fund_seller_share_amount",
      label:
        /(?:part\s+(?:du\s+)?fonds\s+(?:de\s+)?travaux\s+rattach[ée]e\s+aux\s+lots|quote[\s-]*part\s+(?:vendeur\s+)?(?:du\s+)?fonds\s+(?:de\s+)?travaux|part\s+vendeur\s+fonds\s+(?:de\s+)?travaux)\s*[:\-]?/i,
      matchedRule: "financial.explicit_seller_works_fund_share",
      rejectWindow: /(?:cotisation|contribution)\s+(?:annuelle|trimestrielle)/i,
    });
    addWorksFundShareDate(candidates, context, share?.detected ?? null);
  }

  if (
    context.documentType === "appel_de_fonds" ||
    context.documentType === "annexe_comptable" ||
    context.documentType === "pv_ag"
  ) {
    addLabeledAmount(candidates, context, {
      confidence: 92,
      fieldId: "works_fund_annual_amount",
      label:
        /(?:(?:montant|cotisation|contribution)\s+(?:total\s+)?annuel(?:le)?[^\n]{0,40}(?:global(?:e)?|total(?:e)?|de\s+la\s+copropri[ée]t[ée])[^\n]{0,50}fonds\s+(?:de\s+)?travaux|fonds\s+(?:de\s+)?travaux[^\n]{0,50}(?:montant|cotisation|contribution)\s+(?:total\s+)?annuel(?:le)?[^\n]{0,30}(?:global(?:e)?|total(?:e)?|de\s+la\s+copropri[ée]t[ée]))\s*[:\-]?/i,
      matchedRule: "financial.explicit_annual_works_fund",
      rejectWindow: /(?:votre\s+quote[\s-]*part|part\s+vendeur|trimestrielle)/i,
    });
  }
  addWorksFundPercentage(candidates, context);

  markSharedAmountsUncertain(candidates);

  const bestByField = new Map<FinancialFieldId, SimpleFieldCandidate>();
  for (const item of candidates) {
    const fieldId = item.fieldId as FinancialFieldId;
    const existing = bestByField.get(fieldId);
    if (!existing || item.confidence > existing.confidence) {
      bestByField.set(fieldId, item);
    }
  }

  return [...bestByField.values()];
}

import type { TextPage } from "@/lib/classification/types";

import { COMPLEX_EXTRACTION_VERSION, type ComplexFieldId } from "./catalog";
import { findMoneyAmounts } from "./money";
import { findDates, normalizeComparable, sourceExcerpt } from "./normalization";
import type { SimpleExtractionContext, SimpleFieldCandidate } from "./types";

const COMPLEX_DOCUMENT_TYPES = new Set([
  "pv_ag",
  "annexe_comptable",
  "fiche_synthetique",
  "dtg",
  "ppt",
  "dpe_collectif",
]);

type TextBlock = {
  end: number;
  page: TextPage;
  start: number;
  text: string;
};

type WorkItem = {
  amount_cents?: number;
  call_dates?: string[];
  funding_status: "called_and_paid" | "future_calls" | "not_called";
  title: string;
  vote_date?: string;
};

type WorkDetection = {
  block: TextBlock;
  confidence: number;
  item: WorkItem;
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

function compactLiteral(value: string, limit = 180) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= limit
    ? compact
    : `${compact.slice(0, limit - 1).trimEnd()}…`;
}

function stableJson(value: unknown) {
  return JSON.stringify(value);
}

function candidate(
  context: SimpleExtractionContext,
  fieldId: ComplexFieldId,
  value: string,
  confidence: number,
  matchedRule: string,
  block: TextBlock,
): SimpleFieldCandidate {
  return {
    confidence: adjustedConfidence(confidence, context),
    excerpt: sourceExcerpt(block.page.text, block.start, block.end),
    extractionVersion: COMPLEX_EXTRACTION_VERSION,
    fieldId,
    matchedRule,
    normalizedValue: value,
    page: block.page.pageNumber,
    value,
  };
}

function pageBlocks(page: TextPage): TextBlock[] {
  const starts = new Set<number>([0]);
  const boundary =
    /(?:^|\n)\s*(?=(?:r[ée]solution\s*(?:n[°o]|num[ée]ro)?\s*\d+|\d+\s*[.)-]\s+))/gim;

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

function allBlocks(context: SimpleExtractionContext) {
  return context.pages.flatMap(pageBlocks);
}

function agDate(context: SimpleExtractionContext) {
  if (context.documentType !== "pv_ag") return undefined;

  for (const page of context.pages.slice(0, 3)) {
    const match =
      /(?:proc[èe]s[\s-]*verbal[^\n]{0,80})?assembl[ée]e\s+g[ée]n[ée]rale[^\n]{0,120}/i.exec(
        page.text,
      );
    if (!match || match.index === undefined) continue;
    const date = findDates(match[0])[0];
    if (date) return date.iso;
  }

  return undefined;
}

function literalWorkTitle(block: string) {
  const explicit =
    /(?:objet|intitul[ée]|nature)\s+(?:des\s+)?travaux\s*[:\-–—]\s*([^\n.;]{3,140})/i.exec(
      block,
    );
  if (explicit) return compactLiteral(explicit[1], 140);

  const resolution =
    /r[ée]solution\s*(?:n[°o]|num[ée]ro)?\s*\d+\s*[:\-–—]\s*([^\n]{3,160})/i.exec(
      block,
    );
  if (!resolution) return null;

  const title = resolution[1].split(
    /\s+(?=(?:date\s+du\s+vote|montant|co[uû]t|budget|travaux\s+(?:vot[ée]s|appel[ée]s)|appels?\s+de\s+fonds|r[ée]solution\s+adopt[ée]e))/i,
  )[0];
  return compactLiteral(title.replace(/[.:;\-–—]+$/, ""), 140) || null;
}

function explicitVoteDate(block: string, fallback?: string) {
  const label = /date\s+(?:du\s+)?vote\s*[:\-]?\s*/i.exec(block);
  if (label?.index !== undefined) {
    const date = findDates(block.slice(label.index, label.index + 100))[0];
    if (date) return date.iso;
  }
  return fallback;
}

function explicitAmountCents(block: string) {
  if (!/(?:montant|co[uû]t|budget)\s*(?:total)?\s*[:\-]?/i.test(block)) {
    return undefined;
  }
  const amounts = findMoneyAmounts(block);
  if (amounts.length !== 1) return undefined;
  return Math.round(Math.abs(amounts[0].amount) * 100);
}

function futureCallDates(block: string) {
  const anchor =
    /(?:futurs?\s+appels?\s+de\s+fonds|appels?\s+de\s+fonds\s+[àa]\s+venir|ser(?:a|ont)\s+appel[ée]s?|[ée]ch[ée]ancier\s+des\s+appels?)/i.exec(
      block,
    );
  if (!anchor || anchor.index === undefined) return undefined;
  const dates = findDates(block.slice(anchor.index));
  const unique = [...new Set(dates.map((date) => date.iso))];
  return unique.length > 0 ? unique : undefined;
}

function workDetection(
  block: TextBlock,
  fundingStatus: WorkItem["funding_status"],
  fallbackVoteDate?: string,
): WorkDetection | null {
  const normalized = normalizeComparable(block.text);
  const isVoted = /\b(vote|votes|adopte|adoptee|resolution adoptee)\b/.test(
    normalized,
  );
  const title = literalWorkTitle(block.text);
  if (!isVoted || !title) return null;

  const amount = explicitAmountCents(block.text);
  const item: WorkItem = {
    funding_status: fundingStatus,
    title,
  };
  const voteDate = explicitVoteDate(block.text, fallbackVoteDate);
  if (voteDate) item.vote_date = voteDate;
  if (amount !== undefined) item.amount_cents = amount;

  if (fundingStatus === "future_calls") {
    const callDates = futureCallDates(block.text);
    if (callDates) item.call_dates = callDates;
  }

  return {
    block,
    confidence: amount === undefined ? 90 : 94,
    item,
  };
}

function addWorks(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
) {
  if (
    context.documentType !== "pv_ag" &&
    context.documentType !== "annexe_comptable"
  ) {
    return;
  }

  const detections = new Map<ComplexFieldId, WorkDetection[]>();
  const fallbackVoteDate = agDate(context);

  for (const block of allBlocks(context)) {
    const normalized = normalizeComparable(block.text);
    let fieldId: ComplexFieldId | null = null;
    let fundingStatus: WorkItem["funding_status"] | null = null;

    if (
      /\b(non encore appeles?|votes? non appeles?|travaux votes non appeles|solde explicitement a appeler)\b/.test(
        normalized,
      )
    ) {
      fieldId = "voted_not_called_works";
      fundingStatus = "not_called";
    } else if (
      /\b(futurs? appels? de fonds|appels? de fonds a venir|sera appele|seront appeles|echeancier des appels?)\b/.test(
        normalized,
      )
    ) {
      fieldId = "future_works_calls";
      fundingStatus = "future_calls";
    } else if (
      /\b(appele et paye|appeles et payes|appele et regle|appeles et regles|integralement appele et paye|cloture et paye)\b/.test(
        normalized,
      )
    ) {
      fieldId = "voted_paid_works";
      fundingStatus = "called_and_paid";
    }

    if (!fieldId || !fundingStatus) continue;
    const detection = workDetection(block, fundingStatus, fallbackVoteDate);
    if (!detection) continue;
    const current = detections.get(fieldId) ?? [];
    current.push(detection);
    detections.set(fieldId, current);
  }

  for (const [fieldId, items] of detections) {
    const value = stableJson(items.map((item) => item.item));
    const confidence = Math.min(...items.map((item) => item.confidence));
    candidates.push(
      candidate(
        context,
        fieldId,
        value,
        confidence,
        `complex.${fieldId}.explicit_block`,
        items[0].block,
      ),
    );
  }
}

function procedureTarget(statement: string) {
  const normalized = normalizeComparable(statement);
  if (/\b(coproprietaire|coproprietaires)\b/.test(normalized))
    return "coproprietaire";
  if (/\bsyndic\b/.test(normalized)) return "syndic";
  if (/\b(entreprise|prestataire|constructeur)\b/.test(normalized))
    return "entreprise";
  if (/\b(copropriete|syndicat des coproprietaires)\b/.test(normalized))
    return "copropriete";
  return "unknown";
}

function addLegalProceedings(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
) {
  if (
    context.documentType !== "pv_ag" &&
    context.documentType !== "fiche_synthetique"
  ) {
    return;
  }

  for (const block of allBlocks(context)) {
    const noProceeding =
      /\b(?:aucune|pas de)\s+(?:proc[ée]dure(?:\s+judiciaire)?|action\s+en\s+justice|contentieux)\s+(?:en\s+cours|engag[ée]e)?\b/i.exec(
        block.text,
      );
    if (noProceeding?.index !== undefined) {
      const statement = compactLiteral(noProceeding[0]);
      const value = stableJson([]);
      candidates.push(
        candidate(
          context,
          "legal_proceedings_description",
          value,
          94,
          "complex.legal_proceedings.explicit_none",
          {
            ...block,
            end: block.start + noProceeding.index + statement.length,
          },
        ),
      );
      return;
    }

    const sentences = block.text.split(/(?<=[.!?])\s+|\n+/);
    const statement = sentences.find((sentence) =>
      /\b(?:proc[ée]dure\s+judiciaire|assignation|action\s+en\s+justice|contentieux|instance\s+judiciaire)\b/i.test(
        sentence,
      ),
    );
    if (!statement) continue;
    const factualStatement = compactLiteral(statement);
    const value = stableJson([
      {
        factual_statement: factualStatement,
        target: procedureTarget(factualStatement),
      },
    ]);
    candidates.push(
      candidate(
        context,
        "legal_proceedings_description",
        value,
        context.documentType === "fiche_synthetique" ? 92 : 88,
        "complex.legal_proceedings.explicit_statement",
        block,
      ),
    );
    return;
  }
}

type StatusRule = {
  absent: RegExp;
  completed?: RegExp;
  fieldId: ComplexFieldId;
  inProgress?: RegExp;
  positive: RegExp;
  relevantTypes: string[];
  unknown?: RegExp;
};

function addControlledStatus(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
  rule: StatusRule,
) {
  if (!rule.relevantTypes.includes(context.documentType)) return;

  for (const block of allBlocks(context)) {
    if (!rule.positive.test(block.text)) continue;
    let value: string | null = null;
    let ruleName = "";

    if (rule.absent.test(block.text)) {
      value = rule.fieldId === "collective_loan" ? "no" : "absent";
      ruleName = "explicit_absence";
    } else if (rule.inProgress?.test(block.text)) {
      value = "in_progress";
      ruleName = "explicit_in_progress";
    } else if (rule.completed?.test(block.text)) {
      value = rule.fieldId === "ppt_status" ? "adopted" : "completed";
      ruleName = "explicit_positive";
    } else if (rule.unknown?.test(block.text)) {
      value = "unknown";
      ruleName = "explicit_unknown";
    } else if (rule.fieldId === "collective_loan") {
      value = "yes";
      ruleName = "explicit_positive";
    }

    if (!value) continue;

    const directType =
      (rule.fieldId === "ppt_status" && context.documentType === "ppt") ||
      (rule.fieldId === "dtg_status" && context.documentType === "dtg") ||
      (rule.fieldId === "collective_dpe_status" &&
        context.documentType === "dpe_collectif");
    const decisionInPv =
      context.documentType === "pv_ag" &&
      (value === "adopted" || value === "yes" || value === "no");
    const confidence = directType || decisionInPv ? 95 : 82;

    candidates.push(
      candidate(
        context,
        rule.fieldId,
        value,
        confidence,
        `complex.${rule.fieldId}.${ruleName}`,
        block,
      ),
    );
    return;
  }
}

function addStatuses(
  candidates: SimpleFieldCandidate[],
  context: SimpleExtractionContext,
) {
  addControlledStatus(candidates, context, {
    absent:
      /(?:aucun\s+(?:emprunt|pr[êe]t)\s+collectif|absence\s+d['’]emprunt\s+collectif|n['’]a\s+pas\s+contract[ée]\s+d['’]emprunt\s+collectif)/i,
    fieldId: "collective_loan",
    positive:
      /(?:(?:emprunt|pr[êe]t)\s+collectif[^\n]{0,60}(?:en\s+cours|contract[ée]|souscrit|adopt[ée]|aucun|absen|pas\s+contract[ée]|inconnu|non\s+renseign[ée])|(?:aucun|absence\s+d['’])[^\n]{0,40}(?:emprunt|pr[êe]t)\s+collectif)/i,
    relevantTypes: ["pv_ag", "annexe_comptable", "fiche_synthetique"],
    unknown:
      /(?:emprunt|pr[êe]t)\s+collectif[^\n]{0,60}(?:inconnu|non\s+renseign[ée]|non\s+d[ée]termin[ée])/i,
  });
  addControlledStatus(candidates, context, {
    absent:
      /(?:aucun\s+(?:projet\s+de\s+)?plan\s+pluriannuel\s+de\s+travaux|absence\s+de\s+(?:PPPT|PPT)|(?:PPPT|PPT)\s+(?:absent|non\s+[ée]tabli|non\s+r[ée]alis[ée]))/i,
    completed:
      /(?:(?:plan\s+pluriannuel\s+de\s+travaux|PPT)[^\n]{0,80}(?:adopt[ée]|approuv[ée])|(?:adoption|approbation)[^\n]{0,80}(?:du\s+)?(?:PPT|plan\s+pluriannuel\s+de\s+travaux))/i,
    fieldId: "ppt_status",
    inProgress:
      /(?:(?:PPPT|PPT|plan\s+pluriannuel\s+de\s+travaux)[^\n]{0,80}(?:en\s+cours|en\s+pr[ée]paration|en\s+[ée]laboration|command[ée])|[ée]laboration[^\n]{0,80}(?:du\s+)?(?:PPPT|PPT))/i,
    positive: /(?:PPPT|PPT|plan\s+pluriannuel\s+de\s+travaux)/i,
    relevantTypes: ["pv_ag", "fiche_synthetique", "ppt"],
    unknown:
      /(?:PPPT|PPT|plan\s+pluriannuel\s+de\s+travaux)[^\n]{0,80}(?:inconnu|non\s+renseign[ée]|non\s+d[ée]termin[ée])/i,
  });
  addControlledStatus(candidates, context, {
    absent:
      /(?:aucun\s+diagnostic\s+technique\s+global|absence\s+de\s+DTG|DTG\s+(?:absent|non\s+r[ée]alis[ée]))/i,
    completed:
      /(?:(?:diagnostic\s+technique\s+global|DTG)[^\n]{0,80}(?:r[ée]alis[ée]|achev[ée]|rapport\s+final)|rapport\s+final[^\n]{0,80}(?:DTG|diagnostic\s+technique\s+global))/i,
    fieldId: "dtg_status",
    inProgress:
      /(?:diagnostic\s+technique\s+global|DTG)[^\n]{0,80}(?:en\s+cours|command[ée]|en\s+pr[ée]paration)/i,
    positive: /(?:diagnostic\s+technique\s+global|\bDTG\b)/i,
    relevantTypes: ["pv_ag", "fiche_synthetique", "dtg"],
    unknown:
      /(?:diagnostic\s+technique\s+global|\bDTG\b)[^\n]{0,80}(?:inconnu|non\s+renseign[ée]|non\s+d[ée]termin[ée])/i,
  });
  addControlledStatus(candidates, context, {
    absent:
      /(?:aucun\s+DPE\s+collectif|absence\s+de\s+DPE\s+collectif|DPE\s+collectif\s+(?:absent|non\s+r[ée]alis[ée]))/i,
    completed:
      /(?:(?:DPE\s+collectif|diagnostic\s+de\s+performance\s+[ée]nerg[ée]tique\s+collectif)[^\n]{0,80}(?:r[ée]alis[ée]|achev[ée]|disponible|valide)|num[ée]ro\s+ADEME)/i,
    fieldId: "collective_dpe_status",
    inProgress:
      /(?:DPE\s+collectif|diagnostic\s+de\s+performance\s+[ée]nerg[ée]tique\s+collectif)[^\n]{0,80}(?:en\s+cours|command[ée]|en\s+pr[ée]paration)/i,
    positive:
      /(?:DPE\s+collectif|diagnostic\s+de\s+performance\s+[ée]nerg[ée]tique\s+collectif|num[ée]ro\s+ADEME)/i,
    relevantTypes: ["pv_ag", "fiche_synthetique", "dpe_collectif"],
    unknown:
      /(?:DPE\s+collectif|diagnostic\s+de\s+performance\s+[ée]nerg[ée]tique\s+collectif)[^\n]{0,80}(?:inconnu|non\s+renseign[ée]|non\s+d[ée]termin[ée])/i,
  });
}

export function extractComplexFields(context: SimpleExtractionContext) {
  if (
    context.classificationStatus === "insufficient_text" ||
    !COMPLEX_DOCUMENT_TYPES.has(context.documentType)
  ) {
    return [];
  }

  const candidates: SimpleFieldCandidate[] = [];
  addWorks(candidates, context);
  addLegalProceedings(candidates, context);
  addStatuses(candidates, context);
  return candidates;
}

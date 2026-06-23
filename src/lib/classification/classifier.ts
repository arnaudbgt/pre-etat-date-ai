import { normalizeClassificationText } from "./normalization";
import { CLASSIFICATION_RULES, OTHER_TITLE_SIGNALS } from "./rules";
import {
  CLASSIFICATION_VERSION,
  type CandidateScore,
  type ClassificationResult,
  type ClassificationRule,
  type Signal,
  type TextPage,
} from "./types";

function matchesSignal(text: string, item: Signal) {
  const matchesAll = !item.all || item.all.every((term) => text.includes(term));
  const matchesAny = !item.any || item.any.some((term) => text.includes(term));
  return matchesAll && matchesAny;
}

function matched(text: string, signals: Signal[], maximum: number) {
  return signals.filter((item) => matchesSignal(text, item)).slice(0, maximum);
}

function scoreRule(
  rule: ClassificationRule,
  fullText: string,
  titleText: string,
): CandidateScore {
  const title = matched(titleText, rule.titleSignals, 1);
  const strong = matched(fullText, rule.strongExpressions, 2);
  const positive = matched(fullText, rule.positiveKeywords, 5);
  const major = matched(fullText, rule.majorStructures, 2);
  const secondary = matched(fullText, rule.secondaryStructures, 2);
  const negativeStrong = matched(fullText, rule.negativeStrong, 2);
  const negativeWeak = matched(fullText, rule.negativeWeak, 2);
  const incompatible = matched(fullText, rule.incompatible, 1);

  const rawScore =
    title.length * 35 +
    strong.length * 15 +
    positive.length * 4 +
    major.length * 10 +
    secondary.length * 5 -
    negativeStrong.length * 25 -
    negativeWeak.length * 8 -
    incompatible.length * 20;

  const groups = [
    ["title", title],
    ["strong_expression", strong],
    ["positive_keyword", positive],
    ["major_structure", major],
    ["secondary_structure", secondary],
    ["negative_strong", negativeStrong],
    ["negative_weak", negativeWeak],
    ["incompatible", incompatible],
  ] as const;

  return {
    hasDiscriminant: title.length > 0 || strong.length > 0,
    majorStructureCount: major.length,
    matchedSignals: groups.flatMap(([kind, items]) =>
      items.map((item) => ({ id: item.id, kind })),
    ),
    score: Math.max(0, Math.min(100, rawScore)),
    type: rule.type,
  };
}

export function classifyDocument(
  pages: TextPage[],
  options: {
    classificationDurationMs?: number;
    extractedCharacters?: number;
    minCharacters: number;
    totalPages?: number;
    truncated?: boolean;
  },
): ClassificationResult {
  const normalizedPages = pages.map((page) =>
    normalizeClassificationText(page.text),
  );
  const fullText = normalizedPages.join(" ").trim();
  const usefulCharacters = fullText.replace(/[^a-z0-9]/g, "").length;
  const extractedCharacters =
    options.extractedCharacters ??
    pages.reduce((sum, page) => sum + page.text.length, 0);
  const baseDetails = {
    analyzedPages: pages.length,
    classificationDurationMs: options.classificationDurationMs ?? 0,
    extractedCharacters,
    pdf_has_text_layer: extractedCharacters > 0,
    totalPages: options.totalPages ?? pages.length,
    truncated: options.truncated ?? false,
    usefulCharacters,
    version: CLASSIFICATION_VERSION,
  };

  if (usefulCharacters < options.minCharacters) {
    return {
      confidence: 0,
      details: {
        ...baseDetails,
        candidates: [],
        margin: 0,
        matchedSignals: [],
      },
      documentType: "other",
      status: "insufficient_text",
    };
  }

  const titleText = normalizedPages[0]?.slice(0, 2000) ?? "";
  const candidates = CLASSIFICATION_RULES.map((rule) =>
    scoreRule(rule, fullText, titleText),
  ).sort((left, right) => right.score - left.score);
  const first = candidates[0];
  const second = candidates[1];
  const margin = first.score - second.score;
  const canAutomaticallyClassify =
    first.score >= 70 &&
    margin >= 15 &&
    (first.hasDiscriminant || first.majorStructureCount >= 2);
  const explicitOther = OTHER_TITLE_SIGNALS.some((item) =>
    matchesSignal(titleText, item),
  );

  let documentType: ClassificationResult["documentType"] = first.type;
  let status: ClassificationResult["status"] = canAutomaticallyClassify
    ? "classified"
    : "uncertain";
  let confidence = first.score;

  if (first.score < 50) {
    documentType = "other";
    status = "classified";
    confidence =
      explicitOther && first.score <= 30 ? 95 : first.score <= 40 ? 80 : 60;
  }

  return {
    confidence,
    details: {
      ...baseDetails,
      candidates: candidates
        .slice(0, 3)
        .map(({ score, type }) => ({ score, type })),
      margin,
      matchedSignals: first.matchedSignals.map((item) => ({
        ...item,
        type: first.type,
      })),
    },
    documentType,
    status,
  };
}

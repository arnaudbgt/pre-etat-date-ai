export type ParsedMoney = {
  amount: number;
  end: number;
  normalizedValue: string;
  raw: string;
  start: number;
};

const MONEY_PATTERN =
  /(?<![\d/])(-?\s*\(?(?:(?:\d{1,3}(?:[\s\u00a0\u202f./]\d{3})+)|\d+),\d{2}\)?)\s*(?:€|EUR)(?![A-Za-z0-9])/gi;

function parseFrenchNumber(raw: string) {
  const negative = /^\s*-/.test(raw) || /\([^)]*\)/.test(raw);
  const numeric = raw
    .replace(/EUR|€/gi, "")
    .replace(/[()\s\u00a0\u202f./]/g, "")
    .replace(/^[-+]/, "")
    .replace(",", ".");
  const amount = Number(numeric);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return negative ? -amount : amount;
}

export function normalizedDecimal(value: number) {
  return value.toFixed(2);
}

export function findMoneyAmounts(text: string): ParsedMoney[] {
  const amounts: ParsedMoney[] = [];

  for (const match of text.matchAll(MONEY_PATTERN)) {
    if (match.index === undefined) {
      continue;
    }

    const amount = parseFrenchNumber(match[1]);

    if (amount === null) {
      continue;
    }

    amounts.push({
      amount,
      end: match.index + match[0].length,
      normalizedValue: normalizedDecimal(amount),
      raw: match[0].trim(),
      start: match.index,
    });
  }

  return amounts;
}

export function findPercentages(text: string) {
  const percentages: Array<{
    end: number;
    normalizedValue: string;
    raw: string;
    start: number;
    value: number;
  }> = [];
  const pattern = /\b(\d{1,3}(?:,\d{1,2})?)\s*%/g;

  for (const match of text.matchAll(pattern)) {
    if (match.index === undefined) continue;
    const value = Number(match[1].replace(",", "."));

    if (!Number.isFinite(value) || value < 0 || value > 100) continue;

    percentages.push({
      end: match.index + match[0].length,
      normalizedValue: value.toString(),
      raw: match[0],
      start: match.index,
      value,
    });
  }

  return percentages;
}

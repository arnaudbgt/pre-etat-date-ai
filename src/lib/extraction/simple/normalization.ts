const FRENCH_MONTHS: Record<string, number> = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
};

export type DetectedDate = {
  end: number;
  iso: string;
  raw: string;
  start: number;
};

export function normalizeComparable(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[^a-z0-9@+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePhone(value: string) {
  const compact = value.replace(/[^+\d]/g, "");
  return compact.startsWith("0033") ? `+33${compact.slice(4)}` : compact;
}

export function sourceExcerpt(text: string, start: number, end: number) {
  const radius = 90;
  const from = Math.max(0, start - radius);
  const to = Math.min(text.length, end + radius);
  const compact = text.slice(from, to).replace(/\s+/g, " ").trim();

  if (compact.length <= 200) {
    return compact;
  }

  return compact.slice(0, 199).trimEnd() + "…";
}

function validIsoDate(day: number, month: number, year: number) {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

export function findDates(text: string): DetectedDate[] {
  const dates: DetectedDate[] = [];
  const numeric =
    /\b(0?[1-9]|[12]\d|3[01])\s*[/.\-]\s*(0?[1-9]|1[0-2])\s*[/.\-]\s*((?:19|20)\d{2})\b/g;
  const words =
    /\b(0?[1-9]|[12]\d|3[01])\s+(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)\s+((?:19|20)\d{2})\b/gi;

  for (const match of text.matchAll(numeric)) {
    const iso = validIsoDate(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
    );

    if (iso && match.index !== undefined) {
      dates.push({
        end: match.index + match[0].length,
        iso,
        raw: match[0],
        start: match.index,
      });
    }
  }

  for (const match of text.matchAll(words)) {
    const monthName = normalizeComparable(match[2]);
    const iso = validIsoDate(
      Number(match[1]),
      FRENCH_MONTHS[monthName],
      Number(match[3]),
    );

    if (iso && match.index !== undefined) {
      dates.push({
        end: match.index + match[0].length,
        iso,
        raw: match[0],
        start: match.index,
      });
    }
  }

  return dates.sort((left, right) => left.start - right.start);
}

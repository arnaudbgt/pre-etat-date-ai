export function normalizeClassificationText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`´]/g, "'")
    .replace(/\b([a-z])\s*-\s*\n\s*([a-z])/gi, "$1$2")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^a-zA-Z0-9%€'./°-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

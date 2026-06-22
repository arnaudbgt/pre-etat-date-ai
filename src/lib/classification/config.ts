import "server-only";

function positiveInteger(name: string, fallback: number, maximum: number) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value <= 0 || value > maximum) {
    throw new Error(
      `${name} doit être un entier compris entre 1 et ${maximum}.`,
    );
  }

  return value;
}

export function getClassificationLimits() {
  const maxCharacters = positiveInteger(
    "CLASSIFICATION_MAX_CHARACTERS",
    200_000,
    1_000_000,
  );
  const minCharacters = positiveInteger(
    "CLASSIFICATION_MIN_CHARACTERS",
    80,
    2_000,
  );

  if (minCharacters > maxCharacters) {
    throw new Error(
      "CLASSIFICATION_MIN_CHARACTERS doit être inférieur à la limite maximale.",
    );
  }

  return {
    maxCharacters,
    maxPages: positiveInteger("CLASSIFICATION_MAX_PAGES", 50, 200),
    maxPayloadBytes: maxCharacters * 4 + 100_000,
    minCharacters,
  };
}

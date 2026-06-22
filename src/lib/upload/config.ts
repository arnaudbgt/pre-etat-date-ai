import "server-only";

import { BUCKET_MAX_PDF_SIZE_MB } from "./constants";

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

export function getUploadConfig() {
  const maxPdfSizeMb = positiveInteger(
    "MAX_PDF_SIZE_MB",
    10,
    BUCKET_MAX_PDF_SIZE_MB,
  );

  return {
    maxFiles: positiveInteger("MAX_PDF_FILES", 10, 50),
    maxPdfSizeMb,
    maxPdfSizeBytes: maxPdfSizeMb * 1024 * 1024,
    retentionHours: positiveInteger("TEMP_UPLOAD_RETENTION_HOURS", 24, 168),
    purgeBatchSize: positiveInteger("PURGE_BATCH_SIZE", 100, 500),
  };
}

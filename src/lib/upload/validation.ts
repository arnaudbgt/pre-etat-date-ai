import { PDF_MIME_TYPE, UUID_PATTERN } from "./constants";

type FileMetadata = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export function validateFileMetadata(
  metadata: FileMetadata,
  maxSizeBytes: number,
) {
  if (!metadata.filename.toLowerCase().endsWith(".pdf")) {
    return "Le fichier doit utiliser l’extension .pdf.";
  }

  if (metadata.mimeType !== PDF_MIME_TYPE) {
    return "Le type MIME doit être application/pdf.";
  }

  if (!Number.isInteger(metadata.sizeBytes) || metadata.sizeBytes <= 0) {
    return "Le fichier PDF est vide ou sa taille est invalide.";
  }

  if (metadata.sizeBytes > maxSizeBytes) {
    return "Le fichier dépasse la taille maximale autorisée.";
  }

  return null;
}

export async function hasPdfSignature(file: File) {
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const signature = String.fromCharCode(...header);

  return signature === "%PDF-";
}

export function sanitizePdfFilename(filename: string) {
  const withoutPath = filename.split(/[\\/]/).pop() ?? "document.pdf";
  const stem = withoutPath.replace(/\.pdf$/i, "");
  const normalized = stem
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

  return `${normalized || "document"}.pdf`;
}

export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

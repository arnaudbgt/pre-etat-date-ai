import type { ExtractedPdfText } from "./extract-text";

export type PdfTextDiagnostics = {
  extractedCharacters: number;
  pdfHasTextLayer: boolean;
  totalPages: number;
};

export function getPdfTextDiagnostics(
  extractedText: ExtractedPdfText,
): PdfTextDiagnostics {
  const extractedCharacters = extractedText.pages.reduce(
    (sum, page) => sum + page.text.length,
    0,
  );

  return {
    extractedCharacters,
    pdfHasTextLayer: extractedCharacters > 0,
    totalPages: extractedText.totalPages,
  };
}

export function getPdfExtractionFailureMessage() {
  return "Erreur d’extraction PDF : impossible de lire le texte du fichier. Le PDF est peut-être protégé ou incompatible.";
}

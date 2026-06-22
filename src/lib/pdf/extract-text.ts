"use client";

import type { TextPage } from "@/lib/classification/types";

type ExtractionLimits = {
  maxCharacters: number;
  maxPages: number;
};

export type ExtractedPdfText = {
  pages: TextPage[];
  totalPages: number;
  truncated: boolean;
};

let workerConfigured = false;

export async function extractTextFromPdf(
  file: File,
  limits: ExtractionLimits,
): Promise<ExtractedPdfText> {
  const pdfjs = await import("pdfjs-dist");

  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    workerConfigured = true;
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const pages: TextPage[] = [];
  let characterCount = 0;
  let truncated = pdf.numPages > limits.maxPages;

  try {
    const pageLimit = Math.min(pdf.numPages, limits.maxPages);

    for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const remainingCharacters = limits.maxCharacters - characterCount;

      if (remainingCharacters <= 0) {
        truncated = true;
        break;
      }

      const limitedText = pageText.slice(0, remainingCharacters);
      pages.push({ pageNumber, text: limitedText });
      characterCount += limitedText.length;

      if (limitedText.length < pageText.length) {
        truncated = true;
        break;
      }
    }

    return { pages, totalPages: pdf.numPages, truncated };
  } finally {
    await loadingTask.destroy();
  }
}

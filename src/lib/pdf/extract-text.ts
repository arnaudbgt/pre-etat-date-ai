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

type PdfExtractionDiagnostics = {
  errorMessage: string;
  errorName: string;
  stack?: string;
  step: string;
  version?: string;
  workerSrc?: string;
};

export class PdfTextExtractionError extends Error {
  diagnostics: PdfExtractionDiagnostics;

  constructor(diagnostics: PdfExtractionDiagnostics, cause: unknown) {
    super(diagnostics.errorMessage, { cause });
    this.name = diagnostics.errorName;
    this.diagnostics = diagnostics;
  }
}

function toErrorDiagnostics(
  error: unknown,
  step: string,
  version?: string,
  workerSrc?: string,
): PdfExtractionDiagnostics {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
      errorName: error.name,
      stack: error.stack,
      step,
      version,
      workerSrc,
    };
  }

  return {
    errorMessage: String(error),
    errorName: "UnknownPdfExtractionError",
    step,
    version,
    workerSrc,
  };
}

function logPdfExtractionFailure(diagnostics: PdfExtractionDiagnostics) {
  if (process.env.NODE_ENV === "development") {
    console.error("pdf_text_extraction_failed", diagnostics);
  }
}

export async function extractTextFromPdf(
  file: File,
  limits: ExtractionLimits,
): Promise<ExtractedPdfText> {
  let step = "import_pdfjs";
  let version: string | undefined;
  let workerSrc: string | undefined;

  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    version = pdfjs.version;

    step = "configure_worker";
    if (!workerConfigured) {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      workerConfigured = true;
    }
    workerSrc = pdfjs.GlobalWorkerOptions.workerSrc;

    step = "read_file_array_buffer";
    const bytes = new Uint8Array(await file.arrayBuffer());

    step = "get_document_call";
    const loadingTask = pdfjs.getDocument({ data: bytes });

    step = "get_document_promise";
    const pdf = await loadingTask.promise;

    step = "read_num_pages";
    const pages: TextPage[] = [];
    let characterCount = 0;
    let truncated = pdf.numPages > limits.maxPages;

    const pageLimit = Math.min(pdf.numPages, limits.maxPages);

    try {
      for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
        step = `get_page_${pageNumber}`;
        const page = await pdf.getPage(pageNumber);

        step = `get_text_content_${pageNumber}`;
        const content = await page.getTextContent();

        step = `normalize_page_text_${pageNumber}`;
        const pageText = content.items
          .map((item) =>
            "str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : "",
          )
          .join("")
          .replace(/[ \t]+/g, " ")
          .replace(/ *\n */g, "\n")
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
      const stepBeforeDestroy = step;

      try {
        step = "destroy_loading_task";
        await loadingTask.destroy();
        step = stepBeforeDestroy;
      } catch (destroyError) {
        throw destroyError;
      }
    }
  } catch (error) {
    const diagnostics = toErrorDiagnostics(error, step, version, workerSrc);
    logPdfExtractionFailure(diagnostics);

    throw new PdfTextExtractionError(diagnostics, error);
  }
}

import "server-only";

import { dirname, join, sep } from "node:path";
import { createRequire } from "node:module";

import type { TextPage } from "@/lib/classification/types";

type ExtractionLimits = {
  maxCharacters: number;
  maxPages: number;
};

type ExtractionDebugContext = {
  documentId?: string;
  storagePath?: string;
};

export type ServerExtractedPdfText = {
  extractedCharacters: number;
  pages: TextPage[];
  pdfHasTextLayer: boolean;
  totalPages: number;
  truncated: boolean;
};

type PdfServerExtractionDiagnostics = {
  bufferByteLength?: number;
  documentId?: string;
  errorMessage: string;
  errorName: string;
  stack?: string;
  step: string;
  storagePath?: string;
  version?: string;
};

export class PdfServerTextExtractionError extends Error {
  diagnostics: PdfServerExtractionDiagnostics;

  constructor(diagnostics: PdfServerExtractionDiagnostics, cause: unknown) {
    super(diagnostics.errorMessage, { cause });
    this.name = diagnostics.errorName;
    this.diagnostics = diagnostics;
  }
}

const require = createRequire(import.meta.url);

function getStandardFontDataUrl() {
  const packageJsonPath = require.resolve("pdfjs-dist/package.json");
  return `${join(dirname(packageJsonPath), "standard_fonts")}${sep}`;
}

function toErrorDiagnostics(
  error: unknown,
  step: string,
  context: ExtractionDebugContext,
  bufferByteLength: number,
  version?: string,
): PdfServerExtractionDiagnostics {
  if (error instanceof Error) {
    return {
      bufferByteLength,
      documentId: context.documentId,
      errorMessage: error.message,
      errorName: error.name,
      stack: error.stack,
      step,
      storagePath: context.storagePath,
      version,
    };
  }

  return {
    bufferByteLength,
    documentId: context.documentId,
    errorMessage: String(error),
    errorName: "UnknownPdfServerExtractionError",
    step,
    storagePath: context.storagePath,
    version,
  };
}

function normalizeTextItems(items: Array<unknown>) {
  return items
    .map((item) => {
      if (!item || typeof item !== "object" || !("str" in item)) {
        return "";
      }

      const textItem = item as { hasEOL?: boolean; str?: unknown };
      const text = typeof textItem.str === "string" ? textItem.str : "";
      return `${text}${textItem.hasEOL ? "\n" : " "}`;
    })
    .join("")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

function logPdfServerDebug(event: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.error(event, details);
  }
}

export async function extractTextFromPdfBuffer(
  buffer: Buffer,
  limits: ExtractionLimits,
  context: ExtractionDebugContext = {},
): Promise<ServerExtractedPdfText> {
  let step = "import_pdfjs_legacy_server";
  let version: string | undefined;

  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    version = pdfjs.version;
    logPdfServerDebug("pdf_server_text_extraction_pdfjs_loaded", {
      documentId: context.documentId,
      pdfjsVersion: version,
      storagePath: context.storagePath,
    });

    step = "import_pdfjs_legacy_worker_handler";
    await import("pdfjs-dist/legacy/build/pdf.worker.mjs");

    step = "copy_pdf_buffer";
    const data = new Uint8Array(buffer);

    step = "get_document_call";
    const documentParameters = {
      data,
      disableWorker: true,
      standardFontDataUrl: getStandardFontDataUrl(),
      useWorkerFetch: false,
    } as unknown as Parameters<typeof pdfjs.getDocument>[0];

    const loadingTask = pdfjs.getDocument(documentParameters);

    step = "get_document_promise";
    const pdf = await loadingTask.promise;

    step = "read_num_pages";
    const totalPages = pdf.numPages;
    logPdfServerDebug("pdf_server_text_extraction_document_loaded", {
      bufferByteLength: buffer.byteLength,
      documentId: context.documentId,
      pdfjsVersion: version,
      storagePath: context.storagePath,
      totalPages,
    });
    const pages: TextPage[] = [];
    const pageLimit = Math.min(totalPages, limits.maxPages);
    let extractedCharacters = 0;
    let truncated = totalPages > limits.maxPages;

    try {
      for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
        step = `get_page_${pageNumber}`;
        const page = await pdf.getPage(pageNumber);

        step = `get_text_content_${pageNumber}`;
        const content = await page.getTextContent();

        step = `normalize_page_text_${pageNumber}`;
        const pageText = normalizeTextItems(content.items);
        const remainingCharacters = limits.maxCharacters - extractedCharacters;

        if (remainingCharacters <= 0) {
          truncated = true;
          break;
        }

        const limitedText = pageText.slice(0, remainingCharacters);
        pages.push({ pageNumber, text: limitedText });
        extractedCharacters += limitedText.length;

        if (limitedText.length < pageText.length) {
          truncated = true;
          break;
        }
      }
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

    logPdfServerDebug("pdf_server_text_extraction_succeeded", {
      analyzedPages: pages.length,
      bufferByteLength: buffer.byteLength,
      documentId: context.documentId,
      extractedCharacters,
      pdfHasTextLayer: extractedCharacters > 0,
      pdfjsVersion: version,
      storagePath: context.storagePath,
      totalPages,
      truncated,
    });

    return {
      extractedCharacters,
      pages,
      pdfHasTextLayer: extractedCharacters > 0,
      totalPages,
      truncated,
    };
  } catch (error) {
    const diagnostics = toErrorDiagnostics(
      error,
      step,
      context,
      buffer.byteLength,
      version,
    );

    if (process.env.NODE_ENV === "development") {
      console.error("pdf_server_text_extraction_failed", diagnostics);
    }

    throw new PdfServerTextExtractionError(diagnostics, error);
  }
}

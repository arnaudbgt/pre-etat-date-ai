import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("PDF.js extraction configuration", () => {
  it("uses the legacy PDF.js build and legacy worker in the browser extractor", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/pdf/extract-text.ts"),
      "utf8",
    );

    expect(source).toContain('import("pdfjs-dist/legacy/build/pdf.mjs")');
    expect(source).toContain('"pdfjs-dist/legacy/build/pdf.worker.min.mjs"');
    expect(source).not.toContain('import("pdfjs-dist")');
    expect(source).not.toContain('"pdfjs-dist/build/pdf.worker.min.mjs"');
  });
});

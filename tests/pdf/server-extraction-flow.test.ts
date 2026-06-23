import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { classifyDocument } from "../../src/lib/classification/classifier";
import { extractTextFromPdfBuffer } from "../../src/lib/pdf/extract-text-server";

class FakePrivateStorage {
  private readonly files = new Map<string, Buffer>();

  async upload(path: string, buffer: Buffer) {
    this.files.set(path, buffer);
  }

  async download(path: string) {
    const buffer = this.files.get(path);

    if (!buffer) {
      throw new Error("storage_object_not_found");
    }

    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;

    return new Blob([arrayBuffer], { type: "application/pdf" });
  }
}

function escapePdfText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildMinimalTextPdf(text: string) {
  const textLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const content = [
    "BT /F1 12 Tf 14 TL 72 720 Td",
    ...textLines.flatMap((line, index) =>
      index === 0
        ? [`(${escapePdfText(line)}) Tj`]
        : ["T*", `(${escapePdfText(line)}) Tj`],
    ),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

describe("server PDF extraction and classification flow", () => {
  it("supports upload -> Storage download -> server extraction -> classification", async () => {
    const storage = new FakePrivateStorage();
    const path = "projects/project-id/documents/laforet-appel-de-fonds.pdf";
    const pdf = buildMinimalTextPdf(
      `APPEL DE FONDS Montant a regler 420 EUR Exigible le 01/07/2026
       Budget previsionnel tantiemes votre quote-part fonds travaux prochain appel
       Periode du 01/07/2026 au 30/09/2026 Appel TTC
       Postes a repartir Total Base Tantiemes Quote-part
       Lot 12 coproprietaire paiement par virement IBAN`,
    );

    await storage.upload(path, pdf);
    const downloadedPdf = await storage.download(path);
    const buffer = Buffer.from(await downloadedPdf.arrayBuffer());
    const extractedText = await extractTextFromPdfBuffer(buffer, {
      maxCharacters: 200_000,
      maxPages: 50,
    });
    const result = classifyDocument(extractedText.pages, {
      extractedCharacters: extractedText.extractedCharacters,
      minCharacters: 40,
      totalPages: extractedText.totalPages,
      truncated: extractedText.truncated,
    });

    expect(extractedText.totalPages).toBe(1);
    expect(extractedText.pdfHasTextLayer).toBe(true);
    expect(extractedText.extractedCharacters).toBeGreaterThan(80);
    expect(result.documentType).toBe("appel_de_fonds");
    expect(result.status).toBe("classified");
    expect(result.details).toMatchObject({
      analyzedPages: 1,
      pdf_has_text_layer: true,
      totalPages: 1,
      truncated: false,
    });
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("real-world dossier test runner", () => {
  it("declares the npm command and keeps real PDFs out of Git", () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    const gitignore = readFileSync(join(process.cwd(), ".gitignore"), "utf8");

    expect(packageJson.scripts?.["test:real-world"]).toBe(
      "tsx --conditions react-server scripts/run-real-world-tests.ts",
    );
    expect(gitignore).toContain("test-data/*");
    expect(gitignore).toContain("!test-data/real-world/scenarios.example.json");
    expect(gitignore).toContain("test-results/*");
    expect(gitignore).toContain("!test-results/.gitkeep");
  });

  it("documents the scenario format without committing a real scenario", () => {
    const example = JSON.parse(
      readFileSync(
        join(process.cwd(), "test-data/real-world/scenarios.example.json"),
        "utf8",
      ),
    ) as Array<{
      expected?: {
        documents?: Record<string, string>;
        fields?: Record<string, string>;
      };
      files?: string[];
      name?: string;
    }>;

    expect(example[0]?.name).toBe("foncia-001");
    expect(example[0]?.files).toContain("Appel de charges 2025 - Février.pdf");
    expect(example[0]?.expected?.documents).toMatchObject({
      "PV.AGS.14.04.2023.pdf": "pv_ag",
    });
    expect(example[0]?.expected?.fields).toMatchObject({
      syndic_name: "Foncia Nancy - Tour Thiers",
    });
  });

  it("generates reports without logging full extracted PDF text", () => {
    const source = readFileSync(
      join(process.cwd(), "scripts/run-real-world-tests.ts"),
      "utf8",
    );

    expect(source).toContain("real-world-report.json");
    expect(source).toContain("real-world-report.md");
    expect(source).toContain("extractTextFromPdfBuffer");
    expect(source).not.toContain("console.log(extractedText");
    expect(source).not.toContain("writeFileSync(jsonReportPath, extractedText");
    expect(source).not.toContain("pages.map((page) => page.text");
  });
});

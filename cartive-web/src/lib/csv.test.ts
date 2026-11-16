import { describe, expect, it } from "vitest";
import { escapeCsvCell, serializeCsv } from "./csv";

describe("CSV export safety", () => {
  it("quotes delimiters and escapes quotes and line breaks", () => {
    expect(escapeCsvCell('kopi, "Reka"\n')).toBe('"kopi, ""Reka""\n"');
  });

  it("neutralizes spreadsheet formula prefixes in text", () => {
    expect(escapeCsvCell("=HYPERLINK(\"https://example.test\")")).toBe(
      `"'=HYPERLINK(""https://example.test"")"`,
    );
    expect(escapeCsvCell("  @SUM(A1:A2)")).toBe('"\'  @SUM(A1:A2)"');
  });

  it("keeps numbers as numbers and formats a CSV document", () => {
    expect(serializeCsv([["kode", "total"], ["CRT-1", 10000]])).toBe(
      '"kode","total"\r\n"CRT-1","10000"',
    );
  });
});

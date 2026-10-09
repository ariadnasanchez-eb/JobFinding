import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CvFileError, detectCvKind, extractCvText, normaliseText, redactContactDetails } from "@/lib/cv/extract";

const fixture = (name: string) => new Uint8Array(readFileSync(new URL(`../fixtures/${name}`, import.meta.url)));

describe("detectCvKind", () => {
  it("accepts real PDF and DOCX files", () => {
    expect(detectCvKind(fixture("sample-cv.pdf"), "cv.pdf")).toBe("pdf");
    expect(detectCvKind(fixture("sample-cv.docx"), "CV.DOCX")).toBe("docx");
  });

  it("rejects a file whose content doesn't match its extension", () => {
    expect(() => detectCvKind(fixture("sample-cv.docx"), "cv.pdf")).toThrow(CvFileError);
    expect(() => detectCvKind(new TextEncoder().encode("hello world"), "cv.pdf")).toThrow(CvFileError);
  });

  it("rejects empty and oversized files", () => {
    expect(() => detectCvKind(new Uint8Array(), "cv.pdf")).toThrow("empty");
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big.set([0x25, 0x50, 0x44, 0x46]);
    expect(() => detectCvKind(big, "cv.pdf")).toThrow("5 MB");
  });
});

describe("extractCvText", () => {
  it("extracts text from a PDF", async () => {
    const text = await extractCvText(fixture("sample-cv.pdf"), "pdf");
    expect(text).toContain("TicketFlow");
    expect(text).toContain("105%");
  });

  it("extracts text from a DOCX", async () => {
    const text = await extractCvText(fixture("sample-cv.docx"), "docx");
    expect(text).toContain("Engineering Manager, TicketFlow");
    expect(text).not.toMatch(/\n{3,}/);
  });

  it("rejects corrupted files with a readable message", async () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2, 3]);
    await expect(extractCvText(bytes, "pdf")).rejects.toThrow(CvFileError);
  });
});

describe("normaliseText", () => {
  it("collapses whitespace but keeps paragraph breaks", () => {
    expect(normaliseText("a\t\tb\r\n\r\n\r\n\r\nc  d")).toBe("a b\n\nc d");
  });
});

describe("redactContactDetails", () => {
  it("removes email, phone and LinkedIn URL", () => {
    const out = redactContactDetails("laura@example.com · +34 612 345 678 · https://www.linkedin.com/in/laura");
    expect(out).toBe("[email] · [phone] · [linkedin]");
  });

  it("keeps years, date ranges and metrics", () => {
    const text = "2015 to 2019, 2012 - 2015, grew 105% and cut latency by 40%, team of 18";
    expect(redactContactDetails(text)).toBe(text);
  });
});

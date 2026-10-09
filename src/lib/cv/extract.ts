import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const MIN_CV_TEXT_CHARS = 200;

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type CvKind = "pdf" | "docx";

export class CvFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CvFileError";
  }
}

/** Checks size and real file type (magic bytes, not just the extension). */
export function detectCvKind(bytes: Uint8Array, fileName: string): CvKind {
  if (bytes.byteLength === 0) throw new CvFileError("The file is empty.");
  if (bytes.byteLength > MAX_CV_BYTES) throw new CvFileError("The file is larger than 5 MB.");
  const name = fileName.toLowerCase();
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04; // PK..
  if (isPdf && name.endsWith(".pdf")) return "pdf";
  if (isZip && name.endsWith(".docx")) return "docx";
  throw new CvFileError("Upload a PDF or DOCX file.");
}

export function mimeFor(kind: CvKind): string {
  return kind === "pdf" ? "application/pdf" : DOCX_MIME;
}

/** Collapses whitespace noise left by PDF/DOCX extraction while keeping line breaks. */
export function normaliseText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export async function extractCvText(bytes: Uint8Array, kind: CvKind): Promise<string> {
  let text: string;
  try {
    if (kind === "pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const result = await extractText(pdf, { mergePages: true });
      text = result.text;
    } else {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      text = result.value;
    }
  } catch {
    throw new CvFileError("We couldn't read this file. Is it password-protected or corrupted?");
  }
  text = normaliseText(text);
  if (text.length < MIN_CV_TEXT_CHARS) {
    throw new CvFileError(
      "We found almost no text in this file. If it is a scanned image, export it as a text PDF or DOCX.",
    );
  }
  return text;
}

/** Removes direct contact details before CV text is sent to an LLM. */
export function redactContactDetails(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/g, (m) =>
      m.replace(/\D/g, "").length >= 9 ? "[phone]" : m,
    )
    .replace(/https?:\/\/(?:www\.)?linkedin\.com\/\S+/gi, "[linkedin]");
}

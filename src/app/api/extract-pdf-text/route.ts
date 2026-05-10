/**
 * /api/extract-pdf-text
 *
 * Accepts a multipart/form-data POST with a single "file" field containing
 * a PDF. Extracts embedded text using a zero-dependency Node.js extractor
 * that uses only the built-in zlib module.
 *
 * Scanned PDFs (image-only, no embedded text layer) will return an empty
 * string and { scanned: true } so the UI can show the manual-paste fallback.
 *
 * All processing is server-side. No API keys are exposed to the browser.
 *
 * Limitations:
 * - Scanned / image-only PDFs are NOT supported (no OCR in this phase)
 * - Password-protected PDFs will return a specific error message
 * - Maximum file size: 50 MB
 * - PDFs with non-standard encoding may return partial or garbled text
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { extractTextFromPdf } from "@/lib/pdfTextExtractor";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // ── Auth: session + role ────────────────────────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(auth.role, "canUploadFiles")) {
    return NextResponse.json(
      { error: "Forbidden — PDF extraction requires admin or media buyer role" },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "No PDF file provided. Send a multipart/form-data request with a 'file' field." },
        { status: 400 }
      );
    }

    const fileObj = file as File;

    // Validate MIME type
    if (fileObj.type && fileObj.type !== "application/pdf") {
      return NextResponse.json(
        { error: `Unsupported file type: ${fileObj.type}. Only PDF files are accepted.` },
        { status: 415 }
      );
    }

    // Validate size — 50 MB hard limit
    const MAX_BYTES = 50 * 1024 * 1024;
    if (fileObj.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "PDF exceeds the 50 MB size limit." },
        { status: 413 }
      );
    }

    // Convert browser File → Node.js Buffer
    const arrayBuffer = await fileObj.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Confirm we received real PDF bytes
    const firstBytes = buffer.slice(0, 5).toString("hex").toUpperCase();
    const isPdf = firstBytes.startsWith("255044462D"); // %PDF-
    console.log(
      `[extract-pdf-text] recv: name=${fileObj.name} size=${buffer.length}B type=${fileObj.type} first5bytes=${firstBytes} isPdf=${isPdf}`
    );

    if (!isPdf && buffer.length > 0) {
      return NextResponse.json(
        { error: "File does not appear to be a valid PDF (bad header). Please re-upload." },
        { status: 422 }
      );
    }

    // Check for password-protected PDF (encrypted)
    const rawHeader = buffer.slice(0, 1024).toString("binary");
    if (rawHeader.includes("/Encrypt")) {
      return NextResponse.json(
        {
          error:
            "This PDF is password-protected. Remove the password and re-upload, or paste the onboarding summary manually.",
          scanned: false,
          text: "",
        },
        { status: 422 }
      );
    }

    // Extract text — pdfjs-dist primary, hand-rolled zlib fallback
    const { text, pageCount, scanned, method, diagnostic } = await extractTextFromPdf(buffer);

    // Safe diagnostic log — counts only, no text content
    console.log(
      `[extract-pdf-text] result: pages=${pageCount} chars=${text.length} method=${method} scanned=${scanned} diag=${diagnostic ?? "none"}`
    );

    if (scanned) {
      return NextResponse.json(
        {
          error:
            "PDF text could not be extracted automatically. You can paste the onboarding summary manually, or try exporting the PDF as a text-based PDF.",
          scanned: true,
          text: "",
          pageCount,
          fileName: fileObj.name,
          debug: { method, diagnostic: diagnostic ?? "none" },
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text,
      pageCount,
      scanned: false,
      charCount: text.length,
      fileName: fileObj.name,
      method,
    });
  } catch (err) {
    console.error("[extract-pdf-text] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error during PDF extraction." },
      { status: 500 }
    );
  }
}

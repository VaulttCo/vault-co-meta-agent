/**
 * /api/extract-pdf-text
 *
 * Accepts a multipart/form-data POST with a single "file" field containing
 * a PDF. Extracts embedded text using pdfjs-dist (Mozilla PDF.js) — no OCR.
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
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
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

    // Convert browser File → Uint8Array
    const arrayBuffer = await fileObj.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Use dynamic ESM import for pdfjs-dist (it ships as .mjs — must use import())
    // The legacy build is recommended for Node.js environments
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    let text = "";
    let pageCount = 0;
    let scanned = false;

    try {
      const loadingTask = pdfjsLib.getDocument({
        data: uint8,
        // Suppress font warnings — text extraction still works without standard fonts
        verbosity: 0,
        // Disable worker in Node.js serverless environment
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });

      const pdf = await loadingTask.promise;
      pageCount = pdf.numPages;

      const pageTexts: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => item.str ?? "")
          .join(" ");
        pageTexts.push(pageText);
      }

      text = pageTexts.join("\n").trim();
      scanned = text.length === 0;
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.error("[extract-pdf-text] pdfjs error:", msg);

      // Distinguish password-protected PDFs
      if (msg.toLowerCase().includes("password")) {
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

      return NextResponse.json(
        {
          error:
            "PDF text extraction failed. The file may be corrupted or in an unsupported format. Paste the onboarding summary manually.",
          scanned: true,
          text: "",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text,
      pageCount,
      scanned,
      charCount: text.length,
      fileName: fileObj.name,
    });
  } catch (err) {
    console.error("[extract-pdf-text] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error during PDF extraction." },
      { status: 500 }
    );
  }
}

/**
 * /api/extract-pdf-text
 *
 * Accepts a multipart/form-data POST with a single "file" field containing
 * a PDF. Extracts embedded text using pdf-parse (no OCR — scanned PDFs
 * without embedded text will return an empty string and the client should
 * fall back to manual paste).
 *
 * NOTE: Scanned PDFs (image-only, no embedded text layer) are NOT supported
 * in this phase. If text.trim() is empty the response includes
 * { scanned: true } so the UI can show the manual-paste fallback message.
 *
 * All processing is server-side. No API keys are exposed to the browser.
 */

import { NextRequest, NextResponse } from "next/server";

// pdf-parse uses CommonJS; we import it dynamically to avoid ESM issues
// in the Next.js App Router edge/node runtime.
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

    // Validate MIME type
    const mime = (file as File).type;
    if (mime && mime !== "application/pdf") {
      return NextResponse.json(
        { error: `Unsupported file type: ${mime}. Only PDF files are accepted.` },
        { status: 415 }
      );
    }

    // Validate size — 50 MB hard limit
    const MAX_BYTES = 50 * 1024 * 1024;
    if ((file as File).size > MAX_BYTES) {
      return NextResponse.json(
        { error: "PDF exceeds the 50 MB size limit." },
        { status: 413 }
      );
    }

    // Convert browser File → Node Buffer
    const arrayBuffer = await (file as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Dynamically import pdf-parse to avoid CJS/ESM issues at module load time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");

    let text = "";
    let pageCount = 0;
    let scanned = false;

    try {
      const parsed = await pdfParse(buffer);
      text = (parsed.text ?? "").trim();
      pageCount = parsed.numpages ?? 0;
      // If no text was extracted, the PDF is likely scanned (image-only)
      scanned = text.length === 0;
    } catch (parseErr) {
      console.error("[extract-pdf-text] pdf-parse error:", parseErr);
      return NextResponse.json(
        {
          error:
            "PDF text extraction failed. The file may be corrupted, password-protected, or a scanned image PDF. Paste the onboarding summary manually.",
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
      fileName: (file as File).name,
    });
  } catch (err) {
    console.error("[extract-pdf-text] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error during PDF extraction." },
      { status: 500 }
    );
  }
}

/**
 * pdfTextExtractor.ts — Server-side only.
 *
 * Primary:  pdfjs-dist (handles CMap/ToUnicode font encoding, FlateDecode,
 *           and all encoding schemes modern PDF generators produce).
 * Fallback: hand-rolled zlib extractor (handles simple uncompressed or
 *           FlateDecode PDFs with literal ASCII text in Tj/TJ operators).
 *
 * A PDF is marked scanned only when BOTH methods return < 50 meaningful chars.
 */

import { inflateSync } from "zlib";

const SCANNED_THRESHOLD = 50;

export async function extractTextFromPdf(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
  scanned: boolean;
  method: "pdfjs" | "fallback" | "none";
}> {
  // ── Primary: pdfjs-dist ─────────────────────────────────────────────────────
  try {
    const { text, pageCount } = await extractWithPdfJs(buffer);
    if (text.length >= SCANNED_THRESHOLD) {
      return { text: cleanText(text), pageCount, scanned: false, method: "pdfjs" };
    }
    // pdfjs returned something but not enough — try fallback before deciding
    const fallback = extractWithZlib(buffer);
    if (fallback.text.length >= SCANNED_THRESHOLD) {
      return { text: cleanText(fallback.text), pageCount: fallback.pageCount, scanned: false, method: "fallback" };
    }
    // Both returned minimal text — use whichever got more
    const best = text.length >= fallback.text.length ? text : fallback.text;
    const bestPages = text.length >= fallback.text.length ? pageCount : fallback.pageCount;
    return {
      text: cleanText(best),
      pageCount: bestPages,
      scanned: best.length < SCANNED_THRESHOLD,
      method: best.length >= SCANNED_THRESHOLD ? "pdfjs" : "none",
    };
  } catch {
    // pdfjs failed entirely — fall through to zlib extractor
  }

  // ── Fallback: hand-rolled zlib ──────────────────────────────────────────────
  try {
    const { text, pageCount } = extractWithZlib(buffer);
    return {
      text: cleanText(text),
      pageCount,
      scanned: text.length < SCANNED_THRESHOLD,
      method: text.length >= SCANNED_THRESHOLD ? "fallback" : "none",
    };
  } catch {
    return { text: "", pageCount: 0, scanned: true, method: "none" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Primary extractor — pdfjs-dist
// ─────────────────────────────────────────────────────────────────────────────

async function extractWithPdfJs(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  // Dynamic import keeps this server-only and avoids SSR bundle issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs") as any;

  // Disable the worker thread for Node.js server-side execution
  pdfjs.GlobalWorkerOptions.workerSrc = "";

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  });

  const pdf = await loadingTask.promise;
  const numPages: number = pdf.numPages;
  const pageTexts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = (content.items as Array<unknown>)
      .filter((item): item is { str: string } =>
        typeof item === "object" && item !== null && "str" in item
      )
      .map((item) => item.str)
      .join(" ")
      .trim();
    if (pageText) pageTexts.push(pageText);
  }

  return { text: pageTexts.join("\n"), pageCount: numPages };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback extractor — zero-dependency zlib (handles simple FlateDecode PDFs)
// ─────────────────────────────────────────────────────────────────────────────

function extractWithZlib(buffer: Buffer): { text: string; pageCount: number } {
  const raw = buffer.toString("binary");
  const pageCount = countPages(raw);
  const streams = extractStreams(buffer, raw);

  const textParts: string[] = [];
  for (const stream of streams) {
    const text = extractTextFromStream(stream);
    if (text.trim()) textParts.push(text);
  }

  return { text: textParts.join("\n").trim(), pageCount };
}

function countPages(raw: string): number {
  const matches = raw.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

function decodeAscii85(data: string): Buffer {
  const clean = data.replace(/\s/g, "");
  const endIdx = clean.indexOf("~>");
  const encoded = endIdx !== -1 ? clean.slice(0, endIdx) : clean;
  const result: number[] = [];
  let i = 0;
  while (i < encoded.length) {
    if (encoded[i] === "z") { result.push(0, 0, 0, 0); i++; continue; }
    const group = encoded.slice(i, i + 5);
    i += 5;
    if (group.length === 0) break;
    const padded = group.padEnd(5, "u");
    let value = 0;
    for (let j = 0; j < 5; j++) value = value * 85 + (padded.charCodeAt(j) - 33);
    const bytes = [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
    const take = group.length < 5 ? group.length - 1 : 4;
    result.push(...bytes.slice(0, take));
  }
  return Buffer.from(result);
}

function extractStreams(buffer: Buffer, raw: string): Buffer[] {
  const streams: Buffer[] = [];
  const streamRegex = /stream\r?\n/g;
  let match;
  while ((match = streamRegex.exec(raw)) !== null) {
    const streamStart = match.index + match[0].length;
    const endStreamIdx = raw.indexOf("endstream", streamStart);
    if (endStreamIdx === -1) continue;
    const streamBytes = buffer.slice(streamStart, endStreamIdx);
    const dictPart = raw.slice(Math.max(0, match.index - 800), match.index);
    if (dictPart.includes("/Subtype /Image") || dictPart.includes("/Subtype/Image")) continue;
    const hasAscii85 = dictPart.includes("ASCII85Decode") || dictPart.includes("A85");
    const hasFlateDecode = dictPart.includes("FlateDecode") || dictPart.includes("Fl\n");
    const hasLZW = dictPart.includes("LZWDecode");
    let decoded: Buffer = streamBytes;
    try {
      if (hasAscii85 && hasFlateDecode) {
        decoded = inflateSync(decodeAscii85(streamBytes.toString("binary")));
      } else if (hasAscii85) {
        decoded = decodeAscii85(streamBytes.toString("binary"));
      } else if (hasFlateDecode) {
        decoded = inflateSync(streamBytes);
      } else if (hasLZW) {
        continue;
      }
    } catch { decoded = streamBytes; }
    streams.push(decoded);
  }
  return streams;
}

function extractTextFromStream(stream: Buffer): string {
  const content = stream.toString("latin1");
  const parts: string[] = [];
  const btEtRegex = /BT([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(content)) !== null) {
    const t = extractTextFromBlock(match[1]);
    if (t.trim()) parts.push(t);
  }
  return parts.join(" ");
}

function extractTextFromBlock(block: string): string {
  const parts: string[] = [];
  let match;
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  while ((match = tjRegex.exec(block)) !== null) {
    const d = decodePdfString(match[1]);
    if (d.trim()) parts.push(d);
  }
  const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(block)) !== null) {
    const strRegex = /\(([^)]*)\)/g;
    let s;
    while ((s = strRegex.exec(match[1])) !== null) {
      const d = decodePdfString(s[1]);
      if (d.trim()) parts.push(d);
    }
  }
  const apoRegex = /\(([^)]*)\)\s*'/g;
  while ((match = apoRegex.exec(block)) !== null) {
    const d = decodePdfString(match[1]);
    if (d.trim()) parts.push(d);
  }
  return parts.join(" ");
}

function decodePdfString(s: string): string {
  return s
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\");
}

function cleanText(text: string): string {
  return text
    .replace(/\x91/g, "‘").replace(/\x92/g, "’")
    .replace(/\x93/g, "“").replace(/\x94/g, "”")
    .replace(/\x96/g, "–").replace(/\x97/g, "—")
    .replace(/\x85/g, "…")
    .replace(/\\227/g, "—").replace(/\\226/g, "–")
    .replace(/\\221/g, "‘").replace(/\\222/g, "’")
    .replace(/\\223/g, "“").replace(/\\224/g, "”")
    .replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ")
    .trim();
}

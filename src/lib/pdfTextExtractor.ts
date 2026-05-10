/**
 * pdfTextExtractor.ts — Server-side only.
 *
 * Primary:  pdfjs-dist with a custom CMapReaderFactory that reads .bcmap files
 *           from the local filesystem using fs.promises (Node.js 18+ compatible,
 *           avoids process.getBuiltinModule which is Node.js 22+ only).
 * Fallback: hand-rolled zlib extractor for simple FlateDecode / uncompressed PDFs.
 *
 * A PDF is only marked as scanned if BOTH methods return < 50 meaningful chars.
 *
 * CMaps are required for font-encoded text (CMap/ToUnicode). They are loaded
 * from node_modules/pdfjs-dist/cmaps/. next.config.ts must include them in the
 * Vercel output bundle via outputFileTracingIncludes.
 */

import { inflateSync } from "zlib";
import path from "path";
import fs from "fs";

const SCANNED_THRESHOLD = 50;

// Absolute path to pdfjs-dist CMaps directory — evaluated at module load time
// so it is correct both locally and in Vercel's /var/task environment.
const CMAPS_DIR = path.join(process.cwd(), "node_modules", "pdfjs-dist", "cmaps");

/**
 * Custom CMap reader using fs.promises (Node.js 18+ compatible).
 * Replaces the built-in NodeCMapReaderFactory which uses process.getBuiltinModule
 * (Node.js 22+ only) and would crash on Vercel's Node.js 20 runtime.
 */
class NodeFileCMapReaderFactory {
  private baseUrl: string;
  private isCompressed: boolean;

  constructor({ baseUrl = "", isCompressed = true }: { baseUrl?: string | null; isCompressed?: boolean } = {}) {
    this.baseUrl = baseUrl ?? "";
    this.isCompressed = isCompressed;
  }

  async fetch({ name }: { name: string }): Promise<{ cMapData: Uint8Array; isCompressed: boolean }> {
    if (!this.baseUrl) {
      throw new Error("NodeFileCMapReaderFactory: baseUrl (cMapUrl) is not set");
    }
    const fileName = name + (this.isCompressed ? ".bcmap" : "");
    const filePath = path.join(this.baseUrl, fileName);
    try {
      const data = await fs.promises.readFile(filePath);
      return { cMapData: new Uint8Array(data), isCompressed: this.isCompressed };
    } catch {
      throw new Error(`NodeFileCMapReaderFactory: cannot read CMap ${fileName} from ${this.baseUrl}`);
    }
  }
}

export async function extractTextFromPdf(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
  scanned: boolean;
  method: "pdfjs" | "fallback" | "none";
  diagnostic?: string;
}> {
  // ── Primary: pdfjs-dist ─────────────────────────────────────────────────────
  let pdfJsDiagnostic = "";
  try {
    const { text, pageCount, diagnostic } = await extractWithPdfJs(buffer);
    pdfJsDiagnostic = diagnostic;
    if (text.length >= SCANNED_THRESHOLD) {
      return { text: cleanText(text), pageCount, scanned: false, method: "pdfjs" };
    }
    // pdfjs returned something but not enough — also try fallback
    const fallback = extractWithZlib(buffer);
    if (fallback.text.length >= SCANNED_THRESHOLD) {
      return { text: cleanText(fallback.text), pageCount: fallback.pageCount, scanned: false, method: "fallback" };
    }
    const best = text.length >= fallback.text.length ? text : fallback.text;
    const bestPages = text.length >= fallback.text.length ? pageCount : fallback.pageCount;
    const diagnostic2 = `pdfjs:${text.length}chars fallback:${fallback.text.length}chars both_low`;
    return {
      text: cleanText(best),
      pageCount: bestPages,
      scanned: best.length < SCANNED_THRESHOLD,
      method: "none",
      diagnostic: diagnostic2,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? `${err.constructor.name}: ${err.message}` : String(err);
    pdfJsDiagnostic = `pdfjs_threw: ${errMsg}`;
  }

  // ── Fallback: hand-rolled zlib ──────────────────────────────────────────────
  try {
    const { text, pageCount } = extractWithZlib(buffer);
    const scanned = text.length < SCANNED_THRESHOLD;
    return {
      text: cleanText(text),
      pageCount,
      scanned,
      method: scanned ? "none" : "fallback",
      diagnostic: `${pdfJsDiagnostic} | fallback:${text.length}chars`,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? `${err.constructor.name}: ${err.message}` : String(err);
    return {
      text: "",
      pageCount: 0,
      scanned: true,
      method: "none",
      diagnostic: `${pdfJsDiagnostic} | fallback_threw: ${errMsg}`,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Primary extractor — pdfjs-dist
// ─────────────────────────────────────────────────────────────────────────────

async function extractWithPdfJs(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
  diagnostic: string;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs") as any;

  // Empty string disables the worker thread (uses in-process GenericWorker).
  // Do NOT set to a URL — that requires browser APIs not available in Node.js.
  pdfjs.GlobalWorkerOptions.workerSrc = "";

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    // CMaps are required for font-encoded text. Provide absolute filesystem path.
    cMapUrl: CMAPS_DIR,
    cMapPacked: true,
    // Custom factory that uses fs.promises — compatible with Node.js 18+.
    // The built-in NodeCMapReaderFactory uses process.getBuiltinModule (22+ only).
    CMapReaderFactory: NodeFileCMapReaderFactory,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: true,
    verbosity: 0,
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

  const text = pageTexts.join("\n");
  return {
    text,
    pageCount: numPages,
    diagnostic: `pdfjs:${numPages}pages ${text.length}chars`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback extractor — zero-dependency zlib
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
    result.push(...bytes.slice(0, group.length < 5 ? group.length - 1 : 4));
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
    .replace(/\x91/g, "'").replace(/\x92/g, "'")
    .replace(/\x93/g, "“").replace(/\x94/g, "”")
    .replace(/\x96/g, "–").replace(/\x97/g, "—")
    .replace(/\x85/g, "…")
    .replace(/\\227/g, "—").replace(/\\226/g, "–")
    .replace(/\\221/g, "'").replace(/\\222/g, "'")
    .replace(/\\223/g, "“").replace(/\\224/g, "”")
    .replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * pdfTextExtractor.ts
 *
 * Zero-dependency PDF text extraction using Node.js built-in zlib.
 *
 * Supports:
 * - FlateDecode (zlib-compressed) streams
 * - ASCII85Decode + FlateDecode double-filtered streams (ReportLab, etc.)
 * - Uncompressed text streams
 *
 * Does NOT support:
 * - Scanned / image-only PDFs (no OCR)
 * - Password-protected PDFs
 * - LZW, CCITT, JBIG2, or other exotic filters
 *
 * The approach:
 * 1. Find all stream objects in the PDF binary
 * 2. Detect and apply filters (ASCII85Decode, FlateDecode)
 * 3. Extract text from BT...ET (Begin Text / End Text) blocks
 * 4. Decode Tj, TJ, and ' operators to get the actual text strings
 */

import { inflateSync } from "zlib";

/**
 * Extract text from a PDF buffer.
 * Returns { text, pageCount, scanned }
 */
export function extractTextFromPdf(buffer: Buffer): {
  text: string;
  pageCount: number;
  scanned: boolean;
} {
  try {
    const raw = buffer.toString("binary");

    // Count pages
    const pageCount = countPages(raw);

    // Extract all stream contents
    const streams = extractStreams(buffer, raw);

    // Extract text from all streams
    const textParts: string[] = [];
    for (const stream of streams) {
      const text = extractTextFromStream(stream);
      if (text.trim()) {
        textParts.push(text);
      }
    }

    const fullText = textParts.join("\n").trim();

    return {
      text: cleanText(fullText),
      pageCount,
      scanned: fullText.length === 0,
    };
  } catch {
    return { text: "", pageCount: 0, scanned: true };
  }
}

/** Count the number of pages in the PDF */
function countPages(raw: string): number {
  const matches = raw.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

/** Decode ASCII85 encoded data to a Buffer */
function decodeAscii85(data: string): Buffer {
  // Strip whitespace and find end marker ~>
  const clean = data.replace(/\s/g, "");
  const endIdx = clean.indexOf("~>");
  const encoded = endIdx !== -1 ? clean.slice(0, endIdx) : clean;

  const result: number[] = [];
  let i = 0;

  while (i < encoded.length) {
    if (encoded[i] === "z") {
      result.push(0, 0, 0, 0);
      i++;
      continue;
    }

    const group = encoded.slice(i, i + 5);
    i += 5;

    if (group.length === 0) break;

    // Pad with 'u' if needed
    const padded = group.padEnd(5, "u");
    let value = 0;
    for (let j = 0; j < 5; j++) {
      value = value * 85 + (padded.charCodeAt(j) - 33);
    }

    const bytes = [
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff,
    ];

    // For partial groups, only take the first (group.length - 1) bytes
    const take = group.length < 5 ? group.length - 1 : 4;
    result.push(...bytes.slice(0, take));
  }

  return Buffer.from(result);
}

/** Extract all stream contents with filter detection */
function extractStreams(buffer: Buffer, raw: string): Buffer[] {
  const streams: Buffer[] = [];
  const streamRegex = /stream\r?\n/g;
  let match;

  while ((match = streamRegex.exec(raw)) !== null) {
    const streamStart = match.index + match[0].length;
    const endStreamIdx = raw.indexOf("endstream", streamStart);
    if (endStreamIdx === -1) continue;

    const streamBytes = buffer.slice(streamStart, endStreamIdx);

    // Look backwards from stream start to find the stream dictionary
    const dictStart = Math.max(0, match.index - 800);
    const dictPart = raw.slice(dictStart, match.index);

    // Detect filters
    const hasAscii85 = dictPart.includes("ASCII85Decode") || dictPart.includes("A85");
    const hasFlateDecode = dictPart.includes("FlateDecode") || dictPart.includes("Fl\n");
    const hasLZW = dictPart.includes("LZWDecode");

    // Skip image streams (they won't contain text)
    if (dictPart.includes("/Subtype /Image") || dictPart.includes("/Subtype/Image")) {
      continue;
    }

    let decoded: Buffer = streamBytes;

    try {
      if (hasAscii85 && hasFlateDecode) {
        // Double filter: ASCII85 first, then FlateDecode
        const ascii85Decoded = decodeAscii85(streamBytes.toString("binary"));
        decoded = inflateSync(ascii85Decoded);
      } else if (hasAscii85) {
        decoded = decodeAscii85(streamBytes.toString("binary"));
      } else if (hasFlateDecode) {
        decoded = inflateSync(streamBytes);
      } else if (!hasLZW) {
        // Uncompressed — use as-is
        decoded = streamBytes;
      } else {
        // LZW not supported — skip
        continue;
      }
    } catch {
      // Decompression failed — try as raw text
      decoded = streamBytes;
    }

    streams.push(decoded);
  }

  return streams;
}

/** Extract text from a PDF content stream using BT...ET parsing */
function extractTextFromStream(stream: Buffer): string {
  const content = stream.toString("latin1");
  const parts: string[] = [];

  // Find BT...ET blocks (Begin Text / End Text)
  const btEtRegex = /BT([\s\S]*?)ET/g;
  let match;

  while ((match = btEtRegex.exec(content)) !== null) {
    const block = match[1];
    const blockText = extractTextFromBlock(block);
    if (blockText.trim()) {
      parts.push(blockText);
    }
  }

  return parts.join(" ");
}

/** Extract text from a BT...ET block */
function extractTextFromBlock(block: string): string {
  const parts: string[] = [];

  // Match Tj operator: (text) Tj
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(block)) !== null) {
    const decoded = decodePdfString(match[1]);
    if (decoded.trim()) parts.push(decoded);
  }

  // Match TJ operator: [(text) spacing (text)] TJ
  const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(block)) !== null) {
    const arrayContent = match[1];
    const stringRegex = /\(([^)]*)\)/g;
    let strMatch;
    while ((strMatch = stringRegex.exec(arrayContent)) !== null) {
      const decoded = decodePdfString(strMatch[1]);
      if (decoded.trim()) parts.push(decoded);
    }
  }

  // Match ' operator: (text) '  (move to next line and show text)
  const apostropheRegex = /\(([^)]*)\)\s*'/g;
  while ((match = apostropheRegex.exec(block)) !== null) {
    const decoded = decodePdfString(match[1]);
    if (decoded.trim()) parts.push(decoded);
  }

  return parts.join(" ");
}

/** Decode a PDF string literal (handles octal escapes and common escapes) */
function decodePdfString(s: string): string {
  return s
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

/** Clean up extracted text — also decodes common Windows-1252 / Latin-1 characters */
function cleanText(text: string): string {
  return text
    // Windows-1252 / Latin-1 special characters
    .replace(/\x91/g, "\u2018") // left single quote
    .replace(/\x92/g, "\u2019") // right single quote
    .replace(/\x93/g, "\u201C") // left double quote
    .replace(/\x94/g, "\u201D") // right double quote
    .replace(/\x96/g, "\u2013") // en dash
    .replace(/\x97/g, "\u2014") // em dash
    .replace(/\x85/g, "\u2026") // ellipsis
    .replace(/\\227/g, "\u2014") // octal 227 = em dash
    .replace(/\\226/g, "\u2013") // octal 226 = en dash
    .replace(/\\221/g, "\u2018") // octal 221 = left single quote
    .replace(/\\222/g, "\u2019") // octal 222 = right single quote
    .replace(/\\223/g, "\u201C") // octal 223 = left double quote
    .replace(/\\224/g, "\u201D") // octal 224 = right double quote
    // Whitespace normalization
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// VANTA — browser-side audio extraction (CLIENT ONLY, V1.9).
//
// Decodes the dropped video/audio file with the Web Audio API and renders a 16kHz mono
// PCM16 WAV — the only bytes that ever leave the browser (uploaded to private storage
// for cloud transcription; the video itself never uploads). Pure browser APIs, no wasm,
// no server imports. Caps are enforced here BEFORE any upload; decode failures return a
// bounded reason so the Auto Editor falls through to local whisper / worker / paste.

export interface ExtractedAudio {
  blob: Blob;
  durationMs: number;
  sizeBytes: number;
}

export type ExtractResult = { ok: true; audio: ExtractedAudio } | { ok: false; reason: string };

const TARGET_RATE = 16_000;
// Decoding reads the whole file into memory — refuse sources that would blow up the tab
// (those belong to the worker path anyway).
const MAX_SOURCE_BYTES = 1024 * 1024 * 1024; // 1 GB

function encodeWavPcm16(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);          // fmt chunk size
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);           // block align
  view.setUint16(34, 16, true);          // bits/sample
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

/** Decode → downsample to 16kHz mono → WAV. Caps enforced before returning. */
export async function extractAudioWav(file: File, maxDurationMs: number, maxBytes: number): Promise<ExtractResult> {
  let probeCtx: AudioContext | null = null;
  try {
    if (file.size > MAX_SOURCE_BYTES) {
      return { ok: false, reason: `file is ${Math.round(file.size / 1024 / 1024 / 1024 * 10) / 10}GB — too large to decode in the browser (use the worker path)` };
    }
    const sourceBytes = await file.arrayBuffer();
    probeCtx = new AudioContext();
    const decoded = await probeCtx.decodeAudioData(sourceBytes);
    const durationMs = Math.round(decoded.duration * 1000);
    if (durationMs <= 0) return { ok: false, reason: "the file has no decodable audio" };
    if (durationMs > maxDurationMs) {
      return { ok: false, reason: `audio is ${Math.round(durationMs / 60_000)} min — over the ${Math.round(maxDurationMs / 60_000)}-minute cloud cap` };
    }
    // Mixdown + resample via OfflineAudioContext (mono destination sums channels).
    const frames = Math.ceil(decoded.duration * TARGET_RATE);
    const offline = new OfflineAudioContext(1, frames, TARGET_RATE);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    const wav = encodeWavPcm16(rendered.getChannelData(0), TARGET_RATE);
    if (wav.byteLength > maxBytes) {
      return { ok: false, reason: `extracted audio is ${Math.round(wav.byteLength / 1024 / 1024)}MB — over the ${Math.round(maxBytes / 1024 / 1024)}MB cloud cap` };
    }
    return { ok: true, audio: { blob: new Blob([wav], { type: "audio/wav" }), durationMs, sizeBytes: wav.byteLength } };
  } catch {
    return { ok: false, reason: "couldn't decode this file's audio in the browser (unsupported codec)" };
  } finally {
    probeCtx?.close().catch(() => {});
  }
}

#!/usr/bin/env node
// VANTA — local worker runtime (V1.5).
//
// Pulls processing jobs from the Vanta queue over HTTPS per docs/vanta-worker-spec.md:
// claim → heartbeat → execute → complete/fail. Two execution modes:
//
//   --fixture  Deterministic fixture payloads for every job type — proves the queue
//              contract end-to-end with NO media files or tools. Fixture completions
//              OVERWRITE real artifacts on whatever asset the job belongs to, so this
//              mode requires --project <id> (or --allow-any-project for throwaway DBs).
//   --real     Runs the actual media tools (ffprobe/ffmpeg/whisper/scenedetect) against
//              footage under --media-root (or $VANTA_MEDIA_ROOT). Missing tool or file
//              → the job is FAILED with a clear reason (never faked).
//
// Safety: talks ONLY to $APP_URL/api/vanta/runs/*; never publishes, posts, launches,
// or contacts anything else. Binaries run via execFile argv (no shell). `clips` is
// never claimed — it is control-plane generated. Bearer secret comes from
// $VANTA_WORKER_SECRET and is never printed.
//
// Usage:
//   APP_URL=http://localhost:3000 VANTA_WORKER_SECRET=... \
//     node scripts/vanta-worker.mjs --once --fixture --project <project-id>
//   node scripts/vanta-worker.mjs --loop --real --name mac-studio-01 --media-root /footage
//
// Flags: --once | --loop · --fixture | --real · --name <id> · --project <id>
//        --job-types probe,transcript,... · --poll <seconds> · --media-root <dir>
//        --allow-any-project (fixture mode only; dangerous outside throwaway data)

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, statSync, mkdirSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";

const pExecFile = promisify(execFile);

const API_TIMEOUT_MS = 30_000;
const MAX_TOOL_OUTPUT_BYTES = 20 * 1024 * 1024; // whisper JSON / scenedetect CSV read cap
const MAX_SEGMENTS = 400;
const MAX_SCENES = 60;

/** readFileSync with a size cap — a stale/huge artifact must not exhaust memory. */
function readBounded(file) {
  const size = statSync(file).size;
  if (size > MAX_TOOL_OUTPUT_BYTES) throw new Error(`tool output too large: ${path.basename(file)} (${size} bytes)`);
  return readFileSync(file, "utf8");
}

// ── Config ────────────────────────────────────────────────────────────────────

const WORKER_JOB_TYPES = ["probe", "proxy", "thumbnail", "audio", "transcript", "scenes"]; // never "clips"

function parseArgs(argv) {
  const args = { mode: null, run: null, name: "local-worker", project: null, jobTypes: null, pollS: 10, mediaRoot: process.env.VANTA_MEDIA_ROOT ?? null, allowAnyProject: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--fixture") args.mode = "fixture";
    else if (a === "--real") args.mode = "real";
    else if (a === "--once") args.run = "once";
    else if (a === "--loop") args.run = "loop";
    else if (a === "--allow-any-project") args.allowAnyProject = true;
    else if (a === "--name") args.name = String(argv[++i] ?? "local-worker").slice(0, 60);
    else if (a === "--project") args.project = String(argv[++i] ?? "").trim() || null; // whitespace ≠ scoped
    else if (a === "--job-types") args.jobTypes = String(argv[++i] ?? "").split(",").map((t) => t.trim()).filter((t) => WORKER_JOB_TYPES.includes(t));
    else if (a === "--poll") args.pollS = Math.max(2, Number(argv[++i]) || 10);
    else if (a === "--media-root") args.mediaRoot = String(argv[++i] ?? "");
  }
  return args;
}

const APP_URL = (process.env.APP_URL ?? "").replace(/\/$/, "");
const SECRET = process.env.VANTA_WORKER_SECRET ?? "";
const args = parseArgs(process.argv);

function usageExit(msg) {
  console.error(`vanta-worker: ${msg}`);
  console.error("usage: APP_URL=... VANTA_WORKER_SECRET=... node scripts/vanta-worker.mjs (--once|--loop) (--fixture --project <id>|--real) [--name id] [--job-types a,b] [--poll s] [--media-root dir]");
  process.exit(2);
}

if (!APP_URL || !/^https?:\/\//.test(APP_URL)) usageExit("APP_URL is required (http(s) origin of the Vault app)");
if (!SECRET || SECRET.length < 16) usageExit("VANTA_WORKER_SECRET is required (≥16 chars)");
if (!args.mode) usageExit("pick an execution mode: --fixture (contract QA) or --real (media tools)");
if (!args.run) usageExit("pick --once or --loop");
if (args.mode === "fixture" && !args.project && !args.allowAnyProject) {
  usageExit("--fixture overwrites artifacts on the claimed asset; scope it with --project <id> (or --allow-any-project for throwaway data)");
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function api(pathname, body) {
  const res = await fetch(`${APP_URL}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SECRET}` },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ── Fixture payloads (deterministic — contract QA, no media required) ─────────

function fixtureResult(job, asset) {
  const durMs = asset?.duration_ms ?? 60_000;
  const aid = asset?.id ?? "asset";
  switch (job.job_type) {
    case "probe":
      return { duration_ms: durMs, width: 1920, height: 1080, fps: 29.97, codec: "h264", audio_codec: "aac", audio_channels: 2, sample_rate_hz: 48000, format_name: "mov,mp4 (fixture)", notes: ["fixture payload — vanta-worker --fixture"] };
    case "thumbnail":
      return { outputs: [`${aid}/thumb-1.jpg`, `${aid}/thumb-2.jpg`, `${aid}/thumb-3.jpg`], storage_bucket: "vanta-thumbnails", notes: ["fixture payload"] };
    case "proxy":
      return { outputs: [`${aid}/proxy-720.mp4`], storage_bucket: "vanta-proxies", notes: ["fixture payload"] };
    case "audio":
      return { outputs: [`${aid}/audio-16k.wav`, `${aid}/loudness.json`], storage_bucket: "vanta-transcripts", notes: ["fixture payload"] };
    case "transcript":
      return {
        full_text: "Stop. Look at this roof before you sign anything. The adjuster missed the decking damage. We documented every penetration and the claim was approved in full.",
        language: "en", engine: "fixture (vanta-worker --fixture)",
        segments: [
          { start_ms: 0, end_ms: 1400, text: "Stop." },
          { start_ms: 1500, end_ms: 5200, text: "Look at this roof before you sign anything." },
          { start_ms: 5400, end_ms: 9400, text: "The adjuster missed the decking damage." },
          { start_ms: 9800, end_ms: Math.min(16_000, durMs), text: "We documented every penetration and the claim was approved in full." },
        ],
      };
    case "scenes":
      return {
        scenes: [
          { start_ms: 0, end_ms: Math.min(9_400, durMs), kind: "talking_head", detector: "fixture (vanta-worker --fixture)" },
          { start_ms: Math.min(9_400, durMs), end_ms: durMs, kind: "site", detector: "fixture (vanta-worker --fixture)" },
        ],
      };
    default:
      throw new Error(`no fixture for job_type ${job.job_type}`);
  }
}

// ── Real execution (media tools; missing tool/file → throw → job failed) ──────

function resolveLocal(asset) {
  if (!args.mediaRoot) throw new Error("--media-root (or VANTA_MEDIA_ROOT) is required in --real mode");
  const root = realpathSync(path.resolve(args.mediaRoot)); // physical root — symlink-safe
  const file = path.join(root, path.basename(asset.file_name));
  if (!file.startsWith(root + path.sep) || !existsSync(file)) {
    throw new Error(`source file not found under media root: ${path.basename(asset.file_name)}`);
  }
  const real = realpathSync(file); // a symlinked source must also resolve under the root
  if (!real.startsWith(root + path.sep) || !statSync(real).isFile()) {
    throw new Error(`source file resolves outside media root: ${path.basename(asset.file_name)}`);
  }
  return real;
}

function workDir(asset) {
  const dir = path.join(path.resolve(args.mediaRoot), ".vanta", asset.id.replace(/[^a-zA-Z0-9_-]/g, ""));
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function run(bin, argv, timeoutMs = 10 * 60_000) {
  try {
    return await pExecFile(bin, argv, { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, shell: false });
  } catch (e) {
    throw new Error(`${bin} failed: ${String(e.message).slice(0, 300)}`);
  }
}

async function realResult(job, asset) {
  const input = resolveLocal(asset);
  const dir = workDir(asset);
  const aid = asset.id;
  switch (job.job_type) {
    case "probe": {
      const { stdout } = await run("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", input]);
      const d = JSON.parse(stdout);
      const v = d.streams?.find((s) => s.codec_type === "video");
      const a = d.streams?.find((s) => s.codec_type === "audio");
      const fps = (() => { const [n, den] = String(v?.avg_frame_rate ?? "").split("/").map(Number); return n && den ? Math.round((n / den) * 100) / 100 : undefined; })();
      return {
        duration_ms: d.format?.duration ? Math.round(parseFloat(d.format.duration) * 1000) : undefined,
        width: v?.width, height: v?.height, fps, codec: v?.codec_name,
        audio_codec: a?.codec_name, audio_channels: a?.channels,
        sample_rate_hz: a?.sample_rate ? Number(a.sample_rate) : undefined,
        bit_rate: d.format?.bit_rate ? Number(d.format.bit_rate) : undefined,
        size_bytes: d.format?.size ? Number(d.format.size) : undefined,
        format_name: d.format?.format_name,
      };
    }
    case "thumbnail": {
      const durS = (asset.duration_ms ?? 60_000) / 1000;
      const outputs = [];
      for (let i = 0; i < 3; i++) {
        const at = Math.max(0, Math.round(durS * (0.1 + 0.4 * i)));
        const out = path.join(dir, `thumb-${i + 1}.jpg`);
        await run("ffmpeg", ["-y", "-ss", String(at), "-i", input, "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "3", out], 60_000);
        if (existsSync(out)) outputs.push(`${aid}/thumb-${i + 1}.jpg`);
      }
      if (!outputs.length) throw new Error("no thumbnails produced");
      return { outputs, notes: [`written under ${dir}`] };
    }
    case "proxy": {
      const out = path.join(dir, "proxy-720.mp4");
      await run("ffmpeg", ["-y", "-i", input, "-vf", "scale=-2:720", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out]);
      return { outputs: [`${aid}/proxy-720.mp4`], notes: [`written under ${dir}`] };
    }
    case "audio": {
      const out = path.join(dir, "audio-16k.wav");
      await run("ffmpeg", ["-y", "-i", input, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", out]);
      return { outputs: [`${aid}/audio-16k.wav`], notes: [`written under ${dir}`] };
    }
    case "transcript": {
      // V1.8: extract 16kHz mono wav first — much faster for whisper than decoding the
      // full container. Fall back to the source if extraction fails.
      let whisperInput = input;
      try {
        const wav = path.join(dir, "audio-16k.wav");
        await run("ffmpeg", ["-y", "-i", input, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav], 5 * 60_000);
        if (existsSync(wav)) whisperInput = wav;
      } catch { /* whisper decodes the source directly */ }
      await run("whisper", [whisperInput, "--model", "base", "--task", "transcribe", "--output_format", "json", "--output_dir", dir]);
      const jsonFile = readdirSync(dir).find((f) => f.endsWith(".json"));
      if (!jsonFile) throw new Error("whisper produced no JSON output");
      const d = JSON.parse(readBounded(path.join(dir, jsonFile)));
      const segments = (d.segments ?? [])
        .slice(0, MAX_SEGMENTS)
        .filter((s) => typeof s.start === "number" && typeof s.end === "number" && s.text)
        .map((s) => ({ start_ms: Math.round(s.start * 1000), end_ms: Math.round(s.end * 1000), text: String(s.text).trim().slice(0, 1000) }));
      if (!segments.length) throw new Error("whisper produced no segments");
      return { full_text: String(d.text ?? segments.map((s) => s.text).join(" ")).trim(), language: d.language ?? "en", engine: "whisper-cli (vanta-worker)", segments };
    }
    case "scenes": {
      await run("scenedetect", ["-i", input, "-o", dir, "detect-content", "list-scenes"]);
      const csv = readdirSync(dir).find((f) => f.toLowerCase().endsWith("-scenes.csv"));
      if (!csv) throw new Error("scenedetect produced no scenes CSV");
      const lines = readBounded(path.join(dir, csv)).split(/\r?\n/);
      const h = lines.findIndex((l) => l.toLowerCase().includes("scene number"));
      const cols = (lines[h] ?? "").split(",").map((c) => c.trim().toLowerCase());
      const si = cols.findIndex((c) => c.includes("start time (seconds)"));
      const ei = cols.findIndex((c) => c.includes("end time (seconds)"));
      const scenes = lines.slice(h + 1, h + 1 + MAX_SCENES).map((l) => l.split(",")).map((p) => ({
        start_ms: Math.round(parseFloat(p[si]) * 1000), end_ms: Math.round(parseFloat(p[ei]) * 1000),
        kind: "unknown", detector: "pyscenedetect ContentDetector (vanta-worker)",
      })).filter((s) => Number.isFinite(s.start_ms) && Number.isFinite(s.end_ms) && s.end_ms > s.start_ms);
      if (!scenes.length) throw new Error("no scenes parsed from CSV");
      return { scenes };
    }
    default:
      throw new Error(`unsupported job_type ${job.job_type}`);
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

async function processOne() {
  const claim = await api("/api/vanta/runs/claim", {
    claimed_by: args.name,
    job_types: args.jobTypes ?? WORKER_JOB_TYPES,
    ...(args.project ? { project_id: args.project } : {}),
  });
  if (claim.status === 503) throw new Error("worker contract disabled server-side (VANTA_WORKER_SECRET unset)");
  if (claim.status === 401) throw new Error("unauthorized — check VANTA_WORKER_SECRET matches the app");
  if (claim.status !== 200) throw new Error(`claim failed: HTTP ${claim.status} ${JSON.stringify(claim.data).slice(0, 200)}`);
  if (!claim.data.job) return false; // idle

  const { job, asset, claim_token } = claim.data;
  if (job.job_type === "clips") throw new Error("server handed out a clips job — contract violation");
  console.log(`[claim] ${job.job_type} ${job.id} asset=${asset?.file_name ?? job.asset_id} project=${job.project_id}`);

  const ident = { claimed_by: args.name, claim_token };
  let hbInFlight = false; // suppress overlap — a stalled heartbeat must not stack requests
  const hb = setInterval(async () => {
    if (hbInFlight) return;
    hbInFlight = true;
    try {
      const r = await api(`/api/vanta/runs/${job.id}/heartbeat`, ident).catch(() => null);
      if (r && r.status !== 200) console.error(`[heartbeat] HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
    } finally { hbInFlight = false; }
  }, 45_000);

  try {
    // First heartbeat immediately: claimed → running.
    const first = await api(`/api/vanta/runs/${job.id}/heartbeat`, ident);
    if (first.status !== 200) throw new Error(`first heartbeat rejected: HTTP ${first.status}`);

    const result = args.mode === "fixture" ? fixtureResult(job, asset) : await realResult(job, asset);
    const done = await api(`/api/vanta/runs/${job.id}/complete`, { ...ident, result });
    if (done.status === 200) {
      console.log(`[complete] ${job.job_type} ${job.id} ok`);
      if (job.job_type === "transcript" || job.job_type === "scenes") {
        console.log(`[note] ${job.job_type} landed — re-queue processing in the app so the control-plane clips job rescores with measured timing`);
      }
    } else {
      console.error(`[complete] ${job.job_type} ${job.id} rejected: HTTP ${done.status} ${JSON.stringify(done.data).slice(0, 300)}`);
    }
  } catch (e) {
    const msg = String(e.message ?? e).slice(0, 480);
    console.error(`[fail] ${job.job_type} ${job.id}: ${msg}`);
    const failed = await api(`/api/vanta/runs/${job.id}/fail`, { ...ident, error: msg }).catch(() => null);
    if (!failed || failed.status !== 200) console.error(`[fail] could not report failure: HTTP ${failed?.status}`);
  } finally {
    clearInterval(hb);
  }
  return true;
}

async function main() {
  console.log(`vanta-worker: mode=${args.mode} run=${args.run} name=${args.name}${args.project ? ` project=${args.project}` : ""} → ${APP_URL}`);
  if (args.run === "once") {
    const worked = await processOne();
    console.log(worked ? "done (1 job)" : "queue idle — nothing claimed");
    return;
  }
  for (;;) {
    try {
      const worked = await processOne();
      if (!worked) await new Promise((r) => setTimeout(r, args.pollS * 1000));
    } catch (e) {
      console.error(`[loop] ${String(e.message ?? e).slice(0, 300)}`);
      await new Promise((r) => setTimeout(r, args.pollS * 1000));
    }
  }
}

main().catch((e) => { console.error(`vanta-worker: ${e.message ?? e}`); process.exit(1); });

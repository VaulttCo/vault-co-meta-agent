import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ffmpeg-installer/ffmpeg resolves its binary via __dirname at runtime. Keeping it
  // external (not bundled into the route chunk) preserves that resolution inside the
  // Vercel serverless function — otherwise __dirname points at the bundle and the binary
  // can't be found ("ffmpeg unavailable on this server").
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg"],
  // pdfjs-dist CMaps are loaded dynamically at runtime by filename.
  // Next.js output file tracing cannot detect them statically, so we
  // explicitly include them so Vercel bundles them in the serverless function.
  outputFileTracingIncludes: {
    "/api/extract-pdf-text": [
      "./node_modules/pdfjs-dist/cmaps/**",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
    // Vanta V1.10 cloud transcription: @ffmpeg-installer reads its platform binary by a
    // runtime path string Next's tracer can't detect. Bundle the binary into this route's
    // function. The platform package differs per build OS — darwin-arm64 locally,
    // linux-x64 on Vercel — so glob every @ffmpeg-installer platform binary; only the
    // present one matches on each build machine.
    "/api/vanta/jobs/[id]/transcribe-cloud": [
      "./node_modules/@ffmpeg-installer/*/ffmpeg",
      "./node_modules/.pnpm/@ffmpeg-installer+ffmpeg@*/node_modules/@ffmpeg-installer/*/ffmpeg",
      "./node_modules/.pnpm/@ffmpeg-installer+*/node_modules/@ffmpeg-installer/*/ffmpeg",
    ],
  },
};

export default nextConfig;

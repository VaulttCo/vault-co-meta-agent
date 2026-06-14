import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist CMaps are loaded dynamically at runtime by filename.
  // Next.js output file tracing cannot detect them statically, so we
  // explicitly include them so Vercel bundles them in the serverless function.
  outputFileTracingIncludes: {
    "/api/extract-pdf-text": [
      "./node_modules/pdfjs-dist/cmaps/**",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
    // Vanta V1.10 cloud transcription: ffmpeg-static resolves its binary by a runtime
    // path string, which Next's tracer cannot detect statically. Bundle the binary into
    // this route's serverless function so server-side audio extraction works on Vercel.
    "/api/vanta/jobs/[id]/transcribe-cloud": [
      "./node_modules/ffmpeg-static/ffmpeg",
      "./node_modules/.pnpm/ffmpeg-static@*/node_modules/ffmpeg-static/ffmpeg",
    ],
  },
};

export default nextConfig;

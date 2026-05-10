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
  },
};

export default nextConfig;

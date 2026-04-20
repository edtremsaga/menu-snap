import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/analyze-menu": [
      "./lib/ocr/tesseract-worker.cjs",
      "./lib/ocr/worker-runtime/**/*",
      "./node_modules/@tesseract.js-data/eng/4.0.0/**/*",
    ],
  },
};

export default nextConfig;

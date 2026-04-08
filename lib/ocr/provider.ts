import { createRequire } from "module";
import path from "path";
import Tesseract from "tesseract.js";
import sharp from "sharp";

export interface OcrLine {
  text: string;
  confidence: number;
}

export interface OcrResult {
  text: string;
  lines: OcrLine[];
  averageConfidence: number;
}

const require = createRequire(import.meta.url);
const LANG_PATH = path.join(
  process.cwd(),
  "node_modules",
  "@tesseract.js-data",
  "eng",
  "4.0.0",
);
const CACHE_PATH = path.join(process.cwd(), ".next", "cache", "tesseract");
const WORKER_PATH = require.resolve("tesseract.js/src/worker-script/node/index.js");
const OCR_TIMEOUT_MS = 25000;
const WORKER_INIT_TIMEOUT_MS = 5000;

let workerPromise: Promise<Tesseract.Worker> | null = null;

export async function extractTextFromImage(
  imageBuffer: Buffer,
): Promise<OcrResult> {
  const worker = await getWorker();
  const preparedImage = await preprocessImage(imageBuffer);
  const { data } = await withTimeout(
    worker.recognize(preparedImage, {
      rotateAuto: true,
    }),
    OCR_TIMEOUT_MS,
    "Menu analysis took too long.",
  );

  const rawData = data as {
    text?: string;
    confidence?: number;
    lines?: Array<{ text: string; confidence: number }>;
  };

  const fallbackLines = (rawData.text ?? "")
    .split(/\r?\n/)
    .map((line) => ({
      text: normalizeOcrText(line),
      confidence: normalizeConfidence(rawData.confidence ?? 0),
    }));

  const lines = (rawData.lines ?? fallbackLines)
    .map((line) => ({
      text: normalizeOcrText(line.text),
      confidence: normalizeConfidence(line.confidence),
    }))
    .filter((line) => line.text.length > 0);

  const lineConfidence =
    lines.length > 0
      ? lines.reduce((total, line) => total + line.confidence, 0) / lines.length
      : normalizeConfidence(rawData.confidence ?? 0);

  return {
    text: normalizeOcrText(rawData.text ?? ""),
    lines,
    averageConfidence: clampConfidence(lineConfidence),
  };
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = withTimeout(
      Tesseract.createWorker("eng", 1, {
        langPath: LANG_PATH,
        cachePath: CACHE_PATH,
        workerPath: WORKER_PATH,
        gzip: true,
      }).then(async (worker) => {
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
          preserve_interword_spaces: "1",
        });
        return worker;
      }),
      WORKER_INIT_TIMEOUT_MS,
      "Menu analysis could not start.",
    ).catch((error) => {
      workerPromise = null;
      throw error;
    });
  }

  return workerPromise;
}

async function preprocessImage(imageBuffer: Buffer) {
  return sharp(imageBuffer)
    .rotate()
    .resize({
      width: 1400,
      height: 2000,
      fit: "inside",
      withoutEnlargement: true,
    })
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(message));
      }, timeoutMs);

      promise.finally(() => clearTimeout(timeoutId)).catch(() => {
        clearTimeout(timeoutId);
      });
    }),
  ]);
}

function normalizeOcrText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function clampConfidence(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeConfidence(value: number) {
  return clampConfidence(value > 1 ? value / 100 : value);
}

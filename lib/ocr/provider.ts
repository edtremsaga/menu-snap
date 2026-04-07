import path from "path";
import Tesseract from "tesseract.js";

export interface OcrLine {
  text: string;
  confidence: number;
}

export interface OcrResult {
  text: string;
  lines: OcrLine[];
  averageConfidence: number;
}

const LANG_PATH = path.join(
  process.cwd(),
  "node_modules",
  "@tesseract.js-data",
  "eng",
  "4.0.0",
);

export async function extractTextFromImage(
  imageBuffer: Buffer,
): Promise<OcrResult> {
  const { data } = await Tesseract.recognize(imageBuffer, "eng", {
    langPath: LANG_PATH,
    gzip: true,
  });

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

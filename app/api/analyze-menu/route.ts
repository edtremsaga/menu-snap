import { NextResponse } from "next/server";
import { parseMenuAnalysis } from "@/lib/menu/parse";
import { extractTextFromImage } from "@/lib/ocr/provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const traceId = crypto.randomUUID().slice(0, 8);
  const log = (message: string, extra?: Record<string, unknown>) => {
    const suffix = extra ? ` ${JSON.stringify(extra)}` : "";
    console.log(`[analyze-menu:${traceId}] +${Date.now() - startedAt}ms ${message}${suffix}`);
  };

  log("request-start");
  const formData = await request.formData();
  log("form-data-read");
  const image = formData.get("image");

  if (!(image instanceof File)) {
    log("invalid-image");
    return NextResponse.json(
      { message: "A menu image is required." },
      { status: 400 },
    );
  }

  const sessionId = crypto.randomUUID();
  try {
    log("image-found", {
      name: image.name,
      type: image.type,
      size: image.size,
    });
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    log("image-buffer-ready", { bytes: imageBuffer.byteLength });
    log("ocr-start", { started: true });
    const ocr = await extractTextFromImage(imageBuffer);
    log("ocr-complete", {
      averageConfidence: ocr.averageConfidence,
      lineCount: ocr.lines.length,
      textLength: ocr.text.length,
    });
    const result = parseMenuAnalysis({
      sessionId,
      imageName: image.name,
      ocr,
    });
    log("parse-complete", {
      parseStatus: result.parseStatus,
      sections: result.sections.length,
      items: result.flatItems.length,
      warnings: result.warnings.length,
    });

    log("response-success");
    return NextResponse.json(result, {
      headers: {
        "x-menu-snap-trace": traceId,
      },
    });
  } catch (error) {
    log("response-failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    const result = {
      sessionId,
      imageName: image.name,
      parseStatus: "failed" as const,
      sections: [],
      flatItems: [],
      glossaryCandidates: [],
      warnings: [
        "We couldn’t read this menu clearly yet. Try another photo with better lighting.",
      ],
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(result, {
      headers: {
        "x-menu-snap-trace": traceId,
      },
    });
  }
}

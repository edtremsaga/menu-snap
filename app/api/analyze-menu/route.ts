import { NextResponse } from "next/server";
import { parseMenuAnalysis } from "@/lib/menu/parse";
import { extractTextFromImage } from "@/lib/ocr/provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return NextResponse.json(
      { message: "A menu image is required." },
      { status: 400 },
    );
  }

  const sessionId = crypto.randomUUID();
  try {
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const ocr = await extractTextFromImage(imageBuffer);
    const result = parseMenuAnalysis({
      sessionId,
      imageName: image.name,
      ocr,
    });

    return NextResponse.json(result);
  } catch {
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

    return NextResponse.json(result);
  }
}

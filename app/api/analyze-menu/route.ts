import { NextResponse } from "next/server";
import { createMockMenuAnalysis } from "@/lib/mock/menuAnalysis";

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
  const result = createMockMenuAnalysis(sessionId, image.name);

  return NextResponse.json(result);
}

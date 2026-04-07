import { NextResponse } from "next/server";
import { createMockExplanation } from "@/lib/mock/explanations";
import type { ExplanationRequest } from "@/lib/menu/types";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ExplanationRequest>;

  if (!body.label || (body.type !== "dish" && body.type !== "term")) {
    return NextResponse.json(
      { message: "A label and valid type are required." },
      { status: 400 },
    );
  }

  const result = createMockExplanation({
    label: body.label,
    type: body.type,
    contextText: body.contextText,
    sectionTitle: body.sectionTitle,
  });

  return NextResponse.json(result);
}

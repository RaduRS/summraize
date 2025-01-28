import { NextResponse } from "next/server";
import pdf from "pdf-parse-fork";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdf(buffer);

    if (!data.text.trim()) {
      throw new Error("No text content extracted from PDF");
    }

    return NextResponse.json({ text: data.text });
  } catch (error) {
    console.error("PDF processing error:", error);
    return NextResponse.json(
      {
        error: "Failed to process PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

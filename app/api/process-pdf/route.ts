import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import pdf from "pdf-parse-fork";

export const runtime = "nodejs";
// Vercel hobby plan has a 60 second limit for serverless functions
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // Add auth check
    const supabase = await createClient(request);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Authentication error" },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

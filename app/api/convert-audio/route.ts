import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";
import { PassThrough } from "stream";
import { SUPPORTED_FORMATS, AudioFormat } from "@/constants/audio";

export const maxDuration = 300;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as Blob;
    const format = formData.get("format") as AudioFormat;

    if (!audioFile || !format) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!Object.keys(SUPPORTED_FORMATS).includes(format)) {
      return NextResponse.json(
        { error: "Unsupported format" },
        { status: 400 }
      );
    }

    // Auth check
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

    // Convert audio using ffmpeg
    const inputBuffer = Buffer.from(await audioFile.arrayBuffer());
    const inputStream = Readable.from(inputBuffer);

    const outputBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const passThrough = new PassThrough();
      passThrough.on("data", (chunk) => chunks.push(chunk));

      ffmpeg(inputStream)
        .toFormat(format)
        .audioBitrate("128k")
        .audioChannels(1)
        .on("error", reject)
        .on("end", () => resolve(Buffer.concat(chunks)))
        .pipe(passThrough);
    });

    // Upload converted file
    const fileName = `${user.id}/converted-${Date.now()}.${format}`;
    const { error: uploadError } = await supabase.storage
      .from("audio_recordings")
      .upload(fileName, outputBuffer, {
        contentType: `audio/${format}`,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload audio" },
        { status: 500 }
      );
    }

    // Get signed URL
    const { data: urlData } = await supabase.storage
      .from("audio_recordings")
      .createSignedUrl(fileName, 3600);

    if (!urlData?.signedUrl) {
      throw new Error("Failed to generate signed URL");
    }

    return NextResponse.json({ audioUrl: urlData.signedUrl });
  } catch (error) {
    console.error("Error converting audio:", error);
    return NextResponse.json(
      { error: "Failed to convert audio" },
      { status: 500 }
    );
  }
}

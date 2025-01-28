import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import * as pdfjsLib from "pdfjs-dist";
import sharp from "sharp";
import { createCanvas } from "canvas";

// Disable worker for server-side
pdfjsLib.GlobalWorkerOptions.workerSrc = "";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // Add auth check
    const supabase = createClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    let previewUrl = "";

    if (file.type === "application/pdf") {
      // Return a simple, clean PDF icon
      previewUrl = `data:image/svg+xml;base64,${Buffer.from(
        `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="48" height="48">
          <path 
            d="M320 464c8.8 0 16-7.2 16-16V160H256c-17.7 0-32-14.3-32-32V48H64c-8.8 0-16 7.2-16 16v384c0 8.8 7.2 16 16 16h256z"
            fill="#DC2626"
          />
          <path 
            d="M0 64C0 28.7 28.7 0 64 0h220.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64z"
            fill="#EF4444"
          />
          <text 
            x="50%" 
            y="65%" 
            text-anchor="middle" 
            font-family="Arial, sans-serif" 
            font-size="100" 
            font-weight="bold" 
            fill="white"
          >
            PDF
          </text>
        </svg>
      `
      ).toString("base64")}`;
    } else if (file.type === "text/plain") {
      // Handle text files by creating an image with text content
      const text = await file.text();
      const canvas = createCanvas(600, 400);
      const context = canvas.getContext("2d");

      // Set background
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, 600, 400);

      // Configure text
      context.fillStyle = "#000000";
      context.font = "14px Arial";

      // Add text with word wrap
      const words = text.split(" ");
      let line = "";
      let y = 30;
      const maxWidth = 550;
      const lineHeight = 20;

      for (let word of words.slice(0, 100)) {
        // Limit to first 100 words
        const testLine = line + word + " ";
        const metrics = context.measureText(testLine);

        if (metrics.width > maxWidth) {
          context.fillText(line, 25, y);
          line = word + " ";
          y += lineHeight;

          if (y > 380) {
            // Stop if we reach bottom of canvas
            context.fillText("...", 25, y);
            break;
          }
        } else {
          line = testLine;
        }
      }
      if (y <= 380) {
        context.fillText(line, 25, y);
      }

      const imageBuffer = canvas.toBuffer("image/jpeg");
      const optimizedBuffer = await sharp(imageBuffer)
        .resize(300, 300, { fit: "inside" })
        .jpeg({ quality: 80 })
        .toBuffer();

      previewUrl = `data:image/jpeg;base64,${optimizedBuffer.toString("base64")}`;
    } else if (file.type.startsWith("image/")) {
      const buffer = await file.arrayBuffer();
      const imageBuffer = Buffer.from(buffer);

      const optimizedBuffer = await sharp(imageBuffer)
        .resize(300, 400, {
          fit: "fill",
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      previewUrl = `data:image/jpeg;base64,${optimizedBuffer.toString("base64")}`;
    }

    return NextResponse.json({ previewUrl });
  } catch (error) {
    console.error("Error generating preview:", error);
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 }
    );
  }
}

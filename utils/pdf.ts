import * as pdfjsLib from "pdfjs-dist";

// Disable worker to run in Edge runtime
pdfjsLib.GlobalWorkerOptions.workerSrc = "";

export async function extractTextFromPDF(
  buffer: ArrayBuffer | Buffer
): Promise<string> {
  try {
    // Convert Buffer to Uint8Array
    const data = Buffer.isBuffer(buffer) ? buffer : new Uint8Array(buffer);

    // Load the PDF document
    const doc = await pdfjsLib.getDocument({
      data,
      disableFontFace: true,
      standardFontDataUrl: "",
    }).promise;

    let fullText = "";

    // Extract text from each page
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    return fullText;
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    if (error instanceof Error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
    throw new Error("Failed to extract text from PDF");
  }
}

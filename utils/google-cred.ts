import fs from "fs";
import path from "path";
import os from "os";

export function setupGoogleCredentials() {
  try {
    if (process.env.GOOGLE_CREDENTIALS_BASE64) {
      console.log("Setting up Google credentials from base64...");
      // In production, write the credentials to the OS temp directory
      const credentialsPath = path.join(os.tmpdir(), "google-credentials.json");
      const credentials = Buffer.from(
        process.env.GOOGLE_CREDENTIALS_BASE64.replace(/%$/, ""), // Remove trailing % if present
        "base64"
      ).toString();

      // Validate JSON format
      try {
        JSON.parse(credentials);
      } catch (e) {
        throw new Error("Invalid JSON in GOOGLE_CREDENTIALS_BASE64");
      }

      fs.writeFileSync(credentialsPath, credentials);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
      console.log("Successfully wrote credentials to:", credentialsPath);
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // In development, verify the file exists
      const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (!fs.existsSync(filePath)) {
        throw new Error(`Credentials file not found at: ${filePath}`);
      }
      console.log("Using local credentials file:", filePath);
    } else {
      console.warn(
        "⚠️ No Google credentials found. Speech-to-text features will not work."
      );
    }
  } catch (error) {
    console.error("❌ Error setting up Google credentials:", error);
    // Don't throw, let the application continue but with degraded functionality
  }
}

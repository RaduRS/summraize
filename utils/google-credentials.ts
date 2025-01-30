import fs from "fs";
import path from "path";

export function setupGoogleCredentials() {
  if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    // In production, write the credentials to a temporary file
    const credentialsPath = path.join(process.cwd(), "google-credentials.json");
    const credentials = Buffer.from(
      process.env.GOOGLE_CREDENTIALS_BASE64,
      "base64"
    ).toString();
    fs.writeFileSync(credentialsPath, credentials);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // In development, use the local credentials file
    console.log("Using local Google credentials file");
  } else {
    console.warn("No Google credentials found");
  }
}

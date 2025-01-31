const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path");

async function generateFavicons() {
  const sizes = {
    "favicon-16x16.png": 16,
    "favicon-32x32.png": 32,
    "apple-touch-icon.png": 180,
    "android-chrome-192x192.png": 192,
    "android-chrome-512x512.png": 512,
  };

  const inputSvg = path.join(
    __dirname,
    "../public/icons/safari-pinned-tab.svg"
  );

  for (const [filename, size] of Object.entries(sizes)) {
    await sharp(inputSvg)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, "../public/icons/", filename));

    console.log(`Generated ${filename}`);
  }

  // Generate ICO file (16x16 and 32x32 combined)
  const favicon16Buffer = await sharp(inputSvg).resize(16, 16).png().toBuffer();

  const favicon32Buffer = await sharp(inputSvg).resize(32, 32).png().toBuffer();

  // Use sharp to create the final favicon.ico
  await sharp(favicon32Buffer).toFile(
    path.join(__dirname, "../public/favicon.ico")
  );

  console.log("Generated favicon.ico");
}

generateFavicons().catch(console.error);

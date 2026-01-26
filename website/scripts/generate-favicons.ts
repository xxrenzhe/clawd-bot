import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'logo.jpg');

async function generateFaviconsFromLogo() {
  console.log('Generating favicon files from logo.jpg...\n');

  try {
    // Read the logo file
    const logoBuffer = await fs.readFile(logoPath);

    // First, convert logo to square format with white background
    const logoImage = sharp(logoBuffer);
    const metadata = await logoImage.metadata();

    // Determine the size for square crop (use the smaller dimension)
    const size = Math.min(metadata.width || 1009, metadata.height || 909);

    // Calculate crop position to center the image
    const left = Math.floor(((metadata.width || 1009) - size) / 2);
    const top = Math.floor(((metadata.height || 909) - size) / 2);

    // Create a square cropped version
    const squareLogo = await sharp(logoBuffer)
      .extract({ left, top, width: size, height: size })
      .toBuffer();

    // Generate favicon.svg from the logo
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 128 128">
  <defs>
    <clipPath id="circle">
      <circle cx="64" cy="64" r="64"/>
    </clipPath>
  </defs>
  <image href="data:image/jpeg;base64,${squareLogo.toString('base64')}"
         width="128" height="128"
         clip-path="url(#circle)"/>
</svg>`;

    await fs.writeFile(path.join(publicDir, 'favicon.svg'), svgContent);
    console.log('✓ Generated: favicon.svg');

    // Generate PNG favicons in different sizes
    const sizes = [16, 32, 48, 64, 128, 180, 192, 512];

    for (const targetSize of sizes) {
      const outputPath = path.join(publicDir, `favicon-${targetSize}x${targetSize}.png`);
      await sharp(squareLogo)
        .resize(targetSize, targetSize, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated: favicon-${targetSize}x${targetSize}.png`);
    }

    // Generate apple-touch-icon (180x180) with rounded corners
    const appleTouchPath = path.join(publicDir, 'apple-touch-icon.png');
    await sharp(squareLogo)
      .resize(180, 180, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toFile(appleTouchPath);
    console.log(`✓ Generated: apple-touch-icon.png`);

    // Generate android-chrome icons
    const androidSizes = [192, 512];
    for (const targetSize of androidSizes) {
      const outputPath = path.join(publicDir, `android-chrome-${targetSize}x${targetSize}.png`);
      await sharp(squareLogo)
        .resize(targetSize, targetSize, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated: android-chrome-${targetSize}x${targetSize}.png`);
    }

    // Generate favicon.ico (32x32)
    const icoPath = path.join(publicDir, 'favicon.ico');
    await sharp(squareLogo)
      .resize(32, 32, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toFile(icoPath);
    console.log(`✓ Generated: favicon.ico`);

    console.log('\n✅ All favicon files generated successfully from logo.jpg!');
    console.log('\nGenerated files:');
    console.log('- favicon.svg (vector with embedded logo)');
    console.log('- favicon.ico (32x32)');
    console.log('- favicon-*.png (various sizes)');
    console.log('- apple-touch-icon.png (iOS)');
    console.log('- android-chrome-*.png (Android)');

  } catch (error) {
    console.error('Error generating favicons:', error);
    process.exit(1);
  }
}

generateFaviconsFromLogo();

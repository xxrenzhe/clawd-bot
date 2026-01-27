import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'articles');
const MAX_WIDTH = 1600;
const FORMATS = [
  { ext: 'webp', options: { quality: 78 } },
  { ext: 'avif', options: { quality: 55 } },
] as const;

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function optimizeImages() {
  const files = await fs.readdir(IMAGES_DIR);
  const sourceImages = files.filter((file) => /\.(jpe?g|png)$/i.test(file));

  for (const file of sourceImages) {
    const sourcePath = path.join(IMAGES_DIR, file);
    const baseName = file.replace(/\.(jpe?g|png)$/i, '');

    for (const format of FORMATS) {
      const outputPath = path.join(IMAGES_DIR, `${baseName}.${format.ext}`);
      if (await fileExists(outputPath)) {
        continue;
      }

      await sharp(sourcePath)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .toFormat(format.ext, format.options)
        .toFile(outputPath);
    }
  }
}

optimizeImages().catch((error) => {
  console.error('Failed to optimize images:', error);
  process.exit(1);
});

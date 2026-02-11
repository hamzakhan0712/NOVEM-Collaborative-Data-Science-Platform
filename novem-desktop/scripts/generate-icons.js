import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ICONS_DIR = join(__dirname, '../src-tauri/icons');
const SOURCE_ICON = join(__dirname, '../public/logo.png');

// Ensure icons directory exists
if (!existsSync(ICONS_DIR)) {
  mkdirSync(ICONS_DIR, { recursive: true });
}

const sizes = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
];

async function generateIcons() {
  console.log('Generating application icons...');
  
  try {
    for (const { name, size } of sizes) {
      await sharp(SOURCE_ICON)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(join(ICONS_DIR, name));
      console.log(`Generated ${name}`);
    }

    console.log('Icon generation complete!');
  } catch (error) {
    console.error('✗ Failed to generate icons:', error);
    process.exit(1);
  }
}

generateIcons();
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BUILD_DIR = join(__dirname, '../src-tauri/target/release');
const DIST_DIR = join(__dirname, '../dist-installers');

function exec(command, options = {}) {
  console.log(`\n▶ ${command}\n`);
  try {
    execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    console.error(`✗ Command failed: ${command}`);
    process.exit(1);
  }
}

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

async function build() {
  console.log('\n🚀 Starting NOVEM build process...\n');
  
  // Step 1: Clean previous builds
  console.log('📦 Step 1: Cleaning previous builds...');
  exec('npm run clean');
  
  // Step 2: Generate icons
  console.log('🎨 Step 2: Generating application icons...');
  exec('npm run generate-icons');
  
  // Step 3: Check backend services
  console.log('🔍 Step 3: Checking backend services...');
  exec('npm run check-backend');
  
  // Step 4: Build frontend
  console.log('⚛️  Step 4: Building React frontend...');
  exec('npm run build');
  
  // Step 5: Build Tauri application
  console.log('🦀 Step 5: Building Tauri application...');
  exec('npm run tauri:build');
  
  // Step 6: Organize installers
  console.log('📁 Step 6: Organizing installers...');
  ensureDir(DIST_DIR);
  
  const bundleDir = join(__dirname, '../src-tauri/target/release/bundle');
  
  if (existsSync(bundleDir)) {
    // Copy NSIS installer
    const nsisDir = join(bundleDir, 'nsis');
    if (existsSync(nsisDir)) {
      const nsisFiles = readdirSync(nsisDir).filter(f => f.endsWith('.exe'));
      nsisFiles.forEach(file => {
        const src = join(nsisDir, file);
        const dest = join(DIST_DIR, file);
        copyFileSync(src, dest);
        console.log(`  ✓ Copied ${file}`);
      });
    }
    
    // Copy MSI installer
    const msiDir = join(bundleDir, 'msi');
    if (existsSync(msiDir)) {
      const msiFiles = readdirSync(msiDir).filter(f => f.endsWith('.msi'));
      msiFiles.forEach(file => {
        const src = join(msiDir, file);
        const dest = join(DIST_DIR, file);
        copyFileSync(src, dest);
        console.log(`  ✓ Copied ${file}`);
      });
    }
  }
  
  // Step 7: Generate checksums
  console.log('🔒 Step 7: Generating checksums...');
  if (existsSync(DIST_DIR)) {
    const files = readdirSync(DIST_DIR);
    const checksums = {};
    
    files.forEach(file => {
      if (file.endsWith('.exe') || file.endsWith('.msi')) {
        const filePath = join(DIST_DIR, file);
        const fileBuffer = readFileSync(filePath);
        const hashSum = createHash('sha256');
        hashSum.update(fileBuffer);
        checksums[file] = hashSum.digest('hex');
        console.log(`  ✓ ${file}: ${checksums[file]}`);
      }
    });
    
    writeFileSync(
      join(DIST_DIR, 'checksums.json'),
      JSON.stringify(checksums, null, 2)
    );
  }
  
  console.log('\n✅ Build complete!\n');
  console.log('📦 Installers location:', DIST_DIR);
  console.log('\nNext steps:');
  console.log('  1. Test the installer on a clean Windows machine');
  console.log('  2. Sign the executable (optional but recommended)');
  console.log('  3. Upload to your distribution server');
  console.log('  4. Update download links on landing page\n');
}

build().catch(error => {
  console.error('\n✗ Build failed:', error);
  process.exit(1);
});
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG = {
  app: {
    name: 'NOVEM',
    version: '0.1.0',
    description: 'Privacy-first data science platform',
    author: 'NOVEM Team',
  },
  backend: {
    url: process.env.BACKEND_URL || 'http://127.0.0.1:8000',
    computeEngine: process.env.COMPUTE_ENGINE_URL || 'http://127.0.0.1:8765',
  },
  build: {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
  },
};

const configPath = join(__dirname, '../src/config.json');

writeFileSync(configPath, JSON.stringify(CONFIG, null, 2));

console.log('✓ Build configuration generated');
console.log(JSON.stringify(CONFIG, null, 2));
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BACKEND_URL = 'http://127.0.0.1:8000';
const COMPUTE_ENGINE_URL = 'http://127.0.0.1:8765';

function checkService(url, name) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: '/health',
      method: 'GET',
      timeout: 2000,
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log(`✓ ${name} is running`);
        resolve(true);
      } else {
        console.warn(`⚠ ${name} returned status ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', () => {
      console.warn(`⚠ ${name} is not running`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.warn(`⚠ ${name} connection timeout`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function checkBackends() {
  console.log('\nChecking backend services...\n');

  const backendRunning = await checkService(BACKEND_URL, 'Django Backend');
  const computeRunning = await checkService(COMPUTE_ENGINE_URL, 'Compute Engine');

  if (!backendRunning || !computeRunning) {
    console.log('\n⚠ WARNING: Some backend services are not running!');
    console.log('The application will build, but may not function correctly.\n');
    console.log('To start services:');
    if (!backendRunning) {
      console.log('  - Django: cd backend && python manage.py runserver');
    }
    if (!computeRunning) {
      console.log('  - Compute Engine: cd compute-engine && python -m app.main');
    }
    console.log('');
  } else {
    console.log('\n✓ All backend services are ready!\n');
  }
}

checkBackends().catch(console.error);
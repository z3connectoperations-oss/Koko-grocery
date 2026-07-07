import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically copy logo on Vite start/reload
const src = 'C:\\Users\\ELCOT\\.gemini\\antigravity-ide\\brain\\6d88742b-78fc-4f4d-aa1a-0bf5ad7c9cb0\\media__1783407536376.png';
const destDir = path.resolve(__dirname, 'assets');
const dest = path.resolve(destDir, 'logo.png');

try {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('--- KOKO LOGO COPIED SUCCESSFULLY via vite.config.js ---');
  } else {
    console.warn('--- Source logo file not found at:', src);
  }
} catch (err) {
  console.error('--- Failed to copy logo:', err.message);
}

export default defineConfig({
  server: {
    port: 5173
  }
});

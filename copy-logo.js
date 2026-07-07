const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\ELCOT\\.gemini\\antigravity-ide\\brain\\6d88742b-78fc-4f4d-aa1a-0bf5ad7c9cb0\\media__1783407536376.png';
const destDir = path.join(__dirname, 'assets');
const dest = path.join(destDir, 'logo.png');

try {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('KOKO logo copied successfully to assets/logo.png');
  } else {
    console.warn('Source logo file not found at:', src);
  }

  // Cleanup temporary bat files if they exist
  const filesToCleanup = ['copy_logo.bat', 'to_base64.bat', 'base64_logo.txt'];
  filesToCleanup.forEach(f => {
    const fullPath = path.join(__dirname, f);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  });
} catch (err) {
  console.error('Failed to copy logo or cleanup files:', err.message);
}

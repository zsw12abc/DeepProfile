const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

// A simple 1x1 pixel transparent PNG
const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const buffer = Buffer.from(base64Png, 'base64');

fs.writeFileSync(path.join(assetsDir, 'icon.png'), buffer);
console.log('Generated assets/icon.png');

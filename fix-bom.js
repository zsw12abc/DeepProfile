const fs = require('fs');
const path = require('path');

const files = ['package.json', 'tsconfig.json', '.prettierrc'];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
        console.log(`Removed BOM from ${file}`);
        fs.writeFileSync(filePath, content, 'utf8');
      } else {
        console.log(`No BOM found in ${file}`);
      }
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }
});

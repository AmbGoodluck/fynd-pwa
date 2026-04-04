// Improved favicon generator: outputs true .ico format with multiple sizes for browser compatibility
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico').default;

const srcPng = path.resolve(__dirname, '../assets/favicon.png');
const destIco = path.resolve(__dirname, '../dist/favicon.ico');

(async () => {
  try {
    // Generate multiple PNG sizes for .ico
    const sizes = [16, 32, 48, 64, 128, 256];
    const tmpFiles = [];
    for (const size of sizes) {
      const tmp = path.resolve(__dirname, `./tmp-favicon-${size}.png`);
      await sharp(srcPng).resize(size, size).png().toFile(tmp);
      tmpFiles.push(tmp);
    }
    const icoBuffer = await pngToIco(tmpFiles);
    fs.writeFileSync(destIco, icoBuffer);
    // Clean up temp files
    tmpFiles.forEach(f => fs.unlinkSync(f));
    console.log('favicon.ico generated with multiple sizes.');
  } catch (err) {
    console.error('Failed to generate favicon.ico:', err);
    process.exit(1);
  }
})();

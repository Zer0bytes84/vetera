const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [30, 44, 71, 89, 107, 142, 150, 284, 310, 512];

async function generateIcons() {
  const svgBuffer = fs.readFileSync(path.join(__dirname, 'icon.svg'));
  
  for (const size of sizes) {
    const outputFile = path.join(__dirname, `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputFile);
    console.log(`Generated ${size}x${size}`);
  }
  
  // Copy as main icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(__dirname, 'icon.png'));
  
  console.log('Done!');
}

generateIcons().catch(console.error);

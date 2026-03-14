import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create PNG icons using Canvas (requires canvas package)
 * Install: npm install canvas
 * 
 * If canvas installation fails, use one of these alternatives:
 * 1. Open icon-generator.html in Chrome and download PNGs
 * 2. Use online converter: https://cloudconvert.com/svg-to-png
 * 3. Use any image editor (GIMP, Photoshop, etc.)
 */

async function convertSVGtoPNG() {
  try {
    // Try to import canvas
    const { createCanvas, loadImage } = await import('canvas');
    
    const iconsDir = path.join(__dirname, 'icons');
    const sizes = [16, 48, 128];
    
    for (const size of sizes) {
      const svgPath = path.join(iconsDir, `icon${size}.svg`);
      const pngPath = path.join(iconsDir, `icon${size}.png`);
      
      // Read SVG file
      const svgData = fs.readFileSync(svgPath, 'utf8');
      
      // Create canvas
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      // Convert SVG to image and draw on canvas
      const img = await loadImage(`data:image/svg+xml;base64,${Buffer.from(svgData).toString('base64')}`);
      ctx.drawImage(img, 0, 0, size, size);
      
      // Save as PNG
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(pngPath, buffer);
      
      console.log(`✓ Converted icon${size}.svg → icon${size}.png`);
    }
    
    console.log('\n✅ All PNG icons created successfully!');
    
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.log('❌ Canvas package not installed.');
      console.log('\nTo convert SVG to PNG, choose one option:\n');
      console.log('Option 1 - Install canvas package:');
      console.log('  npm install canvas');
      console.log('  node convert-svg-to-png.js\n');
      console.log('Option 2 - Use browser-based converter:');
      console.log('  Open icon-generator.html in Chrome');
      console.log('  Click "Download All Icons"\n');
      console.log('Option 3 - Online converter:');
      console.log('  Visit: https://cloudconvert.com/svg-to-png');
      console.log('  Upload the SVG files from icons/ folder\n');
      console.log('Option 4 - Image editor:');
      console.log('  Open SVG files in GIMP, Photoshop, or Inkscape');
      console.log('  Export as PNG\n');
    } else {
      console.error('Error:', error.message);
    }
  }
}

convertSVGtoPNG();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple SVG to use as icons - can be converted to PNG later
const createSVG = (size) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.1}"/>
  <g transform="translate(${size/2}, ${size/2})">
    <!-- Socket circle -->
    <circle cx="0" cy="0" r="${size * 0.2}" fill="none" stroke="white" stroke-width="${size * 0.04}"/>
    <!-- Plug pins -->
    <rect x="${-size * 0.12}" y="${-size * 0.35}" width="${size * 0.06}" height="${size * 0.18}" fill="white" rx="${size * 0.02}"/>
    <rect x="${size * 0.06}" y="${-size * 0.35}" width="${size * 0.06}" height="${size * 0.18}" fill="white" rx="${size * 0.02}"/>
    <!-- Signal waves -->
    <path d="M ${-size * 0.25},0 L ${-size * 0.2},${-size * 0.06} L ${-size * 0.15},0" 
          fill="none" stroke="white" stroke-width="${size * 0.04}" stroke-linecap="round"/>
    <path d="M ${size * 0.15},0 L ${size * 0.2},${-size * 0.06} L ${size * 0.25},0" 
          fill="none" stroke="white" stroke-width="${size * 0.04}" stroke-linecap="round"/>
  </g>
</svg>`;
};

// Create icons directory
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Generate SVG files
const sizes = [16, 48, 128];
sizes.forEach(size => {
  const svg = createSVG(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), svg);
  console.log(`✓ Created icon${size}.svg`);
});

console.log('\n✅ SVG icons created successfully!');
console.log('\nNOTE: To convert SVG to PNG format:');
console.log('1. Open each SVG file in a browser');
console.log('2. Take a screenshot or use online converter (e.g., cloudconvert.com)');
console.log('3. Or install sharp: npm install sharp && node convert-svg-to-png.js');

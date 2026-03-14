# ICONS FOLDER

This folder contains the extension icons in various sizes.

## Required Icon Sizes

- **icon16.png** - 16x16 pixels (toolbar icon, small)
- **icon48.png** - 48x48 pixels (extension management page)
- **icon128.png** - 128x128 pixels (Chrome Web Store, installation)

## Current Status

✅ SVG files generated
⏳ PNG files need to be created

## How to Create PNG Icons

### Option 1: Use the HTML Generator (Easiest)
1. Open `icon-generator.html` in Chrome
2. Click "Download All Icons" button
3. Save the 3 PNG files to this folder

### Option 2: Use Node.js with Canvas
```bash
npm install canvas
node convert-svg-to-png.js
```

### Option 3: Online Converter
1. Go to https://cloudconvert.com/svg-to-png
2. Upload icon16.svg, icon48.svg, icon128.svg
3. Download converted PNG files
4. Save to this folder

### Option 4: Image Editor
- Open SVG files in GIMP, Photoshop, Inkscape, or any image editor
- Export each as PNG with the correct size
- Save to this folder

## Temporary Workaround

If you want to test the extension immediately without proper icons:
1. Create simple placeholder PNG files
2. Or use the SVG files temporarily (may not work in all contexts)
3. Replace with proper PNG icons before publishing to Chrome Web Store

## Design Specs

**Colors:**
- Background: Purple gradient (#667eea to #764ba2)
- Icon elements: White (#FFFFFF)

**Style:**
- Plug/socket icon with signal waves
- Modern, minimalist design
- Clear visibility at all sizes

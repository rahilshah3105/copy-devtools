import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Package extension for Chrome Web Store submission
 * Creates a ZIP file with all necessary files
 */

async function packageExtension() {
  try {
    // Read manifest to get version
    const manifestPath = path.join(__dirname, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const version = manifest.version.replace(/\./g, '-');
    
    // Output file name
    const outputPath = path.join(__dirname, `extension-v${version}.zip`);
    
    // Create write stream
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    // Listen for completion
    output.on('close', () => {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ Extension packaged successfully!`);
      console.log(`   File: ${outputPath}`);
      console.log(`   Size: ${sizeInMB} MB`);
      console.log(`\n📦 Ready to upload to Chrome Web Store!`);
    });
    
    // Handle errors
    archive.on('error', (err) => {
      throw err;
    });
    
    // Pipe archive to file
    archive.pipe(output);
    
    // Add files to archive
    const filesToInclude = [
      'manifest.json',
      'background.js',
      'devtools.html',
      'devtools.js',
      'panel.html',
      'panel.js',
      'popup.html',
      'popup.js',
      'icons/*.png'  // Only include PNG icons
    ];
    
    console.log('📦 Packaging extension files...\n');
    
    filesToInclude.forEach(pattern => {
      if (pattern.includes('*')) {
        // Handle glob patterns
        const dir = pattern.split('/')[0];
        const ext = pattern.split('*')[1];
        archive.glob(pattern, { cwd: __dirname });
        console.log(`  ✓ Added: ${pattern}`);
      } else {
        archive.file(path.join(__dirname, pattern), { name: pattern });
        console.log(`  ✓ Added: ${pattern}`);
      }
    });
    
    // Finalize archive
    await archive.finalize();
    
  } catch (error) {
    console.error('❌ Error packaging extension:', error.message);
    
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.log('\nTo use this script, install archiver:');
      console.log('  npm install archiver');
      console.log('\nOr manually create a ZIP file with these files:');
      console.log('  - manifest.json');
      console.log('  - background.js');
      console.log('  - devtools.html, devtools.js');
      console.log('  - panel.html, panel.js');
      console.log('  - popup.html, popup.js');
      console.log('  - icons/*.png');
    }
  }
}

packageExtension();

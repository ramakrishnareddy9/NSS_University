const fs = require('fs');
const path = require('path');

// Copy PDF.js worker to public folder from react-pdf's bundled version
const srcPath = path.join(__dirname, '..', 'node_modules', 'react-pdf', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const fallbackSrcPath = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const destPath = path.join(__dirname, '..', 'public', 'pdf.worker.js');

try {
  let sourcePath = srcPath;
  
  // Try react-pdf's bundled version first
  if (!fs.existsSync(srcPath)) {
    // Fallback to direct pdfjs-dist if available
    if (fs.existsSync(fallbackSrcPath)) {
      sourcePath = fallbackSrcPath;
    } else {
      console.warn('⚠️ PDF.js worker source file not found, skipping...');
      return;
    }
  }
  
  fs.copyFileSync(sourcePath, destPath);
  console.log('✅ PDF.js worker copied to public folder');
} catch (error) {
  console.error('❌ Error copying PDF.js worker:', error.message);
  // Don't fail the install if this fails
}

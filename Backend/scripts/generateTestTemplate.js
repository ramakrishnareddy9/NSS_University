const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create a certificate template (1920 x 1357 - A4 landscape at 300 DPI)
const width = 1920;
const height = 1357;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Background - Light gradient
const gradient = ctx.createLinearGradient(0, 0, width, height);
gradient.addColorStop(0, '#f0f9ff');
gradient.addColorStop(1, '#e0f2fe');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, height);

// Border
ctx.strokeStyle = '#3b82f6';
ctx.lineWidth = 20;
ctx.strokeRect(50, 50, width - 100, height - 100);

// Inner border
ctx.strokeStyle = '#60a5fa';
ctx.lineWidth = 3;
ctx.strokeRect(80, 80, width - 160, height - 160);

// Title
ctx.fillStyle = '#1e40af';
ctx.font = 'bold 80px Arial';
ctx.textAlign = 'center';
ctx.fillText('CERTIFICATE OF PARTICIPATION', width / 2, 250);

// Subtitle line
ctx.strokeStyle = '#3b82f6';
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(width / 2 - 300, 290);
ctx.lineTo(width / 2 + 300, 290);
ctx.stroke();

// "This is to certify that" text
ctx.fillStyle = '#374151';
ctx.font = '36px Arial';
ctx.fillText('This is to certify that', width / 2, 400);

// Student Name placeholder (leave space)
ctx.fillStyle = '#9ca3af';
ctx.font = 'italic 28px Arial';
ctx.fillText('[Student name will appear here]', width / 2, 540);

// "has successfully participated in" text
ctx.fillStyle = '#374151';
ctx.font = '32px Arial';
ctx.fillText('has successfully participated in', width / 2, 650);

// Event Name placeholder (leave space)
ctx.fillStyle = '#9ca3af';
ctx.font = 'italic 28px Arial';
ctx.fillText('[Event name will appear here]', width / 2, 780);

// "organized by National Service Scheme" text
ctx.fillStyle = '#374151';
ctx.font = '28px Arial';
ctx.fillText('organized by National Service Scheme', width / 2, 890);

// Date label
ctx.fillStyle = '#374151';
ctx.font = '28px Arial';
ctx.fillText('Event Duration:', width / 2, 1020);

// Date placeholder (leave space)
ctx.fillStyle = '#9ca3af';
ctx.font = 'italic 24px Arial';
ctx.fillText('[Date range will appear here]', width / 2, 1090);

// Signature lines
ctx.strokeStyle = '#374151';
ctx.lineWidth = 2;
// Left signature line
ctx.beginPath();
ctx.moveTo(350, 1220);
ctx.lineTo(650, 1220);
ctx.stroke();
ctx.fillStyle = '#374151';
ctx.font = '24px Arial';
ctx.fillText('NSS Coordinator', 500, 1260);

// Right signature line
ctx.beginPath();
ctx.moveTo(1270, 1220);
ctx.lineTo(1570, 1220);
ctx.stroke();
ctx.fillText('Principal', 1420, 1260);

// Save the image
const outputDir = path.join(__dirname, '..', 'uploads', 'certificates');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'test-template.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);

console.log('✅ Test certificate template created at:', outputPath);
console.log('📐 Size: 1920 x 1357 pixels');
console.log('\n📍 Recommended field positions:');
console.log('   - Student Name: X=960, Y=540 (center)');
console.log('   - Event Name: X=960, Y=780 (center)');
console.log('   - Date: X=960, Y=1090 (center)');
console.log('\n💡 Upload this template in the Certificate Configuration page!');

const fs = require('fs');
const path = require('path');

// Simple 1x1 transparent PNG (smallest valid PNG)
const transparentPNG = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, // Image data
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
    0x42, 0x60, 0x82
]);

const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
const androidRes = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

densities.forEach(density => {
    const folder = path.join(androidRes, `mipmap-${density}`);

    // Create folder if it doesn't exist
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }

    // Create placeholder icons
    fs.writeFileSync(path.join(folder, 'ic_launcher.png'), transparentPNG);
    fs.writeFileSync(path.join(folder, 'ic_launcher_round.png'), transparentPNG);
    fs.writeFileSync(path.join(folder, 'ic_launcher_foreground.png'), transparentPNG);

    console.log(`✅ Created placeholder icons for ${density}`);
});

console.log('🎉 All placeholder icons created!');

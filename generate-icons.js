const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
};

const inputFile = path.join(__dirname, 'public', 'logo-with-bg.jpg');
const androidRes = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

async function generateIcons() {
    for (const [density, size] of Object.entries(sizes)) {
        const folder = path.join(androidRes, `mipmap-${density}`);

        // Create folder if it doesn't exist
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }

        // Generate ic_launcher.png
        await sharp(inputFile)
            .resize(size, size)
            .png()
            .toFile(path.join(folder, 'ic_launcher.png'));

        // Generate ic_launcher_round.png
        await sharp(inputFile)
            .resize(size, size)
            .png()
            .toFile(path.join(folder, 'ic_launcher_round.png'));

        // Generate ic_launcher_foreground.png
        await sharp(inputFile)
            .resize(size, size)
            .png()
            .toFile(path.join(folder, 'ic_launcher_foreground.png'));

        console.log(`✅ Generated icons for ${density} (${size}x${size})`);
    }

    console.log('🎉 All icons generated successfully!');
}

generateIcons().catch(console.error);

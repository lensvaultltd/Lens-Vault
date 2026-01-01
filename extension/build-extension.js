const fs = require('fs');
const path = require('path');

// Build extension package
const distDir = path.join(__dirname, 'dist');
const srcDir = __dirname;

// Copy necessary files
const filesToCopy = [
    'manifest.json',
    'popup.html',
    'styles/autofill.css',
    '../public/icons'
];

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Copy files
filesToCopy.forEach(file => {
    const src = path.join(srcDir, file);
    const dest = path.join(distDir, file);

    if (fs.existsSync(src)) {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        if (fs.statSync(src).isDirectory()) {
            copyDir(src, dest);
        } else {
            fs.copyFileSync(src, dest);
        }
        console.log(`Copied: ${file}`);
    }
});

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('Extension build complete! Output in extension/dist');

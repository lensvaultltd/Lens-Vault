
const crypto = require('crypto');

async function checkPassword(password) {
    const buffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);

    console.log(`Checking password: "${password}"`);
    console.log(`Hash: ${hashHex}`);
    console.log(`Prefix: ${prefix}, Suffix: ${suffix}`);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
        const [lineSuffix, count] = line.split(':');
        if (lineSuffix.trim() === suffix) {
            return parseInt(count, 10);
        }
    }
    return 0;
}

async function run() {
    try {
        const count = await checkPassword('password123');
        console.log(`'password123' seen ${count} times.`);

        if (count > 0) console.log('PASS: Pwned password detected.');
        else console.log('FAIL: Pwned password not detected.');

        const countSafe = await checkPassword('CorrectHorseBatteryStaple' + Date.now());
        console.log(`Safe password seen ${countSafe} times.`);

    } catch (err) {
        console.error(err);
    }
}

run();


// Mock global crypto for Node environment if needed
const { webcrypto } = require('crypto');
if (!globalThis.crypto) {
    globalThis.crypto = webcrypto;
}

// We can't easily import the TS service directly in Node without compilation,
// so we'll replicate the logic or use tsx to run it.
// Let's rely on `tsx` to run this script if we import the module.

import { hibpService } from './services/hibpService';

async function runTest() {
    console.log('--- Starting HIBP Service Test ---');

    // 1. Test Password Check (k-Anonymity)
    const pwnedPassword = 'password123';
    console.log(`Checking password: "${pwnedPassword}"`);
    const count = await hibpService.checkPassword(pwnedPassword);
    console.log(`Result: Seen ${count} times.`);

    if (count > 0) {
        console.log('PASS: Pwned password detected.');
    } else {
        console.error('FAIL: Pwned password NOT detected (or API error).');
    }

    const safePassword = 'CorrectHorseBatteryStaple' + Date.now();
    console.log(`Checking safe password: "${safePassword}"`);
    const countSafe = await hibpService.checkPassword(safePassword);
    console.log(`Result: Seen ${countSafe} times.`);

    if (countSafe === 0) {
        console.log('PASS: Safe password not detected.');
    } else {
        console.warn('WARN: Safe password detected (unlikely but possible).');
    }

    // 2. Test Email Check (Mock Key)
    // We likely don't have a real key in env, so we expect a warning or empty result.
    console.log('Checking email (expecting warning if no key)...');
    const breaches = await hibpService.checkEmail('test@example.com');
    console.log('Breaches found:', breaches.length);

    console.log('--- Test Complete ---');
}

runTest().catch(err => console.error(err));

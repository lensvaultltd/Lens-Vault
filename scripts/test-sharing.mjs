
import { webcrypto } from 'crypto';

// Polyfill for Node environment if needed
if (!globalThis.crypto) {
    globalThis.crypto = webcrypto;
}

// Crypto Lib (Simplified for Node)
const CryptoLib = {
    async generateKeyPair() {
        const keyPair = await webcrypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"]
        );

        const publicKeyBuffer = await webcrypto.subtle.exportKey("spki", keyPair.publicKey);
        const privateKeyBuffer = await webcrypto.subtle.exportKey("pkcs8", keyPair.privateKey);

        return {
            publicKey: Buffer.from(publicKeyBuffer).toString('base64'),
            privateKey: Buffer.from(privateKeyBuffer).toString('base64'),
        };
    },

    async encryptWithPublicKey(data, publicKeyBase64) {
        const publicKeyBuffer = Buffer.from(publicKeyBase64, 'base64');
        const publicKey = await webcrypto.subtle.importKey(
            "spki",
            publicKeyBuffer,
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            false,
            ["encrypt"]
        );

        const encodedData = new TextEncoder().encode(data);
        const encryptedBuffer = await webcrypto.subtle.encrypt(
            {
                name: "RSA-OAEP",
            },
            publicKey,
            encodedData
        );

        return Buffer.from(encryptedBuffer).toString('base64');
    },

    async decryptWithPrivateKey(encryptedDataBase64, privateKeyBase64) {
        const privateKeyBuffer = Buffer.from(privateKeyBase64, 'base64');
        const privateKey = await webcrypto.subtle.importKey(
            "pkcs8",
            privateKeyBuffer,
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            false,
            ["decrypt"]
        );

        const encryptedBuffer = Buffer.from(encryptedDataBase64, 'base64');
        const decryptedBuffer = await webcrypto.subtle.decrypt(
            {
                name: "RSA-OAEP",
            },
            privateKey,
            encryptedBuffer
        );

        return new TextDecoder().decode(decryptedBuffer);
    }
};

const baseUrl = 'http://127.0.0.1:3001/api';

async function request(endpoint, method, body, cookie) {
    const headers = { 'Content-Type': 'application/json' };
    if (cookie) headers['Cookie'] = cookie;

    const res = await fetch(baseUrl + endpoint, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');
    const newCookie = setCookie ? setCookie.split(';')[0] : null;

    return { status: res.status, body: data, cookie: newCookie || cookie };
}

async function runTest() {
    try {
        console.log('--- Starting Sharing Test ---');

        // 1. Create User A
        console.log('Creating User A...');
        const userAKeys = await CryptoLib.generateKeyPair();
        const userAEmail = `userA_${Date.now()}@test.com`;
        const resA = await request('/auth/signup', 'POST', {
            email: userAEmail,
            masterPasswordHash: 'hashA',
            publicKey: userAKeys.publicKey,
            encryptedPrivateKey: 'encPrivKeyA' // Mock encryption
        });
        const cookieA = resA.cookie;
        console.log('User A Created:', resA.body);

        // 2. Create User B
        console.log('Creating User B...');
        const userBKeys = await CryptoLib.generateKeyPair();
        const userBEmail = `userB_${Date.now()}@test.com`;
        const resB = await request('/auth/signup', 'POST', {
            email: userBEmail,
            masterPasswordHash: 'hashB',
            publicKey: userBKeys.publicKey,
            encryptedPrivateKey: 'encPrivKeyB' // Mock encryption
        });
        const cookieB = resB.cookie;
        console.log('User B Created:', resB.body);

        // 3. User A gets User B's Public Key
        console.log('User A fetching User B public key...');
        const keyRes = await request(`/auth/keys/${userBEmail}`, 'GET', null, cookieA);
        console.log('User B Public Key:', keyRes.body.publicKey ? 'Found' : 'Not Found');

        if (keyRes.body.publicKey !== userBKeys.publicKey) {
            throw new Error('Public Key mismatch!');
        }

        // 4. User A shares item with User B
        console.log('User A sharing item...');
        const secretMessage = "This is a secret password";
        const randomKey = "random-aes-key-123"; // Mock AES key
        // Mock AES encryption of data
        const encryptedData = Buffer.from(secretMessage).toString('base64'); // Simple encoding for test

        // Encrypt the "AES Key" with User B's Public Key
        const encryptedKey = await CryptoLib.encryptWithPublicKey(randomKey, keyRes.body.publicKey);

        const shareRes = await request('/share', 'POST', {
            recipientEmail: userBEmail,
            encryptedData: encryptedData,
            encryptedKey: encryptedKey
        }, cookieA);
        console.log('Share Result:', shareRes.body);

        // 5. User B fetches shared items
        console.log('User B checking inbox...');
        const inboxRes = await request('/share', 'GET', null, cookieB);
        console.log('Inbox:', inboxRes.body);

        if (inboxRes.body.items.length === 0) {
            throw new Error('Inbox empty!');
        }

        const item = inboxRes.body.items[0];

        // 6. User B decrypts the key
        console.log('User B decrypting key...');
        const decryptedKey = await CryptoLib.decryptWithPrivateKey(item.encrypted_key, userBKeys.privateKey);
        console.log('Decrypted Key:', decryptedKey);

        if (decryptedKey !== randomKey) {
            throw new Error('Key decryption failed!');
        }

        console.log('--- Test Passed Successfully ---');

    } catch (error) {
        console.error('Test Failed:', error);
        if (error.cause) console.error('Cause:', error.cause);
        process.exit(1);
    }
}

runTest().catch(err => {
    console.error('Top-level Error:', err);
    process.exit(1);
});

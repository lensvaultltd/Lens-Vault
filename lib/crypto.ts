
// Wrapper for Web Crypto API (RSA-OAEP)

export const CryptoLib = {
    // Generate RSA Key Pair (Public/Private)
    async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"]
        );

        const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
        const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

        return {
            publicKey: arrayBufferToBase64(publicKeyBuffer),
            privateKey: arrayBufferToBase64(privateKeyBuffer),
        };
    },

    // Encrypt data with a Public Key (for sharing)
    async encryptWithPublicKey(data: string, publicKeyBase64: string): Promise<string> {
        const publicKeyBuffer = base64ToArrayBuffer(publicKeyBase64);
        const publicKey = await window.crypto.subtle.importKey(
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
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            {
                name: "RSA-OAEP",
            },
            publicKey,
            encodedData
        );

        return arrayBufferToBase64(encryptedBuffer);
    },

    // Decrypt data with a Private Key
    async decryptWithPrivateKey(encryptedDataBase64: string, privateKeyBase64: string): Promise<string> {
        const privateKeyBuffer = base64ToArrayBuffer(privateKeyBase64);
        const privateKey = await window.crypto.subtle.importKey(
            "pkcs8",
            privateKeyBuffer,
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            false,
            ["decrypt"]
        );

        const encryptedBuffer = base64ToArrayBuffer(encryptedDataBase64);
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "RSA-OAEP",
            },
            privateKey,
            encryptedBuffer
        );

        return new TextDecoder().decode(decryptedBuffer);
    }
};

// Helpers
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

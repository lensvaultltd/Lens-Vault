/**
 * Biometric Authentication Module
 * Implements WebAuthn for fingerprint, Face ID, and Windows Hello
 */

import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type {
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON
} from '@simplewebauthn/typescript-types';

export interface BiometricCredential {
    id: string;
    publicKey: string;
    counter: number;
    deviceType: string;
    createdAt: Date;
}

export class BiometricAuth {
    private apiBaseUrl: string;

    constructor(apiBaseUrl: string = '/api/auth/biometric') {
        this.apiBaseUrl = apiBaseUrl;
    }

    /**
     * Check if biometric authentication is available on this device
     */
    async isAvailable(): Promise<boolean> {
        if (!window.PublicKeyCredential) {
            return false;
        }

        try {
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            return available;
        } catch {
            return false;
        }
    }

    /**
     * Get user-friendly name for the biometric type
     */
    async getBiometricType(): Promise<string> {
        const userAgent = navigator.userAgent.toLowerCase();

        if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
            return 'Face ID or Touch ID';
        } else if (userAgent.includes('mac')) {
            return 'Touch ID';
        } else if (userAgent.includes('windows')) {
            return 'Windows Hello';
        } else if (userAgent.includes('android')) {
            return 'Fingerprint or Face Unlock';
        }

        return 'Biometric Authentication';
    }

    /**
     * Register a new biometric credential
     */
    async register(userId: string, userName: string): Promise<BiometricCredential> {
        // Request registration options from server
        const response = await fetch(`${this.apiBaseUrl}/register-options`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, userName }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to get registration options');
        }

        const options: PublicKeyCredentialCreationOptionsJSON = await response.json();

        // Start biometric registration
        const credential = await startRegistration(options);

        // Send credential to server for verification and storage
        const verifyResponse = await fetch(`${this.apiBaseUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, credential }),
            credentials: 'include'
        });

        if (!verifyResponse.ok) {
            throw new Error('Failed to verify biometric credential');
        }

        return verifyResponse.json();
    }

    /**
     * Authenticate using biometric credential
     */
    async authenticate(): Promise<{ token: string; user: any }> {
        // Request authentication options from server
        const response = await fetch(`${this.apiBaseUrl}/auth-options`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to get authentication options');
        }

        const options: PublicKeyCredentialRequestOptionsJSON = await response.json();

        // Start biometric authentication
        const credential = await startAuthentication(options);

        // Send credential to server for verification
        const verifyResponse = await fetch(`${this.apiBaseUrl}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential }),
            credentials: 'include'
        });

        if (!verifyResponse.ok) {
            throw new Error('Biometric authentication failed');
        }

        return verifyResponse.json();
    }

    /**
     * List all registered biometric credentials for a user
     */
    async listCredentials(userId: string): Promise<BiometricCredential[]> {
        const response = await fetch(`${this.apiBaseUrl}/credentials/${userId}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch credentials');
        }

        return response.json();
    }

    /**
     * Remove a biometric credential
     */
    async removeCredential(credentialId: string): Promise<void> {
        const response = await fetch(`${this.apiBaseUrl}/credentials/${credentialId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to remove credential');
        }
    }

    /**
     * Update credential nickname
     */
    async updateCredentialName(credentialId: string, name: string): Promise<void> {
        const response = await fetch(`${this.apiBaseUrl}/credentials/${credentialId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to update credential');
        }
    }
}

// Export singleton instance
export const biometricAuth = new BiometricAuth();

/**
 * Session Manager
 * Handles cross-platform session synchronization and token management
 * Addresses QA scenarios: #9, #10, #11, #12, #13, #14
 */

import { supabase } from './supabase';

interface SessionState {
    userId: string;
    token: string;
    expiresAt: number;
    platform: 'web' | 'desktop';
    deviceId: string;
}

export class SessionManager {
    private static instance: SessionManager;
    private sessionCheckInterval: number | null = null;
    private tokenRefreshInterval: number | null = null;
    private readonly TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes before expiry
    private readonly SESSION_CHECK_INTERVAL = 30 * 1000; // 30 seconds

    private constructor() {
        this.startSessionMonitoring();
        this.startTokenRefresh();
    }

    static getInstance(): SessionManager {
        if (!SessionManager.instance) {
            SessionManager.instance = new SessionManager();
        }
        return SessionManager.instance;
    }

    /**
     * Start monitoring for session changes across platforms
     * Handles QA scenarios #11, #12
     */
    private startSessionMonitoring(): void {
        // Listen for auth state changes
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                this.handleRemoteLogout();
            } else if (event === 'TOKEN_REFRESHED') {
                this.handleTokenRefresh(session);
            } else if (event === 'SIGNED_IN') {
                this.handleSignIn(session);
            }
        });

        // Periodic session validation
        this.sessionCheckInterval = window.setInterval(() => {
            this.validateSession();
        }, this.SESSION_CHECK_INTERVAL);
    }

    /**
     * Automatic token refresh before expiry
     * Handles QA scenarios #13, #14
     */
    private startTokenRefresh(): void {
        this.tokenRefreshInterval = window.setInterval(async () => {
            const session = await supabase.auth.getSession();

            if (!session.data.session) return;

            const expiresAt = session.data.session.expires_at! * 1000;
            const now = Date.now();
            const timeUntilExpiry = expiresAt - now;

            // Refresh if within buffer time
            if (timeUntilExpiry < this.TOKEN_REFRESH_BUFFER) {
                try {
                    const { data, error } = await supabase.auth.refreshSession();

                    if (error) {
                        console.error('Token refresh failed:', error);
                        this.handleTokenExpired();
                    } else {
                        console.log('Token refreshed successfully');
                        this.emitEvent('token-refreshed', data.session);
                    }
                } catch (error) {
                    console.error('Token refresh error:', error);
                    this.handleTokenExpired();
                }
            }
        }, 60 * 1000); // Check every minute
    }

    /**
     * Handle remote logout (from another device)
     */
    private handleRemoteLogout(): void {
        console.log('Detected logout from another device');

        // Clear local data
        this.clearLocalSession();

        // Show notification
        this.emitEvent('remote-logout', {
            message: 'You have been logged out from another device',
            action: 'redirect-to-login'
        });
    }

    /**
     * Handle token refresh
     */
    private handleTokenRefresh(session: any): void {
        console.log('Token refreshed');

        // Update local storage
        if (session) {
            localStorage.setItem('session', JSON.stringify(session));
        }

        this.emitEvent('token-refreshed', session);
    }

    /**
     * Handle sign in
     */
    private handleSignIn(session: any): void {
        console.log('User signed in');

        // Store session
        if (session) {
            localStorage.setItem('session', JSON.stringify(session));
        }

        this.emitEvent('signed-in', session);
    }

    /**
     * Validate current session
     */
    private async validateSession(): Promise<boolean> {
        try {
            const { data, error } = await supabase.auth.getSession();

            if (error || !data.session) {
                this.handleTokenExpired();
                return false;
            }

            return true;
        } catch (error) {
            console.error('Session validation error:', error);
            return false;
        }
    }

    /**
     * Handle expired token
     */
    private handleTokenExpired(): void {
        console.log('Token expired');

        // Clear session
        this.clearLocalSession();

        // Emit event
        this.emitEvent('token-expired', {
            message: 'Your session has expired. Please log in again.',
            action: 'show-login'
        });
    }

    /**
     * Clear local session data
     */
    private clearLocalSession(): void {
        localStorage.removeItem('session');
        localStorage.removeItem('user');

        // Clear IndexedDB vault cache
        if ('indexedDB' in window) {
            indexedDB.deleteDatabase('lens-vault-offline');
        }
    }

    /**
     * Emit custom events
     */
    private emitEvent(eventName: string, detail: any): void {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    /**
     * Cleanup
     */
    destroy(): void {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
        }
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
        }
    }

    /**
     * Force logout across all devices
     */
    async logoutAllDevices(): Promise<void> {
        try {
            await supabase.auth.signOut({ scope: 'global' });
            this.clearLocalSession();
            this.emitEvent('logged-out', { scope: 'global' });
        } catch (error) {
            console.error('Logout all devices failed:', error);
            throw error;
        }
    }

    /**
     * Get current session info
     */
    async getSessionInfo(): Promise<SessionState | null> {
        const { data } = await supabase.auth.getSession();

        if (!data.session) return null;

        return {
            userId: data.session.user.id,
            token: data.session.access_token,
            expiresAt: data.session.expires_at! * 1000,
            platform: this.getPlatform(),
            deviceId: this.getDeviceId()
        };
    }

    /**
     * Detect platform
     */
    private getPlatform(): 'web' | 'desktop' {
        // Check if running in Electron
        return (window as any).electron ? 'desktop' : 'web';
    }

    /**
     * Get or create device ID
     */
    private getDeviceId(): string {
        let deviceId = localStorage.getItem('device_id');

        if (!deviceId) {
            deviceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('device_id', deviceId);
        }

        return deviceId;
    }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();

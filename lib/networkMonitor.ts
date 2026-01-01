/**
 * Network Monitor
 * Detects network changes and handles offline/online transitions
 * Addresses QA scenarios: #6, #7, #8, #20
 */

export type NetworkStatus = 'online' | 'offline' | 'slow' | 'unstable';

export interface NetworkChangeEvent {
    status: NetworkStatus;
    previousStatus: NetworkStatus;
    timestamp: number;
    connectionType?: string;
}

export class NetworkMonitor {
    private static instance: NetworkMonitor;
    private currentStatus: NetworkStatus = 'online';
    private listeners: Set<(event: NetworkChangeEvent) => void> = new Set();
    private checkInterval: number | null = null;
    private lastOnlineTime: number = Date.now();

    private constructor() {
        this.initialize();
    }

    static getInstance(): NetworkMonitor {
        if (!NetworkMonitor.instance) {
            NetworkMonitor.instance = new NetworkMonitor();
        }
        return NetworkMonitor.instance;
    }

    /**
     * Initialize network monitoring
     */
    private initialize(): void {
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Monitor connection quality
        this.startQualityMonitoring();

        // Initial status check
        this.updateStatus();
    }

    /**
     * Handle online event
     * QA scenario #6, #7, #8
     */
    private handleOnline(): void {
        const previousStatus = this.currentStatus;
        this.currentStatus = 'online';
        this.lastOnlineTime = Date.now();

        console.log('Network: Online');

        this.notifyListeners({
            status: 'online',
            previousStatus,
            timestamp: Date.now(),
            connectionType: this.getConnectionType()
        });

        // Emit global event
        window.dispatchEvent(new CustomEvent('connection-restored'));
    }

    /**
     * Handle offline event
     * QA scenario #6, #7
     */
    private handleOffline(): void {
        const previousStatus = this.currentStatus;
        this.currentStatus = 'offline';

        console.log('Network: Offline');

        this.notifyListeners({
            status: 'offline',
            previousStatus,
            timestamp: Date.now()
        });

        // Emit global event
        window.dispatchEvent(new CustomEvent('connection-lost'));
    }

    /**
     * Monitor connection quality
     * QA scenario #8 (network switching)
     */
    private startQualityMonitoring(): void {
        this.checkInterval = window.setInterval(() => {
            this.checkConnectionQuality();
        }, 5000); // Check every 5 seconds
    }

    /**
     * Check connection quality
     */
    private async checkConnectionQuality(): Promise<void> {
        if (!navigator.onLine) {
            if (this.currentStatus !== 'offline') {
                this.handleOffline();
            }
            return;
        }

        try {
            const startTime = Date.now();

            // Ping a fast endpoint
            const response = await fetch('/api/health', {
                method: 'HEAD',
                cache: 'no-cache'
            });

            const latency = Date.now() - startTime;

            // Determine connection quality
            let newStatus: NetworkStatus;

            if (!response.ok) {
                newStatus = 'unstable';
            } else if (latency > 2000) {
                newStatus = 'slow';
            } else {
                newStatus = 'online';
            }

            // Update status if changed
            if (newStatus !== this.currentStatus) {
                const previousStatus = this.currentStatus;
                this.currentStatus = newStatus;

                this.notifyListeners({
                    status: newStatus,
                    previousStatus,
                    timestamp: Date.now(),
                    connectionType: this.getConnectionType()
                });
            }

        } catch (error) {
            // Network error - likely offline
            if (this.currentStatus !== 'offline') {
                this.handleOffline();
            }
        }
    }

    /**
     * Get connection type (WiFi, cellular, etc.)
     */
    private getConnectionType(): string | undefined {
        const connection = (navigator as any).connection ||
            (navigator as any).mozConnection ||
            (navigator as any).webkitConnection;

        return connection?.effectiveType || connection?.type;
    }

    /**
     * Update current status
     */
    private updateStatus(): void {
        this.currentStatus = navigator.onLine ? 'online' : 'offline';
    }

    /**
     * Subscribe to network changes
     */
    subscribe(callback: (event: NetworkChangeEvent) => void): () => void {
        this.listeners.add(callback);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(callback);
        };
    }

    /**
     * Notify all listeners
     */
    private notifyListeners(event: NetworkChangeEvent): void {
        this.listeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('Network listener error:', error);
            }
        });
    }

    /**
     * Get current network status
     */
    getStatus(): NetworkStatus {
        return this.currentStatus;
    }

    /**
     * Check if online
     */
    isOnline(): boolean {
        return this.currentStatus === 'online';
    }

    /**
     * Check if offline
     */
    isOffline(): boolean {
        return this.currentStatus === 'offline';
    }

    /**
     * Get time since last online
     */
    getTimeSinceOnline(): number {
        return Date.now() - this.lastOnlineTime;
    }

    /**
     * Wait for online connection
     */
    async waitForOnline(timeout: number = 30000): Promise<boolean> {
        if (this.isOnline()) return true;

        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                unsubscribe();
                resolve(false);
            }, timeout);

            const unsubscribe = this.subscribe((event) => {
                if (event.status === 'online') {
                    clearTimeout(timeoutId);
                    unsubscribe();
                    resolve(true);
                }
            });
        });
    }

    /**
     * Cleanup
     */
    destroy(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.listeners.clear();
    }
}

// Export singleton instance
export const networkMonitor = NetworkMonitor.getInstance();

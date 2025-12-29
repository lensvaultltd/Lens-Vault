/**
 * Enhanced Offline Sync Service
 * Integrates with all edge case handlers
 * Addresses QA scenarios: #6, #7, #15, #16, #17
 */

import { offlineSyncService } from './offlineSyncService';
import { networkMonitor } from '../lib/networkMonitor';
import { syncConflictResolver } from '../lib/syncConflictResolver';

// Extend the existing offline sync service
class EnhancedOfflineSyncService {
    private syncInProgress: boolean = false;
    private syncQueue: any[] = [];
    private retryAttempts: Map<string, number> = new Map();
    private readonly MAX_RETRIES = 3;

    constructor() {
        this.initialize();
    }

    /**
     * Initialize enhanced sync
     */
    private initialize(): void {
        // Listen for network changes
        networkMonitor.subscribe((event) => {
            if (event.status === 'online' && event.previousStatus === 'offline') {
                console.log('Network restored - resuming sync');
                this.resumeSync();
            }
        });

        // Listen for conflict resolutions
        window.addEventListener('conflict-resolved', (event: any) => {
            this.handleConflictResolved(event.detail);
        });
    }

    /**
     * Enhanced sync with conflict detection
     */
    async syncWithConflictDetection(): Promise<void> {
        if (this.syncInProgress) {
            console.log('Sync already in progress');
            return;
        }

        if (!networkMonitor.isOnline()) {
            console.log('Offline - queueing sync');
            return;
        }

        this.syncInProgress = true;

        try {
            // Get pending operations from queue
            const operations = await offlineSyncService.getSyncStatus();

            if (operations.pendingOperations === 0) {
                this.syncInProgress = false;
                return;
            }

            // Process each operation with conflict detection
            for (const op of this.syncQueue) {
                await this.processSyncOperation(op);
            }

            // Emit sync complete
            window.dispatchEvent(new CustomEvent('sync-complete'));

        } catch (error) {
            console.error('Sync failed:', error);

            // Emit sync error
            window.dispatchEvent(new CustomEvent('sync-error', {
                detail: { error: error.message }
            }));

        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Process single sync operation with conflict detection
     */
    private async processSyncOperation(operation: any): Promise<void> {
        try {
            // Fetch remote version
            const remoteVersion = await this.fetchRemoteVersion(operation.data.id);

            // Detect conflict
            const conflict = syncConflictResolver.detectConflict(
                operation.data,
                remoteVersion
            );

            if (conflict) {
                // Auto-resolve using "most recent" strategy
                const resolved = await syncConflictResolver.autoResolve(
                    conflict.id,
                    'merge'
                );

                // Update operation data
                operation.data = resolved;
            }

            // Perform sync operation
            await this.executeSyncOperation(operation);

            // Clear retry count
            this.retryAttempts.delete(operation.id);

        } catch (error) {
            // Handle retry logic
            await this.handleSyncError(operation, error);
        }
    }

    /**
     * Execute sync operation
     */
    private async executeSyncOperation(operation: any): Promise<void> {
        switch (operation.type) {
            case 'create':
                await fetch('/api/vault/items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(operation.data)
                });
                break;

            case 'update':
                await fetch(`/api/vault/items/${operation.data.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(operation.data)
                });
                break;

            case 'delete':
                await fetch(`/api/vault/items/${operation.data.id}`, {
                    method: 'DELETE'
                });
                break;
        }
    }

    /**
     * Fetch remote version for conflict detection
     */
    private async fetchRemoteVersion(id: string): Promise<any> {
        try {
            const response = await fetch(`/api/vault/items/${id}`);
            if (response.ok) {
                return response.json();
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Handle sync error with retry logic
     */
    private async handleSyncError(operation: any, error: any): Promise<void> {
        const retries = this.retryAttempts.get(operation.id) || 0;

        if (retries < this.MAX_RETRIES) {
            // Increment retry count
            this.retryAttempts.set(operation.id, retries + 1);

            // Exponential backoff
            const delay = Math.pow(2, retries) * 1000;

            console.log(`Retrying operation ${operation.id} in ${delay}ms (attempt ${retries + 1}/${this.MAX_RETRIES})`);

            setTimeout(() => {
                this.processSyncOperation(operation);
            }, delay);

        } else {
            // Max retries reached
            console.error(`Operation ${operation.id} failed after ${this.MAX_RETRIES} retries`);

            // Emit failure event
            window.dispatchEvent(new CustomEvent('sync-operation-failed', {
                detail: { operation, error }
            }));
        }
    }

    /**
     * Resume sync after network restoration
     */
    private async resumeSync(): Promise<void> {
        // Wait for network to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Resume sync
        await this.syncWithConflictDetection();
    }

    /**
     * Handle conflict resolution
     */
    private handleConflictResolved(detail: any): void {
        // Update operation with resolved data
        const operation = this.syncQueue.find(op => op.data.id === detail.conflictId);

        if (operation) {
            operation.data = detail.data;
            this.processSyncOperation(operation);
        }
    }

    /**
     * Add operation to sync queue
     */
    addToQueue(operation: any): void {
        this.syncQueue.push(operation);

        // Try to sync if online
        if (networkMonitor.isOnline()) {
            this.syncWithConflictDetection();
        }
    }

    /**
     * Get sync queue status
     */
    getQueueStatus(): { pending: number; failed: number } {
        return {
            pending: this.syncQueue.length,
            failed: Array.from(this.retryAttempts.values()).filter(r => r >= this.MAX_RETRIES).length
        };
    }
}

// Export singleton instance
export const enhancedOfflineSyncService = new EnhancedOfflineSyncService();

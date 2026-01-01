/**
 * Offline Sync Service
 * Full offline functionality with smart synchronization
 * Essential for mobile users and reliability
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface LensVaultDB extends DBSchema {
    vault_items: {
        key: string;
        value: VaultItem;
        indexes: { 'by-updated': string };
    };
    secure_notes: {
        key: string;
        value: SecureNote;
        indexes: { 'by-updated': string };
    };
    sync_queue: {
        key: string;
        value: SyncOperation;
        indexes: { 'by-timestamp': number };
    };
    metadata: {
        key: string;
        value: any;
    };
}

interface VaultItem {
    id: string;
    title: string;
    username: string;
    password: string;
    url?: string;
    notes?: string;
    folder_id?: string;
    created_at: string;
    updated_at: string;
    synced: boolean;
}

interface SecureNote {
    id: string;
    title: string;
    content: string;
    tags: string[];
    is_favorite: boolean;
    created_at: string;
    updated_at: string;
    synced: boolean;
}

interface SyncOperation {
    id: string;
    type: 'create' | 'update' | 'delete';
    table: 'vault_items' | 'secure_notes';
    data: any;
    timestamp: number;
    retries: number;
}

export class OfflineSyncService {
    private db: IDBPDatabase<LensVaultDB> | null = null;
    private syncQueue: SyncOperation[] = [];
    private isSyncing: boolean = false;
    private syncInterval: number | null = null;

    /**
     * Initialize offline database
     */
    async initialize(): Promise<void> {
        this.db = await openDB<LensVaultDB>('lens-vault-offline', 1, {
            upgrade(db) {
                // Vault items store
                const vaultStore = db.createObjectStore('vault_items', { keyPath: 'id' });
                vaultStore.createIndex('by-updated', 'updated_at');

                // Secure notes store
                const notesStore = db.createObjectStore('secure_notes', { keyPath: 'id' });
                notesStore.createIndex('by-updated', 'updated_at');

                // Sync queue store
                const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
                syncStore.createIndex('by-timestamp', 'timestamp');

                // Metadata store
                db.createObjectStore('metadata', { keyPath: 'key' });
            },
        });

        // Set up online/offline listeners
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Start sync interval if online
        if (navigator.onLine) {
            this.startSyncInterval();
        }
    }

    /**
     * Download vault for offline use
     */
    async downloadVault(userId: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        try {
            // Fetch all vault items
            const response = await fetch(`/api/vault/items?user_id=${userId}`);
            const items = await response.json();

            // Store in IndexedDB
            const tx = this.db.transaction('vault_items', 'readwrite');
            for (const item of items) {
                await tx.store.put({ ...item, synced: true });
            }
            await tx.done;

            // Update last sync time
            await this.db.put('metadata', { key: 'last_sync', value: new Date().toISOString() });
        } catch (error) {
            console.error('Failed to download vault:', error);
            throw error;
        }
    }

    /**
     * Save item offline
     */
    async saveOffline(item: VaultItem): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        // Save to IndexedDB
        await this.db.put('vault_items', { ...item, synced: false });

        // Add to sync queue
        const operation: SyncOperation = {
            id: `${Date.now()}-${Math.random()}`,
            type: item.id ? 'update' : 'create',
            table: 'vault_items',
            data: item,
            timestamp: Date.now(),
            retries: 0
        };

        await this.db.put('sync_queue', operation);
        this.syncQueue.push(operation);

        // Try to sync if online
        if (navigator.onLine) {
            await this.sync();
        }
    }

    /**
     * Get all items (offline-first)
     */
    async getItems(): Promise<VaultItem[]> {
        if (!this.db) throw new Error('Database not initialized');

        // Always return from IndexedDB for speed
        const items = await this.db.getAll('vault_items');

        // Sync in background if online
        if (navigator.onLine && !this.isSyncing) {
            this.sync().catch(console.error);
        }

        return items;
    }

    /**
     * Delete item offline
     */
    async deleteOffline(itemId: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        // Remove from IndexedDB
        await this.db.delete('vault_items', itemId);

        // Add to sync queue
        const operation: SyncOperation = {
            id: `${Date.now()}-${Math.random()}`,
            type: 'delete',
            table: 'vault_items',
            data: { id: itemId },
            timestamp: Date.now(),
            retries: 0
        };

        await this.db.put('sync_queue', operation);
        this.syncQueue.push(operation);

        // Try to sync if online
        if (navigator.onLine) {
            await this.sync();
        }
    }

    /**
     * Synchronize with server
     */
    async sync(): Promise<void> {
        if (!this.db || this.isSyncing || !navigator.onLine) return;

        this.isSyncing = true;

        try {
            // Get all pending operations
            const operations = await this.db.getAll('sync_queue');

            if (operations.length === 0) {
                this.isSyncing = false;
                return;
            }

            // Process operations in batches
            const batchSize = 10;
            for (let i = 0; i < operations.length; i += batchSize) {
                const batch = operations.slice(i, i + batchSize);
                await this.processBatch(batch);
            }

            // Clear sync queue
            const tx = this.db.transaction('sync_queue', 'readwrite');
            await tx.store.clear();
            await tx.done;

            this.syncQueue = [];

            // Update last sync time
            await this.db.put('metadata', { key: 'last_sync', value: new Date().toISOString() });

            // Emit sync complete event
            window.dispatchEvent(new CustomEvent('sync-complete'));

        } catch (error) {
            console.error('Sync failed:', error);

            // Retry failed operations
            await this.retryFailedOperations();
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Process batch of sync operations
     */
    private async processBatch(operations: SyncOperation[]): Promise<void> {
        const promises = operations.map(async (op) => {
            try {
                switch (op.type) {
                    case 'create':
                        await fetch('/api/vault/items', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(op.data)
                        });
                        break;

                    case 'update':
                        await fetch(`/api/vault/items/${op.data.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(op.data)
                        });
                        break;

                    case 'delete':
                        await fetch(`/api/vault/items/${op.data.id}`, {
                            method: 'DELETE'
                        });
                        break;
                }

                // Mark as synced in IndexedDB
                if (this.db && op.type !== 'delete') {
                    const item = await this.db.get(op.table, op.data.id);
                    if (item) {
                        await this.db.put(op.table, { ...item, synced: true });
                    }
                }

            } catch (error) {
                console.error(`Failed to sync operation ${op.id}:`, error);

                // Increment retry count
                op.retries++;

                // Re-queue if retries < 3
                if (op.retries < 3 && this.db) {
                    await this.db.put('sync_queue', op);
                }

                throw error;
            }
        });

        await Promise.allSettled(promises);
    }

    /**
     * Retry failed operations
     */
    private async retryFailedOperations(): Promise<void> {
        if (!this.db) return;

        const operations = await this.db.getAll('sync_queue');
        const failedOps = operations.filter(op => op.retries > 0 && op.retries < 3);

        if (failedOps.length > 0) {
            // Retry after delay
            setTimeout(() => this.sync(), 5000);
        }
    }

    /**
     * Handle online event
     */
    private handleOnline(): void {
        console.log('Connection restored - syncing...');
        this.sync();
        this.startSyncInterval();

        window.dispatchEvent(new CustomEvent('connection-restored'));
    }

    /**
     * Handle offline event
     */
    private handleOffline(): void {
        console.log('Connection lost - offline mode activated');
        this.stopSyncInterval();

        window.dispatchEvent(new CustomEvent('connection-lost'));
    }

    /**
     * Start periodic sync
     */
    private startSyncInterval(): void {
        if (this.syncInterval) return;

        // Sync every 30 seconds
        this.syncInterval = window.setInterval(() => {
            this.sync();
        }, 30000);
    }

    /**
     * Stop periodic sync
     */
    private stopSyncInterval(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * Get sync status
     */
    async getSyncStatus(): Promise<{
        isOnline: boolean;
        isSyncing: boolean;
        pendingOperations: number;
        lastSync: string | null;
    }> {
        if (!this.db) throw new Error('Database not initialized');

        const operations = await this.db.getAll('sync_queue');
        const metadata = await this.db.get('metadata', 'last_sync');

        return {
            isOnline: navigator.onLine,
            isSyncing: this.isSyncing,
            pendingOperations: operations.length,
            lastSync: metadata?.value || null
        };
    }

    /**
     * Clear offline data
     */
    async clearOfflineData(): Promise<void> {
        if (!this.db) return;

        const tx = this.db.transaction(['vault_items', 'secure_notes', 'sync_queue'], 'readwrite');
        await Promise.all([
            tx.objectStore('vault_items').clear(),
            tx.objectStore('secure_notes').clear(),
            tx.objectStore('sync_queue').clear()
        ]);
        await tx.done;
    }
}

// Export singleton instance
export const offlineSyncService = new OfflineSyncService();

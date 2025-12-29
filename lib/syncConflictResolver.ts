/**
 * Sync Conflict Resolver
 * Handles data conflicts between desktop and web
 * Addresses QA scenarios: #7, #15, #16, #17, #18
 */

export interface SyncConflict {
    id: string;
    type: 'password' | 'note' | 'folder';
    localVersion: any;
    remoteVersion: any;
    timestamp: number;
    resolved: boolean;
}

export type ConflictResolution = 'local' | 'remote' | 'merge' | 'manual';

export class SyncConflictResolver {
    private static instance: SyncConflictResolver;
    private conflicts: Map<string, SyncConflict> = new Map();

    private constructor() { }

    static getInstance(): SyncConflictResolver {
        if (!SyncConflictResolver.instance) {
            SyncConflictResolver.instance = new SyncConflictResolver();
        }
        return SyncConflictResolver.instance;
    }

    /**
     * Detect conflict between local and remote data
     */
    detectConflict(local: any, remote: any): SyncConflict | null {
        // No conflict if one is null
        if (!local || !remote) return null;

        // Check if both were modified
        const localUpdated = new Date(local.updated_at).getTime();
        const remoteUpdated = new Date(remote.updated_at).getTime();

        // No conflict if same timestamp
        if (localUpdated === remoteUpdated) return null;

        // Check if data is different
        const localData = JSON.stringify(this.normalizeData(local));
        const remoteData = JSON.stringify(this.normalizeData(remote));

        if (localData === remoteData) return null;

        // Conflict detected
        const conflict: SyncConflict = {
            id: local.id || remote.id,
            type: this.getDataType(local || remote),
            localVersion: local,
            remoteVersion: remote,
            timestamp: Date.now(),
            resolved: false
        };

        this.conflicts.set(conflict.id, conflict);

        // Emit conflict event
        window.dispatchEvent(new CustomEvent('sync-conflict', { detail: conflict }));

        return conflict;
    }

    /**
     * Auto-resolve conflict using strategy
     */
    async autoResolve(conflictId: string, strategy: ConflictResolution): Promise<any> {
        const conflict = this.conflicts.get(conflictId);
        if (!conflict) throw new Error('Conflict not found');

        let resolved: any;

        switch (strategy) {
            case 'local':
                // Keep local version
                resolved = conflict.localVersion;
                break;

            case 'remote':
                // Keep remote version
                resolved = conflict.remoteVersion;
                break;

            case 'merge':
                // Merge both versions
                resolved = this.mergeVersions(conflict.localVersion, conflict.remoteVersion);
                break;

            case 'manual':
                // Requires user intervention
                throw new Error('Manual resolution required');

            default:
                throw new Error('Invalid resolution strategy');
        }

        // Mark as resolved
        conflict.resolved = true;
        this.conflicts.set(conflictId, conflict);

        // Emit resolution event
        window.dispatchEvent(new CustomEvent('conflict-resolved', {
            detail: { conflictId, resolution: strategy, data: resolved }
        }));

        return resolved;
    }

    /**
     * Merge two versions intelligently
     */
    private mergeVersions(local: any, remote: any): any {
        const merged = { ...local };

        // Use most recent timestamp
        const localTime = new Date(local.updated_at).getTime();
        const remoteTime = new Date(remote.updated_at).getTime();

        // Merge field by field
        Object.keys(remote).forEach(key => {
            if (key === 'id' || key === 'created_at') {
                // Keep original
                return;
            }

            if (key === 'updated_at') {
                // Use most recent
                merged[key] = remoteTime > localTime ? remote[key] : local[key];
                return;
            }

            // For other fields, prefer remote if newer
            if (remoteTime > localTime) {
                merged[key] = remote[key];
            }
        });

        return merged;
    }

    /**
     * Get all unresolved conflicts
     */
    getUnresolvedConflicts(): SyncConflict[] {
        return Array.from(this.conflicts.values()).filter(c => !c.resolved);
    }

    /**
     * Clear resolved conflicts
     */
    clearResolvedConflicts(): void {
        for (const [id, conflict] of this.conflicts.entries()) {
            if (conflict.resolved) {
                this.conflicts.delete(id);
            }
        }
    }

    /**
     * Normalize data for comparison
     */
    private normalizeData(data: any): any {
        const normalized = { ...data };
        delete normalized.updated_at;
        delete normalized.created_at;
        delete normalized.synced;
        return normalized;
    }

    /**
     * Get data type
     */
    private getDataType(data: any): 'password' | 'note' | 'folder' {
        if (data.password_enc) return 'password';
        if (data.encrypted_content) return 'note';
        return 'folder';
    }
}

// Export singleton instance
export const syncConflictResolver = SyncConflictResolver.getInstance();

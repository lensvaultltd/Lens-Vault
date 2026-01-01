/**
 * Crash Recovery Manager
 * Handles app crashes and data recovery
 * Addresses QA scenarios: #19
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface RecoveryDB extends DBSchema {
    drafts: {
        key: string;
        value: DraftData;
        indexes: { 'by-timestamp': number };
    };
    autosave: {
        key: string;
        value: AutosaveData;
    };
}

interface DraftData {
    id: string;
    type: 'password' | 'note' | 'folder';
    data: any;
    timestamp: number;
    completed: boolean;
}

interface AutosaveData {
    id: string;
    data: any;
    timestamp: number;
}

export class CrashRecoveryManager {
    private static instance: CrashRecoveryManager;
    private db: IDBPDatabase<RecoveryDB> | null = null;
    private autosaveInterval: number | null = null;
    private readonly AUTOSAVE_INTERVAL = 5000; // 5 seconds

    private constructor() {
        this.initialize();
    }

    static getInstance(): CrashRecoveryManager {
        if (!CrashRecoveryManager.instance) {
            CrashRecoveryManager.instance = new CrashRecoveryManager();
        }
        return CrashRecoveryManager.instance;
    }

    /**
     * Initialize crash recovery system
     */
    private async initialize(): Promise<void> {
        try {
            this.db = await openDB<RecoveryDB>('lens-vault-recovery', 1, {
                upgrade(db) {
                    // Drafts store
                    const draftsStore = db.createObjectStore('drafts', { keyPath: 'id' });
                    draftsStore.createIndex('by-timestamp', 'timestamp');

                    // Autosave store
                    db.createObjectStore('autosave', { keyPath: 'id' });
                },
            });

            // Check for crash on startup
            this.checkForCrash();

            // Start autosave
            this.startAutosave();

            // Listen for beforeunload
            window.addEventListener('beforeunload', () => this.handleBeforeUnload());

        } catch (error) {
            console.error('Failed to initialize crash recovery:', error);
        }
    }

    /**
     * Check if app crashed last time
     */
    private async checkForCrash(): Promise<void> {
        const crashed = localStorage.getItem('app_crashed');

        if (crashed === 'true') {
            console.log('Detected previous crash - recovering data');

            // Emit recovery event
            window.dispatchEvent(new CustomEvent('crash-detected', {
                detail: { timestamp: localStorage.getItem('crash_timestamp') }
            }));

            // Clear crash flag
            localStorage.removeItem('app_crashed');
            localStorage.removeItem('crash_timestamp');
        }

        // Set crash flag (will be cleared on clean exit)
        localStorage.setItem('app_crashed', 'true');
        localStorage.setItem('crash_timestamp', Date.now().toString());
    }

    /**
     * Handle clean app exit
     */
    private handleBeforeUnload(): void {
        // Clear crash flag on clean exit
        localStorage.removeItem('app_crashed');
        localStorage.removeItem('crash_timestamp');
    }

    /**
     * Start autosave interval
     */
    private startAutosave(): void {
        this.autosaveInterval = window.setInterval(() => {
            this.performAutosave();
        }, this.AUTOSAVE_INTERVAL);
    }

    /**
     * Perform autosave
     */
    private async performAutosave(): Promise<void> {
        // Get current form data from DOM
        const forms = document.querySelectorAll('form[data-autosave]');

        for (const form of forms) {
            const formData = new FormData(form as HTMLFormElement);
            const data: any = {};

            formData.forEach((value, key) => {
                data[key] = value;
            });

            if (Object.keys(data).length > 0) {
                await this.saveAutosave(form.id, data);
            }
        }
    }

    /**
     * Save draft
     */
    async saveDraft(type: 'password' | 'note' | 'folder', data: any): Promise<void> {
        if (!this.db) return;

        const draft: DraftData = {
            id: `draft-${Date.now()}`,
            type,
            data,
            timestamp: Date.now(),
            completed: false
        };

        await this.db.put('drafts', draft);

        console.log('Draft saved:', draft.id);
    }

    /**
     * Save autosave data
     */
    async saveAutosave(id: string, data: any): Promise<void> {
        if (!this.db) return;

        const autosave: AutosaveData = {
            id,
            data,
            timestamp: Date.now()
        };

        await this.db.put('autosave', autosave);
    }

    /**
     * Get all drafts
     */
    async getDrafts(): Promise<DraftData[]> {
        if (!this.db) return [];

        const drafts = await this.db.getAll('drafts');
        return drafts.filter(d => !d.completed);
    }

    /**
     * Get autosave data
     */
    async getAutosave(id: string): Promise<AutosaveData | undefined> {
        if (!this.db) return undefined;

        return this.db.get('autosave', id);
    }

    /**
     * Mark draft as completed
     */
    async completeDraft(id: string): Promise<void> {
        if (!this.db) return;

        const draft = await this.db.get('drafts', id);
        if (draft) {
            draft.completed = true;
            await this.db.put('drafts', draft);
        }
    }

    /**
     * Delete draft
     */
    async deleteDraft(id: string): Promise<void> {
        if (!this.db) return;

        await this.db.delete('drafts', id);
    }

    /**
     * Clear all recovery data
     */
    async clearRecoveryData(): Promise<void> {
        if (!this.db) return;

        await this.db.clear('drafts');
        await this.db.clear('autosave');
    }

    /**
     * Cleanup
     */
    destroy(): void {
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
        }
    }
}

// Export singleton instance
export const crashRecoveryManager = CrashRecoveryManager.getInstance();

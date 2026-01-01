import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface VaultEntry {
    id: string;
    website: string;
    username: string;
    password_encrypted: string;
    type: string;
    created_at: string;
    updated_at: string;
}

interface CachedVault {
    entries: VaultEntry[];
    lastSync: number;
}

export class ExtensionVaultService {
    private supabase: SupabaseClient;
    private vault: VaultEntry[] = [];
    private channel: RealtimeChannel | null = null;
    private syncInterval: number | null = null;

    constructor() {
        this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    async init(sessionToken?: string) {
        // Restore session if available
        if (sessionToken) {
            const { data, error } = await this.supabase.auth.setSession({
                access_token: sessionToken,
                refresh_token: sessionToken,
            });
            if (error) console.error('Session restore failed:', error);
        }

        // Load cached vault
        const cached = await this.loadCachedVault();
        if (cached) {
            this.vault = cached.entries;
        }

        // Initial sync
        await this.syncVault();

        // Set up real-time subscription
        this.setupRealtimeSync();

        // Periodic sync every 30 seconds
        this.syncInterval = window.setInterval(() => this.syncVault(), 30000);
    }

    private async loadCachedVault(): Promise<CachedVault | null> {
        return new Promise((resolve) => {
            chrome.storage.local.get(['vaultCache'], (result) => {
                resolve(result.vaultCache || null);
            });
        });
    }

    private async saveCachedVault() {
        const cache: CachedVault = {
            entries: this.vault,
            lastSync: Date.now(),
        };
        return new Promise<void>((resolve) => {
            chrome.storage.local.set({ vaultCache: cache }, () => resolve());
        });
    }

    async syncVault() {
        try {
            const { data: user } = await this.supabase.auth.getUser();
            if (!user.user) return;

            const { data, error } = await this.supabase
                .from('vault_items')
                .select('*')
                .eq('user_id', user.user.id)
                .eq('type', 'login');

            if (error) {
                console.error('Vault sync error:', error);
                return;
            }

            if (data) {
                this.vault = data as VaultEntry[];
                await this.saveCachedVault();

                // Notify all tabs of vault update
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach((tab) => {
                        if (tab.id) {
                            chrome.tabs.sendMessage(tab.id, {
                                action: 'VAULT_UPDATED',
                                entries: this.vault,
                            }).catch(() => {
                                // Ignore errors for tabs without content script
                            });
                        }
                    });
                });
            }
        } catch (err) {
            console.error('Sync failed:', err);
        }
    }

    private setupRealtimeSync() {
        this.channel = this.supabase
            .channel('vault_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'vault_items',
                },
                () => {
                    // Re-sync on any vault change
                    this.syncVault();
                }
            )
            .subscribe();
    }

    getEntriesByDomain(domain: string): VaultEntry[] {
        return this.vault.filter((entry) => {
            try {
                const entryDomain = new URL(entry.website).hostname;
                return entryDomain.includes(domain) || domain.includes(entryDomain);
            } catch {
                return entry.website.includes(domain);
            }
        });
    }

    async saveCredential(
        website: string,
        username: string,
        password: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: user } = await this.supabase.auth.getUser();
            if (!user.user) {
                return { success: false, error: 'Not authenticated' };
            }

            const { error } = await this.supabase.from('vault_items').insert({
                user_id: user.user.id,
                website,
                username,
                password_encrypted: password, // TODO: Encrypt before saving
                type: 'login',
                name: new URL(website).hostname,
            });

            if (error) {
                return { success: false, error: error.message };
            }

            // Sync immediately after save
            await this.syncVault();
            return { success: true };
        } catch (err) {
            return { success: false, error: String(err) };
        }
    }

    async updateCredential(
        id: string,
        password: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await this.supabase
                .from('vault_items')
                .update({ password_encrypted: password }) // TODO: Encrypt
                .eq('id', id);

            if (error) {
                return { success: false, error: error.message };
            }

            await this.syncVault();
            return { success: true };
        } catch (err) {
            return { success: false, error: String(err) };
        }
    }

    destroy() {
        if (this.channel) {
            this.channel.unsubscribe();
        }
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }
}

// Singleton instance
export const vaultService = new ExtensionVaultService();

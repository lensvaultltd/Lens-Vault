/**
 * Secure Notes Service
 * Encrypted note storage with rich text support
 */

import { supabase } from '../lib/supabase';
import { encryptData, decryptData } from '../lib/encryption';

export interface SecureNote {
    id: string;
    user_id: string;
    title: string;
    content: string; // Decrypted
    encrypted_content: string; // Encrypted
    tags: string[];
    is_favorite: boolean;
    created_at: string;
    updated_at: string;
}

export class SecureNotesService {
    /**
     * Create a new secure note
     */
    async createNote(note: Omit<SecureNote, 'id' | 'created_at' | 'updated_at' | 'encrypted_content'>): Promise<SecureNote> {
        const encryptedContent = await encryptData(note.content);

        const { data, error } = await supabase
            .from('secure_notes')
            .insert({
                user_id: note.user_id,
                title: note.title,
                encrypted_content: encryptedContent,
                tags: note.tags,
                is_favorite: note.is_favorite
            })
            .select()
            .single();

        if (error) throw error;

        return {
            ...data,
            content: note.content
        };
    }

    /**
     * Get all notes for a user
     */
    async getNotes(userId: string): Promise<SecureNote[]> {
        const { data, error } = await supabase
            .from('secure_notes')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // Decrypt all notes
        const decrypted = await Promise.all(
            data.map(async (note) => ({
                ...note,
                content: await decryptData(note.encrypted_content)
            }))
        );

        return decrypted;
    }

    /**
     * Get a single note
     */
    async getNote(noteId: string): Promise<SecureNote> {
        const { data, error } = await supabase
            .from('secure_notes')
            .select('*')
            .eq('id', noteId)
            .single();

        if (error) throw error;

        return {
            ...data,
            content: await decryptData(data.encrypted_content)
        };
    }

    /**
     * Update a note
     */
    async updateNote(noteId: string, updates: Partial<SecureNote>): Promise<SecureNote> {
        const updateData: any = { ...updates };

        // Encrypt content if provided
        if (updates.content) {
            updateData.encrypted_content = await encryptData(updates.content);
            delete updateData.content;
        }

        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('secure_notes')
            .update(updateData)
            .eq('id', noteId)
            .select()
            .single();

        if (error) throw error;

        return {
            ...data,
            content: updates.content || await decryptData(data.encrypted_content)
        };
    }

    /**
     * Delete a note
     */
    async deleteNote(noteId: string): Promise<void> {
        const { error } = await supabase
            .from('secure_notes')
            .delete()
            .eq('id', noteId);

        if (error) throw error;
    }

    /**
     * Search notes
     */
    async searchNotes(userId: string, query: string): Promise<SecureNote[]> {
        const allNotes = await this.getNotes(userId);

        const lowerQuery = query.toLowerCase();

        return allNotes.filter(note =>
            note.title.toLowerCase().includes(lowerQuery) ||
            note.content.toLowerCase().includes(lowerQuery) ||
            note.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    }

    /**
     * Toggle favorite
     */
    async toggleFavorite(noteId: string): Promise<SecureNote> {
        const note = await this.getNote(noteId);

        return this.updateNote(noteId, {
            is_favorite: !note.is_favorite
        });
    }

    /**
     * Get notes by tag
     */
    async getNotesByTag(userId: string, tag: string): Promise<SecureNote[]> {
        const allNotes = await this.getNotes(userId);

        return allNotes.filter(note =>
            note.tags.includes(tag)
        );
    }

    /**
     * Get all tags for a user
     */
    async getAllTags(userId: string): Promise<string[]> {
        const notes = await this.getNotes(userId);

        const tagsSet = new Set<string>();
        notes.forEach(note => {
            note.tags.forEach(tag => tagsSet.add(tag));
        });

        return Array.from(tagsSet).sort();
    }
}

export const secureNotesService = new SecureNotesService();

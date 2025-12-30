import { supabase } from '../lib/supabase';

export interface DigitalWill {
    id: string;
    sender_email: string;
    beneficiary_email: string;
    encrypted_vault_data: string;
    condition: 'death' | 'illness' | 'absence' | 'other';
    custom_condition?: string;
    action: 'transfer_access' | 'delete_account';
    release_date?: string;
    released: boolean;
    created_at: string;
    updated_at: string;
}

export interface EmergencyRequest {
    id: string;
    requester_email: string;
    target_user_email: string;
    request_type: 'death' | 'illness' | 'absence' | 'other';
    custom_reason?: string;
    proof_document_url?: string;
    status: 'pending' | 'approved' | 'rejected';
    admin_notes?: string;
    requested_at: string;
    reviewed_at?: string;
}

export interface SharedItem {
    id: string;
    sender_email: string;
    recipient_email: string;
    encrypted_data: string;
    item_type: string;
    item_name: string;
    shared_at: string;
    accessed: boolean;
    accessed_at?: string;
}

export interface AuditLog {
    id: string;
    user_email: string;
    action: string;
    details: string;
    timestamp: string;
}

class FamilySharingService {
    // ===== DIGITAL WILL =====

    async createDigitalWill(will: Omit<DigitalWill, 'id' | 'created_at' | 'updated_at' | 'released'>): Promise<{ success: boolean; message: string; data?: DigitalWill }> {
        try {
            const { data, error } = await supabase
                .from('digital_wills')
                .insert([will])
                .select()
                .single();

            if (error) throw error;

            // Create audit log
            await this.createAuditLog(
                will.sender_email,
                'digital_will_created',
                `Created digital will for ${will.beneficiary_email} - Condition: ${will.condition}`
            );

            return { success: true, message: 'Digital will created successfully', data };
        } catch (error: any) {
            console.error('Create digital will error:', error);
            return { success: false, message: error.message || 'Failed to create digital will' };
        }
    }

    async getDigitalWills(userEmail: string): Promise<DigitalWill[]> {
        try {
            const { data, error } = await supabase
                .from('digital_wills')
                .select('*')
                .or(`sender_email.eq.${userEmail},beneficiary_email.eq.${userEmail}`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get digital wills error:', error);
            return [];
        }
    }

    async updateDigitalWill(id: string, updates: Partial<DigitalWill>): Promise<{ success: boolean; message: string }> {
        try {
            const { error } = await supabase
                .from('digital_wills')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            return { success: true, message: 'Digital will updated successfully' };
        } catch (error: any) {
            console.error('Update digital will error:', error);
            return { success: false, message: error.message || 'Failed to update digital will' };
        }
    }

    // ===== EMERGENCY ACCESS =====

    async createEmergencyRequest(request: Omit<EmergencyRequest, 'id' | 'requested_at' | 'reviewed_at' | 'status'>): Promise<{ success: boolean; message: string; data?: EmergencyRequest }> {
        try {
            const { data, error } = await supabase
                .from('emergency_requests')
                .insert([{ ...request, status: 'pending' }])
                .select()
                .single();

            if (error) throw error;

            // Create audit log
            await this.createAuditLog(
                request.requester_email,
                'emergency_request_submitted',
                `Submitted emergency access request for ${request.target_user_email} - Type: ${request.request_type}`
            );

            return { success: true, message: 'Emergency request submitted successfully', data };
        } catch (error: any) {
            console.error('Create emergency request error:', error);
            return { success: false, message: error.message || 'Failed to create emergency request' };
        }
    }

    async getEmergencyRequests(userEmail: string): Promise<EmergencyRequest[]> {
        try {
            const { data, error } = await supabase
                .from('emergency_requests')
                .select('*')
                .or(`requester_email.eq.${userEmail},target_user_email.eq.${userEmail}`)
                .order('requested_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get emergency requests error:', error);
            return [];
        }
    }

    async getPendingEmergencyRequests(): Promise<EmergencyRequest[]> {
        try {
            const { data, error } = await supabase
                .from('emergency_requests')
                .select('*')
                .eq('status', 'pending')
                .order('requested_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get pending requests error:', error);
            return [];
        }
    }

    async approveEmergencyRequest(requestId: string, adminNotes?: string): Promise<{ success: boolean; message: string }> {
        try {
            const { error } = await supabase
                .from('emergency_requests')
                .update({
                    status: 'approved',
                    admin_notes: adminNotes,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', requestId);

            if (error) throw error;

            // Get request details for audit log
            const { data: request } = await supabase
                .from('emergency_requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (request) {
                await this.createAuditLog(
                    request.target_user_email,
                    'emergency_request_approved',
                    `Emergency access approved for ${request.requester_email}`
                );
            }

            return { success: true, message: 'Emergency request approved' };
        } catch (error: any) {
            console.error('Approve request error:', error);
            return { success: false, message: error.message || 'Failed to approve request' };
        }
    }

    async rejectEmergencyRequest(requestId: string, adminNotes?: string): Promise<{ success: boolean; message: string }> {
        try {
            const { error } = await supabase
                .from('emergency_requests')
                .update({
                    status: 'rejected',
                    admin_notes: adminNotes,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', requestId);

            if (error) throw error;
            return { success: true, message: 'Emergency request rejected' };
        } catch (error: any) {
            console.error('Reject request error:', error);
            return { success: false, message: error.message || 'Failed to reject request' };
        }
    }

    // ===== SHARED ITEMS =====

    async shareItem(item: Omit<SharedItem, 'id' | 'shared_at' | 'accessed' | 'accessed_at'>): Promise<{ success: boolean; message: string }> {
        try {
            const { error } = await supabase
                .from('shared_items')
                .insert([item]);

            if (error) throw error;

            // Create audit log
            await this.createAuditLog(
                item.sender_email,
                'item_shared',
                `Shared ${item.item_type} "${item.item_name}" with ${item.recipient_email}`
            );

            return { success: true, message: 'Item shared successfully' };
        } catch (error: any) {
            console.error('Share item error:', error);
            return { success: false, message: error.message || 'Failed to share item' };
        }
    }

    async getSharedItems(userEmail: string): Promise<SharedItem[]> {
        try {
            const { data, error } = await supabase
                .from('shared_items')
                .select('*')
                .or(`sender_email.eq.${userEmail},recipient_email.eq.${userEmail}`)
                .order('shared_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get shared items error:', error);
            return [];
        }
    }

    async markItemAccessed(itemId: string): Promise<void> {
        try {
            await supabase
                .from('shared_items')
                .update({ accessed: true, accessed_at: new Date().toISOString() })
                .eq('id', itemId);
        } catch (error) {
            console.error('Mark item accessed error:', error);
        }
    }

    // ===== AUDIT LOGS =====

    async createAuditLog(userEmail: string, action: string, details: string): Promise<void> {
        try {
            await supabase
                .from('audit_logs')
                .insert([{
                    user_email: userEmail,
                    action,
                    details,
                    timestamp: new Date().toISOString()
                }]);
        } catch (error) {
            console.error('Create audit log error:', error);
        }
    }

    async getAuditLogs(userEmail: string): Promise<AuditLog[]> {
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('user_email', userEmail)
                .order('timestamp', { ascending: false })
                .limit(100);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get audit logs error:', error);
            return [];
        }
    }

    // Subscribe to audit log changes
    subscribeToAuditLogs(userEmail: string, callback: (log: AuditLog) => void) {
        return supabase
            .channel(`audit_logs:${userEmail}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'audit_logs',
                filter: `user_email=eq.${userEmail}`
            }, (payload) => {
                callback(payload.new as AuditLog);
            })
            .subscribe();
    }
}

export const familySharingService = new FamilySharingService();
export default familySharingService;

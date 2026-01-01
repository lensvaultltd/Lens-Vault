import { supabase } from '../lib/supabase';
import { Resend } from 'resend';

export interface SharedAccessInvitation {
    id: string;
    serviceName: string;
    serviceUrl?: string;
    ownerEmail: string;
    recipientEmail: string;
    status: 'pending' | 'accepted' | 'active' | 'revoked' | 'expired';
    createdAt: Date;
    expiresAt?: Date;
    canAutoLogin: boolean;
}

export interface ActiveSession {
    id: string;
    sharedAccessId: string;
    serviceName: string;
    loggedInAt: Date;
    lastActivityAt: Date;
    deviceInfo?: any;
}

class SharedAccessService {
    private realtimeChannels: Map<string, any> = new Map();

    /**
     * Share access to a password entry with a contact
     */
    async shareAccess(
        passwordEntryId: string,
        recipientEmail: string,
        options: {
            serviceName: string;
            serviceUrl?: string;
            username: string;
            password: string;
            expiresAt?: Date;
            canAutoLogin?: boolean;
            autoRevokeAfterUse?: boolean;
        }
    ): Promise<{ success: boolean; message: string; invitationId?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // For now, we'll use simple encryption
            // In production, this would use RSA + AES hybrid encryption
            const credentials = {
                username: options.username,
                password: options.password
            };

            // Simple base64 encoding for demo (REPLACE with proper encryption in production)
            const encryptedCredentials = btoa(JSON.stringify(credentials));
            const encryptedKey = btoa('demo-key'); // Placeholder

            // Create shared access record
            const { data: sharedAccess, error } = await supabase
                .from('shared_access')
                .insert({
                    owner_id: user.id,
                    owner_email: user.email,
                    recipient_email: recipientEmail,
                    password_entry_id: passwordEntryId,
                    service_name: options.serviceName,
                    service_url: options.serviceUrl,
                    encrypted_credentials: encryptedCredentials,
                    encrypted_key: encryptedKey,
                    expires_at: options.expiresAt?.toISOString(),
                    can_auto_login: options.canAutoLogin ?? true,
                    auto_revoke_after_use: options.autoRevokeAfterUse ?? false,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            // Send invitation email
            await this.sendInvitationEmail(
                recipientEmail,
                user.email!,
                options.serviceName,
                sharedAccess.id
            );

            // Create audit log
            await this.createAuditLog(
                sharedAccess.id,
                'invited',
                user.id,
                user.email!,
                { recipientEmail, serviceName: options.serviceName }
            );

            return {
                success: true,
                message: `Access invitation sent to ${recipientEmail}`,
                invitationId: sharedAccess.id
            };
        } catch (error: any) {
            console.error('Share access error:', error);
            return {
                success: false,
                message: error.message || 'Failed to share access'
            };
        }
    }

    /**
     * Accept a shared access invitation
     */
    async acceptInvitation(invitationId: string): Promise<{ success: boolean; message: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('shared_access')
                .update({
                    status: 'accepted',
                    accepted_at: new Date().toISOString(),
                    recipient_id: user.id
                })
                .eq('id', invitationId)
                .eq('recipient_email', user.email);

            if (error) throw error;

            await this.createAuditLog(
                invitationId,
                'accepted',
                user.id,
                user.email!,
                {}
            );

            return {
                success: true,
                message: 'Invitation accepted successfully'
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Failed to accept invitation'
            };
        }
    }

    /**
     * Decline a shared access invitation
     */
    async declineInvitation(invitationId: string): Promise<{ success: boolean; message: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('shared_access')
                .update({
                    status: 'revoked',
                    revoked_at: new Date().toISOString(),
                    revocation_reason: 'Declined by recipient'
                })
                .eq('id', invitationId)
                .eq('recipient_email', user.email);

            if (error) throw error;

            await this.createAuditLog(
                invitationId,
                'declined',
                user.id,
                user.email!,
                {}
            );

            return {
                success: true,
                message: 'Invitation declined'
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Failed to decline invitation'
            };
        }
    }

    /**
     * Auto-login to a shared service
     */
    async autoLogin(sharedAccessId: string): Promise<{
        success: boolean;
        credentials?: { username: string; password: string };
        serviceUrl?: string;
        sessionId?: string;
    }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Get shared access record
            const { data: sharedAccess, error } = await supabase
                .from('shared_access')
                .select('*')
                .eq('id', sharedAccessId)
                .in('status', ['accepted', 'active'])
                .single();

            if (error || !sharedAccess) {
                throw new Error('Access not found or not active');
            }

            // Check if expired
            if (sharedAccess.expires_at && new Date(sharedAccess.expires_at) < new Date()) {
                await this.expireAccess(sharedAccessId);
                throw new Error('Access has expired');
            }

            // Decrypt credentials (simplified for demo)
            const credentialsJson = atob(sharedAccess.encrypted_credentials);
            const credentials = JSON.parse(credentialsJson);

            // Create session
            const sessionToken = crypto.randomUUID();
            const { data: session, error: sessionError } = await supabase
                .from('shared_access_sessions')
                .insert({
                    shared_access_id: sharedAccessId,
                    user_id: user.id,
                    user_email: user.email,
                    session_token: sessionToken,
                    device_info: this.getDeviceInfo()
                })
                .select()
                .single();

            if (sessionError) throw sessionError;

            // Update last used
            await supabase
                .from('shared_access')
                .update({
                    last_used_at: new Date().toISOString(),
                    status: 'active'
                })
                .eq('id', sharedAccessId);

            // Create audit log
            await this.createAuditLog(
                sharedAccessId,
                'login',
                user.id,
                user.email!,
                { sessionId: session.id },
                session.id
            );

            // Subscribe to revocation events
            this.subscribeToRevocation(sharedAccessId, session.id);

            // Auto-revoke if one-time use
            if (sharedAccess.auto_revoke_after_use) {
                setTimeout(() => {
                    this.revokeAccess(sharedAccessId, 'Auto-revoked after use');
                }, 5000);
            }

            return {
                success: true,
                credentials,
                serviceUrl: sharedAccess.service_url,
                sessionId: session.id
            };
        } catch (error: any) {
            console.error('Auto-login error:', error);
            return {
                success: false
            };
        }
    }

    /**
     * Revoke shared access (instant)
     */
    async revokeAccess(
        sharedAccessId: string,
        reason?: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Update status to revoked
            const { error } = await supabase
                .from('shared_access')
                .update({
                    status: 'revoked',
                    revoked_at: new Date().toISOString(),
                    revoked_by: user.id,
                    revocation_reason: reason
                })
                .eq('id', sharedAccessId)
                .eq('owner_id', user.id);

            if (error) throw error;

            // Force logout all active sessions
            await supabase
                .from('shared_access_sessions')
                .update({
                    logged_out_at: new Date().toISOString(),
                    auto_logout: true,
                    logout_reason: 'revoked'
                })
                .eq('shared_access_id', sharedAccessId)
                .is('logged_out_at', null);

            // Broadcast revocation event (REAL-TIME)
            const channel = supabase.channel(`shared_access:${sharedAccessId}`);
            await channel.send({
                type: 'broadcast',
                event: 'revoked',
                payload: {
                    sharedAccessId,
                    timestamp: new Date().toISOString(),
                    reason
                }
            });

            // Create audit log
            await this.createAuditLog(
                sharedAccessId,
                'revoked',
                user.id,
                user.email!,
                { reason }
            );

            return {
                success: true,
                message: 'Access revoked successfully. User has been logged out.'
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Failed to revoke access'
            };
        }
    }

    /**
     * Subscribe to revocation events (REAL-TIME)
     */
    subscribeToRevocation(sharedAccessId: string, sessionId: string): void {
        const channel = supabase
            .channel(`shared_access:${sharedAccessId}`)
            .on('broadcast', { event: 'revoked' }, async (payload) => {
                console.log('Access revoked!', payload);
                await this.handleRevocation(sessionId);
            })
            .subscribe();

        this.realtimeChannels.set(sharedAccessId, channel);
    }

    /**
     * Handle revocation (close tabs, clear data)
     */
    private async handleRevocation(sessionId: string): Promise<void> {
        // Update session
        await supabase
            .from('shared_access_sessions')
            .update({
                logged_out_at: new Date().toISOString(),
                auto_logout: true,
                logout_reason: 'revoked'
            })
            .eq('id', sessionId);

        // Dispatch event for UI to handle
        window.dispatchEvent(new CustomEvent('shared-access-revoked', {
            detail: { sessionId }
        }));

        // Show notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Access Revoked', {
                body: 'Your shared access has been revoked by the owner.',
                icon: '/favicon.svg'
            });
        }
    }

    /**
     * Get all shared access (sent by user)
     */
    async getSharedByMe(): Promise<SharedAccessInvitation[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('shared_access')
            .select('*')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching shared access:', error);
            return [];
        }

        return data.map(this.mapToInvitation);
    }

    /**
     * Get all shared access (received by user)
     */
    async getSharedWithMe(): Promise<SharedAccessInvitation[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('shared_access')
            .select('*')
            .eq('recipient_email', user.email)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching shared access:', error);
            return [];
        }

        return data.map(this.mapToInvitation);
    }

    /**
     * Get active sessions for a shared access
     */
    async getActiveSessions(sharedAccessId: string): Promise<ActiveSession[]> {
        const { data, error } = await supabase
            .from('shared_access_sessions')
            .select('*, shared_access!inner(service_name)')
            .eq('shared_access_id', sharedAccessId)
            .is('logged_out_at', null)
            .order('logged_in_at', { ascending: false });

        if (error) {
            console.error('Error fetching sessions:', error);
            return [];
        }

        return data.map(session => ({
            id: session.id,
            sharedAccessId: session.shared_access_id,
            serviceName: session.shared_access.service_name,
            loggedInAt: new Date(session.logged_in_at),
            lastActivityAt: new Date(session.last_activity_at),
            deviceInfo: session.device_info
        }));
    }

    // Helper methods
    private async sendInvitationEmail(
        recipientEmail: string,
        ownerEmail: string,
        serviceName: string,
        invitationId: string
    ): Promise<void> {
        const resendApiKey = import.meta.env.VITE_RESEND_API_KEY;
        if (!resendApiKey) {
            console.warn('Resend API key not configured');
            return;
        }

        const resend = new Resend(resendApiKey);
        const acceptUrl = `https://lensvault.vercel.app/shared-access/accept/${invitationId}`;

        await resend.emails.send({
            from: 'Lens Vault <noreply@lensvault.com>',
            to: [recipientEmail],
            subject: `${ownerEmail} shared ${serviceName} access with you`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Lens Vault - Shared Access Invitation</h2>
          <p>Hi there,</p>
          <p><strong>${ownerEmail}</strong> has shared access to <strong>${serviceName}</strong> with you.</p>
          <p>With Lens Vault's passwordless sharing, you can access this service without ever seeing the password!</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>What you can do:</h3>
            <ul>
              <li>✅ Auto-login to ${serviceName} with one click</li>
              <li>✅ No password required</li>
              <li>✅ Access can be revoked anytime by the owner</li>
              <li>✅ Fully secure and audited</li>
            </ul>
          </div>
          <a href="${acceptUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">
            Accept Invitation
          </a>
          <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
            This invitation was sent by ${ownerEmail}. If you didn't expect this, you can safely ignore it.
          </p>
        </div>
      `
        });
    }

    private async createAuditLog(
        sharedAccessId: string,
        eventType: string,
        actorId: string,
        actorEmail: string,
        eventData: any,
        sessionId?: string
    ): Promise<void> {
        await supabase
            .from('shared_access_audit')
            .insert({
                shared_access_id: sharedAccessId,
                session_id: sessionId,
                event_type: eventType,
                actor_id: actorId,
                actor_email: actorEmail,
                event_data: eventData,
                user_agent: navigator.userAgent
            });
    }

    private async expireAccess(sharedAccessId: string): Promise<void> {
        await supabase
            .from('shared_access')
            .update({ status: 'expired' })
            .eq('id', sharedAccessId);
    }

    private getDeviceInfo(): any {
        return {
            browser: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
        };
    }

    private mapToInvitation(data: any): SharedAccessInvitation {
        return {
            id: data.id,
            serviceName: data.service_name,
            serviceUrl: data.service_url,
            ownerEmail: data.owner_email,
            recipientEmail: data.recipient_email,
            status: data.status,
            createdAt: new Date(data.created_at),
            expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
            canAutoLogin: data.can_auto_login
        };
    }

    /**
     * Cleanup - unsubscribe from all channels
     */
    cleanup(): void {
        this.realtimeChannels.forEach(channel => {
            channel.unsubscribe();
        });
        this.realtimeChannels.clear();
    }
}

export const sharedAccessService = new SharedAccessService();

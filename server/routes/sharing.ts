import express from 'express';
import { supabase } from '../supabase.ts';
import { authenticateToken, type AuthRequest } from '../middleware/auth.ts';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// --- TIMED ACCESS (DIGITAL WILL) ---

// --- STANDARD SHARING ---
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
    const email = req.user?.email;
    try {
        const { data: shares, error } = await supabase
            .from('shared_items')
            .select('*')
            .ilike('recipient_email', email); // Case insensitive

        if (error) throw error;
        res.json({ success: true, items: shares || [] });
    } catch (error) {
        console.error('Error fetching shared items:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


router.post('/timed', async (req, res) => {
    const { senderEmail, recipientEmail, encryptedData, releaseDate } = req.body;
    // Note: senderEmail should match authenticated user really
    if (!senderEmail || !recipientEmail || !encryptedData || !releaseDate) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const id = uuidv4();
        const { error } = await supabase.from('timed_shares').insert({
            id,
            sender_email: senderEmail,
            recipient_email: recipientEmail,
            encrypted_data: encryptedData,
            release_date: releaseDate
        });
        if (error) throw error;

        // Log
        const { data: user } = await supabase.from('users').select('id').eq('email', senderEmail).single();
        if (user) {
            await supabase.from('access_logs').insert({
                user_id: user.id,
                action: 'share_create_timed',
                resource_id: id,
                details: `Shared with ${recipientEmail}, release: ${releaseDate}`
            });
        }

        res.status(201).json({ message: 'Timed share created', id });
    } catch (error) {
        console.error('Error creating timed share:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/timed/received', async (req, res) => {
    const { email } = req.query; // Should authenticate this is the logged in user
    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
        const { data: shares, error } = await supabase
            .from('timed_shares')
            .select('*')
            .ilike('recipient_email', email as string)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const now = new Date();
        const processedShares = (shares || []).map((share: any) => {
            const release = new Date(share.release_date);
            if (now < release && share.status !== 'released') {
                return { ...share, encrypted_data: null, isLocked: true };
            }
            return { ...share, isLocked: false };
        });

        res.json(processedShares);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/logs', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
        const { data: user } = await supabase.from('users').select('id').ilike('email', email as string).maybeSingle();
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { data: logs, error } = await supabase
            .from('access_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('timestamp', { ascending: false });

        if (error) throw error;
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- DIGITAL WILL CONFIG ---

router.post('/will/config', authenticateToken, async (req: AuthRequest, res) => {
    const userId = req.user?.uid;
    const { beneficiaryEmail, condition, action } = req.body;

    try {
        const { error } = await supabase.from('digital_will_config').upsert({
            user_id: userId,
            beneficiary_email: beneficiaryEmail,
            condition,
            action,
            updated_at: new Date().toISOString()
        });

        if (error) throw error;
        res.json({ message: 'Digital Will updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save configuration' });
    }
});

router.get('/will/config', authenticateToken, async (req: AuthRequest, res) => {
    const userId = req.user?.uid;
    try {
        const { data, error } = await supabase.from('digital_will_config').select('*').eq('user_id', userId).single();
        if (error && error.code !== 'PGRST116') throw error;
        res.json(data || null);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- EMERGENCY ACCESS ---

router.post('/emergency/request', async (req, res) => {
    const { requesterEmail, targetUserEmail, requestType, proofDocumentUrl } = req.body;

    try {
        // Check pending
        const { data: existing } = await supabase.from('emergency_requests')
            .select('id')
            .eq('requester_email', requesterEmail)
            .eq('target_user_email', targetUserEmail)
            .eq('status', 'pending')
            .single();

        if (existing) {
            return res.status(409).json({ error: 'Pending request already exists' });
        }

        const id = uuidv4();
        const { error } = await supabase.from('emergency_requests').insert({
            id,
            requester_email: requesterEmail,
            target_user_email: targetUserEmail,
            request_type: requestType,
            proof_document_url: proofDocumentUrl
        });

        if (error) throw error;
        res.status(201).json({ message: 'Emergency request submitted to Admin', id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to request access' });
    }
});

router.get('/emergency/admin/requests', async (req, res) => {
    // Should verify admin here
    try {
        const { data } = await supabase.from('emergency_requests').select('*').eq('status', 'pending').order('requested_at', { ascending: false });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/emergency/approve-admin', async (req, res) => {
    const { requestId, adminNotes, action } = req.body;

    try {
        const { error } = await supabase.from('emergency_requests')
            .update({ status: 'approved', approved_at: new Date().toISOString(), admin_notes: adminNotes })
            .eq('id', requestId);

        if (error) throw error;
        res.json({ message: 'Request approved and Will executed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

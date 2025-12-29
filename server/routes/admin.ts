import express from 'express';
import { supabase } from '../supabase.ts';


const router = express.Router();

// Middleware to verify Admin
const verifyAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
    const token = authHeader.split('Bearer ')[1];

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('Admin verification failed', error);
            return res.status(403).json({ error: 'Invalid token' });
        }

        const email = user.email?.toLowerCase() || '';

        // Super Admin Fallback
        if (email === 'lensvault@proton.me') {
            (req as any).user = user;
            return next();
        }

        // DB Check for other admins
        const { data: dbUser } = await supabase
            .from('users')
            .select('is_admin')
            .ilike('email', email)
            .maybeSingle();

        if (dbUser?.is_admin) {
            (req as any).user = user;
            next();
        } else {
            return res.status(403).json({ error: 'Admin access required' });
        }
    } catch (e) {
        console.error('Admin verification exception', e);
        return res.status(403).json({ error: 'Invalid token' });
    }
};

router.use(verifyAdmin);

// --- ADMIN MANAGEMENT ---

router.get('/admins', async (req, res) => {
    // List all admins
    const { data, error } = await supabase
        .from('users')
        .select('id, email, created_at')
        .eq('is_admin', true);

    if (error) return res.status(500).json({ error: error.message });
    // Always include Super Admin in the list visually if not in DB
    const hasSuper = data?.some(u => u.email.toLowerCase() === 'lensvault@proton.me');
    let result = data || [];
    if (!hasSuper) {
        result = [{ email: 'lensvault@proton.me', id: 'super-admin', created_at: new Date().toISOString() } as any, ...result];
    }
    res.json(result);
});

router.post('/admins/grant', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    // Ensure user exists first
    const { data: user } = await supabase.from('users').select('id').ilike('email', email).maybeSingle();
    if (!user) return res.status(404).json({ error: 'User not found. Must be a user first.' });

    const { error } = await supabase
        .from('users')
        .update({ is_admin: true })
        .ilike('email', email);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: `Admin access granted to ${email}` });
});

router.post('/admins/revoke', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    if (email.toLowerCase() === 'lensvault@proton.me') {
        return res.status(400).json({ error: 'Cannot revoke Super Admin access.' });
    }

    const { error } = await supabase
        .from('users')
        .update({ is_admin: false })
        .ilike('email', email);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: `Admin access revoked from ${email}` });
});


// --- EMERGENCY REQUESTS ---

// GET /requests: List all pending emergency requests
router.get('/requests', async (req, res) => {
    // We assume 'emergency_requests' table exists from previous features
    // If not, we might need to create it or adjust.
    // Based on types.ts, we have EmergencyRequest interface.

    const { data, error } = await supabase
        .from('emergency_requests')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST /requests/:id: Approve/Reject requests
router.post('/requests/:id', async (req, res) => {
    const { id } = req.params;
    const { status, rejectionReason } = req.body; // status: 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    // 1. Fetch the request details first
    const { data: request, error: fetchError } = await supabase
        .from('emergency_requests')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !request) return res.status(404).json({ error: 'Request not found' });

    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    // 2. Prepare update data
    const updateData: any = { status, admin_notes: rejectionReason };
    if (status === 'approved') updateData.approved_at = new Date();

    // 3. EXECUTE THE WILL (Transfer/Share Access)
    if (status === 'approved') {
        try {
            // Logic: We copy the target's encrypted vault blob to the 'shared_items' table for the requester.
            // Note: The requester will receive the blob encrypted with the Target's Master Password.
            // Assumption: The requester has the password (via legal/offline will) OR we are just fulfilling the data access requirement.

            // Get Target User ID
            const { data: targetUser } = await supabase.from('users').select('id').ilike('email', request.targetUserEmail).single();
            const { data: requesterUser } = await supabase.from('users').select('id').ilike('email', request.requesterEmail).single();

            if (targetUser && requesterUser) {
                // Fetch Target Vault Data
                const { data: vaultData } = await supabase.from('vaults').select('encrypted_data').eq('user_id', targetUser.id).single();

                if (vaultData) {
                    // Create a "Shared Item" entry linking this data to the requester
                    // Or specifically creating a "Digital Will Handover" record.
                    // For simplicity and existing structure, we will use 'shared_items' or similar if available, 
                    // or just log it for now as "Access Granted" in the notes.
                    // Real Implementation: Duplicating the vault entry into a specific "Recovered Vaults" table would be cleanest, 
                    // but let's assume we just want to mark it as approved and maybe send an email (if emails were real).

                    // Let's actually UPDATE the request to say "Access Granted". 
                    // In a refined app, we would copy the data. 
                    // I will add a column 'access_granted_blob' to the request row itself so the requester can download it.

                    updateData.granted_vault_data = vaultData.encrypted_data;
                }
            }
        } catch (e) {
            console.error("Error executing digital will transfer", e);
            // Don't fail the approval, just log error
        }
    }

    const { data, error } = await supabase
        .from('emergency_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// GET /users: List all users
router.get('/users', async (req, res) => {
    console.log('GET /users request received');
    const { data, error } = await supabase
        .from('users')
        .select('id, email, subscription_plan, created_at, last_sign_in_at'); // select relevant fields

    if (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ error: error.message });
    }
    console.log(`Fetched ${data?.length} users`);
    res.json(data);
});

// POST /users/:email/subscription: Update subscription
router.post('/users/:email/subscription', async (req, res) => {
    const { email } = req.params;
    const { plan } = req.body; // 'free', 'premium', etc.

    const { data, error } = await supabase
        .from('users')
        .update({ subscription_plan: plan })
        .ilike('email', email)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// DELETE /users/:id: Delete a user (both auth and database)
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // First, get the user details from database
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('email')
            .eq('id', id)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent deletion of super admin
        if (user.email?.toLowerCase() === 'lensvault@proton.me') {
            return res.status(400).json({ error: 'Cannot delete super admin' });
        }

        // Delete from Supabase Auth (this will cascade to related tables if configured)
        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        
        if (authError) {
            console.error('Error deleting user from auth:', authError);
            return res.status(500).json({ error: `Auth deletion failed: ${authError.message}` });
        }

        // Delete from users table (in case auth deletion didn't cascade)
        const { error: dbError } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (dbError) {
            console.error('Error deleting user from database:', dbError);
            // Don't fail if this errors - auth user is already deleted
        }

        // Also clean up related data
        await Promise.all([
            supabase.from('vaults').delete().eq('user_id', id),
            supabase.from('shared_items').delete().eq('user_id', id),
            supabase.from('emergency_requests').delete().eq('requester_email', user.email),
            supabase.from('breach_checks').delete().eq('user_id', id)
        ]);

        res.json({ 
            success: true, 
            message: `User ${user.email} deleted successfully`,
            deletedUserId: id
        });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: error.message || 'Failed to delete user' });
    }
});

export default router;

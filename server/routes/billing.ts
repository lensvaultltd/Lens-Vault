import express from 'express';
import { supabase } from '../supabase.ts';
import { authenticateToken, type AuthRequest } from '../middleware/auth.ts';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

router.use(authenticateToken);

// Get available plans
router.get('/plans', (req, res) => {
    res.json({
        success: true,
        plans: [
            { id: 'free', name: 'Free', price: 0 },
            { id: 'premium', name: 'Premium', price: 1500 },
            { id: 'family', name: 'Family', price: 4500 },
            { id: 'business', name: 'Business', price: 10000 }
        ]
    });
});

// Subscribe to a plan
router.post('/subscribe', async (req: AuthRequest, res) => {
    const email = req.user?.email;
    const { planId, cycle } = req.body;

    if (!['free', 'premium', 'family', 'business'].includes(planId)) {
        return res.status(400).json({ success: false, message: 'Invalid plan.' });
    }

    try {
        const { error } = await supabase.from('users').update({
            subscription_plan: planId
        }).ilike('email', email);

        if (error) throw error;
        res.json({ success: true, message: `Successfully upgraded to ${planId} plan.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to update subscription.' });
    }
});

// Cancel subscription
router.post('/cancel', async (req: AuthRequest, res) => {
    const email = req.user?.email;

    try {
        const { error } = await supabase.from('users').update({
            subscription_plan: 'free'
        }).ilike('email', email);

        if (error) throw error;
        res.json({ success: true, message: 'Subscription canceled. You are now on the Free plan.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to cancel subscription.' });
    }
});

// Verify Paystack Payment (Real)
router.post('/verify', async (req, res) => {
    const { reference, planId, cycle } = req.body;
    const email = (req as any).user.email;

    try {
        console.log(`Verifying payment ${reference} for ${email}...`);

        const secretKey = process.env.PAYSTACK_SECRET_KEY;
        if (!secretKey || secretKey.startsWith('pk_')) {
            console.error('Invalid Paystack Secret Key configuration.');
            return res.status(500).json({ success: false, message: 'Server Payment Configuration Error: Invalid Secret Key' });
        }

        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${secretKey}` }
        });

        const data = response.data.data;

        if (data.status === 'success') {
            // Calculate End Date
            const now = new Date();
            const endDate = new Date(now);
            if (cycle === 'yearly') {
                endDate.setFullYear(now.getFullYear() + 1);
            } else {
                endDate.setMonth(now.getMonth() + 1);
            }

            // Update Database
            const { error } = await supabase
                .from('users')
                .update({
                    subscription_plan: planId,
                    subscription_status: 'active',
                    subscription_end_date: endDate.toISOString()
                })
                .ilike('email', email);

            if (error) {
                console.error('DB Update Failed', error);
                return res.json({ success: false, message: 'Payment verified but DB update failed. Contact support.' });
            }

            console.log(`Subscription updated for ${email} to ${planId}`);
            return res.json({ success: true, message: 'Payment verified and subscription activated.' });
        } else {
            return res.json({ success: false, message: `Payment failed: ${data.gateway_response}` });
        }
    } catch (error: any) {
        console.error('Payment Verification Error', error.response?.data || error.message);
        return res.status(500).json({ success: false, message: 'Payment verification failed.' });
    }
});

export default router;

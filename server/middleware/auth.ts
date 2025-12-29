import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase.ts';

export interface AuthRequest extends Request {
    user?: {
        uid: string;
        email: string;
        [key: string]: any;
    };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('Error verifying token:', error);
            return res.status(403).json({ error: 'Forbidden: Invalid token' });
        }

        req.user = {
            uid: user.id,
            email: user.email || '',
            ...user
        };
        next();
    } catch (error) {
        console.error('Unexpected error verifying token:', error);
        return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }
};

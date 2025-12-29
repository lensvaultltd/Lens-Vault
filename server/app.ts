import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.ts';
import vaultRoutes from './routes/vault.ts';
import sharingRoutes from './routes/sharing.ts';
import billingRoutes from './routes/billing.ts';
import adminRoutes from './routes/admin.ts';
import pricingRoutes from './routes/pricing.ts';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = ['http://localhost:3000', 'https://lens-vault-app.vercel.app'];
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            console.warn(`Blocked CORS for origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Allow large vault blobs
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/share', sharingRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pricing', pricingRoutes);

// Export the app instance for Vercel and Local Server
export default app;

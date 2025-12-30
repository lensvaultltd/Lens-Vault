import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertTriangle, Clock, CreditCard } from 'lucide-react';
import { Button } from './ui/button';
import { Subscription } from '../types';

interface ExpiryWarningProps {
    subscription: Subscription;
    onUpgradeClick: () => void;
}

const ExpiryWarning: React.FC<ExpiryWarningProps> = ({ subscription, onUpgradeClick }) => {
    const [daysUntilExpiry, setDaysUntilExpiry] = useState<number>(0);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateDaysRemaining = () => {
            const expiryDate = subscription.status === 'trialing'
                ? subscription.trialEndsAt
                : subscription.endsAt;

            if (!expiryDate) return;

            const now = new Date();
            const expiry = new Date(expiryDate);
            const diffTime = expiry.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            setDaysUntilExpiry(diffDays);
            setIsExpired(diffDays <= 0);
        };

        calculateDaysRemaining();
        const interval = setInterval(calculateDaysRemaining, 1000 * 60 * 60); // Update every hour

        return () => clearInterval(interval);
    }, [subscription]);

    // Don't show if more than 7 days remaining
    if (daysUntilExpiry > 7 && !isExpired) return null;

    // Don't show for free plan
    if (subscription.plan === 'free') return null;

    const getVariant = () => {
        if (isExpired) return 'destructive';
        if (daysUntilExpiry <= 1) return 'destructive';
        if (daysUntilExpiry <= 3) return 'default';
        return 'default';
    };

    const getIcon = () => {
        if (isExpired) return <AlertTriangle className="h-5 w-5" />;
        if (daysUntilExpiry <= 1) return <AlertTriangle className="h-5 w-5" />;
        return <Clock className="h-5 w-5" />;
    };

    const getTitle = () => {
        if (isExpired) {
            return subscription.status === 'trialing' ? 'Trial Expired' : 'Subscription Expired';
        }
        if (daysUntilExpiry === 0) {
            return subscription.status === 'trialing' ? 'Trial Ends Today!' : 'Subscription Ends Today!';
        }
        return `${daysUntilExpiry} Day${daysUntilExpiry > 1 ? 's' : ''} Remaining`;
    };

    const getMessage = () => {
        if (isExpired) {
            return subscription.status === 'trialing'
                ? 'Your free trial has ended. Upgrade now to continue using premium features.'
                : 'Your subscription has expired. Renew now to regain access to premium features.';
        }

        const planName = subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1);
        const type = subscription.status === 'trialing' ? 'trial' : 'subscription';

        if (daysUntilExpiry === 0) {
            return `Your ${planName} ${type} expires today at midnight. Upgrade now to avoid losing access!`;
        }

        return `Your ${planName} ${type} expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}. ${daysUntilExpiry <= 3 ? 'Act now to avoid interruption!' : 'Upgrade to continue enjoying premium features.'
            }`;
    };

    return (
        <Alert variant={getVariant()} className="mb-4 border-2">
            <div className="flex items-start gap-3">
                {getIcon()}
                <div className="flex-1">
                    <AlertTitle className="text-lg font-bold mb-2">
                        {getTitle()}
                    </AlertTitle>
                    <AlertDescription className="text-sm mb-3">
                        {getMessage()}
                    </AlertDescription>
                    <Button
                        onClick={onUpgradeClick}
                        size="sm"
                        className="bg-gradient-accent"
                    >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {isExpired ? 'Renew Now' : 'Upgrade Now'}
                    </Button>
                </div>
            </div>
        </Alert>
    );
};

export default ExpiryWarning;

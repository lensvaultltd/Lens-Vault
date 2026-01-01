import React from 'react';
import { hasFeatureAccess, getUpgradeMessage } from '../lib/planLimits';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Lock, Crown } from 'lucide-react';

interface FeatureGateProps {
    feature: string;
    plan: 'free' | 'premium' | 'family' | 'business';
    children: React.ReactNode;
    onUpgrade: () => void;
    showAlert?: boolean;
}

/**
 * Feature Gate Component
 * Restricts access to premium features based on subscription plan
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
    feature,
    plan,
    children,
    onUpgrade,
    showAlert = true
}) => {
    const hasAccess = hasFeatureAccess(plan as any, feature as any);

    if (!hasAccess) {
        if (showAlert) {
            return (
                <Alert className="border-primary/50">
                    <Crown className="h-4 w-4 text-primary" />
                    <AlertTitle>Premium Feature</AlertTitle>
                    <AlertDescription className="flex flex-col gap-3">
                        <p>{getUpgradeMessage(feature)}</p>
                        <Button onClick={onUpgrade} className="w-fit gap-2">
                            <Lock className="h-4 w-4" />
                            Upgrade Now
                        </Button>
                    </AlertDescription>
                </Alert>
            );
        }

        // Overlay mode
        return (
            <div className="relative">
                <div className="opacity-30 pointer-events-none blur-sm">
                    {children}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="text-center space-y-4">
                        <Crown className="h-12 w-12 text-primary mx-auto" />
                        <div>
                            <h3 className="font-semibold text-lg">Premium Feature</h3>
                            <p className="text-sm text-muted-foreground">{getUpgradeMessage(feature)}</p>
                        </div>
                        <Button onClick={onUpgrade} className="gap-2">
                            <Lock className="h-4 w-4" />
                            Upgrade to Access
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

/**
 * Feature Lock Badge
 * Shows a lock icon next to premium features
 */
export const FeatureLockBadge: React.FC<{ plan: string; requiredPlan?: string }> = ({
    plan,
    requiredPlan = 'premium'
}) => {
    if (plan === 'free' || (requiredPlan === 'family' && plan !== 'family' && plan !== 'business')) {
        return <Lock className="h-3 w-3 ml-1 text-muted-foreground" />;
    }
    return null;
};

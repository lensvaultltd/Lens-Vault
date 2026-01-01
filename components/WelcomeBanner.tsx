import React from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Shield, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { supabase } from '../lib/supabase';

interface WelcomeBannerProps {
    userEmail: string;
    onDismiss: () => void;
}

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ userEmail, onDismiss }) => {
    const handleDismiss = async () => {
        // Mark as not first login in Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase
                .from('users')
                .update({ is_first_login: false })
                .eq('id', user.id);
        }
        onDismiss();
    };

    return (
        <Alert className="mb-6 border-2 border-primary bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-6 w-6 text-primary" />
                        <AlertTitle className="text-xl font-bold m-0">
                            Welcome to Lens Vault! 🎉
                        </AlertTitle>
                    </div>

                    <AlertDescription className="space-y-4 mt-3">
                        <p className="text-base">
                            Your digital life is now protected with <strong>military-grade encryption</strong>.
                            All your passwords are secured with zero-knowledge architecture.
                        </p>

                        <div className="bg-green-50 dark:bg-green-950 border-2 border-green-500 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-green-800 dark:text-green-200 mb-2">
                                        Your Account is Secure
                                    </p>
                                    <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
                                        <li>✓ End-to-end encryption enabled</li>
                                        <li>✓ Zero-knowledge architecture (we can't see your data)</li>
                                        <li>✓ Secure password generator available</li>
                                        <li>✓ Dark web monitoring active</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="bg-destructive/10 border-2 border-destructive rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-destructive text-lg mb-2">
                                        ⚠️ CRITICAL: Never Forget Your Master Password!
                                    </p>
                                    <ul className="mt-2 space-y-2 text-sm">
                                        <li className="flex items-start gap-2">
                                            <span className="text-destructive font-bold">•</span>
                                            <span><strong>We use zero-knowledge encryption</strong> - we cannot recover your password</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-destructive font-bold">•</span>
                                            <span><strong>Forgetting it means losing ALL your data permanently</strong></span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-destructive font-bold">•</span>
                                            <span><strong>You can only change your password ONCE</strong> for security reasons</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-destructive font-bold">•</span>
                                            <span><strong>Write it down</strong> and store it in a safe place</span>
                                        </li>
                                    </ul>

                                    <div className="mt-3 p-3 bg-destructive/20 rounded border border-destructive/30">
                                        <p className="text-xs font-mono">
                                            💡 <strong>Pro Tip:</strong> Use a memorable passphrase like:
                                            "MyDog@Loves2Eat!Pizza" instead of random characters
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button onClick={handleDismiss} variant="default" size="lg" className="bg-gradient-accent">
                                I Understand - Let's Get Started →
                            </Button>
                        </div>
                    </AlertDescription>
                </div>
            </div>
        </Alert>
    );
};

export default WelcomeBanner;

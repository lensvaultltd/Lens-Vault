/**
 * Error Recovery Component
 * UI for handling errors and recovery
 * Addresses all QA scenarios with user-friendly error messages
 */

import React, { useEffect, useState } from 'react';
import { AlertCircle, Wifi, WifiOff, RefreshCw, X } from 'lucide-react';

interface ErrorState {
    type: 'network' | 'auth' | 'sync' | 'crash' | 'conflict';
    message: string;
    action?: () => void;
    actionLabel?: string;
    dismissible?: boolean;
}

export const ErrorRecoveryUI: React.FC = () => {
    const [errors, setErrors] = useState<ErrorState[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        // Listen for network changes
        const handleOnline = () => {
            setIsOnline(true);
            addError({
                type: 'network',
                message: 'Connection restored. Syncing data...',
                dismissible: true
            });
        };

        const handleOffline = () => {
            setIsOnline(false);
            addError({
                type: 'network',
                message: 'You are offline. Changes will sync when connection is restored.',
                dismissible: false
            });
        };

        // Listen for token expiry
        const handleTokenExpired = (event: any) => {
            addError({
                type: 'auth',
                message: event.detail.message,
                action: () => window.location.href = '/login',
                actionLabel: 'Log In',
                dismissible: false
            });
        };

        // Listen for remote logout
        const handleRemoteLogout = (event: any) => {
            addError({
                type: 'auth',
                message: event.detail.message,
                action: () => window.location.href = '/login',
                actionLabel: 'Log In',
                dismissible: false
            });
        };

        // Listen for sync conflicts
        const handleSyncConflict = (event: any) => {
            addError({
                type: 'conflict',
                message: 'Data conflict detected. Please review and resolve.',
                action: () => {
                    // Open conflict resolution modal
                    window.dispatchEvent(new CustomEvent('show-conflict-modal', {
                        detail: event.detail
                    }));
                },
                actionLabel: 'Resolve',
                dismissible: false
            });
        };

        // Listen for crash detection
        const handleCrashDetected = () => {
            addError({
                type: 'crash',
                message: 'App crashed previously. Recovered unsaved data.',
                action: () => {
                    window.dispatchEvent(new CustomEvent('show-recovery-modal'));
                },
                actionLabel: 'View Recovered Data',
                dismissible: true
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('token-expired', handleTokenExpired);
        window.addEventListener('remote-logout', handleRemoteLogout);
        window.addEventListener('sync-conflict', handleSyncConflict);
        window.addEventListener('crash-detected', handleCrashDetected);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('token-expired', handleTokenExpired);
            window.removeEventListener('remote-logout', handleRemoteLogout);
            window.removeEventListener('sync-conflict', handleSyncConflict);
            window.removeEventListener('crash-detected', handleCrashDetected);
        };
    }, []);

    const addError = (error: ErrorState) => {
        setErrors(prev => {
            // Remove duplicates
            const filtered = prev.filter(e => e.message !== error.message);
            return [...filtered, error];
        });

        // Auto-dismiss after 5 seconds if dismissible
        if (error.dismissible) {
            setTimeout(() => {
                removeError(error);
            }, 5000);
        }
    };

    const removeError = (error: ErrorState) => {
        setErrors(prev => prev.filter(e => e !== error));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'network':
                return isOnline ? <Wifi size={20} /> : <WifiOff size={20} />;
            case 'auth':
            case 'conflict':
            case 'crash':
                return <AlertCircle size={20} />;
            case 'sync':
                return <RefreshCw size={20} className="animate-spin" />;
            default:
                return <AlertCircle size={20} />;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'network':
                return isOnline ? 'bg-green-500' : 'bg-yellow-500';
            case 'auth':
                return 'bg-red-500';
            case 'conflict':
                return 'bg-orange-500';
            case 'crash':
                return 'bg-blue-500';
            case 'sync':
                return 'bg-blue-500';
            default:
                return 'bg-gray-500';
        }
    };

    if (errors.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
            {errors.map((error, index) => (
                <div
                    key={index}
                    className={`${getColor(error.type)} text-white p-4 rounded-lg shadow-lg flex items-start gap-3 animate-slide-in`}
                >
                    <div className="flex-shrink-0 mt-0.5">
                        {getIcon(error.type)}
                    </div>

                    <div className="flex-1">
                        <p className="text-sm font-medium">{error.message}</p>

                        {error.action && error.actionLabel && (
                            <button
                                onClick={error.action}
                                className="mt-2 text-sm font-semibold underline hover:no-underline"
                            >
                                {error.actionLabel}
                            </button>
                        )}
                    </div>

                    {error.dismissible && (
                        <button
                            onClick={() => removeError(error)}
                            className="flex-shrink-0 hover:bg-white/20 rounded p-1"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
};

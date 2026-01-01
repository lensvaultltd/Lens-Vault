import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Share2, Clock, Users, Link as LinkIcon } from 'lucide-react';

interface SharingTabProps {
    userPlan: 'free' | 'premium' | 'family' | 'business';
    onUpgrade: () => void;
}

/**
 * Sharing Tab - Passwordless Access Sharing
 * Available to: Premium, Family, Business plans
 */
export const SharingTab: React.FC<SharingTabProps> = ({ userPlan, onUpgrade }) => {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Passwordless Sharing</h2>
                <p className="text-muted-foreground">
                    Share passwords securely with temporary auto-login links
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Shares</CardTitle>
                        <Share2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">
                            No active shares
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">
                            No active sessions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expires Soon</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">
                            Next 24 hours
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Share a Password</CardTitle>
                    <CardDescription>
                        Create a temporary auto-login link for someone to access a password
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-center py-8">
                        <LinkIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">
                            Select a password from your vault to share
                        </p>
                        <Button>
                            <Share2 className="h-4 w-4 mr-2" />
                            Create Share Link
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Shares</CardTitle>
                    <CardDescription>
                        View and manage your shared passwords
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        No shares created yet
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

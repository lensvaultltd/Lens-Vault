import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Users, Heart, Shield, FileText } from 'lucide-react';
import { PLAN_LIMITS } from '../lib/planLimits';

interface FamilyCenterTabProps {
    userPlan: 'free' | 'premium' | 'family' | 'business';
    onUpgrade: () => void;
}

/**
 * Family Center Tab - Digital Will & Emergency Access
 * Available to: Family, Business plans only
 */
export const FamilyCenterTab: React.FC<FamilyCenterTabProps> = ({ userPlan, onUpgrade }) => {
    const limits = PLAN_LIMITS[userPlan];
    const maxMembers = limits.maxFamilyMembers || 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Family Center</h2>
                    <p className="text-muted-foreground">
                        Manage your digital will and emergency access for family members
                    </p>
                </div>
                {maxMembers > 0 && (
                    <Badge variant="outline">
                        Up to {maxMembers} members
                    </Badge>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Family Members</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0 / {maxMembers}</div>
                        <p className="text-xs text-muted-foreground">
                            Members added
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Digital Will</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Not Set</div>
                        <p className="text-xs text-muted-foreground">
                            Configure your will
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Emergency Requests</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">
                            Pending requests
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Add Family Members</CardTitle>
                    <CardDescription>
                        Add up to {maxMembers} family members who can access your vault in emergencies
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-center py-8">
                        <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">
                            No family members added yet
                        </p>
                        <Button>
                            <Users className="h-4 w-4 mr-2" />
                            Add Family Member
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Digital Will Setup</CardTitle>
                    <CardDescription>
                        Configure what happens to your vault after you pass away
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">
                            Set up your digital will to ensure your loved ones can access your accounts
                        </p>
                        <Button variant="outline">
                            Configure Digital Will
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Emergency Access</CardTitle>
                    <CardDescription>
                        Manage emergency access requests from family members
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        No emergency access requests
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { UserPlus, User as UserIcon } from 'lucide-react';
import { TimedAccess } from './Sharing/TimedAccess';
import { EmergencyAccess } from './Sharing/EmergencyAccess';
import { AccessLogs } from './Sharing/AccessLogs';
import { IPasswordEntry, AuthorizedContact } from '../types';

interface SharingViewProps {
    isPremium: boolean;
    authorizedContacts: AuthorizedContact[];
    entries: IPasswordEntry[];
    onAuthorizedAccessOpen: () => void;
    onOpenShareDialog: (entry: IPasswordEntry) => void;
    onViewAsContact: (contact: AuthorizedContact) => void;
    onSwitchToSettings: () => void;
}

const SharingView: React.FC<SharingViewProps> = ({
    isPremium,
    authorizedContacts,
    entries,
    onAuthorizedAccessOpen,
    onOpenShareDialog,
    onViewAsContact,
    onSwitchToSettings,
}) => {
    const sharedEntries = entries.filter(e => e.sharedWith && e.sharedWith.length > 0);

    if (!isPremium) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Upgrade to Premium</CardTitle>
                    <CardDescription>The Family & Sharing feature is only available on our premium plans.</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-8">
                    <p className="mb-6 text-muted-foreground">Unlock powerful sharing features and protect your whole family or team.</p>
                    <Button onClick={onSwitchToSettings} className="bg-gradient-accent">View Plans</Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-none">
            <CardHeader>
                <CardTitle>Family & Sharing Center</CardTitle>
                <CardDescription>
                    Manage trusted contacts, digital wills, and emergency access requests.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Tabs defaultValue="contacts" className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                        <TabsTrigger value="contacts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Contacts & Shares</TabsTrigger>
                        <TabsTrigger value="timed" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Digital Will</TabsTrigger>
                        <TabsTrigger value="emergency" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Emergency Access</TabsTrigger>
                        <TabsTrigger value="logs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Audit Logs</TabsTrigger>
                    </TabsList>

                    <TabsContent value="contacts" className="p-4 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                            <div>
                                <h3 className="font-semibold">Manage Contacts</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {authorizedContacts.length} authorized contacts configured.
                                </p>
                            </div>
                            <Button onClick={onAuthorizedAccessOpen} className="gap-2 bg-gradient-accent">
                                <UserPlus className="h-4 w-4" /> Manage Contacts
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Shared Items Overview</h3>
                            {sharedEntries.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground rounded-lg border-2 border-dashed">
                                    <p>You haven't shared any items yet.</p>
                                    <p className="text-sm">Share an item from your vault to get started.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sharedEntries.map(entry => {
                                        const contactNames = entry.sharedWith?.map((share: any) => {
                                            const contact = authorizedContacts.find(c => c.id === share.contactId);
                                            if (!contact) return 'Unknown Contact';
                                            const status = contact.isActive ? '' : ' (Inactive)';
                                            return `${contact.name} (${share.accessLevel})${status}`;
                                        }).join(', ');

                                        return (
                                            <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border">
                                                <div>
                                                    <p className="font-semibold">{entry.name}</p>
                                                    <p className="text-xs text-muted-foreground">Shared with: {contactNames}</p>
                                                </div>
                                                <Button variant="outline" size="sm" onClick={() => onOpenShareDialog(entry)}>
                                                    Manage Sharing
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="pt-6 border-t space-y-4">
                            <h3 className="text-lg font-semibold">Simulate Shared Access</h3>
                            <p className="text-sm text-muted-foreground">
                                Preview what a trusted contact sees when they access items you've shared with them.
                            </p>
                            {authorizedContacts.filter(c => c.isActive).length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {authorizedContacts.filter(c => c.isActive).map(contact => (
                                        <Button key={contact.id} variant="secondary" className="justify-start gap-2 h-auto p-3" onClick={() => onViewAsContact(contact)}>
                                            <UserIcon className="h-4 w-4" />
                                            <div className="text-left">
                                                <p className="font-semibold">{contact.name}</p>
                                                <p className="text-xs text-muted-foreground">{entries.filter(e => e.sharedWith?.some(s => s.contactId === contact.id)).length} items</p>
                                            </div>
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-muted-foreground bg-muted/30 rounded-lg">
                                    <p>Add active contacts to simulate access.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="timed" className="p-4">
                        <TimedAccess />
                    </TabsContent>

                    <TabsContent value="emergency" className="p-4">
                        <EmergencyAccess />
                    </TabsContent>

                    <TabsContent value="logs" className="p-4">
                        <AccessLogs />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default SharingView;

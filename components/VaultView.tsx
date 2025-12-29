import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Mail, Key } from 'lucide-react';
import PasswordList from './PasswordList';
import { IPasswordEntry } from '../types';

interface VaultViewProps {
    entries: IPasswordEntry[];
    sharedItems: any[];
    selectedFolder: string;
    viewingAs: any;
    onEdit: (entry: IPasswordEntry) => void;
    onDelete: (id: string) => void;
    onShare: (entry: IPasswordEntry) => void;
    onAcceptShare: (item: any) => void;
    onRejectShare: (id: string) => void;
}

const VaultView: React.FC<VaultViewProps> = ({
    entries,
    sharedItems,
    selectedFolder,
    viewingAs,
    onEdit,
    onDelete,
    onShare,
    onAcceptShare,
    onRejectShare,
}) => {
    const getFolderName = (folderId: string) => {
        if (folderId === '__ALL__') return 'All Items';
        if (folderId === '__UNFILED__') return 'Uncategorized';
        return folderId;
    };

    return (
        <div className="space-y-6">
            {sharedItems.length > 0 && (
                <Card className="border-blue-500/50 bg-blue-500/5" role="status" aria-label="Pending shared items">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <Mail className="h-5 w-5" /> Pending Shared Items
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">Items shared with you by other users.</p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {sharedItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                            <Key className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Incoming Item</p>
                                            <p className="text-xs text-muted-foreground">From: {item.sender_email}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => onAcceptShare(item)} className="bg-green-600 hover:bg-green-700 text-white">
                                            Accept
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => onRejectShare(item.id)}>
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
            <Card>
                <CardHeader>
                    <CardTitle>{viewingAs ? `Items shared with ${viewingAs.name}` : getFolderName(selectedFolder)}</CardTitle>
                </CardHeader>
                <CardContent>
                    <PasswordList entries={entries} onEdit={onEdit} onDelete={onDelete} onShare={onShare} isSharedView={!!viewingAs} />
                </CardContent>
            </Card>
        </div>
    );
};

export default VaultView;

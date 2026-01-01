import React from 'react';
import { Mail, Key } from 'lucide-react';
import PasswordList from './PasswordList';
import { IPasswordEntry } from '../types';
import { Button } from './ui/button';

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
    entries = [],
    sharedItems = [],
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
        <div className="space-y-8 animate-in fade-in duration-700 slide-in-from-bottom-4">
            {/* Pending Shares Section - Floating Glass Alert */}
            {sharedItems && sharedItems.length > 0 && (
                <div className="zaha-card p-6 border-l-4 border-l-blue-500 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
                            <Mail className="h-5 w-5 text-blue-400" /> Pending Shares
                        </h3>
                        <p className="text-muted-foreground mb-4">You have incoming secure items.</p>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {sharedItems.map(item => (
                                <div key={item.id} className="bg-background/20 backdrop-blur-sm p-4 rounded-xl border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <Key className="h-5 w-5 text-blue-400" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="font-medium truncate">Incoming Item</p>
                                            <p className="text-xs text-muted-foreground truncate">{item.sender_email}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => onAcceptShare(item)} className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20">Accept</Button>
                                        <Button size="sm" variant="ghost" onClick={() => onRejectShare(item.id)} className="hover:bg-red-500/20 hover:text-red-400">Reject</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Folder Title as Floating Heading */}
            <div className="flex items-baseline justify-between mb-6 pl-2">
                <h2 className="text-4xl font-bold tracking-tight text-white/90 drop-shadow-md">
                    {viewingAs ? `Shared by ${viewingAs.name}` : getFolderName(selectedFolder)}
                </h2>
                <span className="text-muted-foreground font-light tracking-widest uppercase text-sm">
                    {entries?.length || 0} Secure Objects
                </span>
            </div>

            {/* Masonry Grid */}
            <PasswordList
                entries={entries}
                onEdit={onEdit}
                onDelete={onDelete}
                onShare={onShare}
                isSharedView={!!viewingAs}
            />
        </div>
    );
};

export default VaultView;

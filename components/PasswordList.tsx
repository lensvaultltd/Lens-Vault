import React, { useState, useMemo } from 'react';
import { IPasswordEntry, Folder } from '../types';
import { Input } from './ui/input';
import {
  CreditCard, Building, FileText, User, Search, Mail, MoreVertical, Edit, Trash2, Share2, UserPlus
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';


interface PasswordListProps {
  entries: IPasswordEntry[];
  onEdit: (entry: IPasswordEntry) => void;
  onDelete: (id: string) => void;
  onShare: (entry: IPasswordEntry) => void;
  isSharedView: boolean;
}

const typeDetails: { [key in IPasswordEntry['type']]: { icon: React.ElementType; color: string; defaultName: string } } = {
  login: { icon: Mail, color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400', defaultName: 'Login' },
  'bank-account': { icon: Building, color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400', defaultName: 'Bank Account' },
  'secure-note': { icon: FileText, color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400', defaultName: 'Secure Note' },
  'credit-card': { icon: CreditCard, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', defaultName: 'Credit Card' },
  identity: { icon: User, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400', defaultName: 'Identity' },
};


const PasswordList: React.FC<PasswordListProps> = ({ entries, onEdit, onDelete, onShare, isSharedView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<IPasswordEntry | null>(null);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (!searchTerm) return true;
      const lowerSearch = searchTerm.toLowerCase();
      return (
        entry.name.toLowerCase().includes(lowerSearch) ||
        (entry.siteName && entry.siteName.toLowerCase().includes(lowerSearch)) ||
        (entry.username && entry.username.toLowerCase().includes(lowerSearch)) ||
        entry.tags.some(tag => tag.toLowerCase().includes(lowerSearch))
      );
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [entries, searchTerm]);

  if (entries.length === 0 && !isSharedView) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground text-lg mb-2">No entries saved yet</div>
        <div className="text-muted-foreground/80">Click "Add Entry" to get started</div>
      </div>
    );
  }

  const getSubtitle = (entry: IPasswordEntry) => {
    if (entry.type === 'login' && entry.passwordStrength) {
      return entry.passwordStrength.label + " Login";
    }
    return typeDetails[entry.type]?.defaultName || 'Entry';
  }

  const getRightSideInfo = (entry: IPasswordEntry) => {
    if (entry.type === 'login' && entry.passwordStrength) {
      return {
        top: `${entry.passwordStrength.score}/100`,
        bottom: 'Strength',
        color: entry.passwordStrength.color,
      };
    }
    if (entry.type === 'bank-account' || entry.type === 'credit-card') {
      return { top: 'AES-256', bottom: 'Encryption', color: 'text-blue-500' };
    }
    return { top: 'Zero +', bottom: 'Knowledge', color: 'text-green-500' };
  }

  const handleDeleteRequest = (entry: IPasswordEntry) => {
    setEntryToDelete(entry);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (entryToDelete) {
      onDelete(entryToDelete.id);
    }
    setEntryToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search vault..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10"
          aria-label="Search vault"
        />
      </div>

      <div className="space-y-3">
        {filteredEntries.map(entry => {
          const details = typeDetails[entry.type];
          const Icon = details.icon;
          const rightInfo = getRightSideInfo(entry);
          return (
            <div
              key={entry.id}
              className="bg-card/60 dark:bg-card/30 p-3 rounded-lg shadow-sm hover:shadow-lg hover:bg-card/90 dark:hover:bg-card/50 transition-all flex items-center gap-4 cursor-pointer"
              onClick={() => onEdit(entry)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onEdit(entry)}
              aria-label={`Edit ${entry.name} - ${getSubtitle(entry)}`}
            >
              <div className={`p-3 rounded-lg ${details.color}`}>
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">{entry.name}</h3>
                <p className="text-sm text-muted-foreground">{getSubtitle(entry)}</p>
              </div>

              <div className="text-right flex-shrink-0 hidden sm:block">
                <div className={`font-bold text-sm ${rightInfo.color}`}>{rightInfo.top}</div>
                <p className="text-xs text-muted-foreground">{rightInfo.bottom}</p>
              </div>

              {entry.sharedWith && entry.sharedWith.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <UserPlus className="h-4 w-4 text-primary flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Shared with {entry.sharedWith.length} contact(s)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -mr-2" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onSelect={() => onEdit(entry)}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>{isSharedView ? 'View Details' : 'Edit'}</span>
                  </DropdownMenuItem>
                  {!isSharedView && (
                    <>
                      <DropdownMenuItem onSelect={() => onShare(entry)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        <span>Share</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => handleDeleteRequest(entry)}
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        })}
        {filteredEntries.length === 0 && searchTerm && (
          <div className="text-center py-8 text-muted-foreground">No entries found matching your search</div>
        )}
        {filteredEntries.length === 0 && entries.length > 0 && !searchTerm && (
          <div className="text-center py-8 text-muted-foreground">No entries in this folder</div>
        )}
        {filteredEntries.length === 0 && isSharedView && (
          <div className="text-center py-12 text-muted-foreground">No items have been shared with this contact yet.</div>
        )}
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the entry "{entryToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEntryToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PasswordList;
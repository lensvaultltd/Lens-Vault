import React, { useState, useMemo } from 'react';
import { IPasswordEntry } from '../types';
import { Input } from './ui/input';
import {
  CreditCard, Building, FileText, User, Search, Mail, MoreVertical, Edit, Trash2, Share2, UserPlus, Key
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from './ui/alert-dialog';

interface PasswordListProps {
  entries: IPasswordEntry[];
  onEdit: (entry: IPasswordEntry) => void;
  onDelete: (id: string) => void;
  onShare: (entry: IPasswordEntry) => void;
  isSharedView: boolean;
}

const typeDetails: { [key in IPasswordEntry['type']]: { icon: React.ElementType; color: string; gradient: string } } = {
  login: {
    icon: Mail,
    color: 'text-rose-400',
    gradient: 'from-rose-500/20 to-orange-500/10'
  },
  'bank-account': {
    icon: Building,
    color: 'text-emerald-400',
    gradient: 'from-emerald-500/20 to-teal-500/10'
  },
  'secure-note': {
    icon: FileText,
    color: 'text-amber-400',
    gradient: 'from-amber-500/20 to-yellow-500/10'
  },
  'credit-card': {
    icon: CreditCard,
    color: 'text-blue-400',
    gradient: 'from-blue-500/20 to-indigo-500/10'
  },
  identity: {
    icon: User,
    color: 'text-purple-400',
    gradient: 'from-purple-500/20 to-pink-500/10'
  },
};

const PasswordList: React.FC<PasswordListProps> = ({ entries, onEdit, onDelete, onShare, isSharedView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [entryToDelete, setEntryToDelete] = useState<IPasswordEntry | null>(null);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return (
        entry.name.toLowerCase().includes(lower) ||
        (entry.siteName && entry.siteName.toLowerCase().includes(lower) || '') ||
        (entry.username && entry.username.toLowerCase().includes(lower) || '')
      );
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [entries, searchTerm]);

  if (entries.length === 0 && !isSharedView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-50">
        <div className="w-24 h-24 mb-6 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
          <Key className="w-10 h-10 text-muted-foreground" />
        </div>
        <div className="text-xl font-light tracking-wide text-muted-foreground">The Vault is Empty</div>
        <div className="text-sm mt-2 text-muted-foreground/60">Create your first secure object to begin.</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Zaha Search Bar: Floating Void */}
      <div className="relative group max-w-2xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center px-4 py-1 shadow-2xl transition-all duration-300 group-hover:bg-white/10 focus-within:ring-2 focus-within:ring-primary/50">
          <Search className="text-muted-foreground w-5 h-5 mr-3" />
          <input
            type="text"
            placeholder="Search secure objects..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none w-full py-3 text-lg placeholder:text-muted-foreground/50 text-white"
          />
        </div>
      </div>

      {/* Masonry Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
        {filteredEntries.map((entry, index) => {
          const details = typeDetails[entry.type] || typeDetails['login'];
          const Icon = details.icon;

          return (
            <div
              key={entry.id}
              className="zaha-card group cursor-pointer animate-in fade-in zoom-in duration-500 fill-mode-backwards"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => onEdit(entry)}
            >
              {/* Internal Gradient Glow */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${details.gradient} blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 translate-x-10 -translate-y-10`}></div>

              <div className="p-6 relative z-10 h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500 ${details.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>

                  {/* Actions Menu */}
                  <div onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 rounded-full hover:bg-white/10 p-0 text-muted-foreground hover:text-white">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#0f1115]/90 backdrop-blur-xl border-white/10 text-white">
                        <DropdownMenuItem onClick={() => onEdit(entry)} className="focus:bg-white/10 cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" /> {isSharedView ? 'View' : 'Edit'}
                        </DropdownMenuItem>
                        {!isSharedView && (
                          <>
                            <DropdownMenuItem onClick={() => onShare(entry)} className="focus:bg-white/10 cursor-pointer">
                              <Share2 className="mr-2 h-4 w-4" /> Share
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEntryToDelete(entry)} className="text-red-400 focus:bg-red-500/20 cursor-pointer">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <h3 className="text-xl font-bold tracking-tight text-white/90 mb-1 truncate group-hover:text-primary transition-colors duration-300">{entry.name}</h3>
                <p className="text-sm text-muted-foreground truncate mb-6">{entry.username || 'No username'}</p>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex -space-x-2">
                    {entry.sharedWith && entry.sharedWith.length > 0 && (
                      <div className="w-6 h-6 rounded-full bg-primary/20 border border-[#0f1115] flex items-center justify-center text-[10px] text-primary font-bold">
                        {entry.sharedWith.length}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground/50 font-mono tracking-wider">
                    {new Date(entry.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
        <AlertDialogContent className="zaha-card border-none bg-[#0f1115]/95">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Object?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action creates a permanent void. "{entryToDelete?.name}" will be lost effectively forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5 text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (entryToDelete) onDelete(entryToDelete.id); setEntryToDelete(null); }} className="bg-red-600 hover:bg-red-700 border-none text-white">
              Incinerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PasswordList;
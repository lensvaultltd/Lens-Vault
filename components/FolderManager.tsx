import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Folder as FolderIcon, FolderPlus, MoreVertical, Archive, Files } from 'lucide-react';

interface FolderManagerProps {
  folders: string[];
  selectedFolder: string;
  onSelectFolder: (folder: string) => void;
  onAddFolder: (name: string) => void;
  onRenameFolder: (oldName: string, newName: string) => void;
  onDeleteFolder: (name: string) => void;
}

const FolderManager: React.FC<FolderManagerProps> = ({ folders, selectedFolder, onSelectFolder, onAddFolder, onRenameFolder, onDeleteFolder }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddFolder(folderName);
    setFolderName('');
    setIsAddOpen(false);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameTarget) {
      onRenameFolder(renameTarget, folderName);
    }
    setFolderName('');
    setRenameTarget(null);
  };
  
  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      onDeleteFolder(deleteTarget);
    }
    setDeleteTarget(null);
  }

  const FolderItem = ({ name, icon, value }: { name: string, icon: React.ReactNode, value: string }) => (
    <Button
      variant={selectedFolder === value ? 'secondary' : 'ghost'}
      onClick={() => onSelectFolder(value)}
      className="w-full justify-start gap-2"
    >
      {icon}
      <span className="truncate">{name}</span>
    </Button>
  );

  return (
    <>
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full gap-2 mb-4">
              <FolderPlus className="h-4 w-4" /> New Folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Folder</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-folder-name">Folder Name</Label>
                <Input id="new-folder-name" value={folderName} onChange={(e) => setFolderName(e.target.value)} required />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-gradient-accent">Create Folder</Button>
              </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>
      <nav className="flex flex-col gap-1">
        <FolderItem name="All Items" icon={<Files className="h-4 w-4" />} value="__ALL__" />
        <FolderItem name="Uncategorized" icon={<Archive className="h-4 w-4" />} value="__UNFILED__" />

        {folders.length > 0 && <hr className="my-2 border-border" />}

        {folders.sort().map(folder => (
          <div key={folder} className="group flex items-center justify-between rounded-md hover:bg-accent focus-within:bg-accent">
              <Button
                variant={selectedFolder === folder ? 'secondary' : 'ghost'}
                onClick={() => onSelectFolder(folder)}
                className="flex-1 justify-start gap-2 text-left bg-transparent hover:bg-transparent"
              >
                <FolderIcon className="h-4 w-4" />
                <span className="truncate flex-1">{folder}</span>
              </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => { setRenameTarget(folder); setFolderName(folder); }}>Rename</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDeleteTarget(folder)} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </nav>
      
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Folder</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rename-folder-name">New Folder Name</Label>
                <Input id="rename-folder-name" value={folderName} onChange={(e) => setFolderName(e.target.value)} required />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
                <Button type="submit" className="bg-gradient-accent">Rename</Button>
              </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>
      
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Folder "{deleteTarget}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete the folder, but items inside will be moved to "Uncategorized". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm}>
                    Delete Folder
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

    </>
  );
};

export default FolderManager;
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';

// Lazy-loaded view components for code splitting
const VaultView = React.lazy(() => import('./components/VaultView'));
const SettingsView = React.lazy(() => import('./components/SettingsView'));
const SharingView = React.lazy(() => import('./components/SharingView'));

// Core UI Components
import { Button } from './components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
import { Badge } from './components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './components/ui/sheet';
import { Slider } from './components/ui/slider';
import { Switch } from './components/ui/switch';
import { Textarea } from './components/ui/textarea';
import { Toaster } from './components/ui/toaster';
import { toast } from './components/ui/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal
} from "./components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import {
  Lock,
  Eye,
  EyeOff,
  Clipboard,
  ExternalLink,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  FilePlus,
  FileUp,
  FileDown,
  UserPlus,
  Shield,
  ShieldAlert,
  RefreshCw,
  Search,
  Settings,
  LogOut,
  Star,
  Key,
  CreditCard,
  Building,
  FileText,
  User,
  AlertTriangle,
  Mail,
  Clock,
  Sun,
  Moon,
  Share2,
  Folder as FolderIcon,
  Users,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import Auth from './components/Auth';
import AddEditEntryDialog from './components/AddEditEntryDialog';
import ImportExportDialog from './components/ImportExportDialog';
import AuthorizedAccessDialog from './components/EmergencyAccessDialog';
import AiAuditor from './components/AiAuditor';
import { PasswordGenerator } from './components/PasswordGenerator';
import { ThemeToggle } from './components/ThemeToggle';
import { IPasswordEntry, Folder, AuthorizedContact, IPasswordStrength, Subscription, User as IUser } from './types';
import ShareEntryDialog from './components/ShareEntryDialog';
import FolderManager from './components/FolderManager';
import Billing from './components/Billing';
import WelcomeBanner from './components/WelcomeBanner';
import ExpiryWarning from './components/ExpiryWarning';
import { apiService } from './services/apiService';
import { EncryptionService } from './lib/encryption';

import { AdminDashboardLayout } from './components/Admin/AdminDashboardLayout';


const calculatePasswordStrength = (password: string): IPasswordStrength => {
  let score = 0;
  if (!password) return { score: 0, label: 'Very Weak', color: 'text-destructive' };

  // Score based on length
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;

  // Score for character types
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  score = Math.min(100, score);

  if (score < 30) return { score, label: 'Very Weak', color: 'text-destructive' };
  if (score < 50) return { score, label: 'Weak', color: 'text-yellow-500' };
  if (score < 75) return { score, label: 'Medium', color: 'text-yellow-500' };
  if (score < 90) return { score, label: 'Strong', color: 'text-green-500' };
  return { score, label: 'Very Strong', color: 'text-green-600' };
};

const TrialBanner = ({ trialEndsAt, onUpgradeClick }: { trialEndsAt: Date | null, onUpgradeClick: () => void }) => {
  if (!trialEndsAt) return null;
  const now = new Date();
  const ends = new Date(trialEndsAt);
  const daysRemaining = Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  if (daysRemaining <= 0) return null;

  return (
    <div className="w-full bg-primary/10 text-primary-foreground p-2 text-center text-sm mb-4 rounded-lg flex items-center justify-center gap-4 border border-primary/20">
      <AlertTriangle className="h-4 w-4 text-primary" />
      <span className="text-primary font-medium">
        You have {daysRemaining} day{daysRemaining > 1 ? 's' : ''} left on your free trial.
      </span>
      <Button size="sm" variant="outline" onClick={onUpgradeClick} className="h-7 border-primary/30 text-primary hover:bg-primary/20 bg-background/50">Upgrade</Button>
    </div>
  );
};


function App() {
  const [user, setUser] = React.useState<IUser | null>(null);
  const [masterPassword, setMasterPassword] = React.useState<string | null>(null);
  const [privateKey, setPrivateKey] = React.useState<string | null>(null); // Decrypted private key (Base64)

  const [entries, setEntries] = React.useState<IPasswordEntry[]>([]);
  const [folders, setFolders] = React.useState<Folder[]>([]);
  const [authorizedContacts, setAuthorizedContacts] = React.useState<AuthorizedContact[]>([]);
  const [viewingAs, setViewingAs] = React.useState<AuthorizedContact | null>(null);
  const [sharedItems, setSharedItems] = React.useState<any[]>([]); // Pending shared items

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = React.useState(false);
  const [isAuthorizedAccessOpen, setIsAuthorizedAccessOpen] = React.useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false);
  const [isFolderManagerOpen, setIsFolderManagerOpen] = React.useState(false);
  const [isClearDataAlertOpen, setIsClearDataAlertOpen] = React.useState(false);
  const [isChangePasswordAlertOpen, setIsChangePasswordAlertOpen] = React.useState(false);

  const [editingEntry, setEditingEntry] = React.useState<IPasswordEntry | null>(null);
  const [sharingEntry, setSharingEntry] = React.useState<IPasswordEntry | null>(null);
  const [activeTab, setActiveTab] = React.useState('vault');
  const [selectedFolder, setSelectedFolder] = React.useState('__ALL__');
  const [isAdminView, setIsAdminView] = React.useState(false);

  const [subscription, setSubscription] = React.useState<Subscription>({
    plan: 'free',
    status: 'trialing',
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
  });

  const handleAuthenticated = async (authedUser: IUser, pass: string, keys?: { publicKey: string; encryptedPrivateKey: string }) => {
    setUser(authedUser);
    setMasterPassword(pass);
    EncryptionService.setMasterPassword(pass);

    if (keys && keys.encryptedPrivateKey) {
      try {
        // Decrypt the private key using the master password (which is used as key for EncryptionService)
        // Note: EncryptionService.decrypt expects the format used by EncryptionService.encrypt.
        // We assume keys.encryptedPrivateKey was encrypted using EncryptionService.
        const decryptedPrivateKeyStr = EncryptionService.decrypt(keys.encryptedPrivateKey);

        // Import the private key for use
        setPrivateKey(decryptedPrivateKeyStr);
        toast({ variant: 'success', title: 'Security keys loaded.' });
      } catch (error) {
        console.error('Failed to decrypt private key', error);
        toast({ variant: 'destructive', title: 'Failed to load security keys', description: 'Sharing features may be unavailable.' });
      }
    }

    // Sync Subscription from User Object
    if (authedUser.subscription) {
      setSubscription(prev => ({
        ...prev,
        plan: authedUser.subscription as any,
        status: authedUser.subscription === 'free' ? 'trialing' : 'active', // simplified logic
        trialEndsAt: authedUser.subscription === 'free' ? prev.trialEndsAt : null
      }));
    }
  };

  React.useEffect(() => {
    if (user && masterPassword) {
      loadData();
      loadSharedItems();

      // Realtime Subscription for Shared Items
      import('./lib/supabase').then(({ supabase }) => {
        const channel = supabase.channel('shared_items_user')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'shared_items',
            filter: `recipient_email=eq.${user.email}`
          }, (payload) => {
            console.log('Incoming Share:', payload);
            setSharedItems(prev => [...prev, payload.new]);
            toast({ variant: 'info', title: 'New Shared Item Received!' });
          })
          .subscribe();

        return () => { supabase.removeChannel(channel); };
      });
    }
  }, [user, masterPassword]);

  const loadSharedItems = async () => {
    const result = await apiService.getSharedItems();
    if (result.success && result.items) {
      setSharedItems(result.items);
    }
  };

  const handleAcceptShare = async (item: any) => {
    if (!privateKey) {
      toast({ variant: 'destructive', title: 'Security key missing', description: 'Cannot decrypt shared item.' });
      return;
    }

    try {
      const { CryptoLib } = await import('./lib/crypto');
      // 1. Decrypt the AES key using our Private Key
      const aesKey = await CryptoLib.decryptWithPrivateKey(item.encrypted_key, privateKey);

      // 2. Decrypt the data using the AES key
      // We need a way to decrypt with a raw AES key. 
      // Since we used CryptoJS in ShareEntryDialog, we should use it here too.
      const CryptoJS = (await import('crypto-js')).default;
      const bytes = CryptoJS.AES.decrypt(item.encrypted_data, aesKey);
      const decryptedDataStr = bytes.toString(CryptoJS.enc.Utf8);

      if (!decryptedDataStr) throw new Error('Decryption failed');

      const entryData = JSON.parse(decryptedDataStr);

      // 3. Save to our vault (re-encrypts with our master password automatically in handleSaveEntry/saveData)
      // We treat it as a new entry
      const newEntry = { ...entryData, id: crypto.randomUUID(), folder: 'Shared with Me', sharedWith: [] };

      setEntries(prev => [...prev, newEntry]);

      // 4. Delete from shared_items
      await apiService.deleteSharedItem(item.id);
      setSharedItems(prev => prev.filter(i => i.id !== item.id));

      toast({ variant: 'success', title: 'Item accepted', description: `Added "${newEntry.name}" to your vault.` });
    } catch (error) {
      console.error('Failed to accept share', error);
      toast({ variant: 'destructive', title: 'Failed to accept item', description: 'Decryption error.' });
    }
  };

  const handleRejectShare = async (id: string) => {
    await apiService.deleteSharedItem(id);
    setSharedItems(prev => prev.filter(i => i.id !== id));
    toast({ variant: 'info', title: 'Item rejected' });
  };

  const loadData = async () => {
    if (!user || !masterPassword) return;
    try {
      const result = await apiService.getVault(user.email, masterPassword);
      if (result.success && result.data) {
        setEntries(result.data.passwords);
        setFolders(result.data.folders);
        setAuthorizedContacts(result.data.authorizedContacts);
        toast({ variant: 'success', title: 'Vault loaded' });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message || "There was an issue decrypting your vault. Please log out and try again.",
        variant: "destructive",
      });
      console.error("Data load failed:", error);
      // handleLogout();
    }
  };

  const isInitialMount = React.useRef(true);
  React.useEffect(() => {
    if (isInitialMount.current || !user) {
      isInitialMount.current = false;
      return;
    }
    const handler = setTimeout(() => {
      saveData();
    }, 1000); // 1-second debounce

    return () => {
      clearTimeout(handler);
    };
  }, [entries, folders, authorizedContacts, user]);


  const saveData = async () => {
    if (!user || !masterPassword) return;

    try {
      const vaultData = { passwords: entries, folders, authorizedContacts };
      await apiService.saveVault(user.email, masterPassword, vaultData);
    } catch (error) {
      toast({
        title: "Failed to save data to cloud",
        description: "An error occurred while syncing your vault.",
        variant: "destructive",
      });
    }
  };


  const handleSaveEntry = (entryData: Omit<IPasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    let updatedEntries;

    if (entryData.type === 'login' && entryData.password) {
      (entryData as IPasswordEntry).passwordStrength = calculatePasswordStrength(entryData.password);
    }

    if (editingEntry) {
      // Update
      const updatedEntry = { ...editingEntry, ...entryData, updatedAt: new Date() };

      // Add password to history if it's a login and has changed
      if (
        editingEntry.type === 'login' &&
        entryData.password &&
        editingEntry.password &&
        entryData.password !== editingEntry.password
      ) {
        const newHistoryEntry = { password: editingEntry.password, date: new Date() };
        const existingHistory = editingEntry.passwordHistory || [];
        updatedEntry.passwordHistory = [newHistoryEntry, ...existingHistory].slice(0, 10); // Cap at 10
      }

      updatedEntries = entries.map(e => e.id === editingEntry.id ? updatedEntry : e);
      toast({ variant: "success", title: "Entry updated successfully" });
    } else {
      // Create
      const newEntry: IPasswordEntry = {
        ...(entryData as IPasswordEntry),
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      updatedEntries = [...entries, newEntry];
      toast({ variant: "success", title: "Entry saved successfully" });
    }

    setEntries(updatedEntries);

    const entryFolder = entryData.folder?.trim();
    if (entryFolder && !folders.includes(entryFolder)) {
      const updatedFolders = [...folders, entryFolder];
      setFolders(updatedFolders);
    }

    setIsAddEditDialogOpen(false);
    setEditingEntry(null);
  };

  const handleDeleteEntry = (id: string) => {
    const updatedEntries = entries.filter(e => e.id !== id);
    setEntries(updatedEntries);
    toast({ variant: "success", title: "Entry deleted" });
  };

  const handleEditEntry = (entry: IPasswordEntry) => {
    setEditingEntry(entry);
    setIsAddEditDialogOpen(true);
  };

  const handleImport = (importedPasswords: IPasswordEntry[], importedFolders: Folder[]) => {
    setEntries(prev => [...prev, ...importedPasswords]);
    setFolders(prev => [...new Set([...prev, ...importedFolders])]);
  };

  const handleAddAuthorizedContact = (contact: Omit<AuthorizedContact, 'id' | 'createdAt'>) => {
    const newContact = { ...contact, id: crypto.randomUUID(), createdAt: new Date() };
    setAuthorizedContacts(prev => [...prev, newContact]);
    toast({ variant: 'success', title: 'Authorized contact added.' });
  };

  const handleRemoveAuthorizedContact = (id: string) => {
    setAuthorizedContacts(prev => prev.filter(c => c.id !== id));
    toast({ variant: 'success', title: 'Authorized contact removed.' });
  };

  const handleToggleAuthorizedContact = (id: string) => {
    const contact = authorizedContacts.find(c => c.id === id);
    setAuthorizedContacts(prev => prev.map(c =>
      c.id === id ? { ...c, isActive: !c.isActive } : c
    ));
    if (contact) {
      toast({ variant: 'success', title: `Contact ${contact.isActive ? 'deactivated' : 'activated'}.` });
    }
  };

  const handleOpenShareDialog = (entry: IPasswordEntry) => {
    setSharingEntry(entry);
    setIsShareDialogOpen(true);
  };

  const handleSaveSharing = (entryId: string, newShares: { contactId: string; accessLevel: 'view' | 'full' }[]) => {
    setEntries(prev => prev.map(e =>
      e.id === entryId
        ? { ...e, sharedWith: newShares.length > 0 ? newShares : undefined, updatedAt: new Date() }
        : e
    ));
    setIsShareDialogOpen(false);
    setSharingEntry(null);
    toast({ variant: "success", title: "Sharing settings updated" });
  };

  const handleLogout = async () => {
    // CRITICAL: Save data before logging out to prevent data loss
    if (user && masterPassword) {
      try {
        await saveData();
        toast({ variant: "info", title: "Saving vault..." });
        // Small delay to ensure save completes
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Failed to save before logout:', error);
        toast({ variant: "destructive", title: "Warning: Failed to save vault before logout" });
      }
    }

    setUser(null);
    setMasterPassword(null);
    EncryptionService.setMasterPassword(null);
    setEntries([]);
    setFolders([]);
    setAuthorizedContacts([]);
    setViewingAs(null);
    toast({ variant: "success", title: "Logged out successfully" });
  };

  const handleExitSharedView = () => {
    setViewingAs(null);
    setActiveTab('authorized');
  };

  const handleClearAllData = async () => {
    if (!user || !masterPassword) return;
    const result = await apiService.saveVault(user.email, masterPassword, { passwords: [], folders: [], authorizedContacts: [] });
    if (result.success) {
      setEntries([]);
      setFolders([]);
      setAuthorizedContacts([]);
      toast({ variant: "success", title: "All vault data cleared" });
    } else {
      toast({ variant: "destructive", title: "Failed to clear data" });
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      const result = await apiService.deleteAccount();
      if (result.success) {
        toast({ variant: 'success', title: 'Account Deleted', description: 'Your account and data have been permanently removed.' });
        handleLogout();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message || 'Could not delete account.' });
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;

    // TODO: Implement resetPasswordWithPasskey in apiService
    // const result = await apiService.resetPasswordWithPasskey(user.email);

    toast({
      variant: "default",
      title: "Feature Coming Soon",
      description: "Password reset with passkey will be available in the next update.",
      duration: 5000,
    });

    return; // Temporary - remove when method is implemented

    /* Original code - uncomment when apiService.resetPasswordWithPasskey is implemented
    const result = await apiService.resetPasswordWithPasskey(user.email);

    if (result.success) {
      toast({
        variant: "success",
        title: "Verification Successful",
        description: "You will now be logged out to create your new master password.",
        duration: 8000,
      });
      handleLogout();
    } else {
      toast({
        variant: "destructive",
        title: "Password Reset Failed",
        description: result.message
      });
    }
    */
  };

  const handleAddFolder = (folderName: string) => {
    const trimmedName = folderName.trim();
    if (!trimmedName) {
      toast({ title: "Folder name cannot be empty", variant: "destructive" });
      return;
    }
    if (folders.includes(trimmedName)) {
      toast({ title: "Folder already exists", variant: "destructive" });
      return;
    }
    setFolders(prev => [...prev, trimmedName]);
    toast({ variant: "success", title: `Folder "${trimmedName}" created` });
  };

  const handleRenameFolder = (oldName: string, newName: string) => {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName || oldName === trimmedNewName) {
      toast({ title: "Invalid folder name", variant: "destructive" });
      return;
    }
    if (folders.includes(trimmedNewName)) {
      toast({ title: `Folder "${trimmedNewName}" already exists`, variant: "destructive" });
      return;
    }
    setFolders(prev => prev.map(f => (f === oldName ? trimmedNewName : f)));
    setEntries(prev => prev.map(e => e.folder === oldName ? { ...e, folder: trimmedNewName } : e));

    if (selectedFolder === oldName) {
      setSelectedFolder(trimmedNewName);
    }
    toast({ variant: "success", title: `Folder renamed to "${trimmedNewName}"` });
  };

  const handleDeleteFolder = (folderName: string) => {
    setFolders(prev => prev.filter(f => f !== folderName));
    setEntries(prev => prev.map(e => e.folder === folderName ? { ...e, folder: undefined } : e));

    if (selectedFolder === folderName) {
      setSelectedFolder('__ALL__');
    }
    toast({ variant: "success", title: `Folder "${folderName}" deleted` });
  };

  const handleSelectFolder = (folder: string) => {
    setSelectedFolder(folder);
    setIsFolderManagerOpen(false);
  };

  const handlePlanChange = (newPlan: 'free' | 'premium' | 'family' | 'business') => {
    setSubscription(prev => {
      const isStillInTrial = prev.status === 'trialing' && prev.trialEndsAt && new Date() < new Date(prev.trialEndsAt);
      return {
        ...prev,
        plan: newPlan,
        status: newPlan === 'free' ? (isStillInTrial ? 'trialing' : 'canceled') : 'active',
        trialEndsAt: newPlan !== 'free' ? null : prev.trialEndsAt,
      }
    });
    toast({ variant: 'success', title: `Subscription Updated`, description: `You are now on the ${newPlan.charAt(0).toUpperCase() + newPlan.slice(1)} plan.` });
  };

  const displayedEntries = React.useMemo(() => {
    if (viewingAs) {
      return entries.filter(entry =>
        entry.sharedWith?.some(share => share.contactId === viewingAs.id)
      );
    }
    if (selectedFolder === '__UNFILED__') {
      return entries.filter(e => !e.folder || e.folder === 'no-folder');
    }
    if (selectedFolder !== '__ALL__') {
      return entries.filter(e => e.folder === selectedFolder);
    }
    return entries;
  }, [entries, selectedFolder, viewingAs]);

  if (!user) {
    return <Auth onAuthenticated={(u, p, k) => handleAuthenticated(u, p, k)} />;
  }

  if (isAdminView) {
    return (
      <AdminDashboardLayout
        userEmail={user.email}
        onLogout={handleLogout}
        onSwitchDataView={() => setIsAdminView(false)}
      />
    );
  }

  const stats = {
    total: entries.length,
    logins: entries.filter(e => e.type === 'login').length,
    notes: entries.filter(e => e.type === 'secure-note').length,
    banks: entries.filter(e => e.type === 'bank-account').length,
    cards: entries.filter(e => e.type === 'credit-card').length,
    identities: entries.filter(e => e.type === 'identity').length,
  };

  const sharedEntries = entries.filter(e => e.sharedWith && e.sharedWith.length > 0);

  const getFolderName = (folderId: string) => {
    if (folderId === '__ALL__') return 'All Items';
    if (folderId === '__UNFILED__') return 'Uncategorized';
    return folderId;
  };

  const isPremium = subscription.plan !== 'free' || subscription.status === 'trialing';


  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {subscription.status === 'trialing' && <TrialBanner trialEndsAt={subscription.trialEndsAt} onUpgradeClick={() => setActiveTab('settings')} />}
        {viewingAs && (
          <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
            <p className="text-sm font-medium">
              Viewing items shared with <span className="font-bold">{viewingAs.name}</span>. This is a read-only preview.
            </p>
            <Button variant="outline" size="sm" onClick={handleExitSharedView}>
              Return to My Vault
            </Button>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <img src="/logo-transparent.png" alt="Lens Vault logo" className="h-10 w-auto" />
            <h1 className="text-xl font-bold text-gradient-heading hidden sm:inline">Lens Vault</h1>
          </div>
          {!viewingAs && (
            <>
              <div className="hidden md:block text-sm text-muted-foreground flex-grow text-center px-4">
                {stats.total} entries &bull; {stats.logins} logins &bull; {stats.notes} notes &bull; {stats.banks} banks &bull; {stats.cards} cards
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button onClick={() => { setEditingEntry(null); setIsAddEditDialogOpen(true); }} className="gap-2 bg-gradient-accent">
                  <Plus className="h-4 w-4" /> Add Entry
                </Button>
                <Sheet open={isFolderManagerOpen} onOpenChange={setIsFolderManagerOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <FolderIcon className="h-4 w-4" /> Manage Folders
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] sm:w-[320px]">
                    <SheetHeader>
                      <SheetTitle>Folders</SheetTitle>
                    </SheetHeader>
                    <FolderManager
                      folders={folders}
                      selectedFolder={selectedFolder}
                      onSelectFolder={handleSelectFolder}
                      onAddFolder={handleAddFolder}
                      onRenameFolder={handleRenameFolder}
                      onDeleteFolder={handleDeleteFolder}
                    />
                  </SheetContent>
                </Sheet>
                <Button variant="outline" onClick={handleLogout} className="gap-2">
                  <LogOut className="h-4 w-4" /> Logout
                </Button>
                {user.isAdmin && (
                  <Button variant="default" onClick={() => setIsAdminView(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Shield className="h-4 w-4" /> Admin Dashboard
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${viewingAs ? 'grid-cols-1' : 'grid-cols-5'}`}>
            <TabsTrigger value="vault" className="gap-2">
              <Shield className="h-4 w-4" /> {viewingAs ? `Shared Items (${displayedEntries.length})` : 'My Vault'}
            </TabsTrigger>
            {!viewingAs && (
              <>
                <TabsTrigger value="auditor" className="gap-2">
                  <ShieldAlert className="h-4 w-4" />AI Auditor
                </TabsTrigger>
                <TabsTrigger value="generator" className="gap-2">
                  <Key className="h-4 w-4" />Generator
                </TabsTrigger>
                {!isPremium ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="authorized" className="gap-2" disabled>
                          <Users className="h-4 w-4" />Family & Sharing
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Upgrade to a premium plan to share items.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <TabsTrigger value="authorized" className="gap-2">
                    <Users className="h-4 w-4" />Family & Sharing
                  </TabsTrigger>
                )}
                <TabsTrigger value="settings" className="gap-2">
                  <Settings className="h-4 w-4" />Settings
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="vault" className="mt-6">
            <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <VaultView
                entries={displayedEntries}
                sharedItems={sharedItems}
                selectedFolder={selectedFolder}
                viewingAs={viewingAs}
                onEdit={handleEditEntry}
                onDelete={handleDeleteEntry}
                onShare={handleOpenShareDialog}
                onAcceptShare={handleAcceptShare}
                onRejectShare={handleRejectShare}
              />
            </Suspense>
          </TabsContent>
          <TabsContent value="auditor" className="mt-6">
            <AiAuditor entries={entries} />
          </TabsContent>
          <TabsContent value="generator" className="mt-6">
            <PasswordGenerator />
          </TabsContent>
          <TabsContent value="authorized" className="mt-6">
            <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <SharingView
                isPremium={isPremium}
                authorizedContacts={authorizedContacts}
                entries={entries}
                onAuthorizedAccessOpen={() => setIsAuthorizedAccessOpen(true)}
                onOpenShareDialog={handleOpenShareDialog}
                onViewAsContact={(contact) => { setViewingAs(contact); setActiveTab('vault'); }}
                onSwitchToSettings={() => setActiveTab('settings')}
              />
            </Suspense>
          </TabsContent>
          <TabsContent value="settings" className="mt-6">
            <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <SettingsView
                user={user}
                subscription={subscription}
                onPlanChange={handlePlanChange}
                onImportExportOpen={() => setIsImportExportOpen(true)}
                onChangePassword={handleChangePassword}
                onClearData={handleClearAllData}
                onDeleteAccount={handleDeleteAccount}
              />
            </Suspense>
          </TabsContent>
        </Tabs>

        <AddEditEntryDialog
          isOpen={isAddEditDialogOpen}
          onClose={() => { setIsAddEditDialogOpen(false); setEditingEntry(null); }}
          onSave={editingEntry && !viewingAs ? (entry) => handleSaveEntry(entry) : handleSaveEntry}
          editEntry={editingEntry}
          folders={folders}
          viewingAs={viewingAs}
        />

        <ImportExportDialog
          isOpen={isImportExportOpen}
          onClose={() => setIsImportExportOpen(false)}
          passwords={entries}
          folders={folders}
          onImport={handleImport}
        />

        <AuthorizedAccessDialog
          isOpen={isAuthorizedAccessOpen}
          onClose={() => setIsAuthorizedAccessOpen(false)}
          authorizedContacts={authorizedContacts}
          onAddContact={handleAddAuthorizedContact}
          onRemoveContact={handleRemoveAuthorizedContact}
          onToggleContact={handleToggleAuthorizedContact}
        />

        {
          sharingEntry && (
            <ShareEntryDialog
              isOpen={isShareDialogOpen}
              onClose={() => { setIsShareDialogOpen(false); setSharingEntry(null); }}
              entry={sharingEntry}
              contacts={authorizedContacts}
              onSave={handleSaveSharing}
            />
          )
        }
      </div >
      <Toaster />
    </div >
  );
}

export default App;
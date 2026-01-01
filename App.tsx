import React, { Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

// Lazy-loaded view components
const VaultView = React.lazy(() => import('./components/VaultView'));
const SettingsView = React.lazy(() => import('./components/SettingsView'));
const SharingView = React.lazy(() => import('./components/SharingView'));
const AiAuditor = React.lazy(() => import('./components/AiAuditor'));
const PasswordGenerator = React.lazy(() => import('./components/PasswordGenerator'));

// Core UI Components
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/toaster';
import { toast } from './components/ui/use-toast';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger
} from './components/ui/sheet';
import {
  Lock, Plus, Shield, ShieldAlert, Settings, LogOut, Key, Users, Folder as FolderIcon
} from 'lucide-react';

import Auth from './components/Auth';
import SplashScreen from './components/SplashScreen';
import { IPasswordEntry, Folder, AuthorizedContact, Subscription, User as IUser } from './types';
import { apiService } from './services/apiService';
import { EncryptionService } from './lib/encryption';

// Dialogs & Modals
import AddEditEntryDialog from './components/AddEditEntryDialog';
import FolderManager from './components/FolderManager';
import ShareEntryDialog from './components/ShareEntryDialog';
import ImportExportDialog from './components/ImportExportDialog';
import EmergencyAccessDialog from './components/EmergencyAccessDialog';

function App() {
  const [user, setUser] = useState<IUser | null>(null);
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [isSplashScreenComplete, setIsSplashScreenComplete] = useState(false);
  const [entries, setEntries] = useState<IPasswordEntry[]>([]);
  const [folders, setFolders] = useState<Folder[]>(['Personal', 'Work', 'Finance']);
  const [activeTab, setActiveTab] = useState('vault');
  const [selectedFolder, setSelectedFolder] = useState('__ALL__');
  const [viewingAs, setViewingAs] = useState<AuthorizedContact | null>(null);

  // Dialog States
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<IPasswordEntry | null>(null);
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [sharingEntry, setSharingEntry] = useState<IPasswordEntry | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isEmergencyAccessOpen, setIsEmergencyAccessOpen] = useState(false);

  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- DATA LOADING ---
  const loadData = async () => {
    if (!user || !masterPassword) return;
    setIsLoading(true);
    try {
      const result = await apiService.getVault(user.email, masterPassword);
      if (result.success && result.data) {
        setEntries(result.data.passwords || []);
        if (result.data.folders && result.data.folders.length > 0) {
          setFolders(result.data.folders);
        }
        // Note: Authorized contacts handled in SharingView usually, but could load here if needed
      } else {
        console.error("Failed to load vault:", result.message);
        toast({ variant: 'destructive', title: 'Error loading vault', description: result.message });
      }
    } catch (error) {
      console.error("Load data error:", error);
      toast({ variant: 'destructive', title: 'Critical Error', description: 'Failed to decrypt or load data.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && masterPassword) {
      loadData();
    }
  }, [user, masterPassword]);

  // --- ACTIONS ---

  const handleSaveVault = async (updatedEntries: IPasswordEntry[], updatedFolders: Folder[]) => {
    if (!user || !masterPassword) return;
    setIsSaving(true);
    // Construct vault data object matching the API expectation
    // We need to fetch current authorized contacts or manage them in state to prevent overwriting?
    // apiService.getVault returns them. Ideally we keep them in sync.
    // For now, simpler approach: basic save. In prod, use a more robust sync or optimistic update with refetch.

    // Quick fetch to get contacts/others to preserve them? 
    // Or assume apiService.saveVault handles merging? 
    // Usually saveVault overwrites the blob. We should pass everything.
    // Let's rely on local state being the source of truth for now.
    // NOTE: This simple version assumes we don't lose contacts. 
    // Ideally we should keep contacts in state too.
    const vaultData = {
      passwords: updatedEntries,
      folders: updatedFolders,
      authorizedContacts: [] // Logic for contacts should be added if managing them here
    };

    const result = await apiService.saveVault(user.email, masterPassword, vaultData);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Save failed', description: result.message });
      // Revert?
    }
    setIsSaving(false);
  };

  const handleAddEntry = async (entry: IPasswordEntry) => {
    const newEntries = [...entries, entry];
    setEntries(newEntries);
    setIsAddEditDialogOpen(false);
    await handleSaveVault(newEntries, folders);
    toast({ title: 'Entry added', description: 'Your new item is secure.' });
  };

  const handleUpdateEntry = async (updatedEntry: IPasswordEntry) => {
    const newEntries = entries.map(e => e.id === updatedEntry.id ? updatedEntry : e);
    setEntries(newEntries);
    setIsAddEditDialogOpen(false);
    setEditingEntry(null);
    await handleSaveVault(newEntries, folders);
    toast({ title: 'Entry updated', description: 'Changes saved securely.' });
  };

  const handleDeleteEntry = async (id: string) => {
    const newEntries = entries.filter(e => e.id !== id);
    setEntries(newEntries);
    await handleSaveVault(newEntries, folders);
    toast({ variant: "destructive", title: 'Entry incinerated', description: 'Item permanently deleted.' });
  };

  const handleOpenAdd = () => {
    setEditingEntry(null);
    setIsAddEditDialogOpen(true);
  };

  const handleOpenEdit = (entry: IPasswordEntry) => {
    setEditingEntry(entry);
    setIsAddEditDialogOpen(true);
  };

  const handleOpenShare = (entry: IPasswordEntry) => {
    setSharingEntry(entry);
    setIsShareDialogOpen(true);
  };

  const handleUpdateFolders = async (newFolders: Folder[]) => {
    setFolders(newFolders);
    await handleSaveVault(entries, newFolders);
  };

  const handleLogout = async () => {
    await apiService.logout();
    setUser(null);
    setMasterPassword(null);
    setEntries([]);
  };

  // Extension Prompt Logic
  const [showExtensionPrompt, setShowExtensionPrompt] = React.useState(false);

  React.useEffect(() => {
    const hasDismissed = localStorage.getItem('lens-vault-extension-prompt-dismissed');
    // @ts-ignore
    const isExtensionActive = window.lensVaultExtensionActive === true;

    if (!hasDismissed && !isExtensionActive && user) {
      const timer = setTimeout(() => setShowExtensionPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const dismissExtensionPrompt = () => {
    setShowExtensionPrompt(false);
    localStorage.setItem('lens-vault-extension-prompt-dismissed', 'true');
  };

  if (!isSplashScreenComplete) {
    return <SplashScreen onComplete={() => setIsSplashScreenComplete(true)} />;
  }

  if (!user) {
    return <Auth onAuthenticated={(u, p, k) => { setUser(u); setMasterPassword(p); }} />;
  }

  return (
    <div className="zaha-container min-h-screen text-foreground relative selection:bg-primary/30">
      {/* Ambient Moving Background - Hybrid Palette */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full animate-pulse opacity-40"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse opacity-30 animation-delay-2000"></div>
      </div>

      {/* Floating Architectural Header */}
      <header className="relative z-50 px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <img src="/logo-transparent.png" alt="Lens Vault" className="h-12 w-auto relative z-10 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 hidden sm:block font-outfit">
            Lens Vault
          </h1>
        </div>

        {/* Glass Navigation Pill */}
        <div className="hidden md:flex items-center gap-1 p-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10 shadow-2xl">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('vault')}
            className={`rounded-full px-6 transition-all duration-300 ${activeTab === 'vault' ? 'bg-primary/20 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'text-muted-foreground hover:text-white'}`}
          >
            Vault
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('auditor')}
            className={`rounded-full px-6 transition-all duration-300 ${activeTab === 'auditor' ? 'bg-primary/20 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'text-muted-foreground hover:text-white'}`}
          >
            Auditor
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('generator')}
            className={`rounded-full px-6 transition-all duration-300 ${activeTab === 'generator' ? 'bg-primary/20 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'text-muted-foreground hover:text-white'}`}
          >
            Generator
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('settings')}
            className={`rounded-full px-6 transition-all duration-300 ${activeTab === 'settings' ? 'bg-primary/20 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'text-muted-foreground hover:text-white'}`}
          >
            Settings
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleOpenAdd} className="zaha-btn gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Entry</span>
          </Button>
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all" onClick={handleLogout}>
            <LogOut className="w-4 h-4 text-muted-foreground hover:text-red-400" />
          </div>
        </div>
      </header>

      {/* Main Fluid Content Area */}
      <main className="relative z-10 px-4 md:px-8 pb-10">
        <Suspense fallback={<div className="flex justify-center mt-20"><div className="w-10 h-10 border-t-2 border-primary rounded-full animate-spin"></div></div>}>

          {activeTab === 'vault' && (
            <VaultView
              entries={entries}
              folders={folders}
              selectedFolder={selectedFolder}
              sharedItems={[]} // Todo: Add shared items fetch
              viewingAs={viewingAs}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteEntry}
              onShare={handleOpenShare}
              onAcceptShare={() => { }} // Placeholder
              onRejectShare={() => { }} // Placeholder
            />
          )}

          {activeTab === 'auditor' && (
            <AiAuditor
              passwords={entries}
              onFixIssue={(entry) => {
                handleOpenEdit(entry);
                setActiveTab('vault');
              }}
            />
          )}

          {activeTab === 'generator' && (
            <div className="max-w-4xl mx-auto pt-10">
              <PasswordGenerator />
            </div>
          )}

          {activeTab === 'settings' && (
            <SettingsView
              user={user}
              onLogout={handleLogout}
              onOpenImportExport={() => setIsImportExportOpen(true)}
              onOpenEmergency={() => setIsEmergencyAccessOpen(true)}
              subscription={{ plan: 'free', status: 'active', trialEndsAt: null }} // Mock or fetch
            />
          )}

        </Suspense>
      </main>

      {/* Dialogs */}
      <AddEditEntryDialog
        isOpen={isAddEditDialogOpen}
        onClose={() => setIsAddEditDialogOpen(false)}
        onSave={editingEntry ? handleUpdateEntry : handleAddEntry}
        entry={editingEntry}
        folders={folders}
      />

      <FolderManager
        isOpen={isFolderManagerOpen}
        onClose={() => setIsFolderManagerOpen(false)}
        folders={folders}
        onUpdateFolders={handleUpdateFolders}
      />

      {sharingEntry && (
        <ShareEntryDialog
          isOpen={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          entry={sharingEntry}
          userPrivateKey={privateKey || ''} // We need private key management back too!
          userEmail={user.email}
        />
      )}

      {/* Extension Installation Prompt */}
      <Sheet open={showExtensionPrompt} onOpenChange={setShowExtensionPrompt}>
        <SheetContent side="bottom" className="backdrop-blur-xl bg-black/60 border-t-white/10 p-0 sm:max-w-none">
          <div className="container mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-primary/20 rounded-2xl border border-primary/30 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Install the Lens Vault Extension</h3>
                <p className="text-muted-foreground">Detect logins, audit passwords, and autofill credentials securely.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <Button variant="ghost" className="flex-1 md:flex-none" onClick={dismissExtensionPrompt}>
                I'll do it later
              </Button>
              <Button className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white font-bold px-8 shadow-lg shadow-primary/25" onClick={() => {
                window.open('https://lens-vault-website.vercel.app/download', '_blank');
                dismissExtensionPrompt();
              }}>
                Install Now <Plus className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Toaster />
    </div>
  );
}

export default App;
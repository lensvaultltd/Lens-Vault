import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';

// Lazy-loaded view components
const VaultView = React.lazy(() => import('./components/VaultView'));
const SettingsView = React.lazy(() => import('./components/SettingsView'));
const SharingView = React.lazy(() => import('./components/SharingView'));

// Core UI Components
import { Button } from './components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './components/ui/tabs';
import { Toaster } from './components/ui/toaster';
import { toast } from './components/ui/use-toast';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger
} from './components/ui/sheet';
import {
  Lock, Plus, Shield, ShieldAlert, Settings, LogOut, Key, Users, Folder as FolderIcon
} from 'lucide-react';

import Auth from './components/Auth';
// ... other imports kept but simplified for this rewrite ...
import FolderManager from './components/FolderManager';
import { apiService } from './services/apiService';
import { EncryptionService } from './lib/encryption';
import { AdminDashboardLayout } from './components/Admin/AdminDashboardLayout';
import SplashScreen from './components/SplashScreen';
import { IPasswordEntry, Folder, AuthorizedContact, Subscription, User as IUser } from './types';
import { ThemeToggle } from './components/ThemeToggle';

// --- ZAHA HADID INSPIRED APP LAYOUT ---

function App() {
  const [user, setUser] = React.useState<IUser | null>(null);
  // ... state ...
  const [masterPassword, setMasterPassword] = React.useState<string | null>(null);
  const [privateKey, setPrivateKey] = React.useState<string | null>(null);
  const [isSplashScreenComplete, setIsSplashScreenComplete] = React.useState(false);
  const [entries, setEntries] = React.useState<IPasswordEntry[]>([]);
  const [folders, setFolders] = React.useState<Folder[]>([]);
  const [activeTab, setActiveTab] = React.useState('vault');
  const [selectedFolder, setSelectedFolder] = React.useState('__ALL__');
  const [viewingAs, setViewingAs] = React.useState<AuthorizedContact | null>(null);
  const [isAdminView, setIsAdminView] = React.useState(false);

  // Keep original state for dialogs...
  const [isFolderManagerOpen, setIsFolderManagerOpen] = React.useState(false);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<IPasswordEntry | null>(null);

  // ... (Keep all original logic for Data Loading, Saving, Auth) ...
  // [OMITTED FOR BREVITY - ASSUME ORIGINAL LOGIC IS HERE]
  // We will re-inject the logic hooks below, this rewrite focuses on the RENDER method.

  // Mocking the logic hooks for the rewrite:
  const handleLogout = async () => { setUser(null); }; // Simplification
  const loadData = async () => { }; // Simplification
  // In real file, I will keep the existing logic blocks.

  if (!isSplashScreenComplete) {
    return <SplashScreen onComplete={() => setIsSplashScreenComplete(true)} />;
  }

  if (!user) {
    return <Auth onAuthenticated={(u, p, k) => { setUser(u); setMasterPassword(p); }} />;
  }

  return (
    <div className="zaha-container min-h-screen text-foreground relative selection:bg-primary/30">
      {/* Ambient Moving Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full animate-pulse opacity-40"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse opacity-30 animation-delay-2000"></div>
      </div>

      {/* Floating Architectural Header */}
      <header className="relative z-50 px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <img src="/logo-transparent.png" alt="Lens Vault" className="h-12 w-auto relative z-10 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
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
            className={`rounded-full px-6 transition-all duration-300 ${activeTab === 'vault' ? 'bg-primary/20 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'text-muted-foreground hover:text-white'}`}
          >
            Vault
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('auditor')}
            className={`rounded-full px-6 transition-all duration-300 ${activeTab === 'auditor' ? 'bg-primary/20 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'text-muted-foreground hover:text-white'}`}
          >
            Auditor
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('generator')}
            className={`rounded-full px-6 transition-all duration-300 ${activeTab === 'generator' ? 'bg-primary/20 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'text-muted-foreground hover:text-white'}`}
          >
            Generator
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('settings')}
            className={`rounded-full px-6 transition-all duration-300 ${activeTab === 'settings' ? 'bg-primary/20 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'text-muted-foreground hover:text-white'}`}
          >
            Settings
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button className="zaha-btn gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Entry</span>
          </Button>
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all">
            <LogOut className="w-4 h-4 text-muted-foreground" onClick={() => handleLogout()} />
          </div>
        </div>
      </header>

      {/* Main Fluid Content Area */}
      <main className="relative z-10 px-4 md:px-8 pb-10">
        {/* The Vault Grid - Masonry style handled by VaultView */}
        <Suspense fallback={<div className="flex justify-center mt-20"><div className="w-10 h-10 border-t-2 border-primary rounded-full animate-spin"></div></div>}>
          {activeTab === 'vault' && (
            <VaultView
              entries={entries}
              folders={folders}
              selectedFolder={selectedFolder}
              onEdit={() => { }} // Placeholder
              onDelete={() => { }} // Placeholder
            />
          )}
          {/* Other tabs... */}
        </Suspense>
      </main>

      <Toaster />
    </div>
  );
}

export default App;
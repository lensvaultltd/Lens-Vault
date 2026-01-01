import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { apiService } from '../services/apiService';
import { EncryptionService } from '../lib/encryption';
import Auth from '../components/Auth';
import { IPasswordEntry, User } from '../types';

// Fix: Declare chrome to satisfy TypeScript in extension environment.
declare const chrome: any;

function Popup() {
  const [user, setUser] = useState<User | null>(null);
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [matchingEntries, setMatchingEntries] = useState<IPasswordEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const isAuthenticated = !!(user && masterPassword);

  const handleAuthenticated = (authedUser: User, pass: string) => {
    setUser(authedUser);
    setMasterPassword(pass);
    EncryptionService.setMasterPassword(pass);
  };

  const findMatchingEntries = async (url: string) => {
    if (!user || !masterPassword) return;

    const result = await apiService.getVault(user.email, masterPassword);

    if (result.success && result.data) {
      const entries = result.data.passwords;
      try {
        const hostname = new URL(url).hostname;
        const matches = entries.filter((entry) => {
          try {
            if (!entry.url) return false;
            const entryHostname = new URL(entry.url).hostname;
            return entryHostname.includes(hostname) || hostname.includes(entryHostname);
          } catch {
            return false;
          }
        });
        setMatchingEntries(matches);
      } catch (e) {
        setMatchingEntries([]);
      }
    }
  };

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'GET_CURRENT_URL' }, (response: { url?: string }) => {
        if (response?.url) {
          setCurrentUrl(response.url);
          if (isAuthenticated) {
            findMatchingEntries(response.url);
          }
        }
      });
    }
  }, [isAuthenticated, user, masterPassword]);

  const handleFillCredentials = (entry: IPasswordEntry) => {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'FILL_CREDENTIALS',
        username: entry.username,
        password: entry.password,
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="w-[380px] h-auto max-h-[580px] overflow-auto bg-background">
        <Auth onAuthenticated={handleAuthenticated} />
      </div>
    );
  }

  const displayedEntries = matchingEntries.filter(entry =>
    entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entry.username && entry.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className='zaha-container w-[380px] h-screen bg-background relative overflow-hidden flex flex-col'>
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[150px] h-[150px] bg-primary/20 blur-[60px] rounded-full animate-pulse opacity-40"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[150px] h-[150px] bg-blue-500/10 blur-[60px] rounded-full animate-pulse opacity-30 animation-delay-2000"></div>
      </div>

      {/* Header */}
      <div className="p-4 relative z-10 border-b border-white/5 bg-background/50 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-4">
          <img src="https://lens-vault-website.vercel.app/logo-transparent.png" className="w-8 h-8 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" alt="Lens Vault" />
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 font-outfit">Lens Vault</h1>
        </div>

        <Input
          type='search'
          placeholder='Search passwords...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="zaha-input w-full border-b border-white/10 focus:border-primary bg-white/5 rounded-t-lg"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10">
        {displayedEntries.length > 0 ? (
          <>
            <h2 className='text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3'>
              Matches for {new URL(currentUrl || 'http://localhost').hostname}
            </h2>
            {displayedEntries.map((entry) => (
              <div key={entry.id} className='zaha-card p-3 flex items-center justify-between group hover:border-primary/30'>
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-primary font-bold">
                    {entry.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className='font-bold text-white truncate'>{entry.name}</div>
                    <div className='text-xs text-muted-foreground truncate'>{entry.username}</div>
                  </div>
                </div>
                <Button
                  onClick={() => handleFillCredentials(entry)}
                  size="sm"
                  className="zaha-btn py-1 px-3 text-xs h-8 shadow-none hover:shadow-lg bg-primary hover:bg-primary/90"
                >
                  Fill
                </Button>
              </div>
            ))}
          </>
        ) : (
          <div className='flex flex-col items-center justify-center h-[200px] text-center text-muted-foreground p-4'>
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 15 6-6" /></svg>
            </div>
            <p>No matching passwords found.</p>
            <Button variant="link" className="text-primary mt-2" onClick={() => window.open('https://lens-vault.vercel.app', '_blank')}>
              Open Web Vault
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 bg-background/50 backdrop-blur-md relative z-10 flex justify-between items-center text-xs text-muted-foreground">
        <span>{user?.email}</span>
        <Button variant="ghost" size="sm" className="h-6 hover:text-white" onClick={() => setUser(null)} >Lock</Button>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
createRoot(rootElement).render(<Popup />);

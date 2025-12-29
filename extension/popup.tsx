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
    <div className='p-4 space-y-4 w-[380px] bg-background'>
      <Input
        type='search'
        placeholder='Search passwords...'
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {displayedEntries.length > 0 ? (
        <div className='space-y-2 max-h-[450px] overflow-y-auto'>
          <h2 className='text-sm font-medium'>Matching Passwords</h2>
          {displayedEntries.map((entry) => (
            <Card key={entry.id} className='p-3'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='font-medium'>{entry.name}</div>
                  <div className='text-sm text-muted-foreground'>{entry.username}</div>
                </div>
                <Button onClick={() => handleFillCredentials(entry)}>
                  Fill
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className='text-center text-muted-foreground py-4'>
          No matching passwords found for this site.
        </div>
      )}
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
createRoot(rootElement).render(<Popup />);

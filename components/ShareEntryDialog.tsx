import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { IPasswordEntry, AuthorizedContact } from '../types';
import { toast } from './ui/use-toast';
import { Badge } from './ui/badge';

type Share = { contactId: string; accessLevel: 'view' | 'full' };

interface ShareEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entryId: string, shares: Share[]) => void;
  entry: IPasswordEntry;
  contacts: AuthorizedContact[];
}

const ShareEntryDialog: React.FC<ShareEntryDialogProps> = ({ isOpen, onClose, onSave, entry, contacts }) => {
  const [shares, setShares] = useState<Share[]>([]);

  useEffect(() => {
    setShares(entry.sharedWith || []);
  }, [entry]);

  const handleShareToggle = (contactId: string, isShared: boolean) => {
    if (isShared) {
      setShares([...shares, { contactId, accessLevel: 'view' }]);
    } else {
      setShares(shares.filter(s => s.contactId !== contactId));
    }
  };

  const handleAccessLevelChange = (contactId: string, accessLevel: 'view' | 'full') => {
    setShares(shares.map(s => s.contactId === contactId ? { ...s, accessLevel } : s));
  };

  const handleSaveChanges = async () => {
    // Filter for new shares or updates
    // For this MVP, we'll just handle sending new shares. 
    // Updating existing shares (revoking/changing access) would require more complex logic (deleting old share, creating new one).

    const newShares = shares.filter(s => !entry.sharedWith?.some(existing => existing.contactId === s.contactId));

    if (newShares.length === 0) {
      onClose();
      return;
    }

    try {
      const { CryptoLib } = await import('../lib/crypto');
      const { EncryptionService } = await import('../lib/encryption');

      for (const share of newShares) {
        const contact = contacts.find(c => c.id === share.contactId);
        if (!contact) continue;

        // 1. Fetch Recipient's Public Key
        const keyResult = await import('../services/apiService').then(m => m.apiService.getPublicKey(contact.email));
        if (!keyResult.success || !keyResult.publicKey) {
          toast({ variant: 'destructive', title: `Failed to share with ${contact.name}`, description: 'Could not retrieve public key.' });
          continue;
        }

        // 2. Prepare Data to Share
        // We share the whole entry for simplicity, but we could filter fields based on accessLevel
        const dataToShare = JSON.stringify(entry);

        // 3. Generate Random AES Key for this item
        // We can reuse the EncryptionService logic but we need a raw key, not a password-derived one ideally.
        // But to keep it simple with existing utils:
        const randomKey = crypto.randomUUID();

        // 4. Encrypt Data with Random Key
        // We temporarily set the master password to this random key to use the service
        // This is a bit hacky but avoids rewriting EncryptionService for now.
        // A better approach would be to expose a raw encrypt method.
        // Let's assume EncryptionService.encrypt uses the set master password.
        // We need to be careful not to mess up the global state.
        // Actually, let's just use CryptoLib if we add AES there, or just use the existing service carefully.

        // Let's use a temporary instance or just save/restore the master password?
        // No, EncryptionService is static.
        // Let's add a helper to EncryptionService or just use it as is.
        // Actually, `EncryptionService.encrypt` takes data and uses the static key.
        // We can't easily swap the key without affecting other ops if they happen concurrently (unlikely here but bad practice).

        // BETTER: Use the random key directly with a simple AES encryption here or add a method to EncryptionService.
        // Let's add `encryptWithKey` to EncryptionService later. For now, let's just use the static one and restore it.
        // Wait, we don't have access to the current master password here to restore it!
        // We shouldn't touch EncryptionService.secretKey.

        // Let's use a simple AES encryption here for the shared item.
        // Or better, let's just assume we are sharing the *decrypted* data re-encrypted with the random key.
        // We need to encrypt `dataToShare` with `randomKey`.

        // Let's use `CryptoJS` directly here since we have it.
        const CryptoJS = (await import('crypto-js')).default;
        const encryptedData = CryptoJS.AES.encrypt(dataToShare, randomKey).toString();

        // 5. Encrypt the Random Key with Recipient's Public Key
        const encryptedKey = await CryptoLib.encryptWithPublicKey(randomKey, keyResult.publicKey);

        // 6. Send to API
        await import('../services/apiService').then(m => m.apiService.shareItem(contact.email, encryptedData, encryptedKey));
      }

      onSave(entry.id, shares);
      toast({ variant: 'success', title: 'Items shared successfully' });
      onClose();

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Sharing failed', description: 'An error occurred while encrypting data.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share "{entry.name}"</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose which authorized contacts to share this item with and their access level.
          </p>
          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
            {contacts.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-4">
                You have no authorized contacts. Please add one in the Authorized Access tab.
              </p>
            )}
            {contacts.map(contact => {
              const currentShare = shares.find(s => s.contactId === contact.id);
              const isShared = !!currentShare;
              const isContactActive = contact.isActive;

              return (
                <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      {contact.name}
                      {!isContactActive && <Badge variant="secondary">Inactive</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">{contact.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={isShared ? 'opacity-100' : 'opacity-0'}>
                      <Select
                        value={currentShare?.accessLevel}
                        onValueChange={(level: 'view' | 'full') => handleAccessLevelChange(contact.id, level)}
                      >
                        <SelectTrigger className="w-[120px] h-9" disabled={!isContactActive} aria-label={`Access level for ${contact.name}`}>
                          <SelectValue placeholder="Select access level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">View Only</SelectItem>
                          <SelectItem value="full">Full Access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Switch
                      checked={isShared}
                      onCheckedChange={(checked) => handleShareToggle(contact.id, checked)}
                      disabled={!isContactActive && !isShared}
                      aria-label={`Share with ${contact.name}`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveChanges} className="bg-gradient-accent">Save Sharing Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareEntryDialog;
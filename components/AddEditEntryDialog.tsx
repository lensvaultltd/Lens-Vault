import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Star, Eye, EyeOff, Clipboard, Paperclip, Trash2, Key, History, RotateCcw } from 'lucide-react';
import { IPasswordEntry, EntryType, Folder, Attachment, AuthorizedContact } from '../types';
import { toast } from './ui/use-toast';
import { PasswordGenerator } from './PasswordGenerator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';


// Fix: Declare chrome to satisfy TypeScript in extension environment.
declare const chrome: any;

interface AddEditEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<IPasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editEntry: IPasswordEntry | null;
  folders: Folder[];
  viewingAs: AuthorizedContact | null;
}

const HiddenFieldDisplay = ({ label, obscuredText, showCopy = false, valueToCopy = '' }: { label: string, obscuredText: string, showCopy?: boolean, valueToCopy?: string }) => {
    const copyToClipboard = async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast({ variant: 'success', title: 'Copied to clipboard' });
      } catch (err) {
        toast({ title: 'Failed to copy', variant: 'destructive' });
      }
    };
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted">
                <span className="italic text-muted-foreground font-mono">{obscuredText} (Hidden)</span>
                {showCopy && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => copyToClipboard(valueToCopy)}>
                        <Clipboard className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
};


const AddEditEntryDialog: React.FC<AddEditEntryDialogProps> = ({ isOpen, onClose, onSave, editEntry, folders, viewingAs }) => {
  const [type, setType] = useState<EntryType>('login');
  const [formData, setFormData] = useState({
      name: '', folder: '', favorite: false, tags: '',
      siteName: '', username: '', password: '', url: '', notes: '',
      bankName: '', accountType: '', routingNumber: '', accountNumber: '', swiftCode: '',
      cardholderName: '', cardNumber: '', expiryDate: '', cvv: '', pin: '', cardType: 'credit' as 'credit' | 'debit',
      firstName: '', lastName: '', email: '', phone: '', address: ''
  });
  const [revealedFields, setRevealedFields] = useState<{ [key: string]: boolean }>({});
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [revealedHistory, setRevealedHistory] = useState<Record<number, boolean>>({});
  const [revertConfirm, setRevertConfirm] = useState<{ password: string } | null>(null);

  const shareInfo = viewingAs && editEntry?.sharedWith?.find(s => s.contactId === viewingAs.id);
  const accessLevel = viewingAs ? shareInfo?.accessLevel : null;
  const isViewOnly = accessLevel === 'view';
  const isFullAccess = accessLevel === 'full';
  const isSharedView = isViewOnly || isFullAccess;

  useEffect(() => {
    if (editEntry) {
      setType(editEntry.type);
      setFormData({
        name: editEntry.name,
        folder: editEntry.folder || '',
        favorite: editEntry.favorite,
        tags: editEntry.tags.join(', '),
        siteName: editEntry.siteName || '',
        username: editEntry.username || '',
        password: editEntry.password || '',
        url: editEntry.url || '',
        notes: editEntry.notes || '',
        bankName: editEntry.bankName || '',
        accountType: editEntry.accountType || '',
        routingNumber: editEntry.routingNumber || '',
        accountNumber: editEntry.accountNumber || '',
        swiftCode: editEntry.swiftCode || '',
        cardholderName: editEntry.cardholderName || '',
        cardNumber: editEntry.cardNumber || '',
        expiryDate: editEntry.expiryDate || '',
        cvv: editEntry.cvv || '',
        pin: editEntry.pin || '',
        cardType: editEntry.cardType || 'credit',
        firstName: editEntry.firstName || '',
        lastName: editEntry.lastName || '',
        email: editEntry.email || '',
        phone: editEntry.phone || '',
        address: editEntry.address || '',
      });
      setAttachments(editEntry.attachments || []);
    } else {
      setType('login');
      setFormData({
        name: '', folder: '', favorite: false, tags: '',
        siteName: '', username: '', password: '', url: '', notes: '',
        bankName: '', accountType: '', routingNumber: '', accountNumber: '', swiftCode: '',
        cardholderName: '', cardNumber: '', expiryDate: '', cvv: '', pin: '', cardType: 'credit',
        firstName: '', lastName: '', email: '', phone: '', address: ''
      });
      setAttachments([]);
    }
    setRevealedHistory({});
    setRevertConfirm(null);
  }, [editEntry, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
            title: "File is too large",
            description: "Attachments must be smaller than 5MB.",
            variant: "destructive",
        });
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const newAttachment: Attachment = {
            name: file.name,
            type: file.type,
            data: reader.result as string,
        };
        setAttachments(prev => [...prev, newAttachment]);
    };
    reader.onerror = () => {
        toast({
            title: "Failed to read file",
            variant: "destructive",
        });
    };
    reader.readAsDataURL(file);
    
    if (e.target) {
        e.target.value = '';
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
        toast({ title: "Please enter a name for this entry", variant: "destructive" });
        return;
    }
    
    const entryData = {
        ...formData,
        type,
        name: formData.name.trim(),
        folder: formData.folder.trim(),
        favorite: formData.favorite,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        attachments,
    };
    onSave(entryData);
  };
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ variant: 'success', title: 'Copied to clipboard' });
    } catch (err) {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const toggleReveal = (field: string) => {
    setRevealedFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleGeneratedPassword = (password: string) => {
    setFormData({...formData, password});
    setShowPasswordGenerator(false);
  }

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // remove all non-digits
    if (value.length > 4) {
        value = value.slice(0, 4);
    }
    if (value.length > 2) {
        value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setFormData(prev => ({ ...prev, expiryDate: value }));
  };

  const handleAutofill = () => {
    if (!editEntry || !editEntry.username || !editEntry.password) {
        toast({ title: "Missing credentials to autofill", variant: "destructive" });
        return;
    }
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
            action: 'FILL_CREDENTIALS',
            username: editEntry.username,
            password: editEntry.password,
        }, () => {
            if (chrome.runtime.lastError) {
                 toast({ title: "Could not connect to extension.", description: "Are you on the correct website's tab?", variant: "destructive" });
            } else {
                 toast({ variant: "info", title: "Credentials sent to autofill." });
                 onClose();
            }
        });
    } else {
        copyToClipboard(editEntry.password);
        toast({ variant: 'info', title: "Password copied to clipboard", description: "Autofill requires the browser extension." });
    }
  };

  const handleRevertPassword = () => {
    if (revertConfirm) {
      setFormData(prev => ({ ...prev, password: revertConfirm.password }));
      toast({ variant: 'info', title: 'Password reverted in form', description: 'Click "Update Entry" to save this change.' });
      setRevertConfirm(null);
    }
  };

  const toggleRevealHistory = (index: number) => {
    setRevealedHistory(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const renderPasswordField = (id: string, label: string, value: string, onChange: (val: string) => void, placeholder: string, readOnly: boolean = false) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
            <Input
              id={id}
              type={revealedFields[id] ? 'text' : 'password'}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="font-mono"
              readOnly={readOnly}
            />
            {!readOnly && (
                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => toggleReveal(id)}>
                    {revealedFields[id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            )}
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => copyToClipboard(value)} disabled={!value}>
          <Clipboard className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderAttachmentsSection = () => (
    <div className="space-y-2">
        <Label>Attachments</Label>
        <div className="space-y-2">
            {attachments.map((att, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-md border bg-muted/50">
                    <span className="text-sm truncate">{att.name}</span>
                    {!isViewOnly && (
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveAttachment(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    )}
                </div>
            ))}
        </div>
        {!isViewOnly && (
            <>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                <Button type="button" variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="h-4 w-4" /> Add Attachment
                </Button>
            </>
        )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editEntry ? 'Edit Entry' : 'Add New Entry'}</DialogTitle>
        </DialogHeader>

        {showPasswordGenerator ? (
            <div className="space-y-4">
                <PasswordGenerator onPasswordGenerated={handleGeneratedPassword} />
                <Button variant="outline" onClick={() => setShowPasswordGenerator(false)} className="w-full">Back to Form</Button>
            </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs value={type} onValueChange={(v) => !isSharedView && setType(v as EntryType)} defaultValue={type}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="login" disabled={isSharedView && type !== 'login'}>Login</TabsTrigger>
                <TabsTrigger value="secure-note" disabled={isSharedView && type !== 'secure-note'}>Note</TabsTrigger>
                <TabsTrigger value="bank-account" disabled={isSharedView && type !== 'bank-account'}>Bank</TabsTrigger>
                <TabsTrigger value="credit-card" disabled={isSharedView && type !== 'credit-card'}>Card</TabsTrigger>
                <TabsTrigger value="identity" disabled={isSharedView && type !== 'identity'}>Identity</TabsTrigger>
              </TabsList>
              
              <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Entry name" required readOnly={isViewOnly}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="folder">Folder</Label>
                        <Input
                          id="folder"
                          list="folder-suggestions"
                          value={formData.folder}
                          onChange={e => setFormData({ ...formData, folder: e.target.value })}
                          placeholder="e.g., Social, Work (or create new)"
                          autoComplete="off"
                          readOnly={isViewOnly}
                        />
                        <datalist id="folder-suggestions">
                          {folders.map(f => <option key={f} value={f} />)}
                        </datalist>
                    </div>
                  </div>
                   <div className="flex items-center justify-between">
                        <Label htmlFor="favorite">Mark as Favorite</Label>
                        <div className="flex items-center gap-2">
                            <Switch id="favorite" checked={formData.favorite} onCheckedChange={val => setFormData({...formData, favorite: val})} disabled={isViewOnly} />
                            <Star className={`h-4 w-4 ${formData.favorite ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                        </div>
                    </div>
              </div>

              <TabsContent value="login" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input id="siteName" value={formData.siteName} onChange={e => setFormData({ ...formData, siteName: e.target.value })} placeholder="e.g., Jumia, Paystack" readOnly={isViewOnly}/>
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="url">Website URL</Label>
                    <Input id="url" type="url" value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} placeholder="https://example.com" readOnly={isViewOnly}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username/Email *</Label>
                     <div className="flex gap-2">
                        <Input id="username" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} placeholder="yourname@email.ng" required readOnly={isViewOnly}/>
                        <Button type="button" variant="outline" size="icon" onClick={() => copyToClipboard(formData.username)} disabled={!formData.username}>
                            <Clipboard className="h-4 w-4" />
                        </Button>
                    </div>
                  </div>
                  {isViewOnly ? (
                      <div className="space-y-2">
                          <Label>Password</Label>
                          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted">
                              <span className="italic text-muted-foreground font-mono">•••••••• (Hidden)</span>
                              <Button type="button" onClick={handleAutofill} className="gap-2 bg-gradient-accent">
                                  <Key className="h-4 w-4" /> Autofill Credentials
                              </Button>
                          </div>
                      </div>
                  ) : renderPasswordField("password", "Password *", formData.password, val => setFormData({...formData, password: val}), "Enter password", isViewOnly)}
                  {!isViewOnly && <Button type="button" variant="outline" size="sm" onClick={() => setShowPasswordGenerator(true)} className="w-full">Generate Strong Password</Button>}
                  {editEntry?.passwordHistory && editEntry.passwordHistory.length > 0 && !isViewOnly && (
                    <div className="space-y-3 pt-4 border-t">
                        <h4 className="font-semibold text-sm flex items-center gap-2"><History className="h-4 w-4"/> Password History</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {editEntry.passwordHistory.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-2 rounded-md border bg-muted/50">
                                    <div className="flex-1">
                                        <p className="text-sm font-mono">{revealedHistory[index] ? item.password : '••••••••••'}</p>
                                        <p className="text-xs text-muted-foreground">Used until: {new Date(item.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleRevealHistory(index)}>
                                            {revealedHistory[index] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRevertConfirm({ password: item.password })}>
                                            <RotateCcw className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  )}
              </TabsContent>
              <TabsContent value="secure-note" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Note Content *</Label>
                  <Textarea id="notes" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Enter your secure note here..." rows={8} required readOnly={isViewOnly}/>
                </div>
              </TabsContent>
              <TabsContent value="bank-account" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name *</Label>
                        <Input id="bankName" value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} placeholder="GTBank" required readOnly={isViewOnly} />
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="accountType">Account Type</Label>
                      <Select value={formData.accountType} onValueChange={val => setFormData({ ...formData, accountType: val })} defaultValue={formData.accountType}>
                          <SelectTrigger disabled={isViewOnly}>
                              <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="checking">Checking</SelectItem>
                              <SelectItem value="savings">Savings</SelectItem>
                              <SelectItem value="business">Business</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {isViewOnly ? <HiddenFieldDisplay label="Account Number *" obscuredText="••••••••••" /> : renderPasswordField("accountNumber", "Account Number *", formData.accountNumber, val => setFormData({...formData, accountNumber: val}), "0123456789", isViewOnly)}
                    {isViewOnly ? <HiddenFieldDisplay label="Routing Number" obscuredText="•••••••••" /> : renderPasswordField("routingNumber", "Routing Number", formData.routingNumber, val => setFormData({...formData, routingNumber: val}), "058152052", isViewOnly)}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {isViewOnly ? <HiddenFieldDisplay label="PIN" obscuredText="••••" /> : renderPasswordField("pin", "PIN", formData.pin, val => setFormData({...formData, pin: val}), "1234", isViewOnly)}
                     <div className="space-y-2">
                        <Label htmlFor="swiftCode">SWIFT/BIC Code</Label>
                        <Input id="swiftCode" value={formData.swiftCode} onChange={e => setFormData({ ...formData, swiftCode: e.target.value })} placeholder="GTBINGLA" readOnly={isViewOnly}/>
                    </div>
                  </div>
              </TabsContent>
               <TabsContent value="credit-card" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="cardholderName">Cardholder Name *</Label>
                          <Input id="cardholderName" value={formData.cardholderName} onChange={e => setFormData({ ...formData, cardholderName: e.target.value })} placeholder="Jane Doe" required readOnly={isViewOnly}/>
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="cardType">Card Type</Label>
                          <Select value={formData.cardType} onValueChange={(val: 'credit' | 'debit') => setFormData({ ...formData, cardType: val })}>
                              <SelectTrigger id="cardType" disabled={isViewOnly}>
                                  {formData.cardType === 'credit' ? 'Credit' : 'Debit'}
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="credit">Credit</SelectItem>
                                  <SelectItem value="debit">Debit</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                    </div>
                    {isViewOnly ? <HiddenFieldDisplay label="Card Number *" obscuredText="•••• •••• •••• ••••" /> : renderPasswordField("cardNumber", "Card Number *", formData.cardNumber, val => setFormData({...formData, cardNumber: val}), "1234 5678 9012 3456", isViewOnly)}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="expiryDate">Expiry Date</Label>
                            <Input id="expiryDate" value={formData.expiryDate} onChange={handleExpiryDateChange} placeholder="MM/YY" maxLength={5} readOnly={isViewOnly}/>
                        </div>
                        {isViewOnly ? <HiddenFieldDisplay label="CVV" obscuredText="•••" /> : renderPasswordField("cvv", "CVV", formData.cvv, val => setFormData({...formData, cvv: val}), "123", isViewOnly)}
                        {isViewOnly ? <HiddenFieldDisplay label="PIN" obscuredText="••••" /> : renderPasswordField("pin", "PIN", formData.pin, val => setFormData({...formData, pin: val}), "1234", isViewOnly)}
                    </div>
              </TabsContent>
              <TabsContent value="identity" className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name *</Label>
                            <Input id="firstName" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} placeholder="Ade" required readOnly={isViewOnly}/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name *</Label>
                            <Input id="lastName" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} placeholder="Adekunle" required readOnly={isViewOnly}/>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="ade.adekunle@email.ng" readOnly={isViewOnly}/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+234 801 234 5678" readOnly={isViewOnly}/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea id="address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="123 Allen Avenue, Ikeja, Lagos" rows={3} readOnly={isViewOnly}/>
                    </div>
              </TabsContent>
            </Tabs>
            
            {type !== 'secure-note' && (
                <div className="space-y-2">
                    <Label htmlFor="generalNotes">Notes</Label>
                    <Textarea id="generalNotes" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes (optional)" rows={3} readOnly={isViewOnly}/>
                </div>
            )}
            
            <div className="pt-2">{renderAttachmentsSection()}</div>

            <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input id="tags" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} placeholder="work, personal, important (comma-separated)" readOnly={isViewOnly}/>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {isViewOnly ? 'Close' : 'Cancel'}
              </Button>
              {!isViewOnly && <Button type="submit" className="bg-gradient-accent">{editEntry ? 'Update' : 'Save'} Entry</Button>}
            </DialogFooter>
          </form>
        )}

        <AlertDialog open={!!revertConfirm} onOpenChange={(open) => !open && setRevertConfirm(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Revert to Previous Password?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to revert to this password? The current password will be moved to the top of the history when you save.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRevertPassword}>
                        Yes, Revert
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </DialogContent>
    </Dialog>
  );
};

export default AddEditEntryDialog;
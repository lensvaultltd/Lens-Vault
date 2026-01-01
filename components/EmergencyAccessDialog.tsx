import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from './ui/use-toast';
import { AuthorizedContact } from '../types';
import { UserPlus, Mail, Clock, Shield, Trash2 } from 'lucide-react';
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
} from "./ui/alert-dialog";

interface AuthorizedAccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  authorizedContacts: AuthorizedContact[];
  onAddContact: (contact: Omit<AuthorizedContact, 'id' | 'createdAt'>) => void;
  onRemoveContact: (id: string) => void;
  onToggleContact: (id: string) => void;
}

const AuthorizedAccessDialog: React.FC<AuthorizedAccessDialogProps> = ({ isOpen, onClose, authorizedContacts, onAddContact, onRemoveContact, onToggleContact }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newContact, setNewContact] = useState({
        name: '',
        email: '',
        accessLevel: 'view' as 'view' | 'full',
        waitingPeriod: 7,
    });
    
    const handleAddContact = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContact.name.trim() || !newContact.email.trim()) {
            toast({ title: "Please fill in all required fields", variant: "destructive"});
            return;
        }
        if (!newContact.email.includes('@')) {
            toast({ title: "Please enter a valid email address", variant: "destructive"});
            return;
        }
        onAddContact({ ...newContact, isActive: true });
        setNewContact({ name: '', email: '', accessLevel: 'view', waitingPeriod: 7 });
        setShowAddForm(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Authorized Access</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="bg-muted p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                            <Shield className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                                <h3 className="font-medium text-primary">How Authorized Access Works</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Authorized contacts can request access to your vault. After the waiting period, they'll receive access unless you decline the request. This ensures your loved ones can access important information if needed.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Authorized Contacts ({authorizedContacts.length})</h3>
                        <Button onClick={() => setShowAddForm(true)} className="gap-2 bg-gradient-accent">
                            <UserPlus className="h-4 w-4" />
                            Add Contact
                        </Button>
                    </div>

                    {showAddForm && (
                        <Card>
                            <CardHeader><CardTitle>Add Authorized Contact</CardTitle></CardHeader>
                            <CardContent>
                                <form onSubmit={handleAddContact} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Full Name *</Label>
                                            <Input id="name" value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} placeholder="Jane Doe" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address *</Label>
                                            <Input id="email" type="email" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} placeholder="jane.doe@email.ng" required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Access Level</Label>
                                            <Select value={newContact.accessLevel} onValueChange={(val: 'view' | 'full') => setNewContact({...newContact, accessLevel: val})} defaultValue={newContact.accessLevel}>
                                                <SelectTrigger><SelectValue placeholder="Select access level"/></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="view">View Only</SelectItem>
                                                    <SelectItem value="full">Full Access</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Waiting Period (days)</Label>
                                             <Select value={newContact.waitingPeriod.toString()} onValueChange={val => setNewContact({...newContact, waitingPeriod: parseInt(val)})} defaultValue={newContact.waitingPeriod.toString()}>
                                                <SelectTrigger><SelectValue placeholder="Select waiting period"/></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">1 day</SelectItem>
                                                    <SelectItem value="3">3 days</SelectItem>
                                                    <SelectItem value="7">7 days</SelectItem>
                                                    <SelectItem value="14">14 days</SelectItem>
                                                    <SelectItem value="30">30 days</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="submit" className="bg-gradient-accent">Add Contact</Button>
                                        <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}
                    
                    <div className="space-y-3">
                        {authorizedContacts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <UserPlus className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50"/>
                                <p>No authorized contacts added yet</p>
                                <p className="text-sm">Add trusted contacts who can access your vault in emergencies</p>
                            </div>
                        ) : authorizedContacts.map(contact => (
                            <Card key={contact.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="font-medium">{contact.name}</h4>
                                                <Badge variant={contact.isActive ? 'default' : 'secondary'}>{contact.isActive ? 'Active' : 'Inactive'}</Badge>
                                                <Badge variant="outline">{contact.accessLevel === 'view' ? 'View Only' : 'Full Access'}</Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1"><Mail className="h-3 w-3"/>{contact.email}</div>
                                                <div className="flex items-center gap-1"><Clock className="h-3 w-3"/>{contact.waitingPeriod} day waiting period</div>
                                            </div>
                                             <div className="text-xs text-muted-foreground/80 mt-1">Added: {new Date(contact.createdAt).toLocaleDateString()}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => onToggleContact(contact.id)}>{contact.isActive ? 'Deactivate' : 'Activate'}</Button>
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Remove Authorized Contact</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to remove "{contact.name}" as an authorized contact? They will no longer be able to request access to your vault.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                      <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => onRemoveContact(contact.id)}>Remove Contact</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default AuthorizedAccessDialog;
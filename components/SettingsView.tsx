import React from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';
import { RedemptionService } from '../services/redemptionService';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "./ui/dialog";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from './ui/card';
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
import {
    FileDown,
    FileUp,
    Key,
    Trash2,
    ShieldAlert
} from 'lucide-react';
import Billing from './Billing';
import { User, Subscription } from '../types';

interface SettingsViewProps {
    user: User;
    subscription: Subscription;
    onPlanChange: (plan: 'free' | 'premium' | 'family' | 'business') => void;
    onImportExportOpen: () => void;
    onChangePassword: () => void;
    onClearData: () => void;
    onDeleteAccount: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
    user,
    subscription,
    onPlanChange,
    onImportExportOpen,
    onChangePassword,
    onClearData,
    onDeleteAccount,
}) => {
    const { toast } = useToast();
    const [isClearDataAlertOpen, setIsClearDataAlertOpen] = React.useState(false);
    const [isChangePasswordAlertOpen, setIsChangePasswordAlertOpen] = React.useState(false);

    // Redemption State
    const [redeemCode, setRedeemCode] = React.useState('');
    const [isRedeeming, setIsRedeeming] = React.useState(false);

    const handleRedeem = async () => {
        if (!redeemCode) return;
        setIsRedeeming(true);
        const result = await RedemptionService.redeemCode(redeemCode, user.id);
        setIsRedeeming(false);

        if (result.success) {
            toast({
                title: "🎉 Code Redeemed!",
                description: "You've successfully unlocked 2 months of Premium access.",
                className: "bg-green-500 border-none text-white"
            });
            setRedeemCode('');
            // Typically we'd reload the subscription here, forcing a refresh might be needed or user can refresh page
            setTimeout(() => window.location.reload(), 1500);
        } else {
            toast({
                title: "Redemption Failed",
                description: result.error || "Invalid or expired code.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-8">
            <Billing subscription={subscription} onPlanChange={onPlanChange} email={user.email} />

            <Card>
                <CardHeader>
                    <CardTitle>Promotions</CardTitle>
                    <CardDescription>Redeem special codes for premium access</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-end max-w-sm">
                        <div className="grid w-full items-center gap-1.5">
                            <label htmlFor="promo-code" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Enter Code
                            </label>
                            <Input
                                id="promo-code"
                                placeholder="e.g. LAUNCH20"
                                value={redeemCode}
                                onChange={(e) => setRedeemCode(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleRedeem} disabled={!redeemCode || isRedeeming} className="bg-gradient-accent">
                            {isRedeeming ? 'Validating...' : 'Redeem'}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Only one active promotion can be applied per account.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Data Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="font-semibold">Data Storage</h3>
                        <p className="text-sm text-muted-foreground">
                            Your encrypted data is securely stored in the cloud. You can access it from any device.
                        </p>
                    </div>
                    <div className="pt-4 border-t space-y-4">
                        <h3 className="font-semibold">Import & Export</h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button onClick={onImportExportOpen} className="gap-2 bg-gradient-accent">
                                <FileDown className="h-4 w-4" /> Import from Other Services
                            </Button>
                            <Button variant="outline" onClick={onImportExportOpen} className="gap-2">
                                <FileUp className="h-4 w-4" /> Export My Data
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">Import passwords from LastPass, Chrome, 1Password, or export your data for backup. Supports CSV and JSON formats.</p>
                    </div>
                    <div className="pt-4 border-t space-y-2">
                        <h3 className="font-semibold">Security</h3>
                        <AlertDialog open={isChangePasswordAlertOpen} onOpenChange={setIsChangePasswordAlertOpen}>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="gap-2"><Key className="h-4 w-4" />Change Master Password</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Change Master Password</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        For your security in our zero-knowledge system, changing your master password requires resetting your account. This will permanently delete your current encrypted vault.
                                        <br /><br />
                                        You will be guided through a secure verification process using passkeys and 2FA. After verification, you will be logged out and can create a new master password for your new vault.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={onChangePassword}>
                                        Proceed with Secure Reset
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <p className="text-xs text-muted-foreground/80 mt-1">This will start a secure reset process. Your current vault data will be deleted.</p>
                    </div>
                    <div className="pt-4 border-t space-y-2">
                        <h3 className="font-semibold text-destructive">Danger Zone</h3>
                        <div className="flex flex-col gap-4">
                            <div>
                                <AlertDialog open={isClearDataAlertOpen} onOpenChange={setIsClearDataAlertOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" className="gap-2 text-destructive border-destructive/50 hover:bg-destructive/10"><Trash2 className="h-4 w-4" />Clear Vault Data Only</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Clear Vault Data?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will remove all passwords and folders but keep your account active.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction variant="destructive" onClick={onClearData}>
                                                Yes, Clear Data
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <p className="text-xs text-muted-foreground/80 mt-1">Removes encrypted data but keeps your account.</p>
                            </div>

                            <div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="gap-2 w-full sm:w-auto"><ShieldAlert className="h-4 w-4" />Delete Account Permanently</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This is IRREVERSIBLE. Your account, subscription, and ALL encrypted data will be permanently wiped from our servers.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction variant="destructive" onClick={onDeleteAccount}>
                                                Yes, Delete Everything
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <p className="text-xs text-muted-foreground/80 mt-1">Permanently deletes your user account and all associated data.</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Feedback</CardTitle>
                    <CardDescription>Help us improve Lens Vault.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button
                                className="w-full sm:w-auto mt-2 backdrop-blur-md bg-slate-900/5 hover:bg-slate-900/10 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-900/10 dark:border-white/20 text-slate-900 dark:text-white shadow-sm transition-all duration-300 group"
                            >
                                <span className="mr-2 group-hover:scale-110 transition-transform">✨</span>
                                Send Feedback
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Send Feedback</DialogTitle>
                                <DialogDescription>
                                    Tell us what you love or what we can do better. Your privacy is respected.
                                </DialogDescription>
                            </DialogHeader>
                            <FeedbackForm userEmail={user.email} />
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        </div>
    );
};

const FeedbackForm = ({ userEmail }: { userEmail: string }) => {
    const { toast } = useToast();
    const [message, setMessage] = React.useState('');
    const [includeEmail, setIncludeEmail] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async () => {
        if (!message.trim()) {
            toast({ title: "Please enter a message.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        // Dynamically import apiService to avoid circular dependency issues if any, though here it's fine.
        // Assuming apiService is imported at top or available. 
        // We need to import it if not present. It is imported in the file.
        const { apiService } = await import('../services/apiService');

        const result = await apiService.submitFeedback(message, includeEmail, userEmail);
        setIsSubmitting(false);

        if (result.success) {
            toast({ title: "Feedback Sent!", description: "Thank you for helping us improve." });
            setMessage('');
            setIncludeEmail(false);
        } else {
            toast({ title: "Error", description: "Could not send feedback. Please try again.", variant: "destructive" });
        }
    };

    return (
        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Input
                    id="feedback-message"
                    placeholder="Type your feedback here..."
                    className="h-24 pb-16" // Simulating textarea height with input if needed, or better use Textarea
                    as="textarea"
                    value={message}
                    onChange={(e: any) => setMessage(e.target.value)}
                />
            </div>
            <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id="include-email"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={includeEmail}
                    onChange={(e) => setIncludeEmail(e.target.checked)}
                />
                <label
                    htmlFor="include-email"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Include my email for follow-up
                </label>
            </div>
            <DialogFooter>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-gradient-accent">
                    {isSubmitting ? 'Sending...' : 'Send Feedback'}
                </Button>
            </DialogFooter>
        </div>
    );
};

export default SettingsView;

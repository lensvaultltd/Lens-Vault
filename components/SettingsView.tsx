import { Input } from './ui/input';
import { useToast } from './ui/use-toast';
import { RedemptionService } from '../services/redemptionService';

// ... (previous imports)

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
        </div>
    );
};

export default SettingsView;

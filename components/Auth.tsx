import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Eye, EyeOff } from 'lucide-react';
import { apiService } from '../services/apiService';
import { toast } from './ui/use-toast';
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
import { User } from '../types';

interface AuthProps {
  onAuthenticated: (user: User, masterPassword: string) => void;
}

const AuthForm = ({
  isLoginView,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  isPasswordVisible,
  setIsPasswordVisible,
  error,
  isLoading,
  handleSubmit,
  onSwitchView,
  onForgotPassword,
}: {
  isLoginView: boolean;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  isPasswordVisible: boolean;
  setIsPasswordVisible: (value: boolean) => void;
  error: string;
  isLoading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  onSwitchView: () => void;
  onForgotPassword: () => void;
}) => (
  <form onSubmit={handleSubmit} className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        disabled={isLoading}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="password">Master Password</Label>
      <div className="relative">
        <Input
          id="password"
          type={isPasswordVisible ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your master password"
          required
          disabled={isLoading}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setIsPasswordVisible(!isPasswordVisible)}
          disabled={isLoading}
          aria-label={isPasswordVisible ? "Hide password" : "Show password"}
        >
          {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
    {!isLoginView && (
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your master password"
          required
          disabled={isLoading}
        />
      </div>
    )}
    {error && (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )}
    <Button type="submit" className="w-full bg-gradient-accent" disabled={isLoading}>
      {isLoading ? 'Processing...' : (isLoginView ? 'Unlock Vault' : 'Create Vault')}
    </Button>
    <div className="text-center text-sm">
      {isLoginView ? (
        <>
          <a href="#" onClick={(e) => { e.preventDefault(); onSwitchView(); }} className="text-primary hover:underline">
            Create a new account
          </a>
          <span className="mx-2 text-muted-foreground">|</span>
          <a href="#" onClick={(e) => { e.preventDefault(); onForgotPassword(); }} className="text-primary hover:underline">
            Forgot password?
          </a>
        </>
      ) : (
        <a href="#" onClick={(e) => { e.preventDefault(); onSwitchView(); }} className="text-primary hover:underline">
          Already have an account? Log in
        </a>
      )}
    </div>
  </form>
);

const ForgotPasswordForm = ({
  email,
  setEmail,
  isLoading,
  handleResetPassword,
  onBackToLogin,
}: {
  email: string;
  setEmail: (value: string) => void;
  isLoading: boolean;
  handleResetPassword: () => void;
  onBackToLogin: () => void;
}) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="email-reset">Email</Label>
      <Input
        id="email-reset"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email to reset password"
        required
        disabled={isLoading}
      />
    </div>
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="w-full bg-gradient-accent" disabled={isLoading || !email}>
          {isLoading ? 'Processing...' : 'Send Reset Link'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Password</AlertDialogTitle>
          <AlertDialogDescription>
            We will send a password reset link to <strong>{email}</strong>.
            <br /><br />
            <span className="text-destructive font-bold">Warning:</span> Because your vault is encrypted with your master password, resetting it means you will <strong>lose access to your current vault data</strong> unless you have a separate backup.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleResetPassword}>
            Send Email
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <Button variant="outline" className="w-full" onClick={onBackToLogin}>
      Back to Login
    </Button>
  </div>
);

const Auth: React.FC<AuthProps> = ({ onAuthenticated }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [isForgotPasswordView, setIsForgotPasswordView] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (isLoginView) {
      // Login
      const result = await apiService.login(email, password);
      if (result.success && result.user) {
        // Pass user, password, and keys (if available) to onAuthenticated
        onAuthenticated(result.user, password, result.keys);
      } else {
        setError(result.message);
      }
    } else {
      // Sign Up
      if (password.length < 8) {
        setError('Master password must be at least 8 characters long');
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      try {
        // Generate RSA Key Pair
        const { CryptoLib } = await import('../lib/crypto');
        const keys = await CryptoLib.generateKeyPair();

        // Encrypt Private Key with Master Password
        // Note: In a real app, we'd derive a separate key for this, but for this demo we use the master password hash logic or similar.
        // Ideally, we should encrypt the private key with the master password.
        // For now, let's use the EncryptionService to encrypt it.
        // We need to set the master password first.
        const { EncryptionService } = await import('../lib/encryption');
        EncryptionService.setMasterPassword(password);
        const encryptedPrivateKey = EncryptionService.encrypt(keys.privateKey);

        const result = await apiService.signup(email, password, keys.publicKey, encryptedPrivateKey);

        if (result.success) {
          toast({ variant: 'success', title: 'Account created!', description: 'Vault initialized.' });

          // Auto-login logic
          // Construct minimal user object
          const newUser: User = {
            id: 'temp-id', // Will be updated on next fetch
            email: email,
            subscription: 'free',
            isAdmin: false,
            createdAt: new Date(),
          };

          // Proceed directly to app
          onAuthenticated(newUser, password);
        } else {
          setError(result.message);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to generate security keys.');
      }
    }
    setIsLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast({ variant: 'destructive', title: 'Please enter your email address.' });
      return;
    }
    setIsLoading(true);
    // Use the renamed method
    const result = await apiService.requestPasswordReset(email);
    if (result.success) {
      toast({ variant: 'success', title: 'Check your email', description: result.message, duration: 10000 });
      setIsForgotPasswordView(false);
      setIsLoginView(true);
      setPassword('');
      // Info about vault loss
      toast({ variant: 'default', title: 'Important', description: 'After resetting, your old vault will be inaccessible. You will need to create a new one.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsLoading(false);
  };

  const onSwitchView = () => {
    setIsLoginView(!isLoginView);
    setError('');
  };

  const onForgotPassword = () => {
    setIsForgotPasswordView(true);
    setError('');
  };

  const onBackToLogin = () => {
    setIsForgotPasswordView(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out-expo w-full max-w-md">
        <Card className="w-full border-opacity-50 shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto bg-primary/5 p-4 rounded-full w-fit mb-2">
              <img src="/logo-transparent.png" alt="Lens Vault logo" className="h-16 w-auto" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight">
                {isForgotPasswordView ? 'Reset Password' : (isLoginView ? 'Welcome Back' : 'Create Account')}
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground/80">
                {isForgotPasswordView ? 'Reset your master password via email link. Note: You will lose access to your current vault data.' : (isLoginView ? 'Enter your credentials to unlock your vault' : 'Create an account to start securing your digital life')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isForgotPasswordView ? (
              <ForgotPasswordForm
                email={email}
                setEmail={setEmail}
                isLoading={isLoading}
                handleResetPassword={handleResetPassword}
                onBackToLogin={onBackToLogin}
              />
            ) : (
              <AuthForm
                isLoginView={isLoginView}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                isPasswordVisible={isPasswordVisible}
                setIsPasswordVisible={setIsPasswordVisible}
                error={error}
                isLoading={isLoading}
                handleSubmit={handleSubmit}
                onSwitchView={onSwitchView}
                onForgotPassword={onForgotPassword}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;

import { EncryptionService } from '../lib/encryption';
import { IPasswordEntry, Folder, AuthorizedContact, User } from '../types';
import { supabase } from '../lib/supabase';

// Helper for API requests
const request = async (endpoint: string, options: RequestInit = {}) => {
  // Get Supabase Session Token
  let token = null;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    token = session.access_token;
  }

  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }


  // Use environment variable for API URL or fallback to localhost for development
  const BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api';

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  const data = await res.json();
  return data;
};

export const apiService = {
  async signup(email: string, masterPassword: string, publicKey?: string, encryptedPrivateKey?: string): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Create User in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: masterPassword,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user returned from Supabase Auth");

      const token = authData.session?.access_token;
      const masterPasswordHash = EncryptionService.hashPassword(masterPassword);

      console.log("Signup: Supabase user created. Syncing with backend...");

      // 2. Sync user data with backend (create vault, store keys)
      // Note: If email confirmation is enabled, session might be null here.
      // For this app, we assume email confirmation is off or we handle it gracefully.
      if (!token) {
        return { success: true, message: 'Account created. Please verify your email to log in.' };
      }

      return await request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ token, email, masterPasswordHash, publicKey, encryptedPrivateKey }),
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      let message = "Signup failed.";
      if (error.message) message = error.message;
      return { success: false, message };
    }
  },

  async login(email: string, masterPassword: string): Promise<{ success: boolean; message: string; user?: User; keys?: { publicKey: string; encryptedPrivateKey: string } }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: masterPassword,
      });

      if (error) throw error;
      const token = data.session.access_token;
      const masterPasswordHash = EncryptionService.hashPassword(masterPassword);

      return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ token, email, masterPasswordHash }),
      });
    } catch (error: any) {
      console.error("Login error:", error);
      let message = "Login failed.";
      if (error.message === 'Invalid login credentials') message = "Invalid email or password.";
      return { success: false, message };
    }
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      await supabase.auth.signOut();
      return request('/auth/logout', { method: 'POST' });
    } catch (error) {
      return { success: false, message: "Logout failed locally" };
    }
  },

  async checkSession(): Promise<{ success: boolean; user?: User }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false };
    return request('/auth/me');
  },

  async getVault(email: string, masterPassword: string): Promise<{ success: boolean; data?: { passwords: IPasswordEntry[], folders: Folder[], authorizedContacts: AuthorizedContact[] }, message: string }> {
    const result = await request('/vault'); // Token attached automatically

    if (!result.success) {
      return result;
    }

    if (!result.data) {
      // New vault or empty
      return { success: true, data: { passwords: [], folders: [], authorizedContacts: [] }, message: 'New vault created.' };
    }

    try {
      EncryptionService.setMasterPassword(masterPassword);
      const decrypted = EncryptionService.decrypt(result.data);
      const data = JSON.parse(decrypted);
      // Ensure date fields are converted back to Date objects
      data.passwords = (data.passwords || []).map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
        passwordHistory: (p.passwordHistory || []).map((h: any) => ({ ...h, date: new Date(h.date) }))
      }));
      data.authorizedContacts = (data.authorizedContacts || []).map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) }));
      return { success: true, data, message: 'Vault fetched successfully.' };
    } catch (error) {
      return { success: false, message: 'Failed to decrypt vault. Master password may be incorrect.' };
    }
  },

  async saveVault(email: string, masterPassword: string, vaultData: { passwords: IPasswordEntry[], folders: Folder[], authorizedContacts: AuthorizedContact[] }): Promise<{ success: boolean; message: string }> {
    try {
      EncryptionService.setMasterPassword(masterPassword);
      const encryptedData = EncryptionService.encrypt(JSON.stringify(vaultData));
      return request('/vault', {
        method: 'PUT',
        body: JSON.stringify({ encryptedData }),
      });
    } catch (error) {
      return { success: false, message: 'Failed to encrypt and save vault.' };
    }
  },

  async getPublicKey(email: string): Promise<{ success: boolean; publicKey?: string; message?: string }> {
    return request(`/auth/keys/${email}`);
  },

  async shareItem(recipientEmail: string, encryptedData: string, encryptedKey: string): Promise<{ success: boolean; message: string }> {
    return request('/share', {
      method: 'POST',
      body: JSON.stringify({ recipientEmail, encryptedData, encryptedKey })
    });
  },

  async getSharedItems(): Promise<{ success: boolean; items?: any[]; message?: string }> {
    console.log("Fetching shared items...");
    return request('/share');
  },

  async deleteSharedItem(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/share/${id}`, { method: 'DELETE' });
  },

  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    return request('/auth/me', { method: 'DELETE' });
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password', // Ensure this route exists or goes to home
      });
      if (error) throw error;
      return { success: true, message: "Password reset link sent to your email." };
    } catch (error: any) {
      console.error("Reset password error:", error);
      return { success: false, message: error.message || "Failed to send reset email." };
    }
  },

  async getPlans(): Promise<{ success: boolean; plans?: any[]; message?: string }> {
    return request('/billing/plans');
  },

  async subscribe(planId: string, cycle: 'monthly' | 'yearly'): Promise<{ success: boolean; message: string }> {
    return request('/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify({ planId, cycle })
    });
  },

  cancelSubscription(): Promise<{ success: boolean; message: string }> {
    return request('/billing/cancel', { method: 'POST' });
  },

  async verifyPayment(reference: string, planId: string, cycle: string) {
    return request('/billing/verify', {
      method: 'POST',
      body: JSON.stringify({ reference, planId, cycle }),
    });
  },
};
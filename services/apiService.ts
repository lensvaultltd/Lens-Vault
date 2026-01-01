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

      console.log("Signup: Supabase user created successfully");

      // 2. Store user keys in Supabase database if provided
      if (publicKey && encryptedPrivateKey && authData.user) {
        const { error: keysError } = await supabase
          .from('users')
          .update({
            public_key: publicKey,
            encrypted_private_key: encryptedPrivateKey
          })
          .eq('id', authData.user.id);

        if (keysError) {
          console.error("Failed to store keys:", keysError);
        }
      }

      // 3. Check if email confirmation is required
      if (!authData.session) {
        return { success: true, message: 'Account created. Please verify your email to log in.' };
      }

      return { success: true, message: 'Account created successfully!' };
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
      if (!data.user) throw new Error("No user returned from Supabase");

      console.log("Login: Supabase auth successful");

      // Fetch user data from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        console.error("Failed to fetch user data:", userError);
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        subscription: (userData?.subscription_plan as any) || 'free',
        isAdmin: userData?.is_admin || false,
        createdAt: new Date(data.user.created_at),
      };

      // Return keys if available
      const keys = userData?.public_key && userData?.encrypted_private_key
        ? {
          publicKey: userData.public_key,
          encryptedPrivateKey: userData.encrypted_private_key
        }
        : undefined;

      return { success: true, message: 'Login successful', user, keys };
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
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      return { success: false, message: "Logout failed" };
    }
  },

  async checkSession(): Promise<{ success: boolean; user?: User }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false };
    return request('/auth/me');
  },

  async getVault(email: string, masterPassword: string): Promise<{ success: boolean; data?: { passwords: IPasswordEntry[], folders: Folder[], authorizedContacts: AuthorizedContact[] }, message: string }> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, message: 'Not authenticated' };
      }

      // Fetch vault data from Supabase
      const { data: vaultData, error } = await supabase
        .from('vaults')
        .select('encrypted_data')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no vault exists yet, return empty vault
        if (error.code === 'PGRST116') {
          return { success: true, data: { passwords: [], folders: [], authorizedContacts: [] }, message: 'New vault created.' };
        }
        throw error;
      }

      if (!vaultData || !vaultData.encrypted_data) {
        // New vault or empty
        return { success: true, data: { passwords: [], folders: [], authorizedContacts: [] }, message: 'New vault created.' };
      }

      // Decrypt vault data
      EncryptionService.setMasterPassword(masterPassword);
      const decrypted = EncryptionService.decrypt(vaultData.encrypted_data);
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
    } catch (error: any) {
      console.error('getVault error:', error);
      return { success: false, message: 'Failed to decrypt vault. Master password may be incorrect.' };
    }
  },

  async saveVault(email: string, masterPassword: string, vaultData: { passwords: IPasswordEntry[], folders: Folder[], authorizedContacts: AuthorizedContact[] }): Promise<{ success: boolean; message: string }> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, message: 'Not authenticated' };
      }

      // Encrypt vault data
      EncryptionService.setMasterPassword(masterPassword);
      const encryptedData = EncryptionService.encrypt(JSON.stringify(vaultData));

      // Save to Supabase (upsert)
      const { error } = await supabase
        .from('vaults')
        .upsert({
          user_id: user.id,
          encrypted_data: encryptedData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      return { success: true, message: 'Vault saved successfully.' };
    } catch (error: any) {
      console.error('saveVault error:', error);
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
        redirectTo: 'https://lensvault.vercel.app/reset-password',
      });
      if (error) throw error;
      return { success: true, message: "Password reset link sent to your email. Check your inbox!" };
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

  async submitFeedback(message: string, includeEmail: boolean, userEmail?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Direct insertion to Supabase 'feedback' table
      const feedbackData: any = {
        message,
        created_at: new Date().toISOString(),
      };

      if (includeEmail && userEmail) {
        feedbackData.email = userEmail;
      }

      const { error } = await supabase.from('feedback').insert(feedbackData);

      if (error) {
        // If table doesn't exist or RLS blocks it, we might want to log it specifically
        console.error("Feedback insert error:", error);
        throw new Error("Could not submit feedback.");
      }

      return { success: true, message: "Feedback sent successfully!" };
    } catch (error: any) {
      console.error("Feedback error:", error);
      return { success: false, message: "Failed to send feedback." };
    }
  }
};
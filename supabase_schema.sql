-- ============================================
-- 1. USERS TABLE (synced with auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'premium', 'family')),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_sign_in_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin) WHERE is_admin = TRUE;

-- ============================================
-- 2. FOLDERS TABLE (must be before vault_items)
-- ============================================
CREATE TABLE IF NOT EXISTS public.folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders(user_id);

-- ============================================
-- 3. VAULTS TABLE (encrypted passwords)
-- ============================================
CREATE TABLE IF NOT EXISTS public.vaults (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  encrypted_data TEXT NOT NULL,
  master_password_hash TEXT,
  salt TEXT,
  iv TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vaults_user_id ON public.vaults(user_id);

-- ============================================
-- 4. VAULT ITEMS TABLE (individual passwords)
-- ============================================
CREATE TABLE IF NOT EXISTS public.vault_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  url TEXT,
  username_enc TEXT NOT NULL,
  password_enc TEXT NOT NULL,
  notes_enc TEXT,
  strength_score INT,
  is_compromised BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_items_owner_id ON public.vault_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_folder_id ON public.vault_items(folder_id);

-- ============================================
-- 5. SHARED ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.shared_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_items_user_id ON public.shared_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_items_shared_with ON public.shared_items(shared_with_email);

-- ============================================
-- 6. TIMED SHARES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.timed_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_email TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  encrypted_data TEXT NOT NULL, 
  release_date TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('pending', 'released', 'revoked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timed_shares_sender ON public.timed_shares(sender_email);
CREATE INDEX IF NOT EXISTS idx_timed_shares_recipient ON public.timed_shares(recipient_email);

-- ============================================
-- 7. EMERGENCY REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.emergency_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_email TEXT NOT NULL,
  target_user_email TEXT NOT NULL,
  proof_document_url TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  admin_notes TEXT,
  approved_at TIMESTAMPTZ,
  granted_vault_data TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_requests_requester ON public.emergency_requests(requester_email);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_target ON public.emergency_requests(target_user_email);

-- ============================================
-- 8. DIGITAL WILL CONFIG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.digital_will_config (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  beneficiary_email TEXT,
  condition TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. BREACH CHECKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.breach_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  is_breached BOOLEAN DEFAULT FALSE,
  breach_count INTEGER DEFAULT 0,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_breach_checks_user_id ON public.breach_checks(user_id);

-- ============================================
-- 10. SECURE NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.secure_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  encrypted_content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secure_notes_user_id ON public.secure_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_secure_notes_tags ON public.secure_notes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_secure_notes_favorite ON public.secure_notes(user_id, is_favorite) WHERE is_favorite = TRUE;

-- ============================================
-- 11. BIOMETRIC CREDENTIALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.biometric_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0,
  device_type TEXT,
  device_name TEXT,
  transports TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_biometric_credentials_user_id ON public.biometric_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_credential_id ON public.biometric_credentials(credential_id);

-- ============================================
-- 12. AUTHORIZED CONTACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.authorized_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contact_email TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  access_level TEXT CHECK (access_level IN ('view', 'full')) DEFAULT 'view',
  waiting_period_days INT DEFAULT 7,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_authorized_contacts_user_id ON public.authorized_contacts(user_id);

-- ============================================
-- 13. ACCESS LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status TEXT CHECK (status IN ('verified', 'denied', 'pending')),
  device_info TEXT,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON public.access_logs(user_id);

-- ============================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timed_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_will_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breach_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secure_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorized_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Vaults policies
DROP POLICY IF EXISTS "Users can CRUD own vaults" ON public.vaults;
CREATE POLICY "Users can CRUD own vaults" ON public.vaults FOR ALL USING (auth.uid() = user_id);

-- Folders policies
DROP POLICY IF EXISTS "Users can CRUD own folders" ON public.folders;
CREATE POLICY "Users can CRUD own folders" ON public.folders FOR ALL USING (auth.uid() = user_id);

-- Vault items policies
DROP POLICY IF EXISTS "Users can view own vault items" ON public.vault_items;
CREATE POLICY "Users can view own vault items" ON public.vault_items FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can create own vault items" ON public.vault_items;
CREATE POLICY "Users can create own vault items" ON public.vault_items FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own vault items" ON public.vault_items;
CREATE POLICY "Users can update own vault items" ON public.vault_items FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own vault items" ON public.vault_items;
CREATE POLICY "Users can delete own vault items" ON public.vault_items FOR DELETE USING (auth.uid() = owner_id);

-- Shared items policies
DROP POLICY IF EXISTS "Users can CRUD own shared items" ON public.shared_items;
CREATE POLICY "Users can CRUD own shared items" ON public.shared_items FOR ALL USING (auth.uid() = user_id);

-- Secure notes policies
DROP POLICY IF EXISTS "Users can CRUD own notes" ON public.secure_notes;
CREATE POLICY "Users can CRUD own notes" ON public.secure_notes FOR ALL USING (auth.uid() = user_id);

-- Biometric credentials policies
DROP POLICY IF EXISTS "Users can CRUD own credentials" ON public.biometric_credentials;
CREATE POLICY "Users can CRUD own credentials" ON public.biometric_credentials FOR ALL USING (auth.uid() = user_id);

-- Other policies
DROP POLICY IF EXISTS "Users can CRUD own breach checks" ON public.breach_checks;
CREATE POLICY "Users can CRUD own breach checks" ON public.breach_checks FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own digital will" ON public.digital_will_config;
CREATE POLICY "Users can CRUD own digital will" ON public.digital_will_config FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can CRUD own contacts" ON public.authorized_contacts;
CREATE POLICY "Users can CRUD own contacts" ON public.authorized_contacts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert access logs" ON public.access_logs;
CREATE POLICY "Users can insert access logs" ON public.access_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own logs" ON public.access_logs;
CREATE POLICY "Users can view own logs" ON public.access_logs FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- 15. TRIGGERS FOR AUTH SYNC
-- ============================================

-- IMPORTANT: These triggers must be created on auth.users table
-- They sync authentication events to public.users table

-- Function 1: Auto-create user in public.users when auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (NEW.id, NEW.email, NEW.created_at)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users (requires superuser or supabase_admin role)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Function 2: Update last_sign_in_at on login
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.users
  SET last_sign_in_at = NEW.last_sign_in_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.handle_user_login();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_user_login() TO supabase_auth_admin;
GRANT INSERT, UPDATE ON public.users TO supabase_auth_admin;

-- ============================================
-- 16. USER DELETION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id_to_delete UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM public.users WHERE id = user_id_to_delete;
  
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Delete email-based tables
  DELETE FROM public.timed_shares 
  WHERE sender_email = user_email OR recipient_email = user_email;
  
  DELETE FROM public.emergency_requests 
  WHERE requester_email = user_email OR target_user_email = user_email;
  
  -- Delete from public.users (cascades to all related tables)
  DELETE FROM public.users WHERE id = user_id_to_delete;
  
  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 17. SET SUPER ADMIN
-- ============================================

UPDATE public.users 
SET is_admin = TRUE 
WHERE email ILIKE 'lensvault@proton.me';

-- ============================================
-- 18. GRANT PERMISSIONS
-- ============================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;

-- ============================================
-- SCHEMA COMPLETE! 
-- ============================================
-- Total Tables: 13
-- Total Indexes: 20+
-- Total Policies: 15+
-- Total Functions: 3
-- Total Triggers: 2
-- ============================================

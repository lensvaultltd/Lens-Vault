-- ============================================
-- PASSWORDLESS ACCESS SHARING SCHEMA
-- ============================================
-- This schema enables secure password sharing without revealing credentials
-- Users can share login access to services with instant revocation

-- ============================================
-- 1. SHARED ACCESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.shared_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL,
  
  -- Recipient
  recipient_email TEXT NOT NULL,
  recipient_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Shared Item
  password_entry_id UUID NOT NULL,
  service_name TEXT NOT NULL,
  service_url TEXT,
  
  -- Encrypted Credentials (Hybrid Encryption: RSA + AES)
  encrypted_credentials TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  encryption_algorithm TEXT DEFAULT 'AES-256-GCM',
  
  -- Access Control
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'active', 'revoked', 'expired')),
  access_level TEXT DEFAULT 'view_only' CHECK (access_level IN ('view_only', 'full_access')),
  
  -- Permissions
  can_auto_login BOOLEAN DEFAULT true,
  can_view_password BOOLEAN DEFAULT false,
  max_sessions INTEGER DEFAULT 1,
  
  -- Expiry
  expires_at TIMESTAMPTZ,
  auto_revoke_after_use BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  
  -- Audit
  revoked_by UUID REFERENCES public.users(id),
  revocation_reason TEXT,
  
  -- Constraints
  UNIQUE(owner_id, recipient_email, password_entry_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_access_owner ON public.shared_access(owner_id);
CREATE INDEX IF NOT EXISTS idx_shared_access_recipient ON public.shared_access(recipient_email);
CREATE INDEX IF NOT EXISTS idx_shared_access_recipient_id ON public.shared_access(recipient_id);
CREATE INDEX IF NOT EXISTS idx_shared_access_status ON public.shared_access(status);
CREATE INDEX IF NOT EXISTS idx_shared_access_expires ON public.shared_access(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shared_access_entry ON public.shared_access(password_entry_id);

-- ============================================
-- 2. ACTIVE SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.shared_access_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  shared_access_id UUID NOT NULL REFERENCES public.shared_access(id) ON DELETE CASCADE,
  
  -- User Info
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  
  -- Session Info
  session_token TEXT UNIQUE,
  device_info JSONB,
  ip_address TEXT,
  
  -- Timing
  logged_in_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  logged_out_at TIMESTAMPTZ,
  
  -- Auto-logout
  auto_logout BOOLEAN DEFAULT false,
  logout_reason TEXT,
  
  -- Activity Tracking
  actions_count INTEGER DEFAULT 0,
  
  CONSTRAINT active_session_check CHECK (
    logged_out_at IS NULL OR logged_out_at >= logged_in_at
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_shared_access ON public.shared_access_sessions(shared_access_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.shared_access_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.shared_access_sessions(logged_out_at) WHERE logged_out_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.shared_access_sessions(session_token);

-- ============================================
-- 3. AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.shared_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  shared_access_id UUID REFERENCES public.shared_access(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.shared_access_sessions(id) ON DELETE SET NULL,
  
  -- Event
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES public.users(id),
  actor_email TEXT NOT NULL,
  
  -- Details
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_shared_access ON public.shared_access_audit(shared_access_id);
CREATE INDEX IF NOT EXISTS idx_audit_session ON public.shared_access_audit(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON public.shared_access_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.shared_access_audit(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.shared_access_audit(created_at DESC);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.shared_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_access_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_access_audit ENABLE ROW LEVEL SECURITY;

-- Shared Access Policies
DROP POLICY IF EXISTS "Owners can manage their shared access" ON public.shared_access;
CREATE POLICY "Owners can manage their shared access"
  ON public.shared_access FOR ALL
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Recipients can view their shared access" ON public.shared_access;
CREATE POLICY "Recipients can view their shared access"
  ON public.shared_access FOR SELECT
  USING (
    recipient_email IN (SELECT email FROM auth.users WHERE id = auth.uid())
    OR recipient_id = auth.uid()
  );

DROP POLICY IF EXISTS "Recipients can update their shared access status" ON public.shared_access;
CREATE POLICY "Recipients can update their shared access status"
  ON public.shared_access FOR UPDATE
  USING (
    recipient_email IN (SELECT email FROM auth.users WHERE id = auth.uid())
    OR recipient_id = auth.uid()
  )
  WITH CHECK (
    recipient_email IN (SELECT email FROM auth.users WHERE id = auth.uid())
    OR recipient_id = auth.uid()
  );

-- Session Policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.shared_access_sessions;
CREATE POLICY "Users can view their own sessions"
  ON public.shared_access_sessions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.shared_access_sessions;
CREATE POLICY "Users can insert their own sessions"
  ON public.shared_access_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own sessions" ON public.shared_access_sessions;
CREATE POLICY "Users can update their own sessions"
  ON public.shared_access_sessions FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can view sessions for their shared access" ON public.shared_access_sessions;
CREATE POLICY "Owners can view sessions for their shared access"
  ON public.shared_access_sessions FOR SELECT
  USING (
    shared_access_id IN (
      SELECT id FROM public.shared_access WHERE owner_id = auth.uid()
    )
  );

-- Audit Policies
DROP POLICY IF EXISTS "Users can view audit logs for their shared access" ON public.shared_access_audit;
CREATE POLICY "Users can view audit logs for their shared access"
  ON public.shared_access_audit FOR SELECT
  USING (
    shared_access_id IN (
      SELECT id FROM public.shared_access 
      WHERE owner_id = auth.uid() 
      OR recipient_id = auth.uid()
      OR recipient_email IN (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "System can insert audit logs" ON public.shared_access_audit;
CREATE POLICY "System can insert audit logs"
  ON public.shared_access_audit FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 5. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to auto-expire shared access
CREATE OR REPLACE FUNCTION expire_shared_access()
RETURNS void AS $$
BEGIN
  UPDATE public.shared_access
  SET status = 'expired'
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND status NOT IN ('revoked', 'expired');
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old sessions
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
  -- Auto-logout sessions inactive for more than 24 hours
  UPDATE public.shared_access_sessions
  SET 
    logged_out_at = NOW(),
    auto_logout = true,
    logout_reason = 'timeout'
  WHERE logged_out_at IS NULL
    AND last_activity_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. REALTIME PUBLICATION
-- ============================================

-- Enable realtime for shared_access table
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_access;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_access_sessions;

-- ============================================
-- SCHEMA COMPLETE
-- ============================================
-- This schema supports:
-- ✅ Secure credential sharing with hybrid encryption
-- ✅ Real-time revocation via Supabase Realtime
-- ✅ Session tracking and management
-- ✅ Complete audit trail
-- ✅ Auto-expiry and cleanup
-- ✅ Row-level security for data isolation

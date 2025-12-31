-- ============================================
-- SUBSCRIPTION MANAGEMENT SCHEMA - FIXED
-- ============================================

-- Add subscription management columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'expired', 'cancelled'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_payment_reference TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_changes_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ;

-- Add business plan to subscription_plan check constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_subscription_plan_check;
ALTER TABLE public.users ADD CONSTRAINT users_subscription_plan_check 
  CHECK (subscription_plan IN ('free', 'premium', 'family', 'business'));

-- Create subscription notifications table
CREATE TABLE IF NOT EXISTS public.subscription_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_subscription_notifications_user_id ON public.subscription_notifications(user_id);

-- Enable RLS
ALTER TABLE public.subscription_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy for subscription notifications (with DROP first)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.subscription_notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.subscription_notifications FOR SELECT
  USING (user_id = auth.uid());

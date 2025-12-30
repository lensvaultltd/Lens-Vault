-- SUPABASE VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify complete setup

-- ============================================
-- 1. CHECK ALL TABLES EXIST
-- ============================================
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected: 13 tables
-- users, folders, vaults, vault_items, shared_items, timed_shares, 
-- emergency_requests, digital_will_config, breach_checks, secure_notes,
-- biometric_credentials, authorized_contacts, access_logs

-- ============================================
-- 2. CHECK RLS ENABLED
-- ============================================
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- All tables should show ✅ Enabled

-- ============================================
-- 3. CHECK RLS POLICIES
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected: 15+ policies

-- ============================================
-- 4. CHECK INDEXES
-- ============================================
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Expected: 20+ indexes

-- ============================================
-- 5. CHECK TRIGGERS (on auth.users table)
-- ============================================
-- IMPORTANT: Triggers are on auth.users, not public schema
SELECT 
  trigger_name,
  event_object_schema as schema,
  event_object_table as table_name,
  action_timing,
  event_manipulation as event
FROM information_schema.triggers 
WHERE event_object_table = 'users'
  AND event_object_schema = 'auth'
ORDER BY trigger_name;

-- Expected: 2 triggers
-- on_auth_user_created (auth.users, AFTER, INSERT)
-- on_auth_user_login (auth.users, AFTER, UPDATE)

-- ============================================
-- 6. CHECK FUNCTIONS
-- ============================================
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Expected: 3 functions (handle_new_user, handle_user_login, delete_user_completely)

-- ============================================
-- 7. CHECK FOREIGN KEY CONSTRAINTS
-- ============================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Verify CASCADE deletes are set correctly

-- ============================================
-- 8. TEST USER CREATION (SAFE - READ ONLY)
-- ============================================
-- Check if users table can accept data from auth.users
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- 9. CHECK STORAGE BUCKETS
-- ============================================
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets;

-- Expected: profile-pictures, documents (if configured)

-- ============================================
-- 10. SUMMARY
-- ============================================
SELECT 
  'Tables' as component,
  COUNT(*)::text as count,
  '13 expected' as expected
FROM information_schema.tables 
WHERE table_schema = 'public'

UNION ALL

SELECT 
  'RLS Policies',
  COUNT(*)::text,
  '15+ expected'
FROM pg_policies 
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Indexes',
  COUNT(*)::text,
  '20+ expected'
FROM pg_indexes
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Triggers (auth.users)',
  COUNT(*)::text,
  '2 expected'
FROM information_schema.triggers 
WHERE event_object_table = 'users'
  AND event_object_schema = 'auth'

UNION ALL

SELECT 
  'Functions',
  COUNT(*)::text,
  '3 expected'
FROM information_schema.routines 
WHERE routine_schema = 'public';

-- ============================================
-- RESULT INTERPRETATION
-- ============================================
-- ✅ All counts match expected = Supabase fully configured
-- ❌ Any count mismatch = Run supabase_schema.sql again

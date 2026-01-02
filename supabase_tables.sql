-- Run this in your Supabase SQL Editor to enable the new features

-- 1. Create Redemptions Table (for the 10-person limit)
create table if not exists public.redemptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  code text not null,
  redeemed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable security
alter table public.redemptions enable row level security;

-- Allow users to see if they have redeemed
create policy "Users can view own redemptions"
  on public.redemptions for select
  using (auth.uid() = user_id);

-- Allow users to insert a redemption record
create policy "Users can insert own redemptions"
  on public.redemptions for insert
  with check (auth.uid() = user_id);

-- Allow reading count of redemptions for a specific code (needed for the limit check)
create policy "Anyone can count redemptions"
  on public.redemptions for select
  using (true); 


-- 2. Create Feedback Table
create table if not exists public.feedback (
  id uuid default gen_random_uuid() primary key,
  email text, -- Optional, if they choose to share it
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable security
alter table public.feedback enable row level security;

-- Allow authenticated users to send feedback
create policy "Authenticated users can insert feedback"
  on public.feedback for insert
  with check (auth.role() = 'authenticated');

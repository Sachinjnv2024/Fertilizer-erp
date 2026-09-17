-- Run once in Supabase SQL Editor
alter table public.business_settings
  add column if not exists logo_data text;

-- Run this in the Supabase Dashboard SQL Editor:
-- Table Editor > SQL Editor > paste and execute
ALTER TABLE public.leads_assurance ADD COLUMN IF NOT EXISTS commentaire TEXT;

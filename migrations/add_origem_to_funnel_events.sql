-- Guarda de onde veio a visita (posicionamento/campanha do anuncio).
-- Correr no Supabase: SQL Editor > colar > Run.
ALTER TABLE public.funnel_events ADD COLUMN IF NOT EXISTS origem TEXT;

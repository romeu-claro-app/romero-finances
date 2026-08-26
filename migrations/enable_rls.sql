-- Fecha as tabelas a quem usa a chave publica (anon).
-- Correr no Supabase: Dashboard > SQL Editor > colar > Run.
--
-- Com RLS ativo e SEM politicas, a chave publica deixa de ler ou escrever.
-- As funcoes do site (/api/leads, /api/lead-funnel, /api/crm, /api/funnel-step)
-- usam a chave SECRETA no servidor, que ignora o RLS — continuam a funcionar.

ALTER TABLE public.leads                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_credit                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_assurance                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_assurance_nouveau_arrive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_assurance_prenatale      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_pilier                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_patrimoine               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rendezvous                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_events                  ENABLE ROW LEVEL SECURITY;

-- Garantir que nao ficam politicas antigas a permitir acesso publico:
-- (se este SELECT devolver linhas, apaga essas politicas)
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname='public';

-- Contagem anonima de etapas dos funnels (sem dados pessoais).
-- Correr no Supabase: Dashboard > SQL Editor > colar > Run
create table if not exists public.funnel_events (
  id         bigserial primary key,
  created_at timestamptz not null default now(),
  funnel     text        not null,
  step       int         not null,
  step_name  text,
  session    text
);

create index if not exists funnel_events_created_idx on public.funnel_events (created_at desc);
create index if not exists funnel_events_funnel_idx  on public.funnel_events (funnel, step);

alter table public.funnel_events enable row level security;

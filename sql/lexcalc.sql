-- Lex Calc: cálculos salvos por usuário
create table if not exists public.lexcalc_calculos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo text not null,
  processo text,
  autor text not null,
  reu text not null,
  sem_numero boolean not null default false,
  dados jsonb not null default '{}'::jsonb,
  resultado jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists lexcalc_calculos_user on public.lexcalc_calculos (user_id, atualizado_em desc);
alter table public.lexcalc_calculos enable row level security;
drop policy if exists lexcalc_ler on public.lexcalc_calculos;
drop policy if exists lexcalc_criar on public.lexcalc_calculos;
drop policy if exists lexcalc_alterar on public.lexcalc_calculos;
drop policy if exists lexcalc_excluir on public.lexcalc_calculos;
create policy lexcalc_ler on public.lexcalc_calculos for select to authenticated using (user_id = auth.uid());
create policy lexcalc_criar on public.lexcalc_calculos for insert to authenticated with check (user_id = auth.uid());
create policy lexcalc_alterar on public.lexcalc_calculos for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy lexcalc_excluir on public.lexcalc_calculos for delete to authenticated using (user_id = auth.uid());

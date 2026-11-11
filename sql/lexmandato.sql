-- LexMandato (dentro do Lex Calc): escritório, clientes, modelos e documentos salvos na nuvem
-- Cada usuário só enxerga o que é dele.

create table if not exists public.lm_escritorio (
  dono          uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  dados         jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.lm_clientes (
  id            uuid primary key default gen_random_uuid(),
  dono          uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nome          text not null default '',
  documento     text not null default '',
  dados         jsonb not null default '{}'::jsonb,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists lm_clientes_dono on public.lm_clientes (dono, atualizado_em desc);

create table if not exists public.lm_modelos (
  id            uuid primary key default gen_random_uuid(),
  dono          uuid not null references auth.users(id) on delete cascade default auth.uid(),
  grupo         uuid not null default gen_random_uuid(),
  versao        int not null default 1,
  ativo         boolean not null default true,
  area          text not null default 'todas',
  tipo          text not null,
  nome          text not null,
  texto         text not null default '',
  criado_em     timestamptz not null default now()
);
create index if not exists lm_modelos_dono on public.lm_modelos (dono, tipo, ativo);

create table if not exists public.lm_documentos (
  id            uuid primary key default gen_random_uuid(),
  dono          uuid not null references auth.users(id) on delete cascade default auth.uid(),
  cliente_id    uuid references public.lm_clientes(id) on delete set null,
  cliente_nome  text not null default '',
  area          text not null default '',
  titulo        text not null default '',
  status        text not null default 'Rascunho',
  dados         jsonb not null default '{}'::jsonb,
  textos        jsonb not null default '{}'::jsonb,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists lm_documentos_dono on public.lm_documentos (dono, atualizado_em desc);

alter table public.lm_escritorio enable row level security;
alter table public.lm_clientes   enable row level security;
alter table public.lm_modelos    enable row level security;
alter table public.lm_documentos enable row level security;

do $$
declare t text;
begin
  foreach t in array array['lm_escritorio','lm_clientes','lm_modelos','lm_documentos'] loop
    execute format('drop policy if exists %I on public.%I', t || '_dono', t);
    execute format('create policy %I on public.%I for all to authenticated using (dono = auth.uid()) with check (dono = auth.uid())', t || '_dono', t);
  end loop;
end $$;

revoke all on public.lm_escritorio, public.lm_clientes, public.lm_modelos, public.lm_documentos from anon;
grant select, insert, update, delete on public.lm_escritorio, public.lm_clientes, public.lm_modelos, public.lm_documentos to authenticated;

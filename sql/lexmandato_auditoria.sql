-- ============================================================================
-- Lex Calc: presença e auditoria
--
-- Duas coisas, separadas de propósito:
--   lm_presenca   quem está com o sistema aberto agora, e em qual tela
--   lm_auditoria  o que cada pessoa fez, com data, hora e escritório
--
-- Quem enxerga o quê:
--   o login mestre enxerga tudo, de todos os escritórios
--   cada escritório enxerga o próprio registro, inclusive as entradas do
--   suporte da BlackSolutions. Auditoria que só o fornecedor enxerga é
--   problema perante a Lei Geral de Proteção de Dados, porque o escritório é
--   o controlador dos dados dos clientes dele.
--
-- Rode depois dos arquivos lexmandato_escritorio.sql e lexmandato_mestre.sql.
-- Pode ser executado mais de uma vez sem quebrar nada.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Presença
-- ---------------------------------------------------------------------------

create table if not exists public.lm_presenca (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  email         text not null default '',
  escritorio_id uuid references public.lm_escritorios(id) on delete set null,
  tela          text not null default '',
  visto_em      timestamptz not null default now()
);
create index if not exists lm_presenca_visto on public.lm_presenca (visto_em desc);

-- Chamada pelo sistema de tempos em tempos. Não guarda nada além de quem,
-- onde no sistema, e quando foi visto pela última vez.
create or replace function public.lm_ping(p_tela text default '', p_escritorio uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.lm_presenca (user_id, email, escritorio_id, tela, visto_em)
       values (auth.uid(), coalesce((select email from auth.users where id = auth.uid()),''),
               p_escritorio, left(coalesce(p_tela,''),40), now())
  on conflict (user_id) do update
     set email = excluded.email, escritorio_id = excluded.escritorio_id,
         tela = excluded.tela, visto_em = now();
end $$;

grant execute on function public.lm_ping(text,uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Auditoria
-- ---------------------------------------------------------------------------

create table if not exists public.lm_auditoria (
  id            bigserial primary key,
  escritorio_id uuid references public.lm_escritorios(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  email         text not null default '',
  acao          text not null,
  detalhe       text not null default '',   -- completo, para o escritorio
  resumo        text not null default '',   -- sem nome de cliente e sem numero de processo
  quando        timestamptz not null default now()
);
alter table public.lm_auditoria add column if not exists resumo text not null default '';
create index if not exists lm_auditoria_esc on public.lm_auditoria (escritorio_id, quando desc);
create index if not exists lm_auditoria_quando on public.lm_auditoria (quando desc);

-- p_detalhe  o que o escritorio enxerga, com nome de cliente e numero de processo
-- p_resumo   o que o login mestre enxerga, sem identificar ninguem
create or replace function public.lm_registrar(p_acao text, p_detalhe text default '', p_resumo text default '', p_escritorio uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or coalesce(trim(p_acao),'') = '' then return; end if;
  insert into public.lm_auditoria (escritorio_id, user_id, email, acao, detalhe, resumo)
       values (p_escritorio,
               auth.uid(),
               coalesce((select email from auth.users where id = auth.uid()),''),
               left(p_acao,60),
               left(coalesce(p_detalhe,''),300),
               left(coalesce(nullif(trim(p_resumo),''), ''),120));
end $$;

grant execute on function public.lm_registrar(text,text,text,uuid) to authenticated;
drop function if exists public.lm_registrar(text,text,uuid);

-- Limpeza: a auditoria guarda um ano. Chame de vez em quando, ou deixe para
-- quando a tabela crescer.
create or replace function public.lm_auditoria_limpar(p_dias int default 365)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare n bigint;
begin
  if not public.lm_e_mestre() then
    raise exception 'Somente o login mestre.';
  end if;
  delete from public.lm_auditoria where quando < now() - (p_dias || ' days')::interval;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.lm_auditoria_limpar(int) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Telas do login mestre
-- ---------------------------------------------------------------------------

-- Quem está com o sistema aberto agora, e quem entrou por último.
create or replace function public.bs_conectados()
returns table (
  email text, escritorio text, escritorio_id uuid, tela text,
  visto_em timestamptz, online boolean, ultimo_acesso timestamptz, criado_em timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(p.email,''), u.email, ''),
         coalesce(e.nome,''), p.escritorio_id, coalesce(p.tela,''),
         p.visto_em,
         (p.visto_em > now() - interval '5 minutes'),
         u.last_sign_in_at, u.created_at
    from auth.users u
    left join public.lm_presenca p on p.user_id = u.id
    left join public.lm_escritorios e on e.id = p.escritorio_id
   where public.lm_e_mestre()
     and coalesce(u.raw_user_meta_data->>'app','') = 'lexcalc'
   order by (p.visto_em > now() - interval '5 minutes') desc nulls last,
            coalesce(p.visto_em, u.last_sign_in_at, u.created_at) desc
$$;

grant execute on function public.bs_conectados() to authenticated;

-- O que aconteceu. Sem escritório informado, traz de todos.
-- Devolve o resumo, nunca o detalhe: o login mestre precisa saber quem fez o
-- quê e quando, e não precisa do nome do cliente nem do número do processo
-- de escritório de terceiro. Dado que não é necessário não se mostra.
create or replace function public.bs_auditoria(p_escritorio uuid default null, p_dias int default 30, p_limite int default 300)
returns table (
  quando timestamptz, email text, escritorio text, escritorio_id uuid, acao text, detalhe text
)
language sql
stable
security definer
set search_path = public
as $$
  select a.quando, a.email, coalesce(e.nome,''), a.escritorio_id, a.acao, coalesce(a.resumo,'')
    from public.lm_auditoria a
    left join public.lm_escritorios e on e.id = a.escritorio_id
   where public.lm_e_mestre()
     and a.quando > now() - (greatest(coalesce(p_dias,30),1) || ' days')::interval
     and (p_escritorio is null or a.escritorio_id = p_escritorio)
   order by a.quando desc
   limit least(greatest(coalesce(p_limite,300),1), 2000)
$$;

grant execute on function public.bs_auditoria(uuid,int,int) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Acesso: o escritório enxerga o próprio registro
-- ---------------------------------------------------------------------------

alter table public.lm_auditoria enable row level security;
drop policy if exists lm_auditoria_ler on public.lm_auditoria;
-- Repare que o login mestre NÃO entra nesta política. A leitura direta da
-- tabela traz o detalhe completo, e isso é do escritório. O login mestre
-- enxerga pela função bs_auditoria, que devolve só o resumo.
create policy lm_auditoria_ler on public.lm_auditoria
  for select to authenticated
  using (
    user_id = auth.uid()
    or (escritorio_id is not null and escritorio_id in (select public.lm_meus_escritorios()))
  );

alter table public.lm_presenca enable row level security;
drop policy if exists lm_presenca_ler on public.lm_presenca;
create policy lm_presenca_ler on public.lm_presenca
  for select to authenticated
  using (
    public.lm_e_mestre()
    or user_id = auth.uid()
    or (escritorio_id is not null and escritorio_id in (select public.lm_meus_escritorios()))
  );

revoke all on public.lm_auditoria, public.lm_presenca from anon;
grant select on public.lm_auditoria, public.lm_presenca to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Conferência
-- ---------------------------------------------------------------------------
-- select * from public.bs_conectados();
-- select * from public.bs_auditoria(null, 7, 100);
-- select acao, detalhe, resumo from public.lm_auditoria order by quando desc limit 20;
-- select acao, count(*) from public.lm_auditoria group by acao order by 2 desc;

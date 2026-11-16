-- ===========================================================================
-- BlackSolutions, painel mestre: usuários, uso e corte de acesso
--
-- O que este script cria:
--   1. bs_mestre_forte: login mestre COM o segundo fator confirmado na sessão
--      (aal2). Tudo o que mostra dado pessoal em lista ou derruba acesso exige
--      isso. Senha vazada sozinha não basta mais para mexer em ninguém.
--   2. bs_painel_usuarios: cada pessoa cadastrada, em qual sistema, há quantos
--      dias, quando usou por último e se está paga, em teste, vencida ou
--      bloqueada.
--   3. bs_derrubar_acesso e bs_restaurar_acesso: derruba o login (banimento no
--      Supabase Auth), encerra as sessões abertas e desativa a clínica. O
--      próprio banco recusa derrubar quem está com pagamento em dia, o login
--      mestre e a si mesmo, venha o pedido de onde vier.
--   4. Histórico de bloqueios que não aceita alteração nem exclusão.
--   5. Endurecimento geral: TRUNCATE, TRIGGER e REFERENCES retirados dos
--      papéis públicos, e funções novas fechadas para anon.
--
-- Pode ser rodado mais de uma vez. Não apaga dado nenhum.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Mestre com segundo fator
-- ---------------------------------------------------------------------------
create or replace function public.bs_mestre_forte()
returns boolean
language sql stable security definer set search_path to 'public'
as $function$
  select public.lm_e_mestre()
     and coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
$function$;
revoke execute on function public.bs_mestre_forte() from public, anon;
grant execute on function public.bs_mestre_forte() to authenticated;

-- A lista de CPF, CNPJ e celulares passa a exigir o segundo fator.
drop policy if exists bs_identidades_ler on public.bs_identidades;
create policy bs_identidades_ler on public.bs_identidades
  for select to authenticated using (public.bs_mestre_forte());

-- ---------------------------------------------------------------------------
-- 2. Bloqueios e histórico
-- ---------------------------------------------------------------------------
create table if not exists public.bs_bloqueios (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  email          text,
  motivo         text not null,
  clinicas       uuid[] not null default '{}',
  bloqueado_por  uuid not null,
  bloqueado_em   timestamptz not null default now()
);
alter table public.bs_bloqueios enable row level security;
drop policy if exists bs_bloqueios_ler on public.bs_bloqueios;
create policy bs_bloqueios_ler on public.bs_bloqueios
  for select to authenticated using (public.bs_mestre_forte());
revoke all on public.bs_bloqueios from anon, authenticated;
grant select on public.bs_bloqueios to authenticated;

create table if not exists public.bs_bloqueios_log (
  id              bigserial primary key,
  user_id         uuid not null,
  email           text,
  acao            text not null check (acao in ('derrubou','restaurou')),
  motivo          text,
  feito_por       uuid not null,
  feito_por_email text,
  feito_em        timestamptz not null default now()
);
alter table public.bs_bloqueios_log enable row level security;
drop policy if exists bs_bloqueios_log_ler on public.bs_bloqueios_log;
create policy bs_bloqueios_log_ler on public.bs_bloqueios_log
  for select to authenticated using (public.bs_mestre_forte());
revoke all on public.bs_bloqueios_log from anon, authenticated;
grant select on public.bs_bloqueios_log to authenticated;

create or replace function public.bs_log_imutavel()
returns trigger language plpgsql as $function$
begin
  raise exception 'O histórico de bloqueios não pode ser alterado nem apagado.';
end $function$;

drop trigger if exists bs_bloqueios_log_imutavel on public.bs_bloqueios_log;
create trigger bs_bloqueios_log_imutavel
  before update or delete on public.bs_bloqueios_log
  for each row execute function public.bs_log_imutavel();
drop trigger if exists bs_bloqueios_log_sem_truncate on public.bs_bloqueios_log;
create trigger bs_bloqueios_log_sem_truncate
  before truncate on public.bs_bloqueios_log
  for each statement execute function public.bs_log_imutavel();

-- ---------------------------------------------------------------------------
-- 3. Quem está pago
-- Lex Calc: lexcalc_assinantes.pago_ate em dia.
-- BlackFlow: membro de clínica ativa com plano diferente de teste e dentro
-- da validade (cortesia conta como paga).
-- ---------------------------------------------------------------------------
create or replace function public.bs_usuario_pagante(p_user uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $function$
  select exists (select 1 from public.lexcalc_assinantes a
                  where a.user_id = p_user and a.pago_ate >= current_date)
      or exists (select 1 from public.membros m
                   join public.clinicas c on c.id = m.clinica_id
                  where m.user_id = p_user
                    and c.ativa
                    and coalesce(c.plano, 'teste') <> 'teste'
                    and (c.valido_ate is null or c.valido_ate >= current_date))
$function$;
revoke execute on function public.bs_usuario_pagante(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Lista de usuários para o painel
-- ---------------------------------------------------------------------------
drop function if exists public.bs_painel_usuarios();
create or replace function public.bs_painel_usuarios()
returns table (
  user_id        uuid,
  email          text,
  contato        text,
  sistemas       text[],
  negocios       text,
  criado_em      timestamptz,
  dias_cadastro  int,
  ultimo_uso     timestamptz,
  dias_sem_usar  int,
  situacao       text,
  pago_ate       date,
  teste_ate      date,
  cpf            boolean,
  telefone       boolean,
  mestre         boolean,
  bloqueado_em   timestamptz,
  motivo         text
)
language plpgsql stable security definer set search_path to 'public'
as $function$
#variable_conflict use_column
begin
  if not public.bs_mestre_forte() then
    raise exception 'Confirme o segundo fator para ver a lista de usuários.';
  end if;

  return query
  with base as (
    select u.id, u.email::text as email, u.created_at, u.last_sign_in_at,
           u.raw_user_meta_data->>'contato' as contato,
           u.phone_confirmed_at is not null as tel_ok
      from auth.users u
     where u.deleted_at is null
  ), uso as (
    select b.id,
           greatest(b.last_sign_in_at,
                    (select max(s.updated_at) from auth.sessions s where s.user_id = b.id),
                    (select max(p.visto_em) from public.lm_presenca p where p.user_id = b.id)) as ultimo
      from base b
  ), bf as (
    select m.user_id,
           string_agg(c.nome, ', ' order by c.nome) as nomes,
           bool_or(c.ativa and coalesce(c.plano,'teste') <> 'teste'
                   and (c.valido_ate is null or c.valido_ate >= current_date)) as pago,
           bool_or(c.plano = 'cortesia') as cortesia,
           bool_or(c.ativa and coalesce(c.plano,'teste') = 'teste'
                   and coalesce(c.valido_ate, current_date) >= current_date) as em_teste,
           max(c.valido_ate) filter (where coalesce(c.plano,'teste') = 'teste') as teste_ate,
           max(c.valido_ate) filter (where coalesce(c.plano,'teste') <> 'teste') as pago_ate
      from public.membros m join public.clinicas c on c.id = m.clinica_id
     group by m.user_id
  ), lx as (
    select b.id as user_id,
           (select string_agg(distinct e.nome, ', ') from public.lm_membros lm
              join public.lm_escritorios e on e.id = lm.escritorio_id
             where lm.user_id = b.id) as nomes,
           (select a.pago_ate from public.lexcalc_assinantes a where a.user_id = b.id) as pago_ate,
           (b.created_at + make_interval(days => public.bs_cfg('lexcalc_teste_dias', 7)))::date as teste_ate,
           exists (select 1 from public.lexcalc_calculos c where c.user_id = b.id)
             or exists (select 1 from public.lm_membros lm where lm.user_id = b.id)
             or exists (select 1 from public.lexcalc_assinantes a where a.user_id = b.id)
             or coalesce((select u.raw_user_meta_data->>'app' from auth.users u where u.id = b.id), '') = 'lexcalc'
             as usa
      from base b
  )
  select b.id,
         b.email,
         b.contato,
         array_remove(array[case when bf.user_id is not null then 'BlackFlow' end,
                            case when lx.usa then 'Lex Calc' end], null),
         nullif(concat_ws(' · ', bf.nomes, lx.nomes), ''),
         b.created_at,
         (current_date - b.created_at::date),
         uso.ultimo,
         case when uso.ultimo is null then null else (current_date - uso.ultimo::date) end,
         case
           when bl.user_id is not null then 'bloqueado'
           when exists (select 1 from public.lm_mestres ms where ms.user_id = b.id) then 'mestre'
           when coalesce(bf.cortesia, false) then 'cortesia'
           when coalesce(bf.pago, false) or (lx.pago_ate is not null and lx.pago_ate >= current_date) then 'pago'
           when coalesce(bf.em_teste, false) then 'teste'
           when lx.usa and bf.user_id is null and lx.teste_ate >= current_date then 'teste'
           when bf.user_id is null and not lx.usa then 'sem cadastro'
           else 'vencido'
         end,
         greatest(bf.pago_ate, lx.pago_ate),
         coalesce(bf.teste_ate, case when lx.usa then lx.teste_ate end),
         exists (select 1 from public.bs_identidades i where i.user_id = b.id and i.tipo = 'cpf'),
         b.tel_ok,
         exists (select 1 from public.lm_mestres ms where ms.user_id = b.id),
         bl.bloqueado_em,
         bl.motivo
    from base b
    join uso on uso.id = b.id
    left join bf on bf.user_id = b.id
    left join lx on lx.user_id = b.id
    left join public.bs_bloqueios bl on bl.user_id = b.id
   order by uso.ultimo desc nulls last, b.created_at desc;
end
$function$;
revoke execute on function public.bs_painel_usuarios() from public, anon;
grant execute on function public.bs_painel_usuarios() to authenticated;

create or replace function public.bs_painel_bloqueios_log(p_limite int default 100)
returns setof public.bs_bloqueios_log
language plpgsql stable security definer set search_path to 'public'
as $function$
begin
  if not public.bs_mestre_forte() then
    raise exception 'Confirme o segundo fator para ver o histórico.';
  end if;
  return query select * from public.bs_bloqueios_log
                order by feito_em desc limit least(greatest(coalesce(p_limite,100),1),500);
end
$function$;
revoke execute on function public.bs_painel_bloqueios_log(int) from public, anon;
grant execute on function public.bs_painel_bloqueios_log(int) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Derrubar e restaurar
-- ---------------------------------------------------------------------------
create or replace function public.bs_derrubar_acesso(p_user uuid, p_motivo text)
returns boolean
language plpgsql volatile security definer set search_path to 'public'
as $function$
declare
  v_email   text;
  v_meu     text;
  v_clin    uuid[];
begin
  if not public.bs_mestre_forte() then
    raise exception 'Para derrubar acesso, entre no painel com o segundo fator.';
  end if;
  if p_user is null then raise exception 'Informe a conta.'; end if;
  if p_user = auth.uid() then
    raise exception 'Você não pode derrubar o seu próprio acesso.';
  end if;
  if exists (select 1 from public.lm_mestres where user_id = p_user) then
    raise exception 'Login mestre não pode ser derrubado pelo painel.';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Escreva o motivo, com pelo menos cinco letras.';
  end if;

  select email into v_email from auth.users where id = p_user;
  if not found then raise exception 'Conta não encontrada.'; end if;

  if public.bs_usuario_pagante(p_user) then
    raise exception 'Esta conta está com pagamento em dia. O painel só derruba quem não pagou.';
  end if;

  if exists (select 1 from public.bs_bloqueios where user_id = p_user) then
    return true;
  end if;

  -- Clínicas que esta pessoa administra e que não estão pagas
  select coalesce(array_agg(c.id), '{}') into v_clin
    from public.membros m join public.clinicas c on c.id = m.clinica_id
   where m.user_id = p_user and m.papel = 'admin' and c.ativa
     and not (coalesce(c.plano,'teste') <> 'teste'
              and (c.valido_ate is null or c.valido_ate >= current_date));

  update public.clinicas set ativa = false where id = any(v_clin);

  -- Login barrado e sessões encerradas
  update auth.users set banned_until = timestamptz '2999-12-31 00:00:00+00' where id = p_user;
  delete from auth.refresh_tokens where user_id = p_user::text;
  delete from auth.sessions where user_id = p_user;

  select email into v_meu from auth.users where id = auth.uid();

  insert into public.bs_bloqueios (user_id, email, motivo, clinicas, bloqueado_por)
  values (p_user, v_email, trim(p_motivo), v_clin, auth.uid());

  insert into public.bs_bloqueios_log (user_id, email, acao, motivo, feito_por, feito_por_email)
  values (p_user, v_email, 'derrubou', trim(p_motivo), auth.uid(), v_meu);

  return true;
end
$function$;
revoke execute on function public.bs_derrubar_acesso(uuid, text) from public, anon;
grant execute on function public.bs_derrubar_acesso(uuid, text) to authenticated;

create or replace function public.bs_restaurar_acesso(p_user uuid, p_motivo text default null)
returns boolean
language plpgsql volatile security definer set search_path to 'public'
as $function$
declare
  v_b   public.bs_bloqueios%rowtype;
  v_meu text;
begin
  if not public.bs_mestre_forte() then
    raise exception 'Para restaurar acesso, entre no painel com o segundo fator.';
  end if;

  select * into v_b from public.bs_bloqueios where user_id = p_user;
  if not found then
    raise exception 'Esta conta não está bloqueada.';
  end if;

  update auth.users set banned_until = null where id = p_user;
  update public.clinicas set ativa = true where id = any(v_b.clinicas);
  delete from public.bs_bloqueios where user_id = p_user;

  select email into v_meu from auth.users where id = auth.uid();
  insert into public.bs_bloqueios_log (user_id, email, acao, motivo, feito_por, feito_por_email)
  values (p_user, v_b.email, 'restaurou', nullif(trim(coalesce(p_motivo,'')),''), auth.uid(), v_meu);
  return true;
end
$function$;
revoke execute on function public.bs_restaurar_acesso(uuid, text) from public, anon;
grant execute on function public.bs_restaurar_acesso(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Lex Calc: conta bloqueada não grava, mesmo com o token ainda válido
-- ---------------------------------------------------------------------------
create or replace function public.lexcalc_liberado()
returns boolean
language sql stable security definer set search_path to 'public'
as $function$
  select
    public.lm_e_mestre()
    or (
      not exists (select 1 from public.bs_bloqueios b where b.user_id = auth.uid())
      and (
        exists (select 1 from public.lexcalc_assinantes a
                 where a.user_id = auth.uid()
                   and a.pago_ate is not null and a.pago_ate >= current_date)
        or (
          exists (select 1 from auth.users u
                   where u.id = auth.uid()
                     and u.created_at > now() - make_interval(days => public.bs_cfg('lexcalc_teste_dias', 7)))
          and exists (select 1 from public.bs_identidades i
                       where i.user_id = auth.uid() and i.produto = 'lexcalc' and i.tipo = 'cpf')
          and public.bs_telefone_ok('lexcalc')
        )
      )
    )
$function$;
grant execute on function public.lexcalc_liberado() to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Endurecimento geral
-- RLS não vale para TRUNCATE. Nenhum cliente precisa de TRUNCATE, TRIGGER
-- ou REFERENCES nas tabelas públicas.
-- ---------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind in ('r','p')
  loop
    execute format('revoke truncate, trigger, references on public.%I from anon, authenticated', t.relname);
  end loop;
end $$;

alter default privileges in schema public revoke truncate, trigger, references on tables from anon, authenticated;

-- Funções de serviço que ninguém de fora deve chamar diretamente
revoke execute on function public.bs_consultar_cnpj(text) from public, anon, authenticated;
revoke execute on function public.bs_log_imutavel() from public, anon, authenticated;

select 'pronto' as resultado,
       (select count(*) from public.bs_bloqueios) as bloqueados,
       (select count(*) from public.bs_bloqueios_log) as historico;

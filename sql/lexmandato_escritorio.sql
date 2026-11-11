-- ============================================================================
-- LexMandato: escritório, membros e convites
-- Transforma a biblioteca de modelos, os clientes e os documentos, que hoje
-- pertencem a um único login, em patrimônio do escritório, compartilhado por
-- todos os logins ligados a ele.
--
-- Pode ser executado mais de uma vez sem quebrar nada.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabelas novas
-- ---------------------------------------------------------------------------

create table if not exists public.lm_escritorios (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  dados         jsonb not null default '{}'::jsonb,
  criado_por    uuid references auth.users(id) on delete set null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.lm_membros (
  escritorio_id uuid not null references public.lm_escritorios(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  email         text not null default '',
  papel         text not null default 'equipe',
  criado_em     timestamptz not null default now(),
  primary key (escritorio_id, user_id)
);
create index if not exists lm_membros_user on public.lm_membros (user_id);

-- papel: dono (administra o escritório), equipe (usa), suporte (BlackSolutions)
alter table public.lm_membros drop constraint if exists lm_membros_papel_ck;
alter table public.lm_membros add constraint lm_membros_papel_ck
  check (papel in ('dono','equipe','suporte'));

create table if not exists public.lm_convites (
  codigo        text primary key,
  escritorio_id uuid not null references public.lm_escritorios(id) on delete cascade,
  papel         text not null default 'equipe',
  criado_por    uuid references auth.users(id) on delete set null,
  criado_em     timestamptz not null default now(),
  expira_em     timestamptz not null default (now() + interval '30 days'),
  usado_por     uuid references auth.users(id) on delete set null,
  usado_em      timestamptz
);
create index if not exists lm_convites_esc on public.lm_convites (escritorio_id, criado_em desc);

-- ---------------------------------------------------------------------------
-- 2. Coluna escritorio_id nas tabelas que já existem
-- ---------------------------------------------------------------------------

alter table public.lm_modelos    add column if not exists escritorio_id uuid references public.lm_escritorios(id) on delete cascade;
alter table public.lm_clientes   add column if not exists escritorio_id uuid references public.lm_escritorios(id) on delete cascade;
alter table public.lm_documentos add column if not exists escritorio_id uuid references public.lm_escritorios(id) on delete cascade;

create index if not exists lm_modelos_esc    on public.lm_modelos    (escritorio_id, tipo, ativo);
create index if not exists lm_clientes_esc   on public.lm_clientes   (escritorio_id, atualizado_em desc);
create index if not exists lm_documentos_esc on public.lm_documentos (escritorio_id, atualizado_em desc);

-- quem enviou cada modelo, para o escritório saber a origem
alter table public.lm_modelos add column if not exists enviado_por uuid references auth.users(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3. Funções de apoio
--    Todas com security definer para não cair em recursão de política.
-- ---------------------------------------------------------------------------

-- Lista os escritórios de quem está logado.
create or replace function public.lm_meus_escritorios()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select escritorio_id from public.lm_membros where user_id = auth.uid()
$$;

-- Escritório padrão de quem está logado: o primeiro de que virou membro.
create or replace function public.lm_escritorio_atual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select escritorio_id from public.lm_membros
   where user_id = auth.uid()
   order by case papel when 'dono' then 0 when 'equipe' then 1 else 2 end, criado_em
   limit 1
$$;

-- Verdadeiro quando quem está logado administra o escritório.
create or replace function public.lm_administra(p_escritorio uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lm_membros
     where escritorio_id = p_escritorio
       and user_id = auth.uid()
       and papel in ('dono','suporte')
  )
$$;

-- Cria um escritório e põe quem chamou como dono.
create or replace function public.lm_criar_escritorio(p_nome text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para criar o escritório.';
  end if;
  if coalesce(trim(p_nome),'') = '' then
    raise exception 'Informe o nome do escritório.';
  end if;

  insert into public.lm_escritorios (nome, criado_por)
       values (trim(p_nome), auth.uid())
    returning id into v_id;

  insert into public.lm_membros (escritorio_id, user_id, email, papel)
       values (v_id, auth.uid(), coalesce((select email from auth.users where id = auth.uid()),''), 'dono');

  return v_id;
end $$;

-- Gera um código de convite. Só quem administra o escritório pode gerar.
create or replace function public.lm_novo_convite(p_escritorio uuid, p_papel text default 'equipe')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_cod text;
begin
  if not public.lm_administra(p_escritorio) then
    raise exception 'Somente o responsável pelo escritório pode gerar convite.';
  end if;
  if p_papel not in ('dono','equipe','suporte') then
    raise exception 'Papel inválido.';
  end if;

  loop
    v_cod := upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    exit when not exists (select 1 from public.lm_convites where codigo = v_cod);
  end loop;

  insert into public.lm_convites (codigo, escritorio_id, papel, criado_por)
       values (v_cod, p_escritorio, p_papel, auth.uid());

  return v_cod;
end $$;

-- Usa um código de convite e liga o login atual ao escritório.
create or replace function public.lm_usar_convite(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare c record;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta antes de usar o convite.';
  end if;

  select * into c from public.lm_convites
   where codigo = upper(trim(p_codigo));

  if not found then
    raise exception 'Código não encontrado.';
  end if;
  if c.usado_por is not null then
    raise exception 'Este código já foi usado.';
  end if;
  if c.expira_em < now() then
    raise exception 'Este código venceu. Peça um novo ao escritório.';
  end if;

  insert into public.lm_membros (escritorio_id, user_id, email, papel)
       values (c.escritorio_id, auth.uid(), coalesce((select email from auth.users where id = auth.uid()),''), c.papel)
  on conflict (escritorio_id, user_id) do update set papel = excluded.papel;

  update public.lm_convites
     set usado_por = auth.uid(), usado_em = now()
   where codigo = c.codigo;

  return c.escritorio_id;
end $$;

-- Remove um membro. Só quem administra, e nunca o último dono.
create or replace function public.lm_remover_membro(p_escritorio uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.lm_administra(p_escritorio) then
    raise exception 'Somente o responsável pelo escritório pode remover alguém.';
  end if;
  if (select papel from public.lm_membros where escritorio_id = p_escritorio and user_id = p_user) = 'dono'
     and (select count(*) from public.lm_membros where escritorio_id = p_escritorio and papel = 'dono') <= 1 then
    raise exception 'O escritório precisa de pelo menos um responsável.';
  end if;
  delete from public.lm_membros where escritorio_id = p_escritorio and user_id = p_user;
end $$;

grant execute on function
  public.lm_meus_escritorios(),
  public.lm_escritorio_atual(),
  public.lm_administra(uuid),
  public.lm_criar_escritorio(text),
  public.lm_novo_convite(uuid,text),
  public.lm_usar_convite(text),
  public.lm_remover_membro(uuid,uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Preenchimento automático do escritorio_id nos registros novos
-- ---------------------------------------------------------------------------

create or replace function public.lm_marca_escritorio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.escritorio_id is null then
    new.escritorio_id := public.lm_escritorio_atual();
  end if;
  if new.dono is null then
    new.dono := auth.uid();
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['lm_modelos','lm_clientes','lm_documentos'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_esc', t);
    execute format('create trigger %I before insert on public.%I for each row execute function public.lm_marca_escritorio()', t || '_esc', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Migração: cada usuário que já tem dados ganha o escritório dele
-- ---------------------------------------------------------------------------

do $$
declare u record; v_id uuid; v_nome text;
begin
  for u in
    select distinct dono from (
      select dono from public.lm_modelos
      union select dono from public.lm_clientes
      union select dono from public.lm_documentos
      union select dono from public.lm_escritorio
    ) x where dono is not null
  loop
    -- já é membro de algum escritório? então não mexe
    if exists (select 1 from public.lm_membros where user_id = u.dono) then
      continue;
    end if;

    select coalesce(nullif(trim(dados->>'nome'),''), nullif(trim(dados->>'escritorio'),''))
      into v_nome from public.lm_escritorio where dono = u.dono;
    if v_nome is null or v_nome = '' then
      v_nome := coalesce((select email from auth.users where id = u.dono), 'Escritório');
    end if;

    insert into public.lm_escritorios (nome, criado_por, dados)
         values (v_nome, u.dono, coalesce((select dados from public.lm_escritorio where dono = u.dono), '{}'::jsonb))
      returning id into v_id;

    insert into public.lm_membros (escritorio_id, user_id, email, papel)
         values (v_id, u.dono, coalesce((select email from auth.users where id = u.dono),''), 'dono');

    update public.lm_modelos    set escritorio_id = v_id where dono = u.dono and escritorio_id is null;
    update public.lm_clientes   set escritorio_id = v_id where dono = u.dono and escritorio_id is null;
    update public.lm_documentos set escritorio_id = v_id where dono = u.dono and escritorio_id is null;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Políticas de acesso
-- ---------------------------------------------------------------------------

alter table public.lm_escritorios enable row level security;
alter table public.lm_membros     enable row level security;
alter table public.lm_convites    enable row level security;

-- Escritórios: vê e altera quem é membro; alterar o cadastro, só quem administra
drop policy if exists lm_escritorios_ler on public.lm_escritorios;
create policy lm_escritorios_ler on public.lm_escritorios
  for select to authenticated
  using (id in (select public.lm_meus_escritorios()));

drop policy if exists lm_escritorios_alterar on public.lm_escritorios;
create policy lm_escritorios_alterar on public.lm_escritorios
  for update to authenticated
  using (public.lm_administra(id))
  with check (public.lm_administra(id));

-- Membros: cada um enxerga a equipe do próprio escritório
drop policy if exists lm_membros_ler on public.lm_membros;
create policy lm_membros_ler on public.lm_membros
  for select to authenticated
  using (escritorio_id in (select public.lm_meus_escritorios()));

-- Convites: só quem administra enxerga os códigos
drop policy if exists lm_convites_ler on public.lm_convites;
create policy lm_convites_ler on public.lm_convites
  for select to authenticated
  using (public.lm_administra(escritorio_id));

-- Dados do LexMandato: do escritório, com os registros antigos ainda do dono
do $$
declare t text;
begin
  foreach t in array array['lm_modelos','lm_clientes','lm_documentos'] loop
    execute format('drop policy if exists %I on public.%I', t || '_dono', t);
    execute format('drop policy if exists %I on public.%I', t || '_esc', t);
    execute format($f$
      create policy %I on public.%I for all to authenticated
      using (
        (escritorio_id is not null and escritorio_id in (select public.lm_meus_escritorios()))
        or (escritorio_id is null and dono = auth.uid())
      )
      with check (
        (escritorio_id is not null and escritorio_id in (select public.lm_meus_escritorios()))
        or (escritorio_id is null and dono = auth.uid())
      )$f$, t || '_esc', t);
  end loop;
end $$;

revoke all on public.lm_escritorios, public.lm_membros, public.lm_convites from anon;
grant select on public.lm_escritorios, public.lm_membros, public.lm_convites to authenticated;
grant update on public.lm_escritorios to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Conferência rápida
-- ---------------------------------------------------------------------------
-- select e.nome, m.email, m.papel
--   from public.lm_membros m join public.lm_escritorios e on e.id = m.escritorio_id
--  order by e.nome, m.papel;

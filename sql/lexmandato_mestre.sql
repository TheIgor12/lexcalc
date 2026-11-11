-- ============================================================================
-- LexMandato: login mestre da BlackSolutions
-- Um login mestre administra todos os escritórios: cria, lista, entra para
-- alimentar os modelos e dá ou tira acesso de qualquer pessoa.
--
-- Rode DEPOIS do arquivo sql/lexmandato_escritorio.sql.
-- Pode ser executado mais de uma vez sem quebrar nada.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Quem é mestre
-- ---------------------------------------------------------------------------

create table if not exists public.lm_mestres (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  email     text not null default '',
  criado_em timestamptz not null default now()
);

-- O login mestre da BlackSolutions.
-- Para incluir outro mestre depois, troque o e-mail abaixo e rode de novo.
insert into public.lm_mestres (user_id, email)
select id, email from auth.users where lower(email) = lower('loklok2030@gmail.com')
on conflict (user_id) do update set email = excluded.email;

create or replace function public.lm_e_mestre()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.lm_mestres where user_id = auth.uid())
$$;

-- ---------------------------------------------------------------------------
-- 2. Registro de toda entrada do mestre em escritório de terceiro
--    O escritório enxerga esse registro. Poder sem rastro não presta.
-- ---------------------------------------------------------------------------

create table if not exists public.lm_acessos_mestre (
  id            bigserial primary key,
  escritorio_id uuid not null references public.lm_escritorios(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  email         text not null default '',
  acao          text not null default 'entrou',
  quando        timestamptz not null default now()
);
create index if not exists lm_acessos_mestre_esc on public.lm_acessos_mestre (escritorio_id, quando desc);

create or replace function public.lm_mestre_registrar(p_escritorio uuid, p_acao text default 'entrou')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.lm_e_mestre() then
    raise exception 'Somente o login mestre.';
  end if;
  -- não repete registro da mesma ação no mesmo escritório dentro de 1 hora
  if exists (
    select 1 from public.lm_acessos_mestre
     where escritorio_id = p_escritorio and user_id = auth.uid()
       and acao = p_acao and quando > now() - interval '1 hour'
  ) then
    return;
  end if;
  insert into public.lm_acessos_mestre (escritorio_id, user_id, email, acao)
       values (p_escritorio, auth.uid(), coalesce((select email from auth.users where id = auth.uid()),''), p_acao);
end $$;

-- ---------------------------------------------------------------------------
-- 3. Lista de todos os escritórios, só para o mestre
-- ---------------------------------------------------------------------------

create or replace function public.lm_mestre_escritorios()
returns table (
  id uuid, nome text, criado_em timestamptz,
  membros bigint, modelos bigint, clientes bigint, documentos bigint,
  emails text
)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.nome, e.criado_em,
         (select count(*) from public.lm_membros    m where m.escritorio_id = e.id),
         (select count(*) from public.lm_modelos    x where x.escritorio_id = e.id and x.ativo),
         (select count(*) from public.lm_clientes   c where c.escritorio_id = e.id),
         (select count(*) from public.lm_documentos d where d.escritorio_id = e.id),
         (select string_agg(m.email || ' (' || m.papel || ')', ', ' order by m.criado_em)
            from public.lm_membros m where m.escritorio_id = e.id)
    from public.lm_escritorios e
   where public.lm_e_mestre()
   order by e.criado_em desc
$$;

-- Cria escritório em nome de terceiro, sem o mestre virar membro.
create or replace function public.lm_mestre_criar(p_nome text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.lm_e_mestre() then
    raise exception 'Somente o login mestre.';
  end if;
  if coalesce(trim(p_nome),'') = '' then
    raise exception 'Informe o nome do escritório.';
  end if;
  insert into public.lm_escritorios (nome, criado_por) values (trim(p_nome), auth.uid()) returning id into v_id;
  insert into public.lm_acessos_mestre (escritorio_id, user_id, email, acao)
       values (v_id, auth.uid(), coalesce((select email from auth.users where id = auth.uid()),''), 'criou o escritório');
  return v_id;
end $$;

-- Gera convite para qualquer escritório. Só o mestre.
create or replace function public.lm_mestre_convite(p_escritorio uuid, p_papel text default 'dono')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_cod text;
begin
  if not public.lm_e_mestre() then
    raise exception 'Somente o login mestre.';
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
  insert into public.lm_acessos_mestre (escritorio_id, user_id, email, acao)
       values (p_escritorio, auth.uid(), coalesce((select email from auth.users where id = auth.uid()),''), 'gerou convite de ' || p_papel);
  return v_cod;
end $$;

-- Renomeia um escritório. Só o mestre.
create or replace function public.lm_mestre_renomear(p_escritorio uuid, p_nome text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.lm_e_mestre() then
    raise exception 'Somente o login mestre.';
  end if;
  if coalesce(trim(p_nome),'') = '' then
    raise exception 'Informe o nome do escritório.';
  end if;
  update public.lm_escritorios set nome = trim(p_nome), atualizado_em = now() where id = p_escritorio;
end $$;

grant execute on function
  public.lm_e_mestre(),
  public.lm_mestre_registrar(uuid,text),
  public.lm_mestre_escritorios(),
  public.lm_mestre_criar(text),
  public.lm_mestre_convite(uuid,text),
  public.lm_mestre_renomear(uuid,text)
to authenticated;

-- ---------------------------------------------------------------------------
-- 4. O mestre passa a enxergar e alimentar qualquer escritório
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['lm_modelos','lm_clientes','lm_documentos'] loop
    execute format('drop policy if exists %I on public.%I', t || '_esc', t);
    execute format($f$
      create policy %I on public.%I for all to authenticated
      using (
        public.lm_e_mestre()
        or (escritorio_id is not null and escritorio_id in (select public.lm_meus_escritorios()))
        or (escritorio_id is null and dono = auth.uid())
      )
      with check (
        public.lm_e_mestre()
        or (escritorio_id is not null and escritorio_id in (select public.lm_meus_escritorios()))
        or (escritorio_id is null and dono = auth.uid())
      )$f$, t || '_esc', t);
  end loop;
end $$;

drop policy if exists lm_escritorios_ler on public.lm_escritorios;
create policy lm_escritorios_ler on public.lm_escritorios
  for select to authenticated
  using (public.lm_e_mestre() or id in (select public.lm_meus_escritorios()));

drop policy if exists lm_escritorios_alterar on public.lm_escritorios;
create policy lm_escritorios_alterar on public.lm_escritorios
  for update to authenticated
  using (public.lm_e_mestre() or public.lm_administra(id))
  with check (public.lm_e_mestre() or public.lm_administra(id));

drop policy if exists lm_membros_ler on public.lm_membros;
create policy lm_membros_ler on public.lm_membros
  for select to authenticated
  using (public.lm_e_mestre() or escritorio_id in (select public.lm_meus_escritorios()));

drop policy if exists lm_convites_ler on public.lm_convites;
create policy lm_convites_ler on public.lm_convites
  for select to authenticated
  using (public.lm_e_mestre() or public.lm_administra(escritorio_id));

-- O escritório enxerga quando o mestre entrou. O mestre também.
alter table public.lm_acessos_mestre enable row level security;
drop policy if exists lm_acessos_mestre_ler on public.lm_acessos_mestre;
create policy lm_acessos_mestre_ler on public.lm_acessos_mestre
  for select to authenticated
  using (public.lm_e_mestre() or escritorio_id in (select public.lm_meus_escritorios()));

-- O mestre também administra equipe de qualquer escritório
create or replace function public.lm_administra(p_escritorio uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.lm_e_mestre() or exists (
    select 1 from public.lm_membros
     where escritorio_id = p_escritorio
       and user_id = auth.uid()
       and papel in ('dono','suporte')
  )
$$;

alter table public.lm_mestres enable row level security;
drop policy if exists lm_mestres_ler on public.lm_mestres;
create policy lm_mestres_ler on public.lm_mestres
  for select to authenticated using (user_id = auth.uid());

revoke all on public.lm_mestres, public.lm_acessos_mestre from anon;
grant select on public.lm_mestres, public.lm_acessos_mestre to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Conferência
-- ---------------------------------------------------------------------------
-- select * from public.lm_mestres;
-- select * from public.lm_mestre_escritorios();

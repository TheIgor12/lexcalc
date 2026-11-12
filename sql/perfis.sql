-- ============================================================================
-- Lex Calc: perfis de acesso da equipe do escritório
-- Cada escritório cria os próprios perfis (Recepcionista, Secretária, Setor
-- Comercial, Assistente Jurídico, Advogados, Controladoria e outros) e marca,
-- uma a uma, as permissões de cada perfil. Cada pessoa da equipe recebe um
-- perfil, e o banco de dados só deixa fazer o que o perfil permite.
--
-- Rode DEPOIS de:
--   sql/lexmandato_escritorio.sql
--   sql/lexmandato_mestre.sql
--   sql/lexmandato_sair.sql
-- Pode ser executado mais de uma vez sem quebrar nada.
--
-- Regras que valem para todos:
--   1. O responsável (dono), o suporte e o login mestre têm todas as permissões.
--   2. Quem está na equipe sem perfil continua como antes: usa tudo, menos
--      administrar escritório, convites, acessos e perfis.
--   3. Quem administra perfis sem ser o responsável só consegue liberar as
--      permissões que o próprio perfil já tem. Ninguém aumenta o próprio poder.
--   4. Ninguém troca o próprio perfil, a não ser o responsável.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Lista oficial de permissões
-- ---------------------------------------------------------------------------

create or replace function public.lm_catalogo_permissoes()
returns text[]
language sql
immutable
as $$
  select array[
    'calc_juridico','calc_liquidacao','calc_tributario','calc_salvos',
    'lm_gerar','lm_contrato','lm_docs_ver','lm_docs_excluir',
    'lm_clientes_ver','lm_clientes_editar','lm_clientes_excluir',
    'lm_modelos_ver','lm_modelos_editar',
    'esc_editar','equipe_ver','equipe_convidar','equipe_remover','perfis_admin'
  ]
$$;

-- Permissões de administração. A equipe sem perfil não recebe estas.
create or replace function public.lm_permissoes_admin()
returns text[]
language sql
immutable
as $$
  select array['esc_editar','equipe_convidar','equipe_remover','perfis_admin']
$$;

-- ---------------------------------------------------------------------------
-- 2. Tabela de perfis e ligação com membros e convites
-- ---------------------------------------------------------------------------

create table if not exists public.lm_perfis (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references public.lm_escritorios(id) on delete cascade,
  nome          text not null,
  descricao     text not null default '',
  permissoes    text[] not null default '{}',
  criado_por    uuid references auth.users(id) on delete set null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index if not exists lm_perfis_nome on public.lm_perfis (escritorio_id, lower(nome));

alter table public.lm_membros  add column if not exists perfil_id uuid references public.lm_perfis(id);
alter table public.lm_convites add column if not exists perfil_id uuid references public.lm_perfis(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 3. Conferência de permissão
-- ---------------------------------------------------------------------------

-- Verdadeiro quando quem está logado pode fazer aquela ação no escritório.
create or replace function public.lm_pode(p_escritorio uuid, p_chave text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.lm_e_mestre() or exists (
    select 1
      from public.lm_membros m
      left join public.lm_perfis p on p.id = m.perfil_id
     where m.escritorio_id = p_escritorio
       and m.user_id = auth.uid()
       and (
             m.papel in ('dono','suporte')
          or (m.perfil_id is null and not (p_chave = any (public.lm_permissoes_admin())))
          or (p.id is not null and p_chave = any (p.permissoes))
       )
  )
$$;

-- Verdadeiro quando a linha é do próprio login (registro antigo, sem escritório)
-- ou quando o login tem pelo menos uma das permissões no escritório da linha.
create or replace function public.lm_linha(p_escritorio uuid, p_dono uuid, p_chaves text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.lm_e_mestre()
      or (p_escritorio is null and p_dono = auth.uid())
      or (p_escritorio is not null and exists (
            select 1 from unnest(p_chaves) k where public.lm_pode(p_escritorio, k)))
$$;

-- Permissões que faltam para quem está logado entre as informadas.
create or replace function public.lm_faltam(p_escritorio uuid, p_perms text[])
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(k), '{}') from unnest(coalesce(p_perms,'{}')) k
   where not public.lm_pode(p_escritorio, k)
$$;

-- O que a tela precisa saber sobre quem está logado.
create or replace function public.lm_minhas_permissoes(p_escritorio uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare m record; v_total boolean; v_perms text[];
begin
  if public.lm_e_mestre() then
    return jsonb_build_object('papel','mestre','total',true,'perfil',null,'permissoes',to_jsonb(public.lm_catalogo_permissoes()));
  end if;

  select mm.papel, mm.perfil_id, p.nome as perfil_nome, p.permissoes
    into m
    from public.lm_membros mm
    left join public.lm_perfis p on p.id = mm.perfil_id
   where mm.escritorio_id = p_escritorio and mm.user_id = auth.uid();

  if not found then
    return jsonb_build_object('papel',null,'total',false,'perfil',null,'permissoes','[]'::jsonb);
  end if;

  v_total := m.papel in ('dono','suporte');
  if v_total then
    v_perms := public.lm_catalogo_permissoes();
  elsif m.perfil_id is null then
    select coalesce(array_agg(k),'{}') into v_perms
      from unnest(public.lm_catalogo_permissoes()) k
     where not (k = any (public.lm_permissoes_admin()));
  else
    v_perms := m.permissoes;
  end if;

  return jsonb_build_object(
    'papel', m.papel,
    'total', v_total,
    'perfil', case when m.perfil_id is null then null
                   else jsonb_build_object('id', m.perfil_id, 'nome', m.perfil_nome) end,
    'permissoes', to_jsonb(v_perms)
  );
end $$;

-- ---------------------------------------------------------------------------
-- 4. Criar, alterar e excluir perfis
-- ---------------------------------------------------------------------------

create or replace function public.lm_salvar_perfil(
  p_escritorio uuid,
  p_id uuid,
  p_nome text,
  p_descricao text,
  p_permissoes text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; v_perms text[]; v_faltam text[];
begin
  if not public.lm_pode(p_escritorio, 'perfis_admin') then
    raise exception 'Seu perfil não permite criar ou alterar perfis.';
  end if;
  if coalesce(trim(p_nome),'') = '' then
    raise exception 'Informe o nome do perfil.';
  end if;

  -- só entra o que existe na lista oficial, sem repetição
  select coalesce(array_agg(distinct k order by k),'{}') into v_perms
    from unnest(coalesce(p_permissoes,'{}')) k
   where k = any (public.lm_catalogo_permissoes());

  if not public.lm_administra(p_escritorio) then
    v_faltam := public.lm_faltam(p_escritorio, v_perms);
    if array_length(v_faltam,1) > 0 then
      raise exception 'Você só pode liberar as permissões que o seu próprio perfil tem. Desmarque: %', array_to_string(v_faltam, ', ');
    end if;
  end if;

  if exists (select 1 from public.lm_perfis
              where escritorio_id = p_escritorio
                and lower(nome) = lower(trim(p_nome))
                and (p_id is null or id <> p_id)) then
    raise exception 'Já existe um perfil com o nome %.', trim(p_nome);
  end if;

  if p_id is null then
    insert into public.lm_perfis (escritorio_id, nome, descricao, permissoes, criado_por)
         values (p_escritorio, trim(p_nome), coalesce(trim(p_descricao),''), v_perms, auth.uid())
      returning id into v_id;
  else
    update public.lm_perfis
       set nome = trim(p_nome),
           descricao = coalesce(trim(p_descricao),''),
           permissoes = v_perms,
           atualizado_em = now()
     where id = p_id and escritorio_id = p_escritorio
     returning id into v_id;
    if v_id is null then
      raise exception 'Perfil não encontrado neste escritório.';
    end if;
  end if;

  return v_id;
end $$;

-- Um perfil em uso não pode ser apagado: quem está nele ficaria sem perfil,
-- e sem perfil a pessoa ganharia acesso de equipe completo.
create or replace function public.lm_excluir_perfil(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_esc uuid; v_qtd int;
begin
  select escritorio_id into v_esc from public.lm_perfis where id = p_id;
  if v_esc is null then
    raise exception 'Perfil não encontrado.';
  end if;
  if not public.lm_pode(v_esc, 'perfis_admin') then
    raise exception 'Seu perfil não permite excluir perfis.';
  end if;

  select count(*) into v_qtd from public.lm_membros where perfil_id = p_id;
  if v_qtd > 0 then
    raise exception 'Este perfil está em uso por % pessoa(s). Troque o perfil delas antes de excluir.', v_qtd;
  end if;

  -- convites ainda não usados deste perfil deixam de valer
  delete from public.lm_convites where perfil_id = p_id and usado_por is null;
  delete from public.lm_perfis where id = p_id;
end $$;

-- Perfis sugeridos. Só cria os que ainda não existem pelo nome.
create or replace function public.lm_perfis_sugeridos(p_escritorio uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_qtd int := 0; s record;
begin
  if not public.lm_administra(p_escritorio) then
    raise exception 'Somente o responsável pelo escritório pode criar os perfis sugeridos.';
  end if;

  for s in
    select * from (values
      ('Recepcionista',
       'Atende o cliente, cadastra os dados e gera procuração e declaração. Não gera contrato e não faz cálculo.',
       array['lm_gerar','lm_docs_ver','lm_clientes_ver','lm_clientes_editar','lm_modelos_ver']),
      ('Secretária',
       'Organiza clientes e documentos, acompanha a situação de cada um e consulta os cálculos salvos.',
       array['lm_gerar','lm_docs_ver','lm_clientes_ver','lm_clientes_editar','lm_modelos_ver','calc_salvos','equipe_ver']),
      ('Setor Comercial',
       'Fecha o contrato com o cliente: gera procuração, declaração e contrato de honorários.',
       array['lm_gerar','lm_contrato','lm_docs_ver','lm_clientes_ver','lm_clientes_editar','lm_modelos_ver']),
      ('Assistente Jurídico',
       'Faz os cálculos jurídicos, de liquidação e tributários e gera os documentos dos clientes.',
       array['calc_juridico','calc_liquidacao','calc_tributario','calc_salvos','lm_gerar','lm_docs_ver','lm_clientes_ver','lm_clientes_editar','lm_modelos_ver']),
      ('Advogados',
       'Uso completo dos cálculos e do LexMandato, inclusive contrato, exclusão e manutenção da biblioteca de modelos.',
       array['calc_juridico','calc_liquidacao','calc_tributario','calc_salvos','lm_gerar','lm_contrato','lm_docs_ver','lm_docs_excluir','lm_clientes_ver','lm_clientes_editar','lm_clientes_excluir','lm_modelos_ver','lm_modelos_editar','equipe_ver']),
      ('Controladoria',
       'Confere e organiza: vê tudo, exclui o que estiver errado, mantém a biblioteca e os dados do escritório e administra a equipe e os perfis.',
       array['calc_salvos','lm_docs_ver','lm_docs_excluir','lm_clientes_ver','lm_clientes_excluir','lm_modelos_ver','lm_modelos_editar','esc_editar','equipe_ver','equipe_convidar','equipe_remover','perfis_admin'])
    ) as t(nome, descricao, permissoes)
  loop
    if not exists (select 1 from public.lm_perfis where escritorio_id = p_escritorio and lower(nome) = lower(s.nome)) then
      insert into public.lm_perfis (escritorio_id, nome, descricao, permissoes, criado_por)
           values (p_escritorio, s.nome, s.descricao, s.permissoes, auth.uid());
      v_qtd := v_qtd + 1;
    end if;
  end loop;

  return v_qtd;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Dar perfil a uma pessoa
-- ---------------------------------------------------------------------------

create or replace function public.lm_definir_perfil(p_escritorio uuid, p_user uuid, p_perfil uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_papel text; v_perms text[]; v_faltam text[]; v_adm boolean;
begin
  if not public.lm_pode(p_escritorio, 'perfis_admin') then
    raise exception 'Seu perfil não permite trocar o perfil das pessoas.';
  end if;
  v_adm := public.lm_administra(p_escritorio);

  select papel into v_papel from public.lm_membros where escritorio_id = p_escritorio and user_id = p_user;
  if v_papel is null then
    raise exception 'Esta pessoa não está no escritório.';
  end if;
  if v_papel <> 'equipe' then
    raise exception 'O responsável e o suporte já têm todas as permissões. Perfil vale só para a equipe.';
  end if;
  if p_user = auth.uid() and not v_adm then
    raise exception 'Você não pode trocar o seu próprio perfil. Peça ao responsável pelo escritório.';
  end if;

  if p_perfil is null then
    if not v_adm then
      raise exception 'Somente o responsável pode deixar alguém sem perfil, porque sem perfil a pessoa usa tudo.';
    end if;
  else
    select permissoes into v_perms from public.lm_perfis where id = p_perfil and escritorio_id = p_escritorio;
    if v_perms is null then
      raise exception 'Perfil não encontrado neste escritório.';
    end if;
    if not v_adm then
      v_faltam := public.lm_faltam(p_escritorio, v_perms);
      if array_length(v_faltam,1) > 0 then
        raise exception 'Este perfil tem permissões que o seu não tem (%). Peça ao responsável.', array_to_string(v_faltam, ', ');
      end if;
    end if;
  end if;

  update public.lm_membros set perfil_id = p_perfil
   where escritorio_id = p_escritorio and user_id = p_user;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Convites com perfil
-- ---------------------------------------------------------------------------

create or replace function public.lm_novo_convite_perfil(p_escritorio uuid, p_perfil uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_cod text; v_perms text[]; v_faltam text[];
begin
  if not public.lm_pode(p_escritorio, 'equipe_convidar') then
    raise exception 'Seu perfil não permite gerar convite.';
  end if;

  if p_perfil is null then
    if not public.lm_administra(p_escritorio) then
      raise exception 'Escolha o perfil da pessoa convidada.';
    end if;
  else
    select permissoes into v_perms from public.lm_perfis where id = p_perfil and escritorio_id = p_escritorio;
    if v_perms is null then
      raise exception 'Perfil não encontrado neste escritório.';
    end if;
    if not public.lm_administra(p_escritorio) then
      v_faltam := public.lm_faltam(p_escritorio, v_perms);
      if array_length(v_faltam,1) > 0 then
        raise exception 'Este perfil tem permissões que o seu não tem (%). Peça ao responsável.', array_to_string(v_faltam, ', ');
      end if;
    end if;
  end if;

  loop
    v_cod := upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    exit when not exists (select 1 from public.lm_convites where codigo = v_cod);
  end loop;

  insert into public.lm_convites (codigo, escritorio_id, papel, criado_por, perfil_id)
       values (v_cod, p_escritorio, 'equipe', auth.uid(), p_perfil);

  return v_cod;
end $$;

-- O convite agora leva o perfil junto.
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

  select * into c from public.lm_convites where codigo = upper(trim(p_codigo));

  if not found then
    raise exception 'Código não encontrado.';
  end if;
  if c.usado_por is not null then
    raise exception 'Este código já foi usado.';
  end if;
  if c.expira_em < now() then
    raise exception 'Este código venceu. Peça um novo ao escritório.';
  end if;

  insert into public.lm_membros (escritorio_id, user_id, email, papel, perfil_id)
       values (c.escritorio_id, auth.uid(), coalesce((select email from auth.users where id = auth.uid()),''), c.papel,
               case when c.papel = 'equipe' then c.perfil_id else null end)
  on conflict (escritorio_id, user_id) do update
     set papel = excluded.papel,
         perfil_id = excluded.perfil_id;

  update public.lm_convites set usado_por = auth.uid(), usado_em = now() where codigo = c.codigo;

  return c.escritorio_id;
end $$;

-- Tirar acesso: quem tem a permissão tira a equipe; o responsável só sai
-- pelas mãos de outro responsável.
create or replace function public.lm_remover_membro(p_escritorio uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_papel text;
begin
  if not public.lm_pode(p_escritorio, 'equipe_remover') then
    raise exception 'Seu perfil não permite tirar o acesso de alguém.';
  end if;
  if p_user = auth.uid() then
    raise exception 'Para sair do escritório, use o botão Desvincular minha conta.';
  end if;

  select papel into v_papel from public.lm_membros where escritorio_id = p_escritorio and user_id = p_user;
  if v_papel is null then
    raise exception 'Esta pessoa não está no escritório.';
  end if;
  if v_papel in ('dono','suporte') and not public.lm_administra(p_escritorio) then
    raise exception 'Somente o responsável pode tirar o acesso de outro responsável ou do suporte.';
  end if;
  if v_papel = 'dono'
     and (select count(*) from public.lm_membros where escritorio_id = p_escritorio and papel = 'dono') <= 1 then
    raise exception 'O escritório precisa de pelo menos um responsável.';
  end if;

  delete from public.lm_membros where escritorio_id = p_escritorio and user_id = p_user;
end $$;

grant execute on function
  public.lm_catalogo_permissoes(),
  public.lm_permissoes_admin(),
  public.lm_pode(uuid,text),
  public.lm_linha(uuid,uuid,text[]),
  public.lm_faltam(uuid,text[]),
  public.lm_minhas_permissoes(uuid),
  public.lm_salvar_perfil(uuid,uuid,text,text,text[]),
  public.lm_excluir_perfil(uuid),
  public.lm_perfis_sugeridos(uuid),
  public.lm_definir_perfil(uuid,uuid,uuid),
  public.lm_novo_convite_perfil(uuid,uuid),
  public.lm_usar_convite(text),
  public.lm_remover_membro(uuid,uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Políticas de acesso por permissão
-- ---------------------------------------------------------------------------

alter table public.lm_perfis enable row level security;
drop policy if exists lm_perfis_ler on public.lm_perfis;
create policy lm_perfis_ler on public.lm_perfis
  for select to authenticated
  using (public.lm_e_mestre() or escritorio_id in (select public.lm_meus_escritorios()));
revoke all on public.lm_perfis from anon;
grant select on public.lm_perfis to authenticated;

-- Documentos
drop policy if exists lm_documentos_esc     on public.lm_documentos;
drop policy if exists lm_documentos_ler     on public.lm_documentos;
drop policy if exists lm_documentos_criar   on public.lm_documentos;
drop policy if exists lm_documentos_alterar on public.lm_documentos;
drop policy if exists lm_documentos_excluir on public.lm_documentos;
create policy lm_documentos_ler on public.lm_documentos for select to authenticated
  using (public.lm_linha(escritorio_id, dono, array['lm_docs_ver'])
         or (dono = auth.uid() and public.lm_linha(escritorio_id, dono, array['lm_gerar'])));
create policy lm_documentos_criar on public.lm_documentos for insert to authenticated
  with check (public.lm_linha(escritorio_id, dono, array['lm_gerar']));
create policy lm_documentos_alterar on public.lm_documentos for update to authenticated
  using (public.lm_linha(escritorio_id, dono, array['lm_gerar'])
         and (dono = auth.uid() or public.lm_linha(escritorio_id, dono, array['lm_docs_ver'])))
  with check (public.lm_linha(escritorio_id, dono, array['lm_gerar']));
create policy lm_documentos_excluir on public.lm_documentos for delete to authenticated
  using (public.lm_linha(escritorio_id, dono, array['lm_docs_excluir']));

-- Clientes (quem gera documento precisa achar e gravar o cliente)
drop policy if exists lm_clientes_esc     on public.lm_clientes;
drop policy if exists lm_clientes_ler     on public.lm_clientes;
drop policy if exists lm_clientes_criar   on public.lm_clientes;
drop policy if exists lm_clientes_alterar on public.lm_clientes;
drop policy if exists lm_clientes_excluir on public.lm_clientes;
create policy lm_clientes_ler on public.lm_clientes for select to authenticated
  using (public.lm_linha(escritorio_id, dono, array['lm_clientes_ver','lm_gerar']));
create policy lm_clientes_criar on public.lm_clientes for insert to authenticated
  with check (public.lm_linha(escritorio_id, dono, array['lm_clientes_editar','lm_gerar']));
create policy lm_clientes_alterar on public.lm_clientes for update to authenticated
  using (public.lm_linha(escritorio_id, dono, array['lm_clientes_editar','lm_gerar']))
  with check (public.lm_linha(escritorio_id, dono, array['lm_clientes_editar','lm_gerar']));
create policy lm_clientes_excluir on public.lm_clientes for delete to authenticated
  using (public.lm_linha(escritorio_id, dono, array['lm_clientes_excluir']));

-- Biblioteca de modelos (quem gera documento precisa ler os modelos)
drop policy if exists lm_modelos_esc     on public.lm_modelos;
drop policy if exists lm_modelos_ler     on public.lm_modelos;
drop policy if exists lm_modelos_criar   on public.lm_modelos;
drop policy if exists lm_modelos_alterar on public.lm_modelos;
drop policy if exists lm_modelos_excluir on public.lm_modelos;
create policy lm_modelos_ler on public.lm_modelos for select to authenticated
  using (public.lm_linha(escritorio_id, dono, array['lm_modelos_ver','lm_gerar']));
create policy lm_modelos_criar on public.lm_modelos for insert to authenticated
  with check (public.lm_linha(escritorio_id, dono, array['lm_modelos_editar']));
create policy lm_modelos_alterar on public.lm_modelos for update to authenticated
  using (public.lm_linha(escritorio_id, dono, array['lm_modelos_editar']))
  with check (public.lm_linha(escritorio_id, dono, array['lm_modelos_editar']));
create policy lm_modelos_excluir on public.lm_modelos for delete to authenticated
  using (public.lm_linha(escritorio_id, dono, array['lm_modelos_editar']));

-- Dados do escritório e dos advogados
drop policy if exists lm_escritorios_alterar on public.lm_escritorios;
create policy lm_escritorios_alterar on public.lm_escritorios
  for update to authenticated
  using (public.lm_pode(id, 'esc_editar'))
  with check (public.lm_pode(id, 'esc_editar'));

-- ---------------------------------------------------------------------------
-- 8. Conferência rápida
-- ---------------------------------------------------------------------------
-- select e.nome, m.email, m.papel, p.nome as perfil
--   from public.lm_membros m
--   join public.lm_escritorios e on e.id = m.escritorio_id
--   left join public.lm_perfis p on p.id = m.perfil_id
--  order by e.nome, m.papel, m.email;

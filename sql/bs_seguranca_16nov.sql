-- ===========================================================================
-- BlackSolutions, pacote de segurança de 16/11/2026
-- Vale para o BlackFlow e para o Lex Calc, que dividem o mesmo banco.
--
-- Situação encontrada no banco antes deste script:
--   * lexcalc_cobranca.sql nunca foi rodado. A função lexcalc_liberado não
--     existia e as políticas de lexcalc_calculos exigiam só user_id. O Lex
--     Calc não tinha trava de assinatura nenhuma no servidor.
--   * bs_endurecimento.sql nunca foi rodado. A criar_clinica em vigor ainda
--     deixava quem tem unidade paga abrir testes sem limite.
--   * O Lex Calc não pedia documento nenhum no cadastro.
--   * O CNPJ do BlackFlow era conferido no navegador, e o banco aceitava a
--     razão social e a verificação que o navegador mandasse.
--   * O Storage do Lex Calc (timbres) e o LexMandato aceitavam gravação de
--     quem estava com o teste vencido.
--
-- O que este script faz:
--   1. bs_identidades passa a separar produto, para o mesmo CPF poder testar
--      o BlackFlow e o Lex Calc uma vez cada, e passa a aceitar telefone.
--   2. Telefone confirmado por SMS, nos dois sistemas, ligado por chave em
--      bs_config. As chaves nascem DESLIGADAS. Ligue cada uma só depois que o
--      provedor de SMS estiver configurado no Supabase e um código de teste
--      tiver chegado no seu celular. Ligar antes trava todo cadastro novo.
--        update public.bs_config set valor='1' where chave='exigir_telefone_lexcalc';
--        update public.bs_config set valor='1' where chave='exigir_telefone_blackflow';
--   3. CPF obrigatório no Lex Calc para usar o teste grátis, queimado em
--      bs_identidades como no BlackFlow.
--   4. Trava de assinatura do Lex Calc no servidor, em cálculos, LexMandato
--      e Storage. Leitura e exclusão continuam livres para o dono dos dados
--      (Lei nº 13.709/2018, art. 18, incisos II e V).
--   5. CNPJ do BlackFlow conferido pelo próprio banco na Receita Federal,
--      por meio da BrasilAPI. O que vier do navegador deixa de valer.
--   6. As partes do bs_endurecimento.sql que ficaram para trás.
--
-- Pode ser rodado mais de uma vez. Não apaga dado nenhum.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. bs_identidades por produto, com telefone
-- ---------------------------------------------------------------------------
alter table public.bs_identidades add column if not exists produto text not null default 'blackflow';

alter table public.bs_identidades drop constraint if exists bs_identidades_tipo_check;
alter table public.bs_identidades add constraint bs_identidades_tipo_check
  check (tipo in ('cpf','cnpj','telefone'));

alter table public.bs_identidades drop constraint if exists bs_identidades_produto_check;
alter table public.bs_identidades add constraint bs_identidades_produto_check
  check (produto in ('blackflow','lexcalc'));

do $$
begin
  if exists (select 1 from pg_constraint
              where conname = 'bs_identidades_pkey'
                and conrelid = 'public.bs_identidades'::regclass
                and array_length(conkey,1) = 1) then
    alter table public.bs_identidades drop constraint bs_identidades_pkey;
    alter table public.bs_identidades add constraint bs_identidades_pkey primary key (documento, produto);
  end if;
end $$;

create index if not exists bs_identidades_user_idx on public.bs_identidades (user_id, produto, tipo);

-- ---------------------------------------------------------------------------
-- 2. Configuração
-- ---------------------------------------------------------------------------
insert into public.bs_config (chave, valor)
select v.chave, v.valor from (values
  ('exigir_telefone_lexcalc',   '0'),
  ('exigir_telefone_blackflow', '0'),
  ('lexcalc_teste_dias',        coalesce((select valor from public.bs_config where chave='teste_dias'),'7'))
) v(chave, valor)
where not exists (select 1 from public.bs_config c where c.chave = v.chave);

-- ---------------------------------------------------------------------------
-- 3. Telefone
-- O Supabase grava o celular em auth.users.phone e marca phone_confirmed_at
-- quando a pessoa digita o código recebido por SMS. O banco só confia nisso.
-- ---------------------------------------------------------------------------
create or replace function public.bs_meu_telefone_confirmado()
returns text
language sql stable security definer set search_path to 'public'
as $function$
  select nullif(public.bs_so_dig(u.phone), '')
    from auth.users u
   where u.id = auth.uid() and u.phone_confirmed_at is not null
$function$;
grant execute on function public.bs_meu_telefone_confirmado() to authenticated;

create or replace function public.bs_telefone_ok(p_produto text)
returns boolean
language sql stable security definer set search_path to 'public'
as $function$
  select public.lm_e_mestre()
      or public.bs_cfg('exigir_telefone_' || p_produto, 0) <> 1
      or exists (select 1 from public.bs_identidades i
                  where i.user_id = auth.uid() and i.produto = p_produto and i.tipo = 'telefone')
$function$;
grant execute on function public.bs_telefone_ok(text) to authenticated;

create or replace function public.bs_registrar_telefone(p_produto text)
returns boolean
language plpgsql security definer set search_path to 'public'
as $function$
declare v_tel text; v_email text;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro'; end if;
  if p_produto not in ('blackflow','lexcalc') then raise exception 'Produto inválido'; end if;

  v_tel := public.bs_meu_telefone_confirmado();
  if v_tel is null then
    raise exception 'Confirme o celular com o código recebido por SMS.';
  end if;

  if exists (select 1 from public.bs_identidades
              where user_id = auth.uid() and produto = p_produto and tipo = 'telefone') then
    return true;
  end if;

  if not public.lm_e_mestre() and exists (
       select 1 from public.bs_identidades
        where documento = v_tel and produto = p_produto and user_id is distinct from auth.uid()) then
    raise exception 'Este celular já foi usado em outro cadastro de teste grátis. Entre na conta que você já tem, ou fale com o suporte.';
  end if;

  select lower(coalesce(raw_user_meta_data->>'contato', email)) into v_email
    from auth.users where id = auth.uid();

  insert into public.bs_identidades (documento, tipo, produto, user_id, email)
  values (v_tel, 'telefone', p_produto, auth.uid(), v_email)
  on conflict (documento, produto) do nothing;
  return true;
end
$function$;
grant execute on function public.bs_registrar_telefone(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Lex Calc: CPF no cadastro
-- ---------------------------------------------------------------------------
create or replace function public.lexcalc_registrar_cpf(p_cpf text)
returns boolean
language plpgsql security definer set search_path to 'public'
as $function$
declare v_cpf text; v_contato text; v_dom text;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro'; end if;

  v_cpf := public.bs_so_dig(p_cpf);
  if not public.bs_cpf_valido(v_cpf) then
    raise exception 'O CPF informado não é válido. Confira os números.';
  end if;

  if exists (select 1 from public.bs_identidades
              where user_id = auth.uid() and produto = 'lexcalc' and tipo = 'cpf') then
    return true;
  end if;

  select lower(coalesce(raw_user_meta_data->>'contato', email)) into v_contato
    from auth.users where id = auth.uid();
  v_dom := split_part(coalesce(v_contato,''), '@', 2);

  if not public.lm_e_mestre() then
    if exists (select 1 from public.bs_dominios_bloqueados where dominio = v_dom) then
      raise exception 'O e-mail de contato é temporário. Fale com o suporte para corrigir o cadastro.';
    end if;
    if exists (select 1 from public.bs_identidades
                where documento = v_cpf and produto = 'lexcalc' and user_id is distinct from auth.uid()) then
      raise exception 'Este CPF já utilizou o teste grátis do Lex Calc. Entre na conta que você já tem, assine, ou fale com o suporte.';
    end if;
  end if;

  insert into public.bs_identidades (documento, tipo, produto, user_id, email)
  values (v_cpf, 'cpf', 'lexcalc', auth.uid(), v_contato)
  on conflict (documento, produto) do nothing;
  return true;
end
$function$;
grant execute on function public.lexcalc_registrar_cpf(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Lex Calc: quem pode gravar
-- Assinatura em dia, ou teste grátis dentro do prazo COM CPF registrado e,
-- quando a chave estiver ligada, com celular confirmado.
-- ---------------------------------------------------------------------------
create or replace function public.lexcalc_liberado()
returns boolean
language sql stable security definer set search_path to 'public'
as $function$
  select
    public.lm_e_mestre()
    or exists (select 1 from public.lexcalc_assinantes a
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
$function$;
grant execute on function public.lexcalc_liberado() to authenticated;

-- O que a tela do Lex Calc precisa saber, calculado no servidor.
create or replace function public.lexcalc_situacao()
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_pago   date;
  v_criado timestamptz;
  v_pagou  boolean;
  v_falta  text[] := '{}';
  v_dias   int;
begin
  if auth.uid() is null then return null; end if;
  select a.pago_ate into v_pago from public.lexcalc_assinantes a where a.user_id = auth.uid();
  select u.created_at into v_criado from auth.users u where u.id = auth.uid();
  v_dias  := public.bs_cfg('lexcalc_teste_dias', 7);
  v_pagou := public.lm_e_mestre() or (v_pago is not null and v_pago >= current_date);

  if not v_pagou then
    if not exists (select 1 from public.bs_identidades
                    where user_id = auth.uid() and produto = 'lexcalc' and tipo = 'cpf') then
      v_falta := v_falta || 'cpf'::text;
    end if;
    if not public.bs_telefone_ok('lexcalc') then
      v_falta := v_falta || 'telefone'::text;
    end if;
  end if;

  return jsonb_build_object(
    'pago_ate',  v_pago,
    'teste_ate', (v_criado + make_interval(days => v_dias))::date,
    'teste_dias', v_dias,
    'falta',     to_jsonb(v_falta),
    'liberado',  public.lexcalc_liberado());
end
$function$;
grant execute on function public.lexcalc_situacao() to authenticated;

-- Travas restritivas: valem somadas às políticas que já existem, sem
-- reescrevê-las. Gravar e alterar exigem lexcalc_liberado; ler e excluir não.
drop policy if exists lexcalc_pago_criar on public.lexcalc_calculos;
create policy lexcalc_pago_criar on public.lexcalc_calculos as restrictive
  for insert to authenticated with check (public.lexcalc_liberado());
drop policy if exists lexcalc_pago_alterar on public.lexcalc_calculos;
create policy lexcalc_pago_alterar on public.lexcalc_calculos as restrictive
  for update to authenticated using (public.lexcalc_liberado()) with check (public.lexcalc_liberado());

drop policy if exists lm_clientes_pago_criar on public.lm_clientes;
create policy lm_clientes_pago_criar on public.lm_clientes as restrictive
  for insert to authenticated with check (public.lexcalc_liberado());
drop policy if exists lm_clientes_pago_alterar on public.lm_clientes;
create policy lm_clientes_pago_alterar on public.lm_clientes as restrictive
  for update to authenticated using (public.lexcalc_liberado()) with check (public.lexcalc_liberado());

drop policy if exists lm_documentos_pago_criar on public.lm_documentos;
create policy lm_documentos_pago_criar on public.lm_documentos as restrictive
  for insert to authenticated with check (public.lexcalc_liberado());
drop policy if exists lm_documentos_pago_alterar on public.lm_documentos;
create policy lm_documentos_pago_alterar on public.lm_documentos as restrictive
  for update to authenticated using (public.lexcalc_liberado()) with check (public.lexcalc_liberado());

drop policy if exists lm_modelos_pago_criar on public.lm_modelos;
create policy lm_modelos_pago_criar on public.lm_modelos as restrictive
  for insert to authenticated with check (public.lexcalc_liberado());
drop policy if exists lm_modelos_pago_alterar on public.lm_modelos;
create policy lm_modelos_pago_alterar on public.lm_modelos as restrictive
  for update to authenticated using (public.lexcalc_liberado()) with check (public.lexcalc_liberado());

-- Storage do Lex Calc (timbres e arquivos): subir e substituir exigem
-- assinatura em dia. O bucket de fotos do BlackFlow já confere
-- clinica_liberada e não muda.
drop policy if exists lexcalc_pago_upload on storage.objects;
create policy lexcalc_pago_upload on storage.objects as restrictive
  for insert to authenticated
  with check (bucket_id <> 'lexcalc' or public.lexcalc_liberado());
drop policy if exists lexcalc_pago_substituir on storage.objects;
create policy lexcalc_pago_substituir on storage.objects as restrictive
  for update to authenticated
  using (bucket_id <> 'lexcalc' or public.lexcalc_liberado())
  with check (bucket_id <> 'lexcalc' or public.lexcalc_liberado());

-- Agenda online do BlackFlow: configurar exige clínica em dia.
drop policy if exists agenda_online_pago_criar on public.agenda_online;
create policy agenda_online_pago_criar on public.agenda_online as restrictive
  for insert to authenticated with check (public.clinica_liberada(clinica_id));
drop policy if exists agenda_online_pago_alterar on public.agenda_online;
create policy agenda_online_pago_alterar on public.agenda_online as restrictive
  for update to authenticated using (public.clinica_liberada(clinica_id)) with check (public.clinica_liberada(clinica_id));

-- ---------------------------------------------------------------------------
-- 6. CNPJ conferido pelo banco
-- ---------------------------------------------------------------------------
create extension if not exists http with schema extensions;

create or replace function public.bs_consultar_cnpj(p_cnpj text)
returns jsonb
language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
-- Consulta a situação do CNPJ em três fontes públicas, na ordem: CNPJ.ws,
-- ReceitaWS e BrasilAPI. Nenhuma fonte sozinha decide que o CNPJ não existe:
-- na prova de 16/11/2026 a BrasilAPI respondeu "não encontrado" para o CNPJ
-- do Banco do Brasil. Sem resposta conclusiva, volta ok=false, e quem decide
-- é a criar_clinica conforme bs_config.exigir_cnpj.
declare
  v text := public.bs_so_alnum(p_cnpj);
  r extensions.http_response;
  j jsonb;
  v_tent jsonb := '[]'::jsonb;
begin
  if not public.bs_cnpj_valido(v) then
    return jsonb_build_object('ok', false, 'motivo', 'invalido', 'cnpj', v);
  end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '5000');

  -- 1. CNPJ.ws
  begin
    select * into r from extensions.http_get('https://publica.cnpj.ws/cnpj/' || v);
    v_tent := v_tent || jsonb_build_object('fonte','cnpj.ws','status',r.status);
    if r.status = 200 then
      j := r.content::jsonb;
      if coalesce(j->'estabelecimento'->>'situacao_cadastral','') <> '' then
        return jsonb_build_object('ok', true, 'fonte', 'cnpj.ws', 'cnpj', v,
          'razao', j->>'razao_social',
          'situacao', upper(j->'estabelecimento'->>'situacao_cadastral'),
          'consultado_em', now());
      end if;
    end if;
  exception when others then
    v_tent := v_tent || jsonb_build_object('fonte','cnpj.ws','erro',sqlerrm);
  end;

  -- 2. ReceitaWS
  begin
    select * into r from extensions.http_get('https://receitaws.com.br/v1/cnpj/' || v);
    v_tent := v_tent || jsonb_build_object('fonte','receitaws','status',r.status);
    if r.status = 200 then
      j := r.content::jsonb;
      if coalesce(j->>'status','') <> 'ERROR' and coalesce(j->>'situacao','') <> '' then
        return jsonb_build_object('ok', true, 'fonte', 'receitaws', 'cnpj', v,
          'razao', j->>'nome', 'situacao', upper(j->>'situacao'), 'consultado_em', now());
      end if;
    end if;
  exception when others then
    v_tent := v_tent || jsonb_build_object('fonte','receitaws','erro',sqlerrm);
  end;

  -- 3. BrasilAPI
  begin
    select * into r from extensions.http_get('https://brasilapi.com.br/api/cnpj/v1/' || v);
    v_tent := v_tent || jsonb_build_object('fonte','brasilapi','status',r.status);
    if r.status = 200 then
      j := r.content::jsonb;
      if coalesce(j->>'descricao_situacao_cadastral','') <> '' then
        return jsonb_build_object('ok', true, 'fonte', 'brasilapi', 'cnpj', v,
          'razao', j->>'razao_social',
          'situacao', upper(j->>'descricao_situacao_cadastral'), 'consultado_em', now());
      end if;
    end if;
  exception when others then
    v_tent := v_tent || jsonb_build_object('fonte','brasilapi','erro',sqlerrm);
  end;

  return jsonb_build_object('ok', false,
    'motivo', case when v ~ '^[0-9]{14}$' then 'indisponivel' else 'formato_novo' end,
    'cnpj', v, 'tentativas', v_tent, 'consultado_em', now());
end
$function$;
-- Ninguém chama de fora: só a criar_clinica, que roda como dona da função.
revoke execute on function public.bs_consultar_cnpj(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. criar_clinica: endurecimento + telefone + CNPJ conferido no servidor
-- ---------------------------------------------------------------------------
create or replace function public.criar_clinica(
  p_nome   text,
  p_cpf    text default null,
  p_cnpj   text default null,
  p_razao  text default null,
  p_verif  jsonb default null)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id     uuid;
  v_email  text;
  v_nome   text;
  v_cpf    text;
  v_cnpj   text;
  v_dom    text;
  v_teste  int;
  v_mestre boolean;
  v_tel    text;
  v_cons   jsonb;
  v_razao  text;
  v_verif  jsonb;
begin
  if auth.uid() is null then
    raise exception 'Faça login primeiro';
  end if;

  v_mestre := public.lm_e_mestre();

  if coalesce(trim(p_nome), '') = '' then
    raise exception 'Informe o nome do negócio';
  end if;

  select email, raw_user_meta_data->>'nome'
    into v_email, v_nome
    from auth.users where id = auth.uid();

  v_dom := lower(split_part(coalesce(v_email,''), '@', 2));
  if not v_mestre and exists (select 1 from public.bs_dominios_bloqueados where dominio = v_dom) then
    raise exception 'Este endereço de e-mail é temporário. Cadastre-se com o e-mail do seu negócio.';
  end if;

  -- Celular confirmado por SMS
  v_tel := public.bs_meu_telefone_confirmado();
  if not v_mestre and public.bs_cfg('exigir_telefone_blackflow', 0) = 1 then
    if v_tel is null then
      raise exception 'Confirme o seu celular antes de criar o cadastro. O código chega por SMS.';
    end if;
    if exists (select 1 from public.bs_identidades
                where documento = v_tel and produto = 'blackflow' and user_id is distinct from auth.uid()) then
      raise exception 'Este celular já utilizou o teste grátis. Entre na conta que você já tem, ou fale com o suporte.';
    end if;
  end if;

  -- CPF
  v_cpf := public.bs_so_dig(p_cpf);
  if v_cpf = '' then
    raise exception 'Atualize o programa para a versão mais nova. O cadastro agora pede o CPF do responsável.';
  end if;
  if not public.bs_cpf_valido(v_cpf) then
    raise exception 'O CPF informado não é válido. Confira os números.';
  end if;

  -- CNPJ, conferido aqui. O que o navegador mandou em p_razao e p_verif só
  -- é guardado como informação do cliente, nunca como verificação.
  v_cnpj := nullif(public.bs_so_alnum(p_cnpj), '');
  if v_cnpj is not null and not public.bs_cnpj_valido(v_cnpj) then
    raise exception 'O CNPJ informado não é válido. Confira os caracteres.';
  end if;
  if v_cnpj is null and public.bs_cfg('exigir_cnpj', 0) = 1 and not v_mestre then
    raise exception 'Informe o CNPJ do negócio.';
  end if;
  if v_cnpj is not null then
    v_cons := public.bs_consultar_cnpj(v_cnpj);
    if coalesce((v_cons->>'ok')::boolean, false) then
      if v_cons->>'situacao' <> 'ATIVA' and not v_mestre then
        raise exception 'Segundo a Receita Federal, este CNPJ não está ativo (situação: %). Confira o número.',
          lower(coalesce(nullif(v_cons->>'situacao',''), 'desconhecida'));
      end if;
      v_razao := v_cons->>'razao';
      v_verif := v_cons;
    else
      if public.bs_cfg('exigir_cnpj', 0) = 1 and not v_mestre
         and coalesce(v_cons->>'motivo','') <> 'formato_novo' then
        raise exception 'Não foi possível confirmar este CNPJ na Receita Federal agora. Tente de novo em alguns minutos.';
      end if;
      v_razao := nullif(trim(coalesce(p_razao,'')), '');
      v_verif := v_cons || jsonb_build_object('razao_informada_pelo_cliente', v_razao);
    end if;
  end if;

  -- Um teste grátis por usuário, sempre (bs_endurecimento.sql)
  select count(*) filter (where coalesce(c.plano,'teste') = 'teste')
    into v_teste
    from public.membros m
    join public.clinicas c on c.id = m.clinica_id
   where m.user_id = auth.uid() and m.papel = 'admin';

  if v_teste >= 1 and not v_mestre then
    raise exception 'Esta conta já tem um cadastro em teste grátis. Entre nele para continuar de onde parou. Para abrir outra unidade, fale com o suporte.';
  end if;

  if not v_mestre and exists (select 1 from public.bs_identidades
                               where documento = v_cpf and produto = 'blackflow') then
    raise exception 'Este CPF já utilizou o teste grátis. Entre na conta que você já tem, ou fale com o suporte.';
  end if;
  if not v_mestre and v_cnpj is not null and exists (select 1 from public.bs_identidades
                                                      where documento = v_cnpj and produto = 'blackflow') then
    raise exception 'Este CNPJ já utilizou o teste grátis. Entre na conta que você já tem, ou fale com o suporte.';
  end if;

  if not exists (select 1 from public.clinicas) then
    insert into public.clinicas (nome, plano, valido_ate, cpf_responsavel, cnpj, razao_social, verificacao)
    values (trim(p_nome), 'cortesia', null, v_cpf, v_cnpj, v_razao, v_verif)
    returning id into v_id;
  else
    insert into public.clinicas (nome, plano, valido_ate, cpf_responsavel, cnpj, razao_social, verificacao)
    values (trim(p_nome), 'teste', current_date + public.bs_teste_dias(),
            v_cpf, v_cnpj, v_razao, v_verif)
    returning id into v_id;
  end if;

  insert into public.membros (clinica_id, user_id, email, nome, papel)
  values (v_id, auth.uid(), lower(v_email), v_nome, 'admin');

  insert into public.bs_identidades (documento, tipo, produto, clinica_id, user_id, email)
  values (v_cpf, 'cpf', 'blackflow', v_id, auth.uid(), lower(v_email))
  on conflict (documento, produto) do nothing;

  if v_cnpj is not null then
    insert into public.bs_identidades (documento, tipo, produto, clinica_id, user_id, email, razao, verificacao)
    values (v_cnpj, 'cnpj', 'blackflow', v_id, auth.uid(), lower(v_email), v_razao, v_verif)
    on conflict (documento, produto) do nothing;
  end if;

  if v_tel is not null then
    insert into public.bs_identidades (documento, tipo, produto, clinica_id, user_id, email)
    values (v_tel, 'telefone', 'blackflow', v_id, auth.uid(), lower(v_email))
    on conflict (documento, produto) do nothing;
  end if;

  return v_id;
end
$function$;

grant execute on function public.criar_clinica(text,text,text,text,jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Partes do bs_endurecimento.sql que nunca foram aplicadas
-- ---------------------------------------------------------------------------
drop policy if exists bs_identidades_apagar on public.bs_identidades;
create policy bs_identidades_apagar on public.bs_identidades
  for delete to authenticated using (public.lm_e_mestre());

drop policy if exists bs_identidades_alterar on public.bs_identidades;
create policy bs_identidades_alterar on public.bs_identidades
  for update to authenticated using (public.lm_e_mestre()) with check (public.lm_e_mestre());

create table if not exists public.bs_identidades_liberadas (
  id           bigserial primary key,
  documento    text not null,
  motivo       text,
  liberado_por uuid default auth.uid(),
  liberado_em  timestamptz not null default now()
);
alter table public.bs_identidades_liberadas enable row level security;
drop policy if exists bs_idlib_mestre on public.bs_identidades_liberadas;
create policy bs_idlib_mestre on public.bs_identidades_liberadas
  for all to authenticated using (public.lm_e_mestre()) with check (public.lm_e_mestre());

create or replace function public.bs_liberar_documento(p_doc text, p_motivo text default null)
returns boolean
language plpgsql security definer set search_path to 'public' as $function$
declare v_doc text;
begin
  if not public.lm_e_mestre() then raise exception 'Somente o login mestre'; end if;
  v_doc := public.bs_so_alnum(p_doc);
  if v_doc = '' then raise exception 'Informe o documento'; end if;
  delete from public.bs_identidades where documento = v_doc or documento = public.bs_so_dig(p_doc);
  insert into public.bs_identidades_liberadas (documento, motivo) values (v_doc, p_motivo);
  return true;
end $function$;
grant execute on function public.bs_liberar_documento(text,text) to authenticated;

insert into public.bs_dominios_bloqueados (dominio)
select d from (values
  ('temp-mail.io'),('tempmailo.com'),('tempmail.net'),('tempmail.plus'),
  ('mail.tm'),('mailtm.com'),('burnermail.io'),('anonaddy.me'),
  ('simplelogin.io'),('33mail.com'),('spam4.me'),('byom.de'),
  ('mailcatch.com'),('mail-temporaire.fr'),('jetable.org'),('nospam.ze.tc'),
  ('discard.email'),('discardmail.com'),('kasmail.com'),('mailexpire.com'),
  ('mintemail.com'),('mytrashmail.com'),('nowmymail.com'),('objectmail.com'),
  ('proxymail.eu'),('rcpt.at'),('spambog.com'),('spamfree24.org'),
  ('tempinbox.com'),('tempemail.net'),('trbvm.com'),('wegwerfmail.de'),
  ('wh4f.org'),('zetmail.com'),('deadaddress.com'),('e4ward.com'),
  ('emltmp.com'),('fakemail.net'),('filzmail.com'),('gishpuppy.com'),
  ('haltospam.com'),('incognitomail.com'),('klzlk.com'),('koszmail.pl'),
  ('lroid.com'),('luxusmail.org'),('mailbidon.com'),('maileater.com'),
  ('mailin8r.com'),('mailmetrash.com'),('mailzilla.com'),('mt2015.com'),
  ('notmailinator.com'),('pookmail.com'),('putthisinyourspamdatabase.com'),
  ('quickinbox.com'),('safetymail.info'),('sendspamhere.com'),('spamhereplease.com'),
  ('tempomail.fr'),('thankyou2010.com'),('trash-mail.at'),('trashmail.me'),
  ('veryrealemail.com'),('willhackforfood.biz'),('yopmail.fr'),('yopmail.net')
) t(d)
where not exists (select 1 from public.bs_dominios_bloqueados b where b.dominio = t.d);

select 'pronto' as resultado,
       (select count(*) from public.bs_dominios_bloqueados) as dominios_bloqueados,
       (select json_object_agg(chave, valor) from public.bs_config) as config;

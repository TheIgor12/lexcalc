-- Lex Calc: vouchers e liberação automática do pagamento

-- 1. Vouchers (só você cria, pelo painel do Supabase)
create table if not exists public.lexcalc_vouchers (
  codigo text primary key,
  dias int not null check (dias between 1 and 366),
  usos_max int,
  usos int not null default 0,
  valido_ate date,
  ativo boolean not null default true,
  obs text,
  criado_em timestamptz not null default now()
);
alter table public.lexcalc_vouchers enable row level security;

create table if not exists public.lexcalc_voucher_usos (
  codigo text not null references public.lexcalc_vouchers(codigo) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  usado_em timestamptz not null default now(),
  primary key (codigo, user_id)
);
alter table public.lexcalc_voucher_usos enable row level security;

create or replace function public.lexcalc_usar_voucher(p_codigo text)
returns date language plpgsql security definer set search_path = public as $$
declare v public.lexcalc_vouchers; u uuid := auth.uid(); criado timestamptz; atual date; base date; nova date;
begin
  if u is null then raise exception 'Entre na sua conta para usar o voucher.'; end if;
  select * into v from public.lexcalc_vouchers where codigo = upper(trim(p_codigo)) for update;
  if not found or not v.ativo then raise exception 'Voucher inválido.'; end if;
  if v.valido_ate is not null and v.valido_ate < current_date then raise exception 'Este voucher venceu.'; end if;
  if v.usos_max is not null and v.usos >= v.usos_max then raise exception 'Este voucher já atingiu o limite de usos.'; end if;
  if exists (select 1 from public.lexcalc_voucher_usos where codigo = v.codigo and user_id = u) then raise exception 'Você já usou este voucher.'; end if;
  select created_at into criado from auth.users where id = u;
  select pago_ate into atual from public.lexcalc_assinantes where user_id = u;
  base := greatest(coalesce(atual, current_date), current_date, (criado + interval '14 days')::date);
  nova := base + v.dias;
  insert into public.lexcalc_assinantes (user_id, email, pago_ate, obs)
    values (u, (select email from auth.users where id = u), nova, 'voucher ' || v.codigo)
    on conflict (user_id) do update set pago_ate = excluded.pago_ate,
      obs = coalesce(public.lexcalc_assinantes.obs || ' | ', '') || 'voucher ' || v.codigo;
  insert into public.lexcalc_voucher_usos (codigo, user_id) values (v.codigo, u);
  update public.lexcalc_vouchers set usos = usos + 1 where codigo = v.codigo;
  return nova;
end $$;
revoke all on function public.lexcalc_usar_voucher(text) from public, anon;
grant execute on function public.lexcalc_usar_voucher(text) to authenticated;

-- Voucher de exemplo: 30 dias grátis, até 100 usos
insert into public.lexcalc_vouchers (codigo, dias, usos_max, obs)
values ('LEXCALC30', 30, 100, 'Divulgação de lançamento') on conflict do nothing;

-- 2. Pagamentos confirmados (evita liberar duas vezes o mesmo pagamento)
create table if not exists public.lexcalc_pagamentos (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  valor numeric(10,2) not null,
  meio text,
  aprovado_em timestamptz not null default now()
);
alter table public.lexcalc_pagamentos enable row level security;
drop policy if exists lexcalc_pag_ler on public.lexcalc_pagamentos;
create policy lexcalc_pag_ler on public.lexcalc_pagamentos for select to authenticated using (user_id = auth.uid());

-- Chamada só pelo servidor (Edge Function), nunca pelo navegador
create or replace function public.lexcalc_liberar(p_user uuid, p_pagamento text, p_valor numeric, p_meio text, p_dias int default 30)
returns date language plpgsql security definer set search_path = public as $$
declare atual date; nova date;
begin
  insert into public.lexcalc_pagamentos (id, user_id, valor, meio) values (p_pagamento, p_user, p_valor, p_meio)
    on conflict (id) do nothing;
  if not found then
    select pago_ate into atual from public.lexcalc_assinantes where user_id = p_user;
    return atual;
  end if;
  select pago_ate into atual from public.lexcalc_assinantes where user_id = p_user;
  nova := greatest(coalesce(atual, current_date), current_date) + p_dias;
  insert into public.lexcalc_assinantes (user_id, email, pago_ate, obs)
    values (p_user, (select email from auth.users where id = p_user), nova, 'pagamento ' || p_pagamento)
    on conflict (user_id) do update set pago_ate = excluded.pago_ate,
      obs = coalesce(public.lexcalc_assinantes.obs || ' | ', '') || 'pagamento ' || p_pagamento;
  return nova;
end $$;
revoke all on function public.lexcalc_liberar(uuid, text, numeric, text, int) from public, anon, authenticated;
grant execute on function public.lexcalc_liberar(uuid, text, numeric, text, int) to service_role;

-- 3. Papel timbrado de cada escritório (pasta própria de cada usuário, privada)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lexcalc', 'lexcalc', false, 8388608, array['application/pdf','image/png','image/jpeg'])
on conflict (id) do nothing;
drop policy if exists lexcalc_arq_ler on storage.objects;
drop policy if exists lexcalc_arq_criar on storage.objects;
drop policy if exists lexcalc_arq_alterar on storage.objects;
drop policy if exists lexcalc_arq_excluir on storage.objects;
create policy lexcalc_arq_ler on storage.objects for select to authenticated
  using (bucket_id = 'lexcalc' and (storage.foldername(name))[1] = auth.uid()::text);
create policy lexcalc_arq_criar on storage.objects for insert to authenticated
  with check (bucket_id = 'lexcalc' and (storage.foldername(name))[1] = auth.uid()::text);
create policy lexcalc_arq_alterar on storage.objects for update to authenticated
  using (bucket_id = 'lexcalc' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'lexcalc' and (storage.foldername(name))[1] = auth.uid()::text);
create policy lexcalc_arq_excluir on storage.objects for delete to authenticated
  using (bucket_id = 'lexcalc' and (storage.foldername(name))[1] = auth.uid()::text);

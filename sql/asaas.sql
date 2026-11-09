-- Lex Calc: assinatura pelo Asaas com liberação automática

-- Cliente e assinatura do Asaas de cada usuário
create table if not exists public.lexcalc_asaas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  customer_id text not null,
  subscription_id text,
  nome text,
  cpf_cnpj text,
  criado_em timestamptz not null default now()
);
alter table public.lexcalc_asaas enable row level security;
drop policy if exists lexcalc_asaas_ler on public.lexcalc_asaas;
create policy lexcalc_asaas_ler on public.lexcalc_asaas for select to authenticated using (user_id = auth.uid());

-- Libera 1 mês a cada pagamento confirmado. Só o servidor (Edge Function) chama.
create or replace function public.lexcalc_liberar_mes(p_user uuid, p_pagamento text, p_valor numeric, p_meio text)
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
  nova := (greatest(coalesce(atual, current_date), current_date) + interval '1 month')::date;
  insert into public.lexcalc_assinantes (user_id, email, pago_ate, obs)
    values (p_user, (select email from auth.users where id = p_user), nova, 'Asaas ' || p_pagamento)
    on conflict (user_id) do update set pago_ate = excluded.pago_ate,
      obs = coalesce(public.lexcalc_assinantes.obs || ' | ', '') || 'Asaas ' || p_pagamento;
  return nova;
end $$;
revoke all on function public.lexcalc_liberar_mes(uuid, text, numeric, text) from public, anon, authenticated;
grant execute on function public.lexcalc_liberar_mes(uuid, text, numeric, text) to service_role;

-- Encontra a conta do Lex Calc pelo e-mail de quem pagou (pagamento pelo link). Só o servidor chama.
create or replace function public.lexcalc_usuario_por_email(p_email text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1
$$;
revoke all on function public.lexcalc_usuario_por_email(text) from public, anon, authenticated;
grant execute on function public.lexcalc_usuario_por_email(text) to service_role;

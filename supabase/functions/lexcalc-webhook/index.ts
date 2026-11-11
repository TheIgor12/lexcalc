// Lex Calc: aviso do Asaas. Confere o token do aviso, consulta o pagamento direto no Asaas
// e, se recebido ou confirmado, libera 1 mês de acesso ao dono da assinatura.
// Segredos necessários: ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN (o mesmo token cadastrado no webhook do Asaas).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const PRECO = 29.9;
const CHAVE_ADM: string = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || String(Object.values(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"))[0] ?? "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const API = Deno.env.get("ASAAS_AMBIENTE") === "sandbox" ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";
const get = async (c: string) => {
  const r = await fetch(API + c, { headers: { access_token: Deno.env.get("ASAAS_API_KEY") ?? "", "User-Agent": "LexCalc" } });
  return r.ok ? await r.json() : null;
};

Deno.serve(async (req) => {
  const ok = () => new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  const esperado = Deno.env.get("ASAAS_WEBHOOK_TOKEN") ?? "";
  if (!esperado || req.headers.get("asaas-access-token") !== esperado) return new Response("não autorizado", { status: 401 });
  try {
    const ev = await req.json();
    if (!["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"].includes(ev?.event)) return ok();
    const id = String(ev?.payment?.id ?? "");
    if (!/^[a-z_0-9]+$/i.test(id)) return ok();

    const p = await get(`/payments/${id}`);
    if (!p) return new Response("consulta falhou", { status: 500 });
    if (!["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(p.status)) return ok();
    if (Number(p.value) + 0.001 < PRECO) return ok();

    let dono = String(p.externalReference ?? "");
    if (!UUID.test(dono) && p.subscription) dono = String((await get(`/subscriptions/${p.subscription}`))?.externalReference ?? "");
    if (!UUID.test(dono) && p.customer) dono = String((await get(`/customers/${p.customer}`))?.externalReference ?? "");
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, CHAVE_ADM, { auth: { persistSession: false } });
    // Link de pagamento sem identificação: procura a conta do Lex Calc pelo e-mail de quem pagou
    if (!UUID.test(dono) && p.customer) {
      const cli = await get(`/customers/${p.customer}`);
      const email = String(cli?.email ?? "").trim().toLowerCase();
      if (email) { const { data: uid } = await sb.rpc("lexcalc_usuario_por_email", { p_email: email }); if (uid) dono = String(uid); }
    }
    if (!UUID.test(dono)) return ok();

    const { error } = await sb.rpc("lexcalc_liberar_mes", { p_user: dono, p_pagamento: "asaas-" + id, p_valor: p.value, p_meio: p.billingType ?? null });
    if (error) return new Response("erro ao liberar", { status: 500 });
    return ok();
  } catch (_) {
    return new Response("erro", { status: 500 });
  }
});

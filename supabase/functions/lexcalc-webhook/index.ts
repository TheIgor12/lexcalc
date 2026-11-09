// Lex Calc: aviso do Mercado Pago. Consulta o pagamento direto no Mercado Pago
// (o aviso em si não é confiável) e, se aprovado, libera 30 dias de acesso.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const PRECO = 69.9;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const ok = () => new Response("ok", { status: 200 });
  try {
    const url = new URL(req.url);
    let corpo: any = {};
    try { corpo = await req.json(); } catch (_) { /* aviso sem corpo */ }
    const tipo = corpo.type ?? corpo.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
    const id = String(corpo?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
    if (tipo !== "payment" || !/^\d+$/.test(id)) return ok();

    const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}` },
    });
    if (!r.ok) return new Response("consulta falhou", { status: 500 });
    const p = await r.json();
    if (p.status !== "approved") return ok();
    if (!UUID.test(String(p.external_reference ?? ""))) return ok();
    if (Number(p.transaction_amount) + 0.001 < PRECO || p.currency_id !== "BRL") return ok();

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await sb.rpc("lexcalc_liberar", {
      p_user: p.external_reference, p_pagamento: "mp-" + id, p_valor: p.transaction_amount, p_meio: p.payment_type_id ?? null, p_dias: 30,
    });
    if (error) return new Response("erro ao liberar", { status: 500 });
    return ok();
  } catch (_) {
    return new Response("erro", { status: 500 });
  }
});

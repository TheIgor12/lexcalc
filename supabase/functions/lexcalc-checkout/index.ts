// Lex Calc: abre o pagamento no Mercado Pago para o usuário que está logado
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const PRECO = 69.9;
const cors = {
  "Access-Control-Allow-Origin": "https://lexcalc.app.br",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const resp = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return resp({ erro: "login" }, 401);
    const token = Deno.env.get("MP_ACCESS_TOKEN");
    if (!token) return resp({ erro: "pagamento não configurado" }, 500);
    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: "lexcalc-mensal", title: "Lex Calc: assinatura mensal", quantity: 1, unit_price: PRECO, currency_id: "BRL" }],
        payer: { email: user.email },
        external_reference: user.id,
        notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/lexcalc-webhook`,
        back_urls: { success: "https://lexcalc.app.br/?pago=1", pending: "https://lexcalc.app.br/?pago=1", failure: "https://lexcalc.app.br/" },
        auto_return: "approved",
        payment_methods: { installments: 1 },
        statement_descriptor: "LEXCALC",
      }),
    });
    const j = await r.json();
    if (!r.ok || !j.init_point) return resp({ erro: "mercado pago", detalhe: j }, 502);
    return resp({ url: j.init_point });
  } catch (e) {
    return resp({ erro: String(e) }, 500);
  }
});

// Lex Calc: cria (ou reaproveita) a assinatura mensal no Asaas e devolve o link da fatura.
// Segredos necessários no Supabase: ASAAS_API_KEY. Opcional: ASAAS_AMBIENTE=sandbox para testes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const PRECO = 69.9;
const CHAVE_ADM: string = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || String(Object.values(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"))[0] ?? "");
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const API = Deno.env.get("ASAAS_AMBIENTE") === "sandbox" ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";

async function asaas(caminho: string, metodo = "GET", corpo?: unknown) {
  const r = await fetch(API + caminho, {
    method: metodo,
    headers: { access_token: Deno.env.get("ASAAS_API_KEY") ?? "", "Content-Type": "application/json", "User-Agent": "LexCalc" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, j };
}
const hoje = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const resp = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const adm = createClient(Deno.env.get("SUPABASE_URL")!, CHAVE_ADM, { auth: { persistSession: false } });
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await adm.auth.getUser(jwt);
    if (!user) return resp({ erro: "Entre na sua conta para assinar." }, 401);
    const corpo = await req.json().catch(() => ({}));

    const { data: reg } = await adm.from("lexcalc_asaas").select("*").eq("user_id", user.id).maybeSingle();
    let cliente = reg?.customer_id as string | undefined;
    let assin = reg?.subscription_id as string | undefined;

    // Assinatura já existe: devolve a fatura em aberto mais antiga
    if (assin) {
      const s = await asaas(`/subscriptions/${assin}`);
      if (s.ok && !s.j.deleted && s.j.status === "ACTIVE") {
        const p = await asaas(`/subscriptions/${assin}/payments?status=PENDING&limit=10`);
        const lista = (p.j.data ?? []).concat((await asaas(`/subscriptions/${assin}/payments?status=OVERDUE&limit=10`)).j.data ?? []);
        lista.sort((a: any, b: any) => String(a.dueDate).localeCompare(String(b.dueDate)));
        if (lista[0]?.invoiceUrl) return resp({ url: lista[0].invoiceUrl });
        return resp({ erro: "Não há fatura em aberto. A sua assinatura está em dia." }, 409);
      }
      assin = undefined;
    }

    if (!cliente) {
      const nome = String(corpo.nome ?? "").trim().slice(0, 120);
      const doc = String(corpo.cpfCnpj ?? "").replace(/\D/g, "");
      if (nome.length < 3 || !(doc.length === 11 || doc.length === 14)) return resp({ erro: "Informe o nome e um CPF ou CNPJ válido." }, 400);
      const c = await asaas("/customers", "POST", { name: nome, cpfCnpj: doc, email: user.email, externalReference: user.id, notificationDisabled: false });
      if (!c.ok || !c.j.id) return resp({ erro: c.j?.errors?.[0]?.description ?? "Não foi possível cadastrar no Asaas." }, 400);
      cliente = c.j.id;
      await adm.from("lexcalc_asaas").upsert({ user_id: user.id, customer_id: cliente, nome, cpf_cnpj: doc });
    }

    const base = {
      customer: cliente, billingType: "UNDEFINED", value: PRECO, nextDueDate: hoje(), cycle: "MONTHLY",
      description: "Lex Calc: assinatura mensal", externalReference: user.id,
    };
    let s = await asaas("/subscriptions", "POST", { ...base, callback: { successUrl: "https://lexcalc.app.br/?pago=1", autoRedirect: true } });
    if (!s.ok) s = await asaas("/subscriptions", "POST", base); // domínio ainda não cadastrado no Asaas
    if (!s.ok || !s.j.id) return resp({ erro: s.j?.errors?.[0]?.description ?? "Não foi possível criar a assinatura." }, 400);
    await adm.from("lexcalc_asaas").update({ subscription_id: s.j.id }).eq("user_id", user.id);

    const p = await asaas(`/subscriptions/${s.j.id}/payments?limit=1`);
    const url = p.j?.data?.[0]?.invoiceUrl;
    if (!url) return resp({ erro: "Assinatura criada. A fatura foi enviada para o seu e-mail." }, 202);
    return resp({ url });
  } catch (e) {
    return resp({ erro: "Falha inesperada: " + String(e) }, 500);
  }
});

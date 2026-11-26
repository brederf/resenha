// Função "ia" do Supabase: recebe {prompt, imagem?} do app, confere o login e o limite do dia,
// chama o DeepSeek e devolve o JSON que ele gerou. A chave fica no segredo DEEPSEEK_API_KEY.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const resp = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function chavePublica(): string {
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (anon) return anon;
  try {
    const pubs = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}');
    return pubs.default || Object.values(pubs)[0] as string || '';
  } catch { return ''; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resp({ code: 'bad_request' }, 405);

  const auth = req.headers.get('Authorization') || '';
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, chavePublica(), { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (!user) return resp({ code: 'session_expired' }, 401);

  let body: { prompt?: unknown; imagem?: unknown };
  try { body = await req.json(); } catch { return resp({ code: 'bad_request' }, 400); }
  const prompt = typeof body.prompt === 'string' ? body.prompt.slice(0, 30000) : '';
  const imagem = typeof body.imagem === 'string'
    && /^data:image\/(jpeg|png|webp|gif);base64,/.test(body.imagem)
    && body.imagem.length < 8_000_000 ? body.imagem : null;
  if (!prompt) return resp({ code: 'bad_request' }, 400);

  const chave = Deno.env.get('DEEPSEEK_API_KEY');
  if (!chave) return resp({ code: 'sem_chave' }, 500);

  const { data: uso, error } = await sb.rpc('consumir_ia');
  if (error) return resp({ code: 'erro', detalhe: error.message }, 500);
  if (!uso || !uso.ok) return resp({ code: 'limite', limite: uso ? uso.limite : 0 }, 429);

  const content = imagem
    ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imagem } }]
    : prompt;
  let r: Response;
  try {
    r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + chave },
      body: JSON.stringify({
        model: 'deepseek-flash',
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
        max_tokens: 3000,
        messages: [
          { role: 'system', content: 'Responda sempre com um único objeto JSON válido, em português do Brasil.' },
          { role: 'user', content },
        ],
      }),
    });
  } catch (e) {
    return resp({ code: 'erro', detalhe: String(e).slice(0, 200) }, 502);
  }
  if (!r.ok) {
    const t = await r.text();
    const code = r.status === 429 ? 'rate_limited' : r.status === 402 ? 'sem_saldo' : imagem && r.status === 400 ? 'image_rejected' : 'erro';
    return resp({ code, detalhe: t.slice(0, 300) }, 502);
  }
  const j = await r.json();
  const txt: string = j?.choices?.[0]?.message?.content || '';
  if (!txt) return resp({ code: 'empty_completion' }, 502);
  try {
    return resp({ ok: true, resultado: JSON.parse(txt), restam: uso.limite - uso.usados });
  } catch {
    return resp({ code: 'invalid_json' }, 502);
  }
});

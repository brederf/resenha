import { createClient } from '@supabase/supabase-js';

'use strict';
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------------------------------------------------------------- vocabulário
const TIPOS = {natureza:'Trilha, serra e água', cultura:'Cultura', exploracao:'Exploração urbana', eventos:'Eventos da cidade',
  comer:'Comer fora', diversao:'Diversão paga', torneio:'Torneio', comida:'Comida como projeto', casa:'Base em casa',
  missao:'Missão com regra', criar:'Criar algo juntos', horario:'Horário incomum', esporte:'Esporte', acesso:'Rolê de acesso', tela:'Tela'};
const TIPO_ORDEM = Object.keys(TIPOS);
const COM = {sozinho:'Sozinho', date:'Date', galera:'Galera'};
const GRANA = {gratis:'Grátis', barato:'Barato', medio:'Médio', caro:'Caro'};
const DUR = {curto:'1 a 2h', medio:'Meio período', longo:'Dia todo'};
const HOR = {manha:'Manhã', tarde:'Tarde', 'por-do-sol':'Pôr do sol', noite:'Noite', madrugada:'Madrugada'};
const FORMATO = {lugar:'Lugar', roteiro:'Roteiro', casa:'Em casa', atividade:'Atividade'};
const ETIPO = {show:'Show', exposicao:'Exposição', festival:'Festival', feira:'Feira', oficina:'Oficina', teatro:'Teatro',
  cinema:'Cinema', palestra:'Palestra', passeio:'Passeio', esporte:'Esporte', festa:'Festa', outro:'Evento'};
const DOW = ['dom','seg','ter','qua','qui','sex','sáb'];
const DOW_L = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
const MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const MES_L = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
// Distância estimada a partir da região da Pampulha, de carro ou Uber.
const REG = {'Pampulha':'perto','Copacabana':'perto','Itapoã':'perto','Planalto':'perto','Venda Nova':'perto','São Luiz':'perto','UFMG':'perto','Santa Amélia':'perto','Jaraguá':'perto','Castelo':'perto',
  'Caiçara':'medio','Califórnia':'medio','Centro':'medio','Lagoinha':'medio','Floresta':'medio','Santa Tereza':'medio','Bonfim':'medio','Santa Efigênia':'medio','Santa Inês':'medio','Coração Eucarístico':'medio','Contagem':'medio','Salgado Filho':'medio','Pindorama':'medio','Prado':'medio','Horto':'medio','Barro Preto':'medio','Boa Viagem':'medio',
  'Savassi':'longe','Funcionários':'longe','Lourdes':'longe','Cidade Jardim':'longe','Mangabeiras':'longe','Belvedere':'longe','Santa Lúcia':'longe','Buritis':'longe','Estrela Dalva':'longe','Carmo':'longe','Sion':'longe','Serra':'longe','Santo Agostinho':'longe','Nova Lima':'longe','Sabará':'longe','Olhos D\'Água':'longe','Lagoa Santa':'longe',
  'Brumadinho':'batevolta','Serra da Moeda':'batevolta','Serra do Rola-Moça':'batevolta','Congonhas':'batevolta','Sete Lagoas':'batevolta','Ibirité':'batevolta','Rio Acima':'batevolta','Macacos':'batevolta','Ouro Preto':'batevolta','Gramado':'viagem'};
const CIDADES = new Set(['Lagoa Santa','Sabará','Brumadinho','Contagem','Nova Lima','Sete Lagoas','Congonhas','Ibirité','Rio Acima','Gramado','Serra da Moeda','Macacos','Serra do Rola-Moça','Ouro Preto']);
const DIST = {casa:{t:'Em casa', d:'em casa'}, perto:{t:'Perto', d:'até uns 15 min de Uber'}, medio:{t:'Médio', d:'20 a 30 min de Uber'},
  longe:{t:'Longe', d:'35 a 50 min de Uber'}, batevolta:{t:'Bate-volta', d:'1h ou mais'}, viagem:{t:'Viagem', d:'viagem'}};

// ---------------------------------------------------------------- datas
const pad = n => String(n).padStart(2, '0');
const isoLocal = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const hojeISO = () => isoLocal(new Date());
const fromISO = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
const addDias = (s, n) => { const d = fromISO(s); d.setDate(d.getDate() + n); return isoLocal(d); };
const diffDias = (a, b) => Math.round((fromISO(b) - fromISO(a)) / 86400000);
const okISO = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const fmtCurta = s => { const d = fromISO(s); return DOW[d.getDay()] + ', ' + d.getDate() + ' ' + MES[d.getMonth()]; };
const fmtLonga = s => { const d = fromISO(s); return DOW_L[d.getDay()] + ', ' + d.getDate() + ' de ' + MES_L[d.getMonth()]; };
function relativo(s){
  const n = diffDias(hojeISO(), s);
  if (n === 0) return 'hoje'; if (n === 1) return 'amanhã'; if (n === -1) return 'ontem';
  if (n > 1) return n <= 60 ? 'em ' + n + ' dias' : 'em ' + Math.round(n / 30) + ' meses';
  return -n <= 60 ? 'há ' + (-n) + ' dias' : 'há ' + Math.round(-n / 30) + ' meses';
}
function quandoFoi(ts){
  if (!ts) return '';
  const d = new Date(ts); if (isNaN(d)) return '';
  const dia = isoLocal(d); const hora = pad(d.getHours()) + ':' + pad(d.getMinutes());
  const n = diffDias(dia, hojeISO());
  return (n === 0 ? 'hoje' : n === 1 ? 'ontem' : fmtCurta(dia)) + ' às ' + hora;
}
function proxFds(){
  const h = hojeISO(); const dow = fromISO(h).getDay();
  const sab = dow === 6 ? h : dow === 0 ? addDias(h, -1) : addDias(h, 6 - dow);
  return [sab, addDias(sab, 1)];
}
const fimDe = x => x.dataFim || x.dataInicio || x.data || '9999-12-31';
const ehPontual = e => !!e.dataInicio && diffDias(e.dataInicio, e.dataFim || e.dataInicio) <= 6;
function urgencia(e){
  const h = hojeISO(), ini = e.dataInicio, fim = fimDe(e);
  if (fim < h) return {txt:'Já passou', cls:''};
  if (ini && ini > h){
    const n = diffDias(h, ini);
    if (!ehPontual(e)) return {txt: n === 1 ? 'Abre amanhã' : 'Abre ' + fmtCurta(ini), cls:'cob'};
    if (n === 1) return {txt:'Amanhã', cls:'hot'};
    if (n <= 6) return {txt:'Em ' + n + ' dias', cls:'sun'};
    return null;
  }
  if (ini === h && ehPontual(e) && fim === h) return {txt:'Hoje', cls:'hot'};
  const n = diffDias(h, fim);
  if (n === 0) return {txt:'Último dia', cls:'hot'};
  if (n <= 7) return {txt:'Acaba em ' + n + (n === 1 ? ' dia' : ' dias'), cls:'hot'};
  return null;
}

// ---------------------------------------------------------------- links
function distDe(x){
  if (!x) return null;
  if (x.formato === 'casa' || x.regiao === 'Em casa') return 'casa';
  return REG[x.regiao] || null;
}
function lugarQuery(x){
  if (x.mapa) return x.mapa;
  const cidade = CIDADES.has(x.regiao) ? x.regiao + ', MG' : (x.regiao && x.regiao !== 'Em casa' ? x.regiao + ', Belo Horizonte' : 'Belo Horizonte');
  if (x.local) return x.local + ', ' + cidade;
  if (x.formato === 'lugar' || x.tipo === 'comer') return x.titulo.replace(/\s*\([^)]*\)\s*/g, ' ').trim() + ', ' + cidade;
  return null;
}
const mapsUrl = q => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
const uberUrl = q => 'https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff%5Bformatted_address%5D=' + encodeURIComponent(q);
function gcal(titulo, ini, fim, local, det){
  const a = ini.replace(/-/g, ''), b = addDias(fim || ini, 1).replace(/-/g, '');
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(titulo) + '&dates=' + a + '/' + b +
    '&location=' + encodeURIComponent(local || '') + '&details=' + encodeURIComponent(det || '');
}
const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
const rand4 = () => Math.random().toString(36).slice(2, 6);
function hash(str){ let h = 2166136261; for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// ---------------------------------------------------------------- estado
function lerLS(k){ try { const v = localStorage.getItem('resenha:' + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function salvarLS(k, v){ try { localStorage.setItem('resenha:' + k, JSON.stringify(v)); } catch (e) {} }
const S = {
  db:null, user:null, perfil:null, erroMsg:'', login:{}, sample:null, sampleImg:false,
  rolesDocs:{}, roles:[], eventos:[], diario:[], notas:{}, fontes:{}, radar:null,
  got:{roles:false, eventos:false, diario:false, caderno:false, fontes:false, radar:false},
  status:'carregando',
  tab: ['bora','roles','agenda','radar','caderno'].includes(lerLS('tab')) ? lerLS('tab') : 'bora',
  bora: Object.assign({com:'galera', tempo:'medio', grana:'pouca', quando:'hoje', chuva:false, perto:false, tela:false}, lerLS('bora') || {}),
  sorteado:null, roteiros:null, roteiroMsg:'', verTodos:false,
  rf:{q:'', tipo:'', com:'', grana:'', dist:'', status:'ativos'},
  ag: ['fila','eventos','diario'].includes(lerLS('ag')) ? lerLS('ag') : 'fila', ef:'todos',
  sheet:null, add:null,
};
(function(){ const ok = {com:['sozinho','date','galera'], tempo:['curto','medio','longo'], grana:['gratis','pouca','tudo'], quando:['hoje','fds']}; const pad0 = {com:'galera', tempo:'medio', grana:'pouca', quando:'hoje'}; Object.keys(ok).forEach(k => { if (!ok[k].includes(S.bora[k])) S.bora[k] = pad0[k]; }); ['chuva','perto','tela'].forEach(k => { S.bora[k] = !!S.bora[k]; }); })();


// ---------------------------------------------------------------- dados (Supabase)
const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sb = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY) : null;
if (import.meta.env.DEV && sb){
  window.__importar = async () => { const m = await import('./importar-dev.js'); const r = await m.importar(sb); await recarregar(); return r; };
}

const roleById = id => S.roles.find(r => r.id === id);
const evById = id => S.eventos.find(e => e.id === id);
let rafPend = false;
function agendarRender(){ if (rafPend) return; rafPend = true; requestAnimationFrame(() => { rafPend = false; render(); }); }

const minhaRole = {}, meuEvento = {};
function podeEditar(x){ return !!S.user && (x.criado_por === S.user.id || (S.perfil && S.perfil.admin)); }
function origemDe(x){
  if (!x.publico) return 'Só seu';
  if (x.moderacao === 'pendente') return 'Aguardando aprovação';
  if (x.moderacao === 'recusado') return 'Recusado';
  return '';
}
function roleDoBanco(r){
  const m = minhaRole[r.id] || {};
  return {id: r.id, slug: r.slug, titulo: r.titulo, formato: r.formato, tipo: r.tipo, com: r.com || [], regiao: r.regiao || '',
    grana: r.grana || null, horario: r.horario || [], duracao: r.duracao || null, chuva: r.chuva, dias: r.dias || null,
    obs: r.descricao || '', paradas: r.paradas, checklist: r.checklist, links: r.links, mapa: r.mapa, aviso: r.aviso,
    destaque: r.destaque, publico: r.publico, moderacao: r.moderacao, criado_por: r.criado_por, origem: origemDe(r),
    status: m.status || 'quero', longoPrazo: !!m.longo_prazo, data: m.data || null, dataFim: m.data_fim || null,
    minhaNota: m.nota || '', motivo: m.motivo || null, check: m.checklist_feito || null, podeEditar: podeEditar(r)};
}
function eventoDoBanco(e){
  const m = meuEvento[e.id];
  const recente = Date.now() - new Date(e.criado_em).getTime() < 7 * 86400000;
  return {id: e.id, slug: e.slug, titulo: e.titulo, dataInicio: e.data_inicio, dataFim: e.data_fim, horario: e.horario || '',
    local: e.local || '', regiao: e.regiao || '', gratis: e.gratis, preco: e.preco || '', descricao: e.descricao || '',
    link: e.link || '', fonte: e.fonte || '', com: e.com || [], tipo: e.tipo, destaque: e.destaque, roleId: e.role_id,
    origem: e.origem, publico: e.publico, moderacao: e.moderacao, criado_por: e.criado_por, criadoEm: e.criado_em,
    status: m ? m.status : (recente ? 'novo' : 'visto'), dataVou: m && m.data, ideia: m && m.nota, podeEditar: podeEditar(e)};
}
const cru = {roles: [], eventos: []};
function remontar(){
  S.roles = cru.roles.map(roleDoBanco).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt'));
  S.eventos = cru.eventos.map(eventoDoBanco);
}

async function tudo(q){ const {data, error} = await q; if (error) throw error; return data; }
async function carregar(){
  const uid = S.user.id;
  const [perfil, roles, eventos, lista, diario, notas, fontes, radar] = await Promise.all([
    tudo(sb.from('perfis').select('*').eq('id', uid).maybeSingle()),
    tudo(sb.from('roles').select('*').limit(5000)),
    tudo(sb.from('eventos').select('*').limit(5000)),
    tudo(sb.from('minha_lista').select('*').eq('usuario', uid).limit(10000)),
    tudo(sb.from('diario').select('*').eq('usuario', uid).limit(5000)),
    tudo(sb.from('notas').select('*').eq('usuario', uid)),
    tudo(sb.from('fontes').select('*')),
    tudo(sb.from('radar_status').select('*').maybeSingle()),
  ]);
  S.perfil = perfil;
  Object.keys(minhaRole).forEach(k => delete minhaRole[k]); Object.keys(meuEvento).forEach(k => delete meuEvento[k]);
  lista.forEach(m => { (m.ref_tipo === 'role' ? minhaRole : meuEvento)[m.ref_id] = m; });
  cru.roles = roles; cru.eventos = eventos; remontar();
  S.diario = diario.map(d => ({id: d.id, titulo: d.titulo, refTipo: d.ref_tipo, refId: d.ref_id, data: d.data, prestou: d.prestou, nota: d.nota, quem: d.quem, comentario: d.comentario}));
  S.notas = Object.fromEntries(notas.map(n => [n.id, {titulo: n.titulo, texto: n.texto, ordem: n.ordem, slug: n.slug}]));
  const olhados = lerLS('olhados') || {};
  S.fontes = Object.fromEntries(fontes.map(f => [f.id, {nome: f.nome, url: f.url, tipo: f.tipo, desc: f.descricao, freq: f.freq, auto: f.automatica, conferir: f.conferir, ordem: f.ordem, olhadoEm: olhados[f.id]}]));
  S.radar = radar ? {ultimaBusca: radar.ultima_busca, resumo: radar.resumo} : null;
  Object.keys(S.got).forEach(k => { S.got[k] = true; });
  S.status = 'ok';
}

// IA: o app manda o pedido pra função "ia" do Supabase, que chama o DeepSeek com a chave guardada lá.
function imagemParaDataURL(blob){
  return new Promise((ok, falhou) => {
    const url = URL.createObjectURL(blob), img = new Image();
    img.onload = () => {
      const max = 1600, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); falhou({code:'image_rejected'}); };
    img.src = url;
  });
}
const IA = {
  async json(prompt, opts){
    const body = {prompt};
    if (opts && opts.images && opts.images[0]) body.imagem = await imagemParaDataURL(opts.images[0]);
    const {data, error} = await sb.functions.invoke('ia', {body});
    if (error){
      let info = null; try { info = await error.context.json(); } catch (_){}
      throw Object.assign({code: (info && info.code) || 'erro'}, info || {});
    }
    if (!data || !data.ok) throw {code: (data && data.code) || 'erro'};
    return data.resultado;
  },
};

async function iniciar(){
  render();
  if (!sb){ S.status = 'erro'; S.erroMsg = 'O app está sem a configuração do Supabase.'; render(); return; }
  sb.auth.onAuthStateChange((evento, sessao) => {
    const u = sessao && sessao.user;
    if (u && (!S.user || S.user.id !== u.id)){ S.user = u; S.db = sb; S.sample = IA; S.sampleImg = true; S.status = 'carregando'; render(); recarregar(); }
    if (!u && S.user){ S.user = null; S.db = null; S.sample = null; S.status = 'login'; render(); }
  });
  const {data} = await sb.auth.getSession();
  if (!data.session){ S.status = 'login'; render(); }
}
async function recarregar(){
  try { await carregar(); }
  catch (e){ console.warn(e); S.status = 'erro'; S.erroMsg = 'Não deu pra carregar seus dados. Confere a internet e abre de novo.'; }
  render();
}

function falha(e){
  console.warn('escrita', e);
  toast(e && /row-level security|permission/i.test(e.message || '') ? 'Você não pode mudar isso.' : 'Não salvou. Confere a internet e tenta de novo.');
}
const PESSOAIS = ['status', 'data', 'dataFim', 'longoPrazo', 'check', 'motivo', 'minhaNota'];
const CAMPO_ROLE = {titulo:'titulo', formato:'formato', tipo:'tipo', com:'com', regiao:'regiao', grana:'grana', horario:'horario',
  duracao:'duracao', chuva:'chuva', dias:'dias', obs:'descricao', paradas:'paradas', checklist:'checklist', links:'links', mapa:'mapa', aviso:'aviso'};
async function salvarMinha(refTipo, refId, linha){
  const {error} = await sb.from('minha_lista').upsert(Object.assign({usuario: S.user.id, ref_tipo: refTipo, ref_id: refId}, linha), {onConflict: 'usuario,ref_tipo,ref_id'});
  if (error) throw error;
  (refTipo === 'role' ? minhaRole : meuEvento)[refId] = Object.assign({}, (refTipo === 'role' ? minhaRole : meuEvento)[refId], linha, {ref_id: refId});
}
async function patchRole(r, patch){
  if (!S.user) return falha();
  try {
    const pessoal = {}, conteudo = {};
    Object.entries(patch).forEach(([k, v]) => { if (PESSOAIS.includes(k)) pessoal[k] = v; else if (CAMPO_ROLE[k]) conteudo[CAMPO_ROLE[k]] = v === '' ? null : v; });
    if (Object.keys(pessoal).length){
      const novo = Object.assign({}, r, pessoal);
      if ('check' in pessoal) novo.check = pessoal.check === null ? null : Object.assign({}, r.check, pessoal.check);
      await salvarMinha('role', r.id, {status: novo.status || 'quero', longo_prazo: !!novo.longoPrazo, data: novo.data || null, data_fim: novo.dataFim || null,
        motivo: novo.motivo || null, nota: novo.minhaNota || null, checklist_feito: novo.check || null});
    }
    if (Object.keys(conteudo).length){
      if (r.publico && !(S.perfil && S.perfil.admin)) conteudo.moderacao = 'pendente';
      const {data, error} = await sb.from('roles').update(conteudo).eq('id', r.id).select().single();
      if (error) throw error;
      cru.roles = cru.roles.map(x => x.id === r.id ? data : x);
    }
    remontar(); agendarRender(); return true;
  } catch (e){ falha(e); return false; }
}
async function novoRole(data){
  if (!S.user) return falha();
  try {
    const publico = !!data.publico;
    const linha = {titulo: data.titulo, formato: data.formato || 'lugar', tipo: data.tipo || 'cultura', com: data.com || [], regiao: data.regiao || null,
      grana: data.grana || null, horario: data.horario || [], duracao: data.duracao || null, chuva: typeof data.chuva === 'boolean' ? data.chuva : null,
      descricao: data.obs || null, paradas: data.paradas || null, links: data.links || null, publico,
      moderacao: publico && !(S.perfil && S.perfil.admin) ? 'pendente' : 'aprovado', criado_por: S.user.id};
    const {data: nova, error} = await sb.from('roles').insert(linha).select().single();
    if (error) throw error;
    cru.roles.push(nova); remontar(); agendarRender();
    if (publico && !(S.perfil && S.perfil.admin)) toast('Mandado pra aprovação. Enquanto isso, só você vê.');
    return nova.id;
  } catch (e){ falha(e); return null; }
}
async function patchEvento(id, patch){
  if (!S.user) return falha();
  const e = evById(id); if (!e) return false;
  try {
    if ('status' in patch || 'dataVou' in patch){
      const st = 'status' in patch ? patch.status : e.status;
      await salvarMinha('evento', id, {status: st === 'novo' ? 'visto' : st, data: ('dataVou' in patch ? patch.dataVou : e.dataVou) || null});
    }
    const mapa = {titulo:'titulo', dataInicio:'data_inicio', dataFim:'data_fim', horario:'horario', local:'local', regiao:'regiao', gratis:'gratis', preco:'preco', descricao:'descricao', link:'link', com:'com'};
    const conteudo = {};
    Object.entries(patch).forEach(([k, v]) => { if (mapa[k]) conteudo[mapa[k]] = v === '' ? null : v; });
    if (Object.keys(conteudo).length){
      if (e.publico && !(S.perfil && S.perfil.admin)) conteudo.moderacao = 'pendente';
      const {data, error} = await sb.from('eventos').update(conteudo).eq('id', id).select().single();
      if (error) throw error;
      cru.eventos = cru.eventos.map(x => x.id === id ? data : x);
    }
    remontar(); agendarRender(); return true;
  } catch (err){ falha(err); return false; }
}
async function novoEvento(data){
  if (!S.user) return falha();
  try {
    const publico = data.publico !== false;
    const linha = {titulo: data.titulo, data_inicio: data.dataInicio || null, data_fim: data.dataFim || null, horario: data.horario || null,
      local: data.local || null, regiao: data.regiao || null, gratis: typeof data.gratis === 'boolean' ? data.gratis : null, preco: data.preco || null,
      descricao: data.descricao || null, link: data.link || null, com: data.com || [], tipo: data.tipo || 'outro', origem: data.origem || 'manual',
      publico, moderacao: publico && !(S.perfil && S.perfil.admin) ? 'pendente' : 'aprovado', criado_por: S.user.id};
    const {data: novo, error} = await sb.from('eventos').insert(linha).select().single();
    if (error) throw error;
    cru.eventos.push(novo);
    await salvarMinha('evento', novo.id, {status: 'interesse'});
    remontar(); agendarRender();
    if (publico && !(S.perfil && S.perfil.admin)) toast('Mandado pra aprovação. Enquanto isso, só você vê.');
    return novo.id;
  } catch (e){ falha(e); return null; }
}
async function novoDiario(entry){
  if (!S.user) return falha();
  try {
    const linha = {titulo: entry.titulo, ref_tipo: entry.refTipo || null, ref_id: entry.refId || null, data: entry.data,
      prestou: typeof entry.prestou === 'boolean' ? entry.prestou : null, nota: entry.nota || null, quem: entry.quem || null, comentario: entry.comentario || null};
    const {data, error} = await sb.from('diario').insert(linha).select().single();
    if (error) throw error;
    S.diario.push({id: data.id, titulo: data.titulo, refTipo: data.ref_tipo, refId: data.ref_id, data: data.data, prestou: data.prestou, nota: data.nota, quem: data.quem, comentario: data.comentario});
    return true;
  } catch (e){ falha(e); return false; }
}
async function moderar(tabela, id, valor){
  const {data, error} = await sb.from(tabela).update({moderacao: valor}).eq('id', id).select().single();
  if (error) return falha(error);
  cru[tabela] = cru[tabela].map(x => x.id === id ? data : x); remontar(); render();
  toast(valor === 'aprovado' ? 'Aprovado. Agora todo mundo vê.' : 'Recusado.');
}

// ---------------------------------------------------------------- derivados
function filaItens(){
  const out = [];
  S.roles.forEach(r => { if (r.status === 'fila' && okISO(r.data)) out.push({kind:'role', id:r.id, titulo:r.titulo, data:r.data, dataFim:r.dataFim, local:lugarQuery(r) || '', ref:r}); });
  S.eventos.forEach(e => { if (e.status === 'vou'){ const d = okISO(e.dataVou) ? e.dataVou : (okISO(e.dataInicio) && e.dataInicio >= hojeISO() ? e.dataInicio : hojeISO()); out.push({kind:'evento', id:e.id, titulo:e.titulo, data:d, dataFim: e.dataVou ? null : (ehPontual(e) ? e.dataFim : null), local:e.local || '', ref:e}); } });
  return out.sort((a, b) => a.data.localeCompare(b.data));
}
const novosCount = () => S.eventos.filter(e => e.status === 'novo' && fimDe(e) >= hojeISO()).length;
function eventosNosDias(dias){
  return S.eventos.filter(e => !['ignorado','fui'].includes(e.status) && dias.some(d => (e.dataInicio || '0000-01-01') <= d && d <= fimDe(e)));
}
function montarPool(){
  const b = S.bora, h = hojeISO();
  const dias = b.quando === 'hoje' ? [h] : proxFds().filter(d => d >= h);
  const dows = dias.map(d => fromISO(d).getDay());
  const ordD = {curto:1, medio:2, longo:3};
  const pool = [];
  S.roles.forEach(r => {
    if (r.status === 'riscado' || r.status === 'feito' || r.longoPrazo) return;
    if (!(r.com || []).includes(b.com)) return;
    if (r.tipo === 'tela' && !b.tela) return;
    if (r.duracao && ordD[r.duracao] > ordD[b.tempo]) return;
    if (b.grana === 'gratis' && r.grana !== 'gratis') return;
    if (b.grana === 'pouca' && !['gratis','barato'].includes(r.grana)) return;
    if (r.dias && r.dias.length && !dows.some(d => r.dias.includes(d))) return;
    if (b.chuva && r.chuva === false) return;
    if (b.perto && !['casa','perto','medio'].includes(distDe(r))) return;
    if (r.aviso && /piracema/i.test(r.aviso)) return;
    pool.push({kind:'role', id:r.id, ref:r, peso: (r.destaque ? 2 : 1) * (r.status === 'fila' ? 0.5 : 1)});
  });
  eventosNosDias(dias).forEach(e => {
    const com = e.com && e.com.length ? e.com : ['sozinho','date','galera'];
    if (!com.includes(b.com)) return;
    if (b.grana !== 'tudo' && e.gratis !== true) return;
    if (b.perto && !['perto','medio'].includes(distDe(e))) return;
    const pont = ehPontual(e);
    if (b.tempo === 'curto' && pont && /festival|feira/.test(e.tipo || '')) return;
    pool.push({kind:'evento', id:e.id, ref:e, pontual:pont, peso: pont ? 3 : 1.5});
  });
  pool.forEach(p => { p.ord = hash(p.kind + p.id + h); });
  pool.sort((a, b) => (b.pontual ? 1 : 0) - (a.pontual ? 1 : 0) || (b.ref.destaque ? 1 : 0) - (a.ref.destaque ? 1 : 0) || a.ord - b.ord);
  return pool;
}
function sortearPeso(pool){
  const tot = pool.reduce((s, p) => s + p.peso, 0);
  let x = Math.random() * tot;
  for (const p of pool){ x -= p.peso; if (x <= 0) return p; }
  return pool[pool.length - 1];
}

// ---------------------------------------------------------------- pedaços de UI
const seg = (rotulo, k, ops) => `<div><div class="row-l">${rotulo}</div><div class="seg" role="group" aria-label="${rotulo}">${ops.map(([v, l]) => `<button data-act="b" data-k="${k}" data-v="${v}" aria-pressed="${S.bora[k] === v}">${l}</button>`).join('')}</div></div>`;
const chipB = (k, l) => `<button class="chip" data-act="bt" data-k="${k}" aria-pressed="${!!S.bora[k]}">${l}</button>`;
const fato = (k, v) => v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : '';
const grab = () => `<div class="grab"><button class="fechar" data-act="fechar" aria-label="Fechar">&times;</button></div>`;
function metaDe(x){
  const d = distDe(x);
  const onde = x.regiao && x.regiao !== 'Em casa' ? x.regiao : (d === 'casa' ? 'Em casa' : '');
  return [onde, d && d !== 'casa' ? DIST[d].t : '', GRANA[x.grana] || (x.gratis === true ? 'Grátis' : '')].filter(Boolean).join(' · ');
}
function roleCard(r){
  const tags = [];
  if (r.status === 'fila' && okISO(r.data)) tags.push(`<span class="tag cob">Na fila · ${fmtCurta(r.data)}</span>`);
  if (r.status === 'feito') tags.push('<span class="tag ok">Já fiz</span>');
  if (r.status === 'riscado') tags.push('<span class="tag">Riscado</span>');
  if (r.destaque) tags.push('<span class="tag sun">5 estrelas na base</span>');
  if (r.formato === 'roteiro') tags.push('<span class="tag">Roteiro</span>');
  if (r.longoPrazo) tags.push('<span class="tag cob">Longo prazo</span>');
  if (r.aviso) tags.push(`<span class="tag hot">${esc(r.aviso)}</span>`);
  (r.com || []).forEach(c => COM[c] && tags.push(`<span class="tag">${COM[c]}</span>`));
  const m = metaDe(r);
  return `<button class="role" data-act="abrir" data-kind="role" data-id="${esc(r.id)}"><span class="role-t">${esc(r.titulo)}</span>${m ? `<span class="role-m">${esc(m)}</span>` : ''}<span class="tags">${tags.join('')}</span></button>`;
}
function caixaData(e){
  const h = hojeISO(), pont = ehPontual(e);
  if (pont || (e.dataInicio && e.dataInicio > h)){
    const d = fromISO(e.dataInicio);
    return `<span class="dia">${d.getDate()}</span><span class="mes">${MES[d.getMonth()]}</span><span class="dow">${DOW[d.getDay()]}</span>`;
  }
  if (e.dataFim){ const d = fromISO(e.dataFim); return `<span class="ate">até</span><span class="dia">${d.getDate()}</span><span class="mes">${MES[d.getMonth()]}</span>`; }
  return '<span class="mes">?</span>';
}
function ingresso(e){
  const u = urgencia(e), tags = [];
  if (e.status === 'novo') tags.push('<span class="tag cob">Novo</span>');
  if (e.status === 'vou') tags.push('<span class="tag ok">Vou</span>');
  if (e.status === 'interesse') tags.push('<span class="tag">Talvez</span>');
  if (u) tags.push(`<span class="tag ${u.cls}">${u.txt}</span>`);
  if (e.gratis === true) tags.push('<span class="tag ok">Grátis</span>'); else if (e.gratis === false) tags.push('<span class="tag">Pago</span>');
  if (e.destaque) tags.push('<span class="tag sun">5 estrelas na base</span>');
  const d = distDe(e);
  const meta = [e.local ? e.local.split(',')[0] : '', e.regiao, d ? DIST[d].t : ''].filter(Boolean).join(' · ');
  return `<button class="ing" data-act="abrir" data-kind="evento" data-id="${esc(e.id)}"><span class="ing-d">${caixaData(e)}</span><span class="ing-b"><span class="ing-t">${esc(e.titulo)}</span>${meta ? `<span class="role-m">${esc(meta)}</span>` : ''}${e.horario ? `<span class="role-m">${esc(e.horario)}</span>` : ''}<span class="tags">${tags.join('')}</span></span></button>`;
}
function filaCard(x){
  const d = fromISO(x.data);
  const box = `<span class="dia">${d.getDate()}</span><span class="mes">${MES[d.getMonth()]}</span><span class="dow">${DOW[d.getDay()]}</span>`;
  const quando = relativo(x.data) + (x.dataFim ? ' · até ' + fmtCurta(x.dataFim) : '');
  return `<button class="ing" data-act="abrir" data-kind="${x.kind}" data-id="${esc(x.id)}"><span class="ing-d">${box}</span><span class="ing-b"><span class="ing-t">${esc(x.titulo)}</span><span class="role-m">${esc(quando)}</span>${x.local ? `<span class="role-m">${esc(x.local.split(',')[0])}</span>` : ''}</span></button>`;
}
function avisoAtrasado(x){
  return `<div class="aviso hot"><strong>${esc(x.titulo)}</strong> estava marcado pra ${fmtCurta(x.data)} (${relativo(x.data)}). Rolou?
    <div class="acts"><button class="btn btn-s" data-act="fui" data-kind="${x.kind}" data-id="${esc(x.id)}">Rolou</button><button class="btn btn-s" data-act="marcar" data-kind="${x.kind}" data-id="${esc(x.id)}">Remarcar</button><button class="btn btn-s" data-act="naorolou" data-kind="${x.kind}" data-id="${esc(x.id)}">Não rolou</button></div></div>`;
}
function vazio(t, txt){ return `<div class="vazio"><strong>${t}</strong>${txt}</div>`; }
const carregando = t => `<p class="carrega">${t}...</p>`;

// ---------------------------------------------------------------- aba Bora
function vBora(){
  if (!S.got.roles) return carregando('Carregando seus rolês');
  const b = S.bora, h = hojeISO();
  const fila = filaItens();
  const atrasados = fila.filter(x => (x.dataFim || x.data) < h);
  const futuros = fila.filter(x => (x.dataFim || x.data) >= h);
  let out = atrasados.map(avisoAtrasado).join('');
  if (futuros.length){
    out += `<div class="prox"><div class="eyebrow">Próximo na fila${futuros.length > 1 ? ' · mais ' + (futuros.length - 1) : ''}</div>${filaCard(futuros[0])}</div>`;
  } else {
    out += `<div class="aviso"><strong>Sua fila não tem nada com data.</strong> Se a fila zera, o grupo para. Escolhe um rolê ou evento e marca o dia.<div class="acts"><button class="btn btn-s" data-act="ir" data-tab="agenda" data-ag="eventos">Ver eventos</button></div></div>`;
  }
  const dom = proxFds()[1];
  const ate = S.eventos.filter(e => !['ignorado','fui'].includes(e.status) && ehPontual(e) && e.dataInicio <= dom && fimDe(e) >= h)
    .sort((a, c) => a.dataInicio.localeCompare(c.dataInicio));
  if (ate.length) out += `<h3 class="h3">Rolando até domingo</h3><div class="strip">${ate.map(ingresso).join('')}</div>`;

  const pool = montarPool();
  const qtd = pool.length;
  out += `<section class="bora" aria-labelledby="bora-t">
    <h2 class="h2" id="bora-t">Bora?</h2>
    ${seg('Com quem', 'com', [['sozinho','Sozinho'],['date','Date'],['galera','Galera']])}
    ${seg('Tempo', 'tempo', [['curto','1 a 2h'],['medio','Meio período'],['longo','Dia todo']])}
    ${seg('Grana', 'grana', [['gratis','Grátis'],['pouca','Pouca'],['tudo','Tanto faz']])}
    ${seg('Quando', 'quando', [['hoje','Hoje'],['fds','Fim de semana']])}
    <div class="chips quebra">${chipB('perto','Perto de casa')}${chipB('chuva','Tá chovendo')}${chipB('tela','Incluir tela')}</div>
    ${b.com === 'date' ? '<p class="dica">Jarro dos dates: uma âncora por encontro, tela no máximo 1 a cada 3, prioridade pra coisa nova. O sorteio deixa de fora o que vocês já fizeram.</p>' : ''}
    ${fromISO(h).getDay() === 0 && b.quando === 'hoje' ? '<p class="dica">Hoje é domingo: ônibus de graça em BH.</p>' : ''}
    <button class="btn btn-p btn-big" data-act="sortear" ${qtd ? '' : 'disabled'}>Sortear rolê</button>
    ${S.sample && qtd > 1 ? '<button class="btn" data-act="roteiro-ia">Montar roteiro com IA</button>' : ''}
    <div id="sorteio" aria-live="polite">${S.sorteado ? cardSorteado() : ''}</div>
    ${S.roteiros || S.roteiroMsg ? vRoteiros() : ''}
  </section>`;
  out += `<h3 class="h3">${qtd ? qtd + (qtd === 1 ? ' opção combina' : ' opções combinam') : 'Nada combina'}</h3>`;
  if (!qtd) out += `<p class="mut">Afrouxa algum filtro: mais tempo, mais grana ou desliga "Perto de casa".</p>`;
  out += `<div class="lista">${pool.slice(0, S.verTodos ? 500 : 12).map(p => p.kind === 'role' ? roleCard(p.ref) : ingresso(p.ref)).join('')}</div>`;
  if (qtd > 12 && !S.verTodos) out += `<button class="btn mais" data-act="ver-todos">Ver todas as ${qtd}</button>`;
  return out;
}
function cardSorteado(){
  const s = S.sorteado; const x = s.kind === 'role' ? roleById(s.id) : evById(s.id);
  if (!x) return '';
  const linha = s.kind === 'role'
    ? [metaDe(x), (x.horario || []).map(k => HOR[k]).join(', ')].filter(Boolean).join(' · ')
    : [ehPontual(x) ? fmtCurta(x.dataInicio) : (x.dataFim ? 'até ' + fmtCurta(x.dataFim) : ''), x.horario, x.regiao].filter(Boolean).join(' · ');
  const txt = (x.obs || x.descricao || '');
  return `<div class="sorteio"><div class="eyebrow">${s.kind === 'role' ? 'Bora de' : 'Bora nesse evento'}</div><div class="t">${esc(x.titulo)}</div><div class="s">${esc(linha)}</div>${txt ? `<p>${esc(txt.length > 180 ? txt.slice(0, 177) + '...' : txt)}</p>` : ''}
    <div class="acts"><button class="btn btn-s btn-sun" data-act="marcar" data-kind="${s.kind}" data-id="${esc(s.id)}">Bora! Marcar dia</button><button class="btn btn-s btn-inv" data-act="abrir" data-kind="${s.kind}" data-id="${esc(s.id)}">Detalhes</button><button class="btn btn-s btn-inv" data-act="sortear">Outro</button></div></div>`;
}
function sortear(){
  const pool = montarPool(); if (!pool.length) return;
  const escolha = sortearPeso(pool);
  const fim = () => { S.sorteado = {kind: escolha.kind, id: escolha.id}; render(); const el = $('#sorteio'); if (el) el.scrollIntoView({block:'nearest'}); };
  const box = $('#sorteio');
  if (!box || pool.length < 3 || matchMedia('(prefers-reduced-motion: reduce)').matches) return fim();
  box.innerHTML = '<div class="sorteio girando"><div class="eyebrow">Sorteando</div><div class="t" id="giro"></div></div>';
  const giro = $('#giro'); let i = 0;
  const nomes = pool.map(p => p.ref.titulo);
  (function passo(){ giro.textContent = nomes[Math.floor(Math.random() * nomes.length)]; i++; if (i < 15) setTimeout(passo, 35 + i * i * 2.4); else fim(); })();
}
function vRoteiros(){
  if (S.roteiroMsg) return `<div class="aviso">${esc(S.roteiroMsg)}</div>`;
  if (S.roteiros === 'carregando') return '<div class="aviso cob">Montando roteiros com o que combina agora. Pode levar até um minuto.</div>';
  return S.roteiros.map((r, i) => `<div class="rot"><div class="rot-t">${esc(r.titulo)}</div>${r.resumo ? `<p>${esc(r.resumo)}</p>` : ''}<ol class="paradas">${(r.paradas || []).map(p => `<li><span class="q">${esc(p.quando)}</span>${esc(p.oque)}</li>`).join('')}</ol>${r.custo ? `<p class="mut">Custo: ${esc(r.custo)}</p>` : ''}${r.dica ? `<p class="mut">Dica: ${esc(r.dica)}</p>` : ''}<button class="btn btn-s" data-act="salvar-roteiro" data-i="${i}">Salvar como roteiro</button></div>`).join('');
}
function promptRoteiro(pool){
  const b = S.bora, h = hojeISO(), d = fromISO(h);
  const quando = b.quando === 'hoje' ? 'hoje (' + DOW_L[d.getDay()] + ', ' + h + ')' : 'no fim de semana (' + proxFds().join(' e ') + ')';
  const lista = pool.slice(0, 60).map(p => { const x = p.ref; return {id: x.id, titulo: x.titulo, tipo: p.kind === 'evento' ? (ETIPO[x.tipo] || 'Evento') : (TIPOS[x.tipo] || ''),
    regiao: x.regiao || '', distancia: (DIST[distDe(x)] || {}).t || '', grana: GRANA[x.grana] || (x.gratis === true ? 'Grátis' : ''),
    horario: p.kind === 'evento' ? (x.horario || '') : (x.horario || []).map(k => HOR[k]).join('/'), duracao: DUR[x.duracao] || '', nota: String(x.obs || x.descricao || '').slice(0, 140)}; });
  return 'Você monta roteiros de rolê em Belo Horizonte para uma pessoa que anda de Uber e de ônibus em BH (domingo o ônibus é de graça).\n' +
    'Pedido: rolê ' + quando + ', ' + COM[b.com].toLowerCase() + ', tempo disponível: ' + DUR[b.tempo] + ', grana: ' + (b.grana === 'gratis' ? 'só coisa grátis' : b.grana === 'pouca' ? 'gastar pouco' : 'tanto faz') + (b.chuva ? ', está chovendo' : '') + '.\n' +
    'Princípios do app: rolê barato como padrão, uma âncora por encontro, juntar paradas que fiquem perto uma da outra.\n' +
    'Opções disponíveis (JSON):\n' + JSON.stringify(lista) + '\n' +
    'Monte 2 roteiros diferentes, cada um com 2 ou 3 paradas que façam sentido juntas (mesma região ou no caminho, horários compatíveis). Use só opções da lista, citando o id. Pode incluir uma parada genérica como "comer algo por perto" com id null.\n' +
    'Responda só com JSON neste formato:\n{"roteiros":[{"titulo":"","resumo":"uma frase","paradas":[{"quando":"","id":"id ou null","oque":""}],"custo":"","dica":""}]}\n' +
    'Escreva em português do Brasil, direto, sem travessão.';
}
async function montarRoteiro(){
  if (!S.sample) return;
  const pool = montarPool(); if (pool.length < 2) return;
  S.roteiros = 'carregando'; S.roteiroMsg = ''; render();
  try {
    const r = await S.sample.json(promptRoteiro(pool), {modelTier:'default'});
    const rots = (r && Array.isArray(r.roteiros) ? r.roteiros : []).filter(x => x && x.titulo).slice(0, 3);
    S.roteiros = rots.length ? rots : null;
    if (!rots.length) S.roteiroMsg = 'Não consegui montar roteiros agora. Tenta de novo.';
  } catch (e){ S.roteiros = null; S.roteiroMsg = msgIA(e); }
  render();
}
function msgIA(e){
  const c = e && e.code;
  if (['not_granted','sampling_disabled','capability_disabled','capability_removed','not_declared'].includes(c)){ S.sample = null; return 'A IA não está liberada aqui. Dá pra preencher na mão.'; }
  if (c === 'images_unavailable'){ S.sampleImg = false; return 'Esse aparelho não consegue mandar imagem pra IA. Cola o texto do post.'; }
  if (c === 'rate_limited') return 'Muitos pedidos agora. Tenta de novo daqui a pouco.';
  if (c === 'image_rejected') return 'Esse arquivo não deu. Tenta outro print.';
  if (c === 'invalid_json' || c === 'empty_completion') return 'Não consegui organizar. Tenta de novo ou preenche na mão.';
  if (c === 'session_expired') return 'Sua sessão expirou. Sai, entra de novo e tenta.';
  if (c === 'limite') return 'Você usou as ' + (e.limite || '') + ' leituras de IA de hoje. Amanhã libera de novo. Dá pra preencher na mão.';
  if (c === 'sem_chave' || c === 'sem_saldo') return 'A IA está fora do ar agora. Dá pra preencher na mão.';
  if (c === 'cancelled') return 'Cancelado.';
  return 'Deu erro na IA. Tenta de novo.';
}

// ---------------------------------------------------------------- aba Rolês
function visivel(r, st){
  if (st === 'todos') return true;
  if (st === 'longo') return !!r.longoPrazo && r.status !== 'riscado';
  if (st === 'ativos') return r.status !== 'feito' && r.status !== 'riscado';
  return r.status === st;
}
function filtrarRoles(){
  const f = S.rf;
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const partes = norm(f.q).split(/[^a-z0-9$]+/).filter(Boolean);
  return S.roles.filter(r => {
    if (!visivel(r, f.status)) return false;
    if (f.tipo && r.tipo !== f.tipo) return false;
    if (f.com && !(r.com || []).includes(f.com)) return false;
    if (f.grana && r.grana !== f.grana) return false;
    if (f.dist && distDe(r) !== f.dist) return false;
    if (partes.length){ const alvo = norm([r.titulo, r.regiao, r.obs, r.origem, TIPOS[r.tipo], (r.paradas || []).map(p => p.oque).join(' ')].join(' ')); if (!partes.every(p => alvo.includes(p))) return false; }
    return true;
  });
}
function listaRoles(){
  const rs = filtrarRoles();
  if (!rs.length) return vazio('Nada aqui', 'Nenhum rolê com esses filtros.');
  const ord = (a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0) || a.titulo.localeCompare(b.titulo, 'pt');
  if (S.rf.tipo || S.rf.q) return `<div class="lista">${rs.sort(ord).map(roleCard).join('')}</div>`;
  return TIPO_ORDEM.map(t => { const g = rs.filter(r => r.tipo === t).sort(ord); return g.length ? `<h3 class="h3">${TIPOS[t]} <span class="cont">${g.length}</span></h3><div class="lista">${g.map(roleCard).join('')}</div>` : ''; }).join('');
}
function sel(k, ops){ return `<select data-rf="${k}" aria-label="${ops[0][1]}">${ops.map(([v, l]) => `<option value="${v}" ${S.rf[k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`; }
function vRoles(){
  if (!S.got.roles) return carregando('Carregando seus rolês');
  const cont = {}; let total = 0;
  S.roles.forEach(r => { if (visivel(r, S.rf.status)){ cont[r.tipo] = (cont[r.tipo] || 0) + 1; total++; } });
  return `<h2 class="h2">Rolês <span class="cont">${total}</span></h2>
    <input type="search" id="q" placeholder="Buscar rolê, lugar ou bairro" value="${esc(S.rf.q)}" autocomplete="off" enterkeyhint="search">
    <div class="chips"><button class="chip" data-act="rf-tipo" data-v="" aria-pressed="${!S.rf.tipo}">Todos</button>${TIPO_ORDEM.filter(t => cont[t]).map(t => `<button class="chip" data-act="rf-tipo" data-v="${t}" aria-pressed="${S.rf.tipo === t}">${TIPOS[t]} ${cont[t]}</button>`).join('')}</div>
    <div class="selects">
      ${sel('com', [['','Com quem'],['sozinho','Sozinho'],['date','Date'],['galera','Galera']])}
      ${sel('grana', [['','Grana'],['gratis','Grátis'],['barato','Barato'],['medio','Médio'],['caro','Caro']])}
      ${sel('dist', [['','Distância'],['casa','Em casa'],['perto','Perto'],['medio','Médio'],['longe','Longe'],['batevolta','Bate-volta']])}
      ${sel('status', [['ativos','Quero fazer'],['fila','Na fila'],['longo','Longo prazo'],['feito','Já fiz'],['riscado','Riscados'],['todos','Todos']])}
    </div>
    <div id="rolesLista">${listaRoles()}</div>`;
}

// ---------------------------------------------------------------- aba Agenda
function vAgenda(){
  const nv = novosCount();
  const segs = [['fila','Fila'],['eventos','Eventos' + (nv ? ' · ' + nv + ' novos' : '')],['diario','Já rolou']];
  return `<h2 class="h2">Agenda</h2>
    <div class="seg" role="group" aria-label="Seção da agenda">${segs.map(([k, l]) => `<button data-act="ag" data-v="${k}" aria-pressed="${S.ag === k}">${l}</button>`).join('')}</div>
    ${S.ag === 'fila' ? vFila() : S.ag === 'eventos' ? vEventos() : vDiario()}`;
}
function vFila(){
  if (!S.got.roles || !S.got.eventos) return carregando('Carregando a fila');
  const h = hojeISO(), it = filaItens();
  const atras = it.filter(x => (x.dataFim || x.data) < h), fut = it.filter(x => (x.dataFim || x.data) >= h);
  let out = atras.map(avisoAtrasado).join('');
  if (!fut.length) out += vazio('Fila vazia', 'Nada com data marcada. Se a fila zera, o grupo para.<div class="acts" style="justify-content:center"><button class="btn btn-s" data-act="ag" data-v="eventos">Ver eventos</button><button class="btn btn-s" data-act="tab" data-tab="bora">Sortear um rolê</button></div>');
  else out += `<h3 class="h3">Com data marcada</h3><div class="lista">${fut.map(filaCard).join('')}</div>`;
  out += '<p class="mut">Regra da fila: sempre ter uma coisa com data. O que tem data vira compromisso, põe no Google Agenda pelo detalhe do rolê.</p>';
  return out;
}
function vEventos(){
  if (!S.got.eventos) return carregando('Carregando eventos');
  const h = hojeISO(), [sab, dom] = proxFds();
  const fimMes = isoLocal(new Date(fromISO(h).getFullYear(), fromISO(h).getMonth() + 1, 0));
  let evs = S.eventos.filter(e => e.status !== 'ignorado' && e.status !== 'fui' && fimDe(e) >= h);
  const f = S.ef;
  if (f === 'novos') evs = evs.filter(e => e.status === 'novo');
  if (f === 'gratis') evs = evs.filter(e => e.gratis === true);
  if (f === 'fds') evs = evs.filter(e => (e.dataInicio || '0000-01-01') <= dom && fimDe(e) >= sab);
  if (f === 'mes') evs = evs.filter(e => (e.dataInicio || h) <= fimMes);
  if (f === 'perto') evs = evs.filter(e => ['perto','medio'].includes(distDe(e)));
  const chips = [['todos','Todos'],['novos','Novos'],['gratis','Grátis'],['fds','Este fim de semana'],['mes','Este mês'],['perto','Perto de casa']]
    .map(([k, l]) => `<button class="chip" data-act="ef" data-v="${k}" aria-pressed="${f === k}">${l}</button>`).join('');
  const pont = evs.filter(ehPontual).sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
  const cartaz = evs.filter(e => !ehPontual(e)).sort((a, b) => fimDe(a).localeCompare(fimDe(b)));
  let out = `<div class="chips" style="margin-top:12px">${chips}</div>`;
  if (!evs.length) out += vazio('Nada por aqui', 'Nenhum evento com esse filtro. A busca automática traz novidades todo dia.');
  if (pont.length) out += `<h3 class="h3">Com data</h3><div class="lista">${pont.map(ingresso).join('')}</div>`;
  if (cartaz.length) out += `<h3 class="h3">Em cartaz</h3><div class="lista">${cartaz.map(ingresso).join('')}</div>`;
  const ign = S.eventos.filter(e => e.status === 'ignorado' && fimDe(e) >= h).length;
  if (ign) out += `<p class="mut">${ign} ${ign === 1 ? 'evento escondido' : 'eventos escondidos'} porque você passou.</p>`;
  return out;
}
function vDiario(){
  if (!S.got.diario) return carregando('Carregando o diário');
  const ds = S.diario.slice().sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
  if (!ds.length) return vazio('Diário vazio', 'Quando fizer um rolê, toca em "Fui!" nele e diz se prestou. Em alguns meses você tem dado real do que funciona.');
  const prest = ds.filter(d => d.prestou === true).length;
  const notas = ds.filter(d => d.nota).map(d => d.nota);
  const media = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1).replace('.', ',') : '-';
  return `<div class="stats" style="margin-top:12px"><div class="stat"><b>${ds.length}</b><span>rolês</span></div><div class="stat"><b>${Math.round(prest / ds.length * 100)}%</b><span>prestaram</span></div><div class="stat"><b>${media}</b><span>nota média</span></div></div>
    <div class="lista">${ds.map(d => `<div class="dj"><div class="linha"><strong>${esc(d.titulo)}</strong><span class="data">${okISO(d.data) ? fmtCurta(d.data) : ''}</span></div><div class="tags">${d.prestou === true ? '<span class="tag ok">Prestou</span>' : d.prestou === false ? '<span class="tag hot">Não prestou</span>' : ''}${d.nota ? `<span class="tag sun">${'★'.repeat(d.nota)}</span>` : ''}${d.quem ? `<span class="tag">${esc(d.quem)}</span>` : ''}</div>${d.comentario ? `<p class="mut">${esc(d.comentario)}</p>` : ''}</div>`).join('')}</div>`;
}

// ---------------------------------------------------------------- aba Radar
function vRadar(){
  if (!S.got.fontes) return carregando('Carregando o radar');
  const st = S.radar, h = hojeISO();
  const fs = Object.entries(S.fontes).map(([id, f]) => Object.assign({id}, f)).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const grupos = [['site','Agendas e sites'],['instagram','Instagram'],['tiktok','TikTok'],['venue','Casas de show'],['dica','Domingo']];
  let out = `<h2 class="h2">Radar</h2>
    <div class="radar-st"><div class="eyebrow">Busca automática</div><strong>${st && st.ultimaBusca ? 'Última: ' + esc(quandoFoi(st.ultimaBusca)) : 'Ainda não rodou'}</strong>${st && st.resumo ? `<p class="mut">${esc(st.resumo)}</p>` : ''}<p class="mut">A busca roda todo dia. As novidades aparecem como "Novo" na Agenda.</p></div>`;
  const adm = S.perfil && S.perfil.admin;
  const pend = adm ? [...S.roles.filter(r => r.publico && r.moderacao === 'pendente').map(x => ({tb:'roles', kind:'role', x})), ...S.eventos.filter(e => e.publico && e.moderacao === 'pendente').map(x => ({tb:'eventos', kind:'evento', x}))] : [];
  if (pend.length) out += `<h3 class="h3">Pra aprovar <span class="cont">${pend.length}</span></h3><div class="lista">${pend.map(p => `<div class="fonte"><div class="fonte-b"><button class="link-btn" data-act="abrir" data-kind="${p.kind}" data-id="${esc(p.x.id)}">${esc(p.x.titulo)}</button><span class="role-m">${p.kind === 'role' ? 'Rolê' : 'Evento'}${p.x.regiao ? ' · ' + esc(p.x.regiao) : ''}${p.kind === 'evento' && p.x.dataInicio ? ' · ' + fmtCurta(p.x.dataInicio) : ''}</span></div><div class="fonte-a"><button class="btn btn-s btn-p" data-act="aprovar" data-tb="${p.tb}" data-id="${esc(p.x.id)}">Aprovar</button><button class="btn btn-s" data-act="recusar" data-tb="${p.tb}" data-id="${esc(p.x.id)}">Recusar</button></div></div>`).join('')}</div>`;
  if (fromISO(h).getDay() === 5) out += `<div class="aviso"><strong>Hoje é sexta.</strong> Escolhe UM programa pro fim de semana.<div class="acts"><button class="btn btn-s" data-act="ir" data-tab="agenda" data-ag="eventos" data-ef="fds">Ver o fim de semana</button></div></div>`;
  out += '<div class="aviso cob">Viu algum rolê ou evento que não está aqui? Manda pelo "+ Adicionar" na Agenda ou nos Rolês.</div>';
  grupos.forEach(([g, nome]) => {
    const it = fs.filter(f => f.tipo === g); if (!it.length) return;
    out += `<h3 class="h3">${nome}</h3><div class="lista">${it.map(fonteRow).join('')}</div>`;
  });
  return out;
}
function fonteRow(f){
  const olhou = f.olhadoEm ? 'Você olhou ' + quandoFoi(f.olhadoEm) : '';
  return `<div class="fonte"><div class="fonte-b"><div class="fonte-n">${esc(f.nome)}${f.auto ? '<span class="tag ok">Na busca</span>' : ''}${f.conferir ? '<span class="tag">Link a conferir</span>' : ''}</div>${f.desc ? `<span class="role-m">${esc(f.desc)}</span>` : ''}${olhou ? `<span class="role-m">${esc(olhou)}</span>` : ''}</div>
    <div class="fonte-a">${f.url ? `<a class="btn btn-s" href="${esc(f.url)}" target="_blank" rel="noopener">Abrir</a>` : ''}<button class="btn btn-s" data-act="olhei" data-id="${esc(f.id)}">Olhei</button></div></div>`;
}

// ---------------------------------------------------------------- aba Caderno
const previa = t => { const l = String(t || '').split('\n').map(s => s.replace(/^[-#\s]+/, '').trim()).filter(Boolean)[0] || ''; return l.length > 110 ? l.slice(0, 107) + '...' : l; };
function vCaderno(){
  if (!S.got.caderno) return carregando('Carregando o caderno');
  const ns = Object.entries(S.notas).map(([id, n]) => Object.assign({id}, n)).filter(n => n.titulo).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  if (!ns.length) return `<h2 class="h2">Caderno</h2>` + vazio('Caderno vazio', 'Suas ideias guardadas vão aparecer aqui.') + rodapeConta();
  return `<h2 class="h2">Caderno</h2><p class="mut">Ideias guardadas, regras e o que está em aberto.</p>
    <div class="lista">${ns.map(n => `<button class="nota ${n.slug === 'grupo-resenha' ? 'nota-dest' : ''}" data-act="abrir" data-kind="nota" data-id="${esc(n.id)}"><span class="role-t">${esc(n.titulo)}</span><span class="role-m">${esc(previa(n.texto))}</span></button>`).join('')}</div>` + rodapeConta();
}
function rodapeConta(){
  const nome = (S.perfil && S.perfil.nome) || (S.user && S.user.email) || '';
  return `<div class="conta"><span class="mut">Entrou como ${esc(nome)}${S.perfil && S.perfil.admin ? ' (admin)' : ''}</span><button class="btn btn-s" data-act="sair">Sair</button></div>`;
}
function md(t){
  const out = []; let lista = null;
  const fecha = () => { if (lista){ out.push('<ul>' + lista.join('') + '</ul>'); lista = null; } };
  String(t || '').split('\n').forEach(l => {
    const s = l.trim();
    if (!s){ fecha(); return; }
    if (s.startsWith('## ')){ fecha(); out.push('<h4>' + esc(s.slice(3)) + '</h4>'); return; }
    if (s.startsWith('- ')){ (lista = lista || []).push('<li>' + esc(s.slice(2)) + '</li>'); return; }
    fecha(); out.push('<p>' + esc(s) + '</p>');
  });
  fecha();
  return '<div class="md">' + out.join('') + '</div>';
}

// ---------------------------------------------------------------- render
function vLogin(){
  const l = S.login || {};
  const email = l.etapa === 'codigo'
    ? `<div class="aviso cob">Mandamos um link de entrada pra <strong>${esc(l.email)}</strong>. Abre o e-mail neste mesmo aparelho e toca em "Sign in". Confere o spam se não chegar.<div class="acts"><button class="btn btn-s" data-act="login-voltar">Usar outro e-mail</button></div></div>`
    : `<details class="login-email"><summary>Prefiro entrar com link por e-mail</summary><div class="form"><div class="f"><label for="loginEmail">E-mail</label><input type="text" id="loginEmail" inputmode="email" autocomplete="email" value="${esc(l.email || '')}"></div><button class="btn" data-act="login-email">Mandar link</button></div></details>`;
  return `<section class="login"><h2 class="h2">Entra na Resenha</h2><p class="mut">Seus rolês, a agenda de BH e o que a galera sugere, num lugar só.</p>
    <button class="btn btn-p btn-big" data-act="login-google">Entrar com Google</button>${email}${l.erro ? `<p class="erro">${esc(l.erro)}</p>` : ''}</section>`;
}
function render(){
  document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === S.tab)));
  const h = hojeISO(); $('#hoje').textContent = fmtLonga(h);
  const nv = novosCount(); const pill = $('#pillAgenda'); pill.hidden = !nv; pill.textContent = nv;
  const view = $('#view');
  const ae = document.activeElement;
  const fid = ae && view.contains(ae) && ae.id ? ae.id : null;
  let pos = null; try { pos = fid ? ae.selectionStart : null; } catch (e) {}
  let html = '';
  if (S.status === 'login') html = vLogin();
  else if (S.status === 'erro') html = vazio('Deu ruim', esc(S.erroMsg || 'Algo deu errado.'));
  else {
    if (S.status === 'lento') html += '<div class="aviso">Seus dados estão demorando pra carregar. Confere a internet.</div>';
    html += S.tab === 'bora' ? vBora() : S.tab === 'roles' ? vRoles() : S.tab === 'agenda' ? vAgenda() : S.tab === 'radar' ? vRadar() : vCaderno();
  }
  view.innerHTML = html;
  if (fid){ const el = document.getElementById(fid); if (el){ el.focus({preventScroll: true}); if (pos != null){ try { el.setSelectionRange(pos, pos); } catch (e) {} } } }
  $('#fab').hidden = !(S.db && (S.tab === 'roles' || S.tab === 'agenda'));
  if (S.sheet && S.sheet.vivo) renderSheet();
}

// ---------------------------------------------------------------- folhas
function abrirSheet(info, html){
  S.sheet = info;
  const body = $('#sheetBody');
  body.innerHTML = html; body.scrollTop = 0;
  $('#sheet').hidden = false;
  document.body.style.overflow = 'hidden';
}
function fecharSheet(){
  if (S.add && S.add.previewUrl) { try { URL.revokeObjectURL(S.add.previewUrl); } catch (e) {} }
  S.sheet = null; S.add = null;
  $('#sheet').hidden = true; $('#sheetBody').innerHTML = '';
  document.body.style.overflow = '';
}
function renderSheet(){
  const s = S.sheet; if (!s) return;
  const body = $('#sheetBody'); const top = body.scrollTop;
  let html = '';
  if (s.kind === 'role') html = sheetRole(s.id);
  else if (s.kind === 'evento') html = sheetEvento(s.id);
  else if (s.kind === 'nota') html = sheetNota(s.id);
  else return;
  body.innerHTML = html; body.scrollTop = top;
}
function abrir(kind, id){
  if (kind === 'role') abrirSheet({kind, id, vivo:true}, sheetRole(id));
  else if (kind === 'evento'){
    abrirSheet({kind, id, vivo:true}, sheetEvento(id));
    const e = evById(id); if (e && e.status === 'novo') patchEvento(id, {status:'visto'});
  }
  else if (kind === 'nota') abrirSheet({kind, id, vivo:true}, sheetNota(id));
}
function paradasHtml(ps){ return `<h4 class="h4">Roteiro</h4><ol class="paradas">${ps.map(p => `<li><span class="q">${esc(p.quando)}</span>${esc(p.oque)}</li>`).join('')}</ol>`; }
function checklistHtml(r){
  const ch = r.check || {};
  return '<h4 class="h4">Checklist</h4>' + r.checklist.map((s, si) => `<div class="ck"><div class="ck-t">${esc(s.secao)}</div>${s.tipo === 'nao'
    ? `<ul class="nao">${s.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
    : s.itens.map((it, ii) => { const k = si + '-' + ii; return `<label class="ck-i"><input type="checkbox" data-ck="${esc(r.id)}" data-k="${k}" ${ch[k] ? 'checked' : ''}><span>${esc(it)}</span></label>`; }).join('')}</div>`).join('')
    + `<button class="btn btn-s" data-act="check-limpar" data-id="${esc(r.id)}">Desmarcar tudo</button>`;
}
function sheetRole(id){
  const r = roleById(id); if (!r) return grab() + vazio('Sumiu', 'Esse rolê não existe mais.');
  const d = distDe(r), q = lugarQuery(r);
  const evs = S.eventos.filter(e => e.roleId === r.id && fimDe(e) >= hojeISO() && e.status !== 'ignorado');
  const ag = r.status === 'fila' && okISO(r.data) ? gcal(r.titulo, r.data, r.dataFim, q || '', r.obs || '') : null;
  return `${grab()}
    <div class="eyebrow">${esc([TIPOS[r.tipo], FORMATO[r.formato], r.origem].filter(Boolean).join(' · '))}</div>
    <h3 class="sh-t">${esc(r.titulo)}</h3>
    ${ag ? `<div class="aviso cob">Marcado pra <strong>${fmtLonga(r.data)}</strong> (${relativo(r.data)})${r.dataFim ? ' até ' + fmtCurta(r.dataFim) : ''}.<div class="acts"><a class="btn btn-s" href="${esc(ag)}" target="_blank" rel="noopener">Pôr no Google Agenda</a></div></div>` : ''}
    ${r.status === 'riscado' ? `<div class="aviso">Riscado${r.motivo ? ': ' + esc(r.motivo) : '.'}</div>` : ''}
    ${r.status === 'feito' ? '<div class="aviso">Você já fez esse.</div>' : ''}
    ${r.aviso ? `<div class="aviso hot">${esc(r.aviso)}</div>` : ''}
    <dl class="fatos">
      ${fato('Onde', [r.regiao && r.regiao !== 'Em casa' ? r.regiao : (d === 'casa' ? 'Em casa' : ''), d && d !== 'casa' ? DIST[d].t + ', ' + DIST[d].d : ''].filter(Boolean).join(' · '))}
      ${fato('Grana', GRANA[r.grana] ? GRANA[r.grana] + (r.tipo === 'comer' && r.grana !== 'gratis' ? ' (estimativa)' : '') : '')}
      ${fato('Com quem', (r.com || []).map(c => COM[c]).filter(Boolean).join(', '))}
      ${fato('Melhor horário', (r.horario || []).map(k => HOR[k]).filter(Boolean).join(', '))}
      ${fato('Duração', DUR[r.duracao])}
      ${fato('Chuva', r.chuva === true ? 'Dá pra fazer com chuva' : r.chuva === false ? 'Precisa de tempo bom' : '')}
      ${fato('Dias', r.dias && r.dias.length ? r.dias.map(x => DOW_L[x]).join(', ') : '')}
    </dl>
    ${r.obs ? `<p class="obs">${esc(r.obs)}</p>` : ''}
    ${r.minhaNota ? `<div class="aviso cob"><strong>Sua nota:</strong> ${esc(r.minhaNota)}</div>` : ''}
    ${r.paradas && r.paradas.length ? paradasHtml(r.paradas) : ''}
    ${r.checklist && r.checklist.length ? checklistHtml(r) : ''}
    ${evs.length ? `<h4 class="h4">Na agenda</h4><div class="lista">${evs.map(ingresso).join('')}</div>` : ''}
    <div class="links">${q ? `<a class="btn btn-s" href="${esc(mapsUrl(q))}" target="_blank" rel="noopener">Abrir no Maps</a><a class="btn btn-s" href="${esc(uberUrl(q))}" target="_blank" rel="noopener">Chamar Uber</a>` : ''}${(r.links || []).filter(l => l && /^https:\/\//.test(l.url || '')).map(l => `<a class="btn btn-s" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.rotulo || 'Link')}</a>`).join('')}</div>
    <div class="acts">
      ${r.status === 'fila'
        ? `<button class="btn btn-p" data-act="marcar" data-kind="role" data-id="${esc(id)}">Mudar data</button><button class="btn" data-act="naorolou" data-kind="role" data-id="${esc(id)}">Tirar da fila</button>`
        : r.status !== 'riscado' ? `<button class="btn btn-p" data-act="marcar" data-kind="role" data-id="${esc(id)}">Marcar dia</button>` : ''}
      <button class="btn" data-act="fui" data-kind="role" data-id="${esc(id)}">Fui!</button>
      ${r.podeEditar ? `<button class="btn" data-act="editar" data-kind="role" data-id="${esc(id)}">Editar</button>` : ''}
      <button class="btn" data-act="longo" data-id="${esc(id)}">${r.longoPrazo ? 'Tirar do longo prazo' : 'Longo prazo'}</button>
      ${r.status === 'riscado' || r.status === 'feito'
        ? `<button class="btn" data-act="restaurar" data-id="${esc(id)}">Quero de novo</button>`
        : `<button class="btn" data-act="riscar" data-id="${esc(id)}">Riscar</button>`}
    </div>`;
}
function sheetEvento(id){
  const e = evById(id); if (!e) return grab() + vazio('Sumiu', 'Esse evento não existe mais.');
  const u = urgencia(e), d = distDe(e), q = lugarQuery(e);
  const quando = ehPontual(e) ? fmtLonga(e.dataInicio) + (e.dataFim && e.dataFim !== e.dataInicio ? ' até ' + fmtCurta(e.dataFim) : '')
    : (e.dataInicio && e.dataInicio > hojeISO() ? 'De ' + fmtCurta(e.dataInicio) + ' ' : 'Em cartaz ') + (e.dataFim ? 'até ' + fmtCurta(e.dataFim) : '');
  const iniAg = e.dataInicio && e.dataInicio >= hojeISO() ? e.dataInicio : hojeISO();
  const role = e.roleId ? roleById(e.roleId) : null;
  const st = e.status;
  return `${grab()}
    <div class="eyebrow">${esc([ETIPO[e.tipo] || 'Evento', e.fonte ? 'via ' + e.fonte : '', e.origem === 'print' ? 'do seu print' : ''].filter(Boolean).join(' · '))}</div>
    <h3 class="sh-t">${esc(e.titulo)}</h3>
    <div class="tags">${u ? `<span class="tag ${u.cls}">${u.txt}</span>` : ''}${e.gratis === true ? '<span class="tag ok">Grátis</span>' : e.gratis === false ? '<span class="tag">Pago</span>' : ''}${e.destaque ? '<span class="tag sun">5 estrelas na base</span>' : ''}</div>
    <dl class="fatos">
      ${fato('Quando', quando)}${fato('Horário', e.horario)}
      ${fato('Onde', [e.local, e.regiao && !(e.local || '').includes(e.regiao) ? e.regiao : '', d ? DIST[d].t + ', ' + DIST[d].d : ''].filter(Boolean).join(' · '))}
      ${fato('Preço', e.preco)}
      ${fato('Combina com', (e.com || []).map(c => COM[c]).filter(Boolean).join(', '))}
    </dl>
    ${e.descricao ? `<p class="obs">${esc(e.descricao)}</p>` : ''}
    ${e.ideia ? `<div class="aviso cob">${esc(e.ideia)}</div>` : ''}
    ${role ? `<div class="acts"><button class="btn btn-s" data-act="abrir" data-kind="role" data-id="${esc(role.id)}">Ver o rolê: ${esc(role.titulo)}</button></div>` : ''}
    <div class="links">${e.link && /^https:\/\//.test(e.link) ? `<a class="btn btn-s" href="${esc(e.link)}" target="_blank" rel="noopener">Ver a fonte</a>` : ''}${q ? `<a class="btn btn-s" href="${esc(mapsUrl(q))}" target="_blank" rel="noopener">Maps</a><a class="btn btn-s" href="${esc(uberUrl(q))}" target="_blank" rel="noopener">Uber</a>` : ''}<a class="btn btn-s" href="${esc(gcal(e.titulo, iniAg, ehPontual(e) ? e.dataFim : null, e.local || '', [e.horario, e.preco, e.link].filter(Boolean).join('\n')))}" target="_blank" rel="noopener">Google Agenda</a></div>
    <div class="row-l" style="margin-top:14px">Você vai?</div>
    <div class="seg" role="group" aria-label="Você vai?">
      <button data-act="ev-status" data-id="${esc(id)}" data-v="vou" aria-pressed="${st === 'vou'}">Vou</button>
      <button data-act="ev-status" data-id="${esc(id)}" data-v="interesse" aria-pressed="${st === 'interesse'}">Talvez</button>
      <button data-act="ev-status" data-id="${esc(id)}" data-v="ignorado" aria-pressed="${st === 'ignorado'}">Passo</button>
    </div>
    <div class="acts"><button class="btn" data-act="fui" data-kind="evento" data-id="${esc(id)}">Fui!</button>${e.podeEditar ? `<button class="btn" data-act="editar" data-kind="evento" data-id="${esc(id)}">Editar</button>` : ''}</div>`;
}
function sheetNota(id){
  const n = S.notas[id]; if (!n) return grab() + vazio('Sumiu', 'Essa nota não existe mais.');
  if (S.sheet && S.sheet.editar) return `${grab()}<div class="eyebrow">Editando</div><h3 class="sh-t">${esc(n.titulo)}</h3>
    <p class="mut">Use "## " pra subtítulo e "- " pra lista.</p>
    <textarea id="notaTxt" style="min-height:52vh">${esc(n.texto)}</textarea>
    <div class="acts"><button class="btn btn-p" data-act="nota-salvar" data-id="${esc(id)}">Salvar</button><button class="btn" data-act="nota-cancelar" data-id="${esc(id)}">Cancelar</button></div>`;
  return `${grab()}<div class="eyebrow">Caderno</div><h3 class="sh-t">${esc(n.titulo)}</h3>${md(n.texto)}
    <div class="acts"><button class="btn" data-act="nota-editar" data-id="${esc(id)}">Editar</button></div>`;
}

// marcar dia
function abrirMarcar(kind, id){
  const x = kind === 'role' ? roleById(id) : evById(id); if (!x) return;
  const h = hojeISO();
  const [sab, dom] = proxFds();
  let sug = kind === 'role' ? (okISO(x.data) && x.data >= h ? x.data : (x.dias && x.dias.length ? proxDia(x.dias) : (sab >= h ? sab : dom)))
    : (okISO(x.dataVou) ? x.dataVou : (okISO(x.dataInicio) && x.dataInicio >= h ? x.dataInicio : h));
  abrirSheet({kind:'marcar', alvo:kind, id}, `${grab()}<div class="eyebrow">Marcar dia</div><h3 class="sh-t">${esc(x.titulo)}</h3>
    ${kind === 'role' && x.dias && x.dias.length ? `<p class="mut">Esse só rola ${x.dias.map(d => DOW_L[d]).join(', ')}.</p>` : ''}
    <div class="form"><div class="f"><label for="mData">Dia</label><input type="date" id="mData" value="${sug}" min="${h}"${kind === 'evento' && okISO(x.dataFim) ? ' max="' + x.dataFim + '"' : ''}></div>
    <button class="btn btn-p" data-act="salvar-marcar">Pôr na fila</button></div>`);
}
function proxDia(dias){ let d = hojeISO(); for (let i = 0; i < 8; i++){ if (dias.includes(fromISO(d).getDay())) return d; d = addDias(d, 1); } return hojeISO(); }
async function salvarMarcar(){
  const s = S.sheet; const v = $('#mData') && $('#mData').value;
  if (!okISO(v)) return toast('Escolhe um dia.');
  let ok;
  if (s.alvo === 'role'){ const r = roleById(s.id); ok = r && await patchRole(r, {status:'fila', data:v}); }
  else ok = await patchEvento(s.id, {status:'vou', dataVou:v});
  if (ok){ fecharSheet(); toast('Marcado pra ' + fmtCurta(v) + '.'); }
}

// fui
function abrirFui(kind, id){
  const x = kind === 'role' ? roleById(id) : evById(id); if (!x) return;
  const h = hojeISO();
  const sug = kind === 'role' ? (okISO(x.data) && x.data <= h ? x.data : h) : (okISO(x.dataVou) && x.dataVou <= h ? x.dataVou : (okISO(x.dataInicio) && x.dataInicio <= h ? x.dataInicio : h));
  abrirSheet({kind:'fui', alvo:kind, id, prestou:null, nota:0}, `${grab()}<div class="eyebrow">Fui! Como foi?</div><h3 class="sh-t">${esc(x.titulo)}</h3>
    <div class="form">
      <div class="f"><label for="fuiData">Quando</label><input type="date" id="fuiData" value="${sug}" max="${h}"></div>
      <div class="f"><span class="lbl">Prestou?</span><div class="seg" role="group" aria-label="Prestou?"><button data-act="fui-prestou" data-v="sim" aria-pressed="false">Prestou</button><button data-act="fui-prestou" data-v="nao" aria-pressed="false">Não prestou</button></div></div>
      <div class="f"><span class="lbl">Nota</span><div class="estrelas" role="group" aria-label="Nota de 1 a 5">${[1,2,3,4,5].map(n => `<button data-act="fui-nota" data-v="${n}" aria-pressed="false" aria-label="${n} de 5">★</button>`).join('')}</div></div>
      <div class="f"><label for="fuiQuem">Com quem foi</label><input type="text" id="fuiQuem" placeholder="Opcional"></div>
      <div class="f"><label for="fuiObs">Comentário</label><textarea id="fuiObs" placeholder="O que valeu, o que não valeu, se volta"></textarea></div>
      <button class="btn btn-p" data-act="salvar-fui">Salvar no diário</button>
    </div>`);
}
async function salvarFui(){
  const s = S.sheet; const x = s.alvo === 'role' ? roleById(s.id) : evById(s.id); if (!x) return;
  const data = $('#fuiData').value;
  if (!okISO(data)) return toast('Escolhe o dia.');
  const entry = {titulo: x.titulo, refTipo: s.alvo, refId: s.id, data, prestou: s.prestou, nota: s.nota || null,
    quem: $('#fuiQuem').value.trim() || null, comentario: $('#fuiObs').value.trim() || null, criadoEm: new Date().toISOString()};
  Object.keys(entry).forEach(k => entry[k] === null && delete entry[k]);
  const ok = await novoDiario(entry); if (!ok) return;
  if (s.alvo === 'role') await patchRole(x, {status:'feito', data:null, dataFim:null});
  else await patchEvento(s.id, {status:'fui'});
  fecharSheet(); toast('Salvo no diário.');
}

// adicionar e editar
const FORM_ROLE = ['titulo','formato','tipo','com','regiao','grana','duracao','horario','chuva','obs','link'];
function abrirAdd(pre){
  S.add = Object.assign({modo: S.sample ? (S.sampleImg ? 'print' : 'texto') : 'mao', etapa: S.sample ? 'entrada' : 'form', tipo: S.tab === 'roles' ? 'role' : 'evento', dados:{}, texto:'', blob:null, previewUrl:null, carregando:false, erro:''}, pre || {});
  abrirSheet({kind:'add'}, htmlAdd());
}
function renderAdd(){ if (S.sheet && S.sheet.kind === 'add'){ const b = $('#sheetBody'); const t = b.scrollTop; b.innerHTML = htmlAdd(); b.scrollTop = t; } }
function htmlAdd(){
  const a = S.add;
  const editando = !!a.editId;
  let out = `${grab()}<div class="eyebrow">${editando ? 'Editar' : 'Adicionar'}</div><h3 class="sh-t">${editando ? esc(a.dados.titulo || '') : 'Rolê ou evento novo'}</h3>`;
  if (!editando){
    const modos = [];
    if (S.sample && S.sampleImg) modos.push(['print','Print']);
    if (S.sample) modos.push(['texto','Texto']);
    modos.push(['mao','Na mão']);
    if (modos.length > 1) out += `<div class="seg" role="group" aria-label="Como adicionar">${modos.map(([k, l]) => `<button data-act="add-modo" data-v="${k}" aria-pressed="${a.modo === k}">${l}</button>`).join('')}</div>`;
  }
  if (a.etapa === 'entrada' && a.modo !== 'mao'){
    if (a.modo === 'print'){
      out += `<div class="form"><label class="drop" for="addFoto">${a.previewUrl ? `<img src="${a.previewUrl}" alt="Print escolhido">` : '<strong>Escolher print</strong><span>Do Instagram, TikTok, cartaz, o que for</span>'}</label>
        <input type="file" id="addFoto" class="vh" accept="image/*">
        <button class="btn btn-p" data-act="add-ler" ${a.blob && !a.carregando ? '' : 'disabled'}>${a.carregando ? 'Lendo o print...' : 'Ler com IA'}</button></div>`;
    } else {
      out += `<div class="form"><div class="f"><label for="addTexto">Texto</label><textarea id="addTexto" placeholder="Cola a legenda do post, o texto do site ou descreve o rolê">${esc(a.texto)}</textarea></div>
        <p class="mut">Link sozinho não dá: o app não consegue abrir sites. Cola o texto junto.</p>
        <button class="btn btn-p" data-act="add-ler" ${a.carregando ? 'disabled' : ''}>${a.carregando ? 'Organizando...' : 'Organizar com IA'}</button></div>`;
    }
    if (a.erro) out += `<p class="erro">${esc(a.erro)}</p>`;
    return out;
  }
  if (a.erro) out += `<p class="erro">${esc(a.erro)}</p>`;
  if (!editando) out += `<div class="row-l" style="margin-top:12px">É um</div><div class="seg" role="group" aria-label="Tipo"><button data-act="add-tipo" data-v="evento" aria-pressed="${a.tipo === 'evento'}">Evento com data</button><button data-act="add-tipo" data-v="role" aria-pressed="${a.tipo === 'role'}">Rolê sem data</button></div>`;
  out += a.tipo === 'evento' ? formEvento(a.dados) : formRole(a.dados);
  if (!editando) out += `<label class="ck-i" style="margin-top:14px"><input type="checkbox" id="fPublico" ${a.tipo === 'evento' ? 'checked' : ''}><span>Sugerir pra todo mundo. Vai pra aprovação antes de aparecer pros outros.</span></label>`;
  out += `<button class="btn btn-p" data-act="add-salvar" style="margin-top:14px;width:100%">Salvar</button>`;
  return out;
}
const op = (v, l, cur) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${l}</option>`;
const chipsF = (grupo, mapa, sel) => `<div class="chips quebra">${Object.entries(mapa).map(([k, l]) => `<button class="chip" data-act="fchip" data-g="${grupo}" data-v="${k}" aria-pressed="${(sel || []).includes(k)}">${l}</button>`).join('')}</div>`;
function formEvento(d){
  return `<div class="form">
    <div class="f"><label for="fTitulo">Nome</label><input type="text" id="fTitulo" value="${esc(d.titulo)}"></div>
    <div class="dois"><div class="f"><label for="fIni">Começa</label><input type="date" id="fIni" value="${esc(d.dataInicio || '')}"></div><div class="f"><label for="fFim">Termina</label><input type="date" id="fFim" value="${esc(d.dataFim || '')}"></div></div>
    <div class="f"><label for="fHora">Horário</label><input type="text" id="fHora" value="${esc(d.horario)}" placeholder="Ex: 21h"></div>
    <div class="f"><label for="fLocal">Local</label><input type="text" id="fLocal" value="${esc(d.local)}" placeholder="Nome e endereço"></div>
    <div class="f"><label for="fRegiao">Bairro ou cidade</label><input type="text" id="fRegiao" value="${esc(d.regiao)}" list="regioes"></div>
    <div class="dois"><div class="f"><label for="fGratis">Grátis?</label><select id="fGratis">${op('', 'Não sei', d.gratis === true ? 'sim' : d.gratis === false ? 'nao' : '')}${op('sim', 'Grátis', d.gratis === true ? 'sim' : '')}${op('nao', 'Pago', d.gratis === false ? 'nao' : '')}</select></div><div class="f"><label for="fPreco">Preço</label><input type="text" id="fPreco" value="${esc(d.preco)}"></div></div>
    <div class="f"><span class="lbl">Combina com</span>${chipsF('com', COM, d.com || ['sozinho','date','galera'])}</div>
    <div class="f"><label for="fDesc">Descrição</label><textarea id="fDesc">${esc(d.descricao || d.obs)}</textarea></div>
    <div class="f"><label for="fLink">Link</label><input type="url" id="fLink" value="${esc(d.link || ((d.links || [])[0] || {}).url || '')}" placeholder="https://"></div>
    ${datalist()}</div>`;
}
function formRole(d){
  return `<div class="form">
    <div class="f"><label for="fTitulo">Nome</label><input type="text" id="fTitulo" value="${esc(d.titulo)}"></div>
    <div class="dois"><div class="f"><label for="fFormato">Formato</label><select id="fFormato">${Object.entries(FORMATO).map(([k, l]) => op(k, l, d.formato || 'lugar')).join('')}</select></div>
      <div class="f"><label for="fTipo">Tipo</label><select id="fTipo">${Object.entries(TIPOS).map(([k, l]) => op(k, l, d.tipo || 'cultura')).join('')}</select></div></div>
    <div class="f"><span class="lbl">Com quem</span>${chipsF('com', COM, d.com || ['galera'])}</div>
    <div class="f"><label for="fRegiao">Bairro ou cidade</label><input type="text" id="fRegiao" value="${esc(d.regiao)}" list="regioes" placeholder="Ex: Pampulha, Centro, Em casa"></div>
    <div class="dois"><div class="f"><label for="fGrana">Grana</label><select id="fGrana">${op('', 'Não sei', d.grana || '')}${Object.entries(GRANA).map(([k, l]) => op(k, l, d.grana)).join('')}</select></div>
      <div class="f"><label for="fDur">Duração</label><select id="fDur">${op('', 'Não sei', d.duracao || '')}${Object.entries(DUR).map(([k, l]) => op(k, l, d.duracao)).join('')}</select></div></div>
    <div class="f"><span class="lbl">Melhor horário</span>${chipsF('hor', HOR, d.horario || [])}</div>
    <div class="f"><label for="fChuva">Com chuva</label><select id="fChuva">${op('', 'Tanto faz', d.chuva === true ? 's' : d.chuva === false ? 'n' : '')}${op('s', 'Dá pra fazer com chuva', d.chuva === true ? 's' : '')}${op('n', 'Precisa de tempo bom', d.chuva === false ? 'n' : '')}</select></div>
    <div class="f"><label for="fDesc">Observações</label><textarea id="fDesc">${esc(d.obs || d.descricao)}</textarea></div>
    <div class="f"><label for="fLink">Link</label><input type="url" id="fLink" value="${esc(d.link || ((d.links || [])[0] || {}).url || '')}" placeholder="https://"></div>
    ${datalist()}</div>`;
}
const datalist = () => `<datalist id="regioes">${['Em casa', ...Object.keys(REG)].map(r => `<option value="${esc(r)}"></option>`).join('')}</datalist>`;
const lerChips = g => [...document.querySelectorAll(`[data-act="fchip"][data-g="${g}"]`)].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.v);
function lerForm(){
  const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const a = S.add;
  if (a.tipo === 'evento'){
    const g = v('fGratis');
    return {titulo: v('fTitulo'), dataInicio: v('fIni') || null, dataFim: v('fFim') || null, horario: v('fHora'), local: v('fLocal'), regiao: v('fRegiao'),
      gratis: g === 'sim' ? true : g === 'nao' ? false : null, preco: v('fPreco'), com: lerChips('com'), descricao: v('fDesc'), link: v('fLink')};
  }
  const ch = v('fChuva');
  const link = v('fLink');
  return {titulo: v('fTitulo'), formato: v('fFormato') || 'lugar', tipo: v('fTipo') || 'cultura', com: lerChips('com'), regiao: v('fRegiao'),
    grana: v('fGrana') || null, duracao: v('fDur') || null, horario: lerChips('hor'), chuva: ch === 's' ? true : ch === 'n' ? false : null,
    obs: v('fDesc'), links: link ? [{rotulo: 'Link', url: link}] : null};
}
async function salvarForm(){
  const a = S.add; const d = lerForm();
  const pubEl = document.getElementById('fPublico'); if (pubEl) d.publico = pubEl.checked;
  if (!d.titulo) return toast('Põe um nome.');
  if (d.link && !/^https:\/\//.test(d.link)) d.link = /^[\w.-]+\.[a-z]{2,}/i.test(d.link) ? 'https://' + d.link : '';
  if (d.links && d.links[0] && !/^https:\/\//.test(d.links[0].url)) d.links = /^[\w.-]+\.[a-z]{2,}/i.test(d.links[0].url) ? [{rotulo:'Link', url:'https://' + d.links[0].url}] : null;
  if (a.tipo === 'evento'){
    if (!d.dataInicio && !d.dataFim) return toast('Põe a data ou salva como rolê sem data.');
    if (d.dataFim && d.dataInicio && d.dataFim < d.dataInicio) return toast('A data final está antes da inicial.');
    if (!d.com.length) d.com = ['sozinho','date','galera'];
    if (a.editKind === 'evento'){ if (await patchEvento(a.editId, d)){ fecharSheet(); toast('Evento atualizado.'); } return; }
    const novo = Object.assign({}, d, {status:'interesse', origem: a.modo === 'print' ? 'print' : a.modo === 'texto' ? 'texto' : 'manual', criadoEm: new Date().toISOString(), tipo: a.dados.tipoEvento || 'outro'});
    Object.keys(novo).forEach(k => (novo[k] === null || novo[k] === '') && delete novo[k]);
    if (await novoEvento(novo)){ fecharSheet(); S.tab = 'agenda'; S.ag = 'eventos'; render(); toast('Evento salvo na Agenda.'); }
    return;
  }
  if (!d.com.length) d.com = ['galera'];
  if (a.editKind === 'role'){
    const r = roleById(a.editId); if (!r) return;
    const orig = r.links || [];
    if (orig.length && d.links && d.links[0] && orig[0] && d.links[0].url === orig[0].url) d.links = orig;
    if (await patchRole(r, d)){ fecharSheet(); toast('Rolê atualizado.'); }
    return;
  }
  const novo = Object.assign({}, d, {status:'quero', origem:'Adicionado no app'});
  Object.keys(novo).forEach(k => (novo[k] === null || novo[k] === '') && delete novo[k]);
  if (await novoRole(novo)){ fecharSheet(); toast('Rolê salvo.'); }
}
function promptExtrair(texto){
  const h = hojeISO(), d = fromISO(h);
  return 'Você organiza divulgações de eventos e rolês em Belo Horizonte (MG) para um app de rolês.\n' +
    'Hoje é ' + DOW_L[d.getDay()] + ', ' + h + '. Quando o ano não aparecer, use a próxima data futura.\n' +
    (texto ? 'Texto colado pelo usuário:\n"""\n' + texto.slice(0, 8000) + '\n"""\n' : 'Leia o print anexado (pode ser post de Instagram, TikTok, cartaz ou site).\n') +
    'Responda só com um objeto JSON neste formato:\n' +
    '{"tipo":"evento ou role","titulo":"","dataInicio":"AAAA-MM-DD ou null","dataFim":"AAAA-MM-DD ou null","horario":"","local":"","regiao":"","gratis":true/false/null,"preco":"","descricao":"","link":"","com":["sozinho","date","galera"],"tipoEvento":"","tipoRole":"","formato":"","grana":"","duracao":"","horarioRole":[],"chuva":true/false/null}\n' +
    'Regras:\n- "tipo" é "evento" quando tem data marcada e "role" quando é um lugar ou ideia sem data.\n' +
    '- "regiao" é o bairro de BH ou a cidade (ex: Pampulha, Centro, Savassi, Santa Tereza, Sabará).\n' +
    '- "com" diz com quem combina: sozinho, date (encontro a dois), galera. Pode ter mais de um.\n' +
    '- "tipoEvento" é uma de: ' + Object.keys(ETIPO).join(', ') + '.\n' +
    '- "tipoRole" é uma de: ' + Object.keys(TIPOS).join(', ') + '. "formato" é uma de: lugar, roteiro, casa, atividade.\n' +
    '- "grana": gratis, barato, medio ou caro. "duracao": curto (1 a 2h), medio (meio período) ou longo (dia todo).\n' +
    '- "horarioRole" usa: manha, tarde, por-do-sol, noite, madrugada. "chuva": true se é lugar fechado, false se precisa de tempo bom.\n' +
    '- "descricao": uma ou duas frases curtas em português, sem travessão.\n- Quando não souber um campo, use null ou "". Não invente.';
}
function normalizarIA(r){
  r = r && typeof r === 'object' ? r : {};
  const str = x => typeof x === 'string' ? x.trim().replace(/\s*[—–]\s*/g, ', ') : '';
  const lista = (x, ok) => Array.isArray(x) ? x.filter(v => ok.includes(v)) : [];
  const d = {titulo: str(r.titulo), dataInicio: okISO(r.dataInicio) ? r.dataInicio : null, dataFim: okISO(r.dataFim) ? r.dataFim : null,
    horario: str(r.horario), local: str(r.local), regiao: str(r.regiao), gratis: typeof r.gratis === 'boolean' ? r.gratis : null, preco: str(r.preco),
    descricao: str(r.descricao), obs: str(r.descricao), link: /^https?:\/\//.test(str(r.link)) ? str(r.link).replace(/^http:/, 'https:') : '',
    com: lista(r.com, Object.keys(COM)), tipoEvento: ETIPO[r.tipoEvento] ? r.tipoEvento : 'outro',
    tipo: TIPOS[r.tipoRole] ? r.tipoRole : 'cultura', formato: FORMATO[r.formato] ? r.formato : 'lugar',
    grana: GRANA[r.grana] ? r.grana : null, duracao: DUR[r.duracao] ? r.duracao : null, horario_r: lista(r.horarioRole, Object.keys(HOR)),
    chuva: typeof r.chuva === 'boolean' ? r.chuva : null};
  d._tipo = r.tipo === 'role' ? 'role' : (d.dataInicio || d.dataFim ? 'evento' : 'role');
  return d;
}
async function lerIA(){
  const a = S.add; if (!a || !S.sample) return;
  const ta = $('#addTexto'); if (ta) a.texto = ta.value;
  const texto = a.modo === 'texto' ? a.texto.trim() : '';
  if (a.modo === 'texto' && !texto){ a.erro = 'Cola um texto primeiro.'; return renderAdd(); }
  if (a.modo === 'print' && !a.blob){ a.erro = 'Escolhe um print primeiro.'; return renderAdd(); }
  a.carregando = true; a.erro = ''; renderAdd();
  try {
    const opts = {modelTier:'default'}; if (a.modo === 'print') opts.images = [a.blob];
    const res = await S.sample.json(promptExtrair(texto), opts);
    const d = normalizarIA(res);
    if (!d.titulo && !d.descricao) throw {code:'invalid_json'};
    a.tipo = d._tipo; a.dados = Object.assign({}, d, {horario: d._tipo === 'role' ? d.horario_r : d.horario}); a.etapa = 'form';
  } catch (e){ a.erro = msgIA(e); }
  a.carregando = false;
  if (!S.sample || (a.modo === 'print' && !S.sampleImg)){ a.modo = S.sample ? 'texto' : 'mao'; if (!S.sample) a.etapa = 'form'; }
  renderAdd();
}
function abrirEditar(kind, id){
  const x = kind === 'role' ? roleById(id) : evById(id); if (!x) return;
  abrirAdd({modo:'mao', etapa:'form', tipo:kind, dados: JSON.parse(JSON.stringify(x)), editKind:kind, editId:id});
}

// ---------------------------------------------------------------- toast
function toast(msg, acao){
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${acao ? `<button class="btn btn-s" id="toastBtn">${esc(acao.rotulo)}</button>` : ''}`;
  t.classList.add('on');
  if (acao) $('#toastBtn').onclick = () => { t.classList.remove('on'); acao.fn(); };
  clearTimeout(toast.tm); toast.tm = setTimeout(() => t.classList.remove('on'), acao ? 6500 : 2800);
}

// ---------------------------------------------------------------- eventos de interface
document.addEventListener('click', async ev => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, id = el.dataset.id, kind = el.dataset.kind;
  switch (act){
    case 'tab': S.tab = el.dataset.tab; salvarLS('tab', S.tab); fecharSheet(); render(); window.scrollTo(0, 0); break;
    case 'ir': S.tab = el.dataset.tab; if (el.dataset.ag){ S.ag = el.dataset.ag; salvarLS('ag', S.ag); } if (el.dataset.ef) S.ef = el.dataset.ef; salvarLS('tab', S.tab); fecharSheet(); render(); window.scrollTo(0, 0); break;
    case 'b': S.bora[el.dataset.k] = el.dataset.v; salvarLS('bora', S.bora); S.sorteado = null; S.roteiros = null; S.roteiroMsg = ''; S.verTodos = false; render(); break;
    case 'bt': S.bora[el.dataset.k] = !S.bora[el.dataset.k]; salvarLS('bora', S.bora); S.sorteado = null; S.roteiros = null; S.roteiroMsg = ''; S.verTodos = false; render(); break;
    case 'sortear': sortear(); break;
    case 'ver-todos': S.verTodos = true; render(); break;
    case 'roteiro-ia': montarRoteiro(); break;
    case 'salvar-roteiro': {
      const r = Array.isArray(S.roteiros) && S.roteiros[+el.dataset.i]; if (!r) break;
      const refs = (r.paradas || []).map(p => roleById(p.id) || evById(p.id)).filter(Boolean);
      const nid = await novoRole({titulo: r.titulo, formato:'roteiro', tipo:'exploracao', com:[S.bora.com], regiao: (refs[0] && refs[0].regiao) || '',
        grana: S.bora.grana === 'gratis' ? 'gratis' : S.bora.grana === 'pouca' ? 'barato' : 'medio', duracao: S.bora.tempo,
        paradas: (r.paradas || []).map(p => ({quando: String(p.quando || ''), oque: String(p.oque || '')})), obs: [r.resumo, r.custo ? 'Custo: ' + r.custo : '', r.dica ? 'Dica: ' + r.dica : ''].filter(Boolean).join(' '),
        status:'quero', origem:'Montado com IA'});
      if (nid) toast('Roteiro salvo nos Rolês.');
      break;
    }
    case 'abrir': abrir(kind, id); break;
    case 'fechar': fecharSheet(); break;
    case 'marcar': abrirMarcar(kind, id); break;
    case 'salvar-marcar': salvarMarcar(); break;
    case 'naorolou': {
      if (kind === 'role'){ const r = roleById(id); if (r && await patchRole(r, {status:'quero', data:null, dataFim:null})){ fecharSheet(); toast('Saiu da fila.', {rotulo:'Desfazer', fn: () => patchRole(r, {status:'fila', data:r.data, dataFim:r.dataFim || null})}); } }
      else { const e = evById(id); if (e && await patchEvento(id, {status:'interesse', dataVou:null})) toast('Saiu da fila.'); }
      break;
    }
    case 'fui': abrirFui(kind, id); break;
    case 'fui-prestou': S.sheet.prestou = el.dataset.v === 'sim'; el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === el))); break;
    case 'fui-nota': { const n = +el.dataset.v; S.sheet.nota = n; el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v <= n))); break; }
    case 'salvar-fui': salvarFui(); break;
    case 'riscar': { const r = roleById(id); if (r && await patchRole(r, {status:'riscado'})){ toast('Riscado.', {rotulo:'Desfazer', fn: () => patchRole(r, {status: r.status || 'quero'})}); } break; }
    case 'restaurar': { const r = roleById(id); if (r) await patchRole(r, {status:'quero', motivo:null}); break; }
    case 'editar': abrirEditar(kind, id); break;
    case 'longo': {
      const r = roleById(id); if (!r) break;
      const patch = r.longoPrazo ? {longoPrazo: false} : {longoPrazo: true, status: r.status === 'fila' ? 'quero' : r.status, data: null, dataFim: null};
      if (await patchRole(r, patch)) toast(r.longoPrazo ? 'Saiu do longo prazo.' : 'Guardado no longo prazo. Ele não entra no sorteio.');
      break;
    }
    case 'check-limpar': { const r = roleById(id); if (r) await patchRole(r, {check:null}); break; }
    case 'ev-status': {
      const e = evById(id); if (!e) break;
      const v = el.dataset.v;
      if (v === 'vou' && e.status !== 'vou' && !ehPontual(e)){ abrirMarcar('evento', id); break; }
      const patch = {status: e.status === v ? 'visto' : v};
      if (v !== 'vou') patch.dataVou = null;
      if (await patchEvento(id, patch)){
        if (patch.status === 'vou') toast('Na fila pra ' + fmtCurta(okISO(e.dataInicio) && e.dataInicio >= hojeISO() ? e.dataInicio : hojeISO()) + '. Dá pra mudar o dia na Fila.');
        if (patch.status === 'ignorado'){ fecharSheet(); toast('Escondido.', {rotulo:'Desfazer', fn: () => patchEvento(id, {status: e.status})}); }
      }
      break;
    }
    case 'ag': S.ag = el.dataset.v; salvarLS('ag', S.ag); render(); break;
    case 'ef': S.ef = el.dataset.v; render(); break;
    case 'rf-tipo': S.rf.tipo = el.dataset.v; render(); break;
    case 'olhei': {
      const o = lerLS('olhados') || {}; o[id] = new Date().toISOString(); salvarLS('olhados', o);
      if (S.fontes[id]) S.fontes[id].olhadoEm = o[id]; toast('Anotado.'); render();
      break;
    }
    case 'login-google': {
      const {error} = await sb.auth.signInWithOAuth({provider: 'google', options: {redirectTo: location.origin + location.pathname}});
      if (error){ S.login = {erro: 'Não deu pra abrir o login do Google. Tenta de novo.'}; render(); }
      break;
    }
    case 'login-email': {
      const email = ($('#loginEmail') || {}).value ? $('#loginEmail').value.trim() : '';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ S.login = {email, erro: 'Confere o e-mail.'}; render(); break; }
      el.disabled = true;
      const {error} = await sb.auth.signInWithOtp({email, options: {emailRedirectTo: location.origin + location.pathname}});
      S.login = error ? {email, erro: 'Não deu pra mandar o link. Espera um minuto e tenta de novo.'} : {email, etapa: 'codigo'};
      render(); break;
    }
    case 'login-codigo': {
      const token = ($('#loginCodigo') || {}).value ? $('#loginCodigo').value.trim() : '';
      if (!token){ S.login.erro = 'Digita o código.'; render(); break; }
      const {error} = await sb.auth.verifyOtp({email: S.login.email, token, type: 'email'});
      if (error){ S.login.erro = 'Código errado ou vencido.'; render(); }
      break;
    }
    case 'login-voltar': S.login = {}; render(); break;
    case 'sair': await sb.auth.signOut(); break;
    case 'aprovar': moderar(el.dataset.tb, id, 'aprovado'); break;
    case 'recusar': moderar(el.dataset.tb, id, 'recusado'); break;
    case 'add': abrirAdd(); break;
    case 'add-modo': { const a = S.add; const ta = $('#addTexto'); if (ta) a.texto = ta.value; a.modo = el.dataset.v; a.etapa = a.modo === 'mao' ? 'form' : 'entrada'; a.erro = ''; renderAdd(); break; }
    case 'add-ler': lerIA(); break;
    case 'add-tipo': { const a = S.add; a.dados = Object.assign({}, a.dados, lerForm()); if (Array.isArray(a.dados.horario) && el.dataset.v === 'evento') a.dados.horario = ''; if (typeof a.dados.horario === 'string' && el.dataset.v === 'role') a.dados.horario = a.dados.horario_r || []; a.tipo = el.dataset.v; renderAdd(); break; }
    case 'add-salvar': salvarForm(); break;
    case 'fchip': el.setAttribute('aria-pressed', String(el.getAttribute('aria-pressed') !== 'true')); break;
    case 'nota-editar': S.sheet.editar = true; S.sheet.vivo = false; renderSheetNota(id); break;
    case 'nota-cancelar': S.sheet.editar = false; S.sheet.vivo = true; renderSheetNota(id); break;
    case 'nota-salvar': {
      const txt = $('#notaTxt') ? $('#notaTxt').value : null; if (txt == null || !S.db) break;
      const {error} = await sb.from('notas').update({texto: txt}).eq('id', id);
      if (error){ falha(error); break; }
      S.notas[id].texto = txt; S.sheet.editar = false; S.sheet.vivo = true; toast('Nota salva.'); renderSheetNota(id);
      break;
    }
  }
});
function renderSheetNota(id){ const b = $('#sheetBody'); b.innerHTML = sheetNota(id); }
document.addEventListener('change', async ev => {
  const el = ev.target;
  if (el.matches('input[data-ck]')){ const r = roleById(el.dataset.ck); if (r) await patchRole(r, {check: {[el.dataset.k]: el.checked}}); return; }
  if (el.matches('select[data-rf]')){ S.rf[el.dataset.rf] = el.value; render(); return; }
  if (el.id === 'addFoto' && S.add){
    const f = el.files && el.files[0]; if (!f) return;
    if (S.add.previewUrl){ try { URL.revokeObjectURL(S.add.previewUrl); } catch (e) {} }
    S.add.blob = f; S.add.previewUrl = URL.createObjectURL(f); S.add.erro = ''; renderAdd();
  }
});
document.addEventListener('input', ev => {
  if (ev.target.id === 'q'){ S.rf.q = ev.target.value; const l = $('#rolesLista'); if (l) l.innerHTML = listaRoles(); }
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && S.sheet) fecharSheet(); });

iniciar();

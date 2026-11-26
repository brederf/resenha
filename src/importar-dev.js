// Importa os dados do app antigo usando o login de admin, direto do navegador.
// Só existe no modo de desenvolvimento (npm run dev). Uso: no console, `await __importar()`.
const okData = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;

export async function importar(sb){
  const {data: {user}} = await sb.auth.getUser();
  if (!user) throw new Error('Entre no app antes de importar.');
  const {data: perfil} = await sb.from('perfis').select('admin').eq('id', user.id).single();
  if (!perfil || !perfil.admin) throw new Error('Essa conta não é admin.');
  const eu = user.id;
  const t = await fetch('/dados/app-atual/_tudo.json').then(r => r.json());
  const PESSOAL = new RegExp(t.pessoal, 'i');
  const log = [];
  async function upsert(tabela, linhas, conflito){
    for (let i = 0; i < linhas.length; i += 200){
      const {error} = await sb.from(tabela).upsert(linhas.slice(i, i + 200), {onConflict: conflito});
      if (error) throw new Error(tabela + ': ' + error.message);
    }
    log.push(tabela + ': ' + linhas.length);
  }
  const ehPub = r => r.formato === 'lugar' && r.status !== 'riscado';
  const roles = t.roles.map(r => ({
    slug: r.slug, titulo: r.titulo, formato: r.formato || 'lugar', tipo: r.tipo || 'cultura', com: r.com || [],
    regiao: r.regiao || null, grana: r.grana || null, horario: r.horario || [], duracao: r.duracao || null,
    chuva: typeof r.chuva === 'boolean' ? r.chuva : null, dias: r.dias || null,
    descricao: ehPub(r) ? (r.obs && !PESSOAL.test(r.obs) ? r.obs : null) : (r.obs || null),
    paradas: r.paradas || null, checklist: r.checklist || null, links: r.links || null, mapa: r.mapa || null,
    aviso: r.aviso || null, destaque: !!r.destaque, publico: ehPub(r), moderacao: 'aprovado', criado_por: eu,
  }));
  await upsert('roles', roles, 'slug');
  const {data: rolesDb} = await sb.from('roles').select('id, slug').limit(5000);
  const roleId = Object.fromEntries(rolesDb.map(r => [r.slug, r.id]));

  const eventos = t.eventos.map(e => ({
    slug: e.slug, titulo: e.titulo, data_inicio: okData(e.dataInicio), data_fim: okData(e.dataFim), horario: e.horario || null,
    local: e.local || null, regiao: e.regiao || null, gratis: typeof e.gratis === 'boolean' ? e.gratis : null, preco: e.preco || null,
    descricao: e.descricao && !PESSOAL.test(e.descricao) ? e.descricao : null, link: e.link || null, fonte: e.fonte || null,
    com: e.com || [], tipo: e.tipo || 'outro', destaque: !!e.destaque, role_id: e.roleId ? roleId[e.roleId] || null : null,
    origem: e.origem || 'busca', publico: true, moderacao: 'aprovado', criado_por: eu, criado_em: e.criadoEm || new Date().toISOString(),
  }));
  await upsert('eventos', eventos, 'slug');
  const {data: evDb} = await sb.from('eventos').select('id, slug').limit(5000);
  const evId = Object.fromEntries(evDb.map(e => [e.slug, e.id]));

  const lista = [];
  for (const r of t.roles){
    const nota = [ehPub(r) && r.obs ? r.obs : null, r.ideia].filter(Boolean).join(' ') || null;
    lista.push({usuario: eu, ref_tipo: 'role', ref_id: roleId[r.slug], status: r.status || 'quero', longo_prazo: !!r.longoPrazo,
      data: okData(r.data), data_fim: okData(r.dataFim), nota, motivo: r.motivo || null, checklist_feito: r.check || null});
  }
  for (const e of t.eventos){
    if ((e.status && e.status !== 'novo') || e.ideia){
      lista.push({usuario: eu, ref_tipo: 'evento', ref_id: evId[e.slug], status: e.status && e.status !== 'novo' ? e.status : 'visto',
        longo_prazo: false, data: okData(e.dataVou), data_fim: null, nota: e.ideia || null, motivo: null, checklist_feito: null});
    }
  }
  await upsert('minha_lista', lista.filter(x => x.ref_id), 'usuario,ref_tipo,ref_id');

  await upsert('notas', Object.entries(t.notas).map(([slug, n]) => ({usuario: eu, slug, titulo: n.titulo, texto: n.texto || '', ordem: n.ordem || 0})), 'usuario,slug');
  await upsert('fontes', Object.entries(t.fontes).map(([id, f]) => ({id, nome: f.nome, url: f.url || null, tipo: f.tipo,
    descricao: f.desc || null, freq: f.freq || null, automatica: !!f.auto, conferir: !!f.conferir, ordem: f.ordem || 0})), 'id');
  const st = t.status || {};
  await upsert('radar_status', [{id: 1, ultima_busca: st.ultimaBusca || null, origem: st.origem || null, novos: st.novos ?? null, resumo: st.resumo || null}], 'id');
  log.push('públicos: ' + roles.filter(r => r.publico).length + ', privados: ' + roles.filter(r => !r.publico).length);
  return log.join(' | ');
}

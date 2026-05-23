const NEON_URL = 'postgresql://neondb_owner:npg_t2LcrZEXCmx8@ep-fancy-dream-actr329k-pooler.sa-east-1.aws.neon.tech/BD%2FFUTURECAST?sslmode=require&channel_binding=require';
let _sql = null;

async function sql(query, params = []) {
  if (!_sql) {
    const { neon } = await import('https://esm.sh/@neondatabase/serverless@0.10.4');
    _sql = neon(NEON_URL);
  }
  return _sql(query, params);
}

function lerLocal(c) { try { return JSON.parse(localStorage.getItem(c)) || {}; } catch { return {}; } }
function salvarLocal(c, d) { localStorage.setItem(c, JSON.stringify(d)); }
function usuario() { return lerLocal('futurecast_usuario'); }

function inicializarHamburger() {
  const btn = document.getElementById('hamburger');
  const links = document.getElementById('nav-links');
  if (!btn || !links) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const aberto = links.classList.toggle('aberto');
    btn.classList.toggle('ativo', aberto);
  });
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !links.contains(e.target)) {
      links.classList.remove('aberto');
      btn.classList.remove('ativo');
    }
  });
}

function inicializarSaudacao() {
  const u = usuario();
  if (!u?.nome) return;
  const esquerda = document.querySelector('.nav-esquerda');
  if (!esquerda || esquerda.querySelector('.nav-saudacao')) return;
  const s = document.createElement('span');
  s.className = 'nav-saudacao';
  s.textContent = 'Olá, ' + u.nome + ' 👋';
  esquerda.appendChild(s);
  const btnPost = document.getElementById('btn-novo-post');
  if (btnPost) btnPost.classList.add('visivel');
}

const _cache = {};
async function garantirPost(titulo) {
  if (_cache[titulo]) return _cache[titulo];
  try {
    let r = await sql('SELECT id FROM post WHERE titulo = $1 LIMIT 1', [titulo]);
    if (r.length) { _cache[titulo] = r[0].id; return r[0].id; }
    r = await sql(`INSERT INTO post (titulo, imagem_url, publicado_em) VALUES ($1, 'placeholder.jpg', NOW()) ON CONFLICT DO NOTHING RETURNING id`, [titulo]);
    if (r.length) { _cache[titulo] = r[0].id; return r[0].id; }
    r = await sql('SELECT id FROM post WHERE titulo = $1 LIMIT 1', [titulo]);
    _cache[titulo] = r[0]?.id || null;
    return _cache[titulo];
  } catch (e) { return null; }
}

function pegarWrapper(card) {
  if (card.parentElement?.classList.contains('card-wrapper')) return card.parentElement;
  const w = document.createElement('div');
  w.className = 'card-wrapper';
  card.parentNode.insertBefore(w, card);
  w.appendChild(card);
  return w;
}

function pegarSpanAcao(card, texto) {
  return [...card.querySelectorAll('.footer span')].find(s => s.textContent.trim() === texto);
}

function pegarLinkAcao(card, texto) {
  const porSpan = pegarSpanAcao(card, texto);
  if (porSpan) return porSpan;
  return [...card.querySelectorAll('.footer span a')].find(a => a.textContent.trim() === texto)?.parentElement || null;
}

async function inicializarCurtida(card, postId, titulo) {
  const span = pegarLinkAcao(card, 'Curtir');
  if (!span) return;

  const u = usuario();
  const curtidas = lerLocal('futurecast_curtidas');
  let estado = curtidas[titulo] || { id: null, ativa: false };
  const contadores = lerLocal('futurecast_curtidas_count');
  let total = contadores[titulo] || 0;

  if (u?.email && estado.id) {
    try {
      const r = await sql('SELECT curtida_ativa FROM curtida WHERE id = $1', [estado.id]);
      if (r.length) { estado.ativa = r[0].curtida_ativa; curtidas[titulo] = estado; salvarLocal('futurecast_curtidas', curtidas); }
    } catch {}
  }

  const btn = document.createElement('button');
  btn.className = 'btn-curtir';

  function render() { btn.textContent = (estado.ativa ? '❤️' : '🤍') + (total > 0 ? ' ' + total : ''); }

  btn.addEventListener('click', async () => {
    if (!u?.email) { alert('Faça login para curtir.'); return; }
    const pE = { ...estado }, pT = total;
    estado.ativa = !estado.ativa;
    total = Math.max(0, total + (estado.ativa ? 1 : -1));
    render();
    btn.style.transform = 'scale(1.35)';
    setTimeout(() => { btn.style.transform = ''; }, 180);
    try {
      if (!estado.id) {
        const r = await sql(`INSERT INTO curtida (usuario_id, curtida_ativa, curtido_em) VALUES ((SELECT id FROM usuario WHERE email = $1), $2, NOW()) RETURNING id`, [u.email, estado.ativa]);
        estado.id = r[0]?.id || null;
      } else {
        await sql('UPDATE curtida SET curtida_ativa = $1 WHERE id = $2', [estado.ativa, estado.id]);
      }
      const c = lerLocal('futurecast_curtidas'); c[titulo] = estado; salvarLocal('futurecast_curtidas', c);
      const ct = lerLocal('futurecast_curtidas_count'); ct[titulo] = total; salvarLocal('futurecast_curtidas_count', ct);
    } catch { estado = pE; total = pT; render(); }
  });

  render();
  span.innerHTML = '';
  span.appendChild(btn);
}

async function inicializarComentarios(wrapper, card, postId, titulo) {
  const span = pegarLinkAcao(card, 'Comentar');
  if (!span) return;

  const u = usuario();
  let lista = [];

  if (postId) {
    try {
      lista = await sql(`SELECT u.nome AS autor, c.conteudo, c.feito_em FROM comentario c JOIN usuario u ON u.id = c.usuario_id WHERE c.post_id = $1 ORDER BY c.feito_em ASC`, [postId]);
    } catch { lista = lerLocal('futurecast_comentarios')[titulo] || []; }
  } else {
    lista = lerLocal('futurecast_comentarios')[titulo] || [];
  }

  const btn = document.createElement('button');
  btn.className = 'btn-comentar';
  function atualizarBtn() { btn.textContent = 'Comentar' + (lista.length ? ' (' + lista.length + ')' : ''); }

  const secao = document.createElement('div');
  secao.hidden = true;
  secao.className = 'secao-comentarios';

  const divLista = document.createElement('div');
  divLista.className = 'lista-comentarios';

  function renderLista() {
    divLista.innerHTML = '';
    if (!lista.length) {
      divLista.innerHTML = '<p class="sem-comentarios">Nenhum comentário ainda. Seja o primeiro!</p>';
      return;
    }
    lista.forEach(c => {
      const item = document.createElement('div');
      item.className = 'item-comentario';
      const ts = c.feito_em ? new Date(c.feito_em).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';
      item.innerHTML = '<strong class="autor-comentario">' + (c.autor || 'Anônimo') + '</strong>' +
        '<span class="texto-comentario">' + c.conteudo + '</span>' +
        (ts ? '<small class="data-comentario">' + ts + '</small>' : '');
      divLista.appendChild(item);
    });
    divLista.scrollTop = divLista.scrollHeight;
  }

  const formDiv = document.createElement('div');
  formDiv.className = 'form-comentario';
  const input = document.createElement('input');
  input.type = 'text'; input.placeholder = 'Escreva um comentário…'; input.maxLength = 280; input.className = 'input-comentario';
  const btnEnviar = document.createElement('button');
  btnEnviar.textContent = 'Enviar'; btnEnviar.className = 'btn-enviar-comentario';
  formDiv.append(input, btnEnviar);
  secao.append(divLista, formDiv);
  wrapper.appendChild(secao);

  async function enviar() {
    const texto = input.value.trim();
    if (!texto) { input.classList.add('erro'); setTimeout(() => input.classList.remove('erro'), 800); return; }
    if (!u?.email) { alert('Faça login para comentar.'); return; }
    lista.push({ autor: u.nome || 'Anônimo', conteudo: texto, feito_em: new Date().toISOString() });
    input.value = '';
    renderLista(); atualizarBtn();
    if (postId) {
      try { await sql(`INSERT INTO comentario (usuario_id, post_id, conteudo, feito_em) VALUES ((SELECT id FROM usuario WHERE email = $1), $2, $3, NOW())`, [u.email, postId, texto]); }
      catch { const l = lerLocal('futurecast_comentarios'); l[titulo] = lista; salvarLocal('futurecast_comentarios', l); }
    } else {
      const l = lerLocal('futurecast_comentarios'); l[titulo] = lista; salvarLocal('futurecast_comentarios', l);
    }
  }

  btnEnviar.addEventListener('click', enviar);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') enviar(); });
  btn.addEventListener('click', () => { secao.hidden = !secao.hidden; if (!secao.hidden) { renderLista(); input.focus(); } });

  renderLista(); atualizarBtn();
  span.innerHTML = '';
  span.appendChild(btn);
}

async function inicializarCompartilhamento(card, postId, titulo) {
  const span = pegarLinkAcao(card, 'Compartilhar');
  if (!span) return;

  const u = usuario();
  let total = 0;
  if (postId) {
    try { const r = await sql('SELECT COUNT(*)::int AS count FROM compartilhar WHERE post_id = $1', [postId]); total = r[0]?.count || 0; }
    catch { total = lerLocal('futurecast_compartilhamentos')[titulo] || 0; }
  } else { total = lerLocal('futurecast_compartilhamentos')[titulo] || 0; }

  const btn = document.createElement('button');
  btn.className = 'btn-compartilhar';
  function atualizarBtn() { btn.textContent = 'Compartilhar' + (total > 0 ? ' (' + total + ')' : ''); }

  btn.addEventListener('click', async () => {
    total++;
    atualizarBtn();
    const l = lerLocal('futurecast_compartilhamentos'); l[titulo] = total; salvarLocal('futurecast_compartilhamentos', l);
    if (postId) {
      try { await sql(`INSERT INTO compartilhar (usuario_id, post_id, compartilhado_em) VALUES ((SELECT id FROM usuario WHERE email = $1), $2, NOW())`, [u?.email || null, postId]); } catch {}
    }
    if (navigator.share) { try { await navigator.share({ title: titulo, url: window.location.href }); } catch {} }
    else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        const tip = document.createElement('span');
        tip.textContent = ' Copiado!'; tip.style.cssText = 'font-size:.75rem;color:#4a9e6b';
        btn.after(tip); setTimeout(() => tip.remove(), 2000);
      } catch {}
    }
  });

  atualizarBtn();
  span.innerHTML = '';
  span.appendChild(btn);
}

async function inicializarCard(card, postId, titulo) {
  if (!titulo) titulo = card.querySelector('.titulo')?.textContent?.trim() || '';
  if (!titulo) return;
  const wrapper = pegarWrapper(card);
  const id = postId || await garantirPost(titulo);
  await Promise.all([
    inicializarCurtida(card, id, titulo),
    inicializarComentarios(wrapper, card, id, titulo),
    inicializarCompartilhamento(card, id, titulo),
  ]);
}

window.inicializarCard = inicializarCard;

async function inicializar() {
  inicializarHamburger();
  inicializarSaudacao();
  const cards = [...document.querySelectorAll('.card')];
  if (cards.length) await Promise.all(cards.map(c => inicializarCard(c, null, null)));
  document.dispatchEvent(new CustomEvent('interacoes-prontas'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}

async function sql(query, params = []) {
  if (!_sql) {
    const { neon } = await import('https://esm.sh/@neondatabase/serverless@0.10.4');
    _sql = neon(NEON_URL);
  }
  return _sql(query, params);
}

function lerLocal(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } }
function usuario() { return lerLocal('futurecast_usuario'); }
function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function categoriaAtual() {
  const feed = document.querySelector('.feed');
  return feed ? (feed.dataset.categoria || '0') : '0';
}

function criarCard(post) {
  const card = document.createElement('article');
  card.className = 'card';
  const temImg = post.imagem_url && post.imagem_url !== 'placeholder.jpg';
  const u = usuario();
  const fotoUrl = post.autor_foto || u?.foto_url || null;
  const avatarInner = fotoUrl
    ? '<img src="' + esc(fotoUrl) + '" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
    : '';
  card.innerHTML =
    '<div class="header"><div class="avatar">' + avatarInner + '</div><div class="pessoa">' + esc(post.autor || 'Usuário') + '</div></div>' +
    (temImg ? '<div class="imagem"><img src="' + esc(post.imagem_url) + '" alt="' + esc(post.titulo) + '"></div>' : '') +
    '<div class="conteudo"><h3 class="titulo">' + esc(post.titulo) + '</h3>' +
    (post.descricao ? '<p class="descricao">' + esc(post.descricao) + '</p>' : '') + '</div>' +
    '<div class="footer"><span>Curtir</span><span>Comentar</span><span>Compartilhar</span></div>';
  return card;
}

function novoWrapper(card) {
  const w = document.createElement('div');
  w.className = 'card-wrapper';
  w.appendChild(card);
  return w;
}

async function carregarPosts() {
  const feed = document.querySelector('.feed');
  if (!feed) return;
  const cat = categoriaAtual();
  try {
    const query = cat === '0'
      ? 'SELECT p.id, p.titulo, p.descricao, p.imagem_url, u.nome AS autor, u.foto_url AS autor_foto FROM post p LEFT JOIN usuario u ON u.id = p.autor_id WHERE p.autor_id IS NOT NULL ORDER BY p.publicado_em DESC LIMIT 20'
      : 'SELECT p.id, p.titulo, p.descricao, p.imagem_url, u.nome AS autor, u.foto_url AS autor_foto FROM post p LEFT JOIN usuario u ON u.id = p.autor_id WHERE p.autor_id IS NOT NULL AND p.categoria_id = $1 ORDER BY p.publicado_em DESC LIMIT 20';
    const params = cat === '0' ? [] : [parseInt(cat)];
    const posts = await sql(query, params);
    for (const post of posts) {
      const card = criarCard(post);
      feed.insertBefore(novoWrapper(card), feed.firstChild);
      if (window.inicializarCard) await window.inicializarCard(card, post.id, post.titulo);
    }
  } catch (e) { console.warn('carregarPosts:', e.message); }
}

let aberto = false;

function abrirModal() {
  if (aberto) return;
  document.getElementById('modal-post')?.classList.add('ativo');
  setTimeout(() => document.getElementById('input-titulo-post')?.focus(), 80);
  aberto = true;
}

function fecharModal() {
  document.getElementById('modal-post')?.classList.remove('ativo');
  ['input-titulo-post','input-descricao-post','input-imagem-post'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.style.borderColor = ''; }
  });
  const prev = document.getElementById('preview-imagem');
  if (prev) { prev.style.display = 'none'; prev.src = ''; }
  const btnPub = document.getElementById('btn-publicar-post');
  if (btnPub) { btnPub.textContent = 'Publicar'; btnPub.disabled = false; }
  aberto = false;
}

async function publicar() {
  const u = usuario();
  if (!u?.email) { alert('Faça login para publicar.'); return; }

  const elTitulo  = document.getElementById('input-titulo-post');
  const elDesc    = document.getElementById('input-descricao-post');
  const elImg     = document.getElementById('input-imagem-post');
  const elBtn     = document.getElementById('btn-publicar-post');

  const titulo    = elTitulo?.value.trim() || '';
  const descricao = elDesc?.value.trim() || '';
  const imagemUrl = elImg?.value.trim() || '';

  if (!titulo) {
    if (elTitulo) { elTitulo.style.borderColor = '#e55'; elTitulo.focus(); }
    setTimeout(() => { if (elTitulo) elTitulo.style.borderColor = ''; }, 1000);
    return;
  }

  if (elBtn) { elBtn.textContent = 'Publicando…'; elBtn.disabled = true; }

  const cat = categoriaAtual();
  const catId = cat !== '0' ? parseInt(cat) : null;

  let postId = null;
  try {
    const r = await sql(
      'INSERT INTO post (autor_id, categoria_id, titulo, descricao, imagem_url, publicado_em) VALUES ((SELECT id FROM usuario WHERE email = $1), $2, $3, $4, $5, NOW()) RETURNING id',
      [u.email, catId, titulo, descricao || null, imagemUrl || 'placeholder.jpg']
    );
    postId = r[0]?.id || null;
  } catch (err) { console.warn('publicar erro:', err.message); }

  fecharModal();

  const feed = document.querySelector('.feed');
  if (feed) {
    const card = criarCard({ titulo, descricao, imagem_url: imagemUrl || null, autor: u.nome || 'Você' });
    const wrapper = novoWrapper(card);
    wrapper.style.animation = 'aparecer-card .4s ease';
    feed.insertBefore(wrapper, feed.firstChild);
    if (window.inicializarCard) await window.inicializarCard(card, postId, titulo);
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function configurarModal() {
  const modal  = document.getElementById('modal-post');
  if (!modal) return;

  document.getElementById('btn-novo-post')?.addEventListener('click', abrirModal);
  document.getElementById('btn-fechar-modal')?.addEventListener('click', fecharModal);
  document.getElementById('btn-publicar-post')?.addEventListener('click', publicar);

  modal.addEventListener('click', (e) => { if (e.target === modal) fecharModal(); });

  document.addEventListener('keydown', (e) => {
    if (!aberto) return;
    if (e.key === 'Escape') fecharModal();
  });

  const inpImg = document.getElementById('input-imagem-post');
  const prev   = document.getElementById('preview-imagem');
  inpImg?.addEventListener('input', () => {
    const url = inpImg.value.trim();
    if (prev) {
      prev.style.display = url ? 'block' : 'none';
      if (url) { prev.src = url; prev.onerror = () => { prev.style.display = 'none'; }; }
    }
  });
}

function inicializar() {
  const u = usuario();
  if (u?.nome) {
    const btn = document.getElementById('btn-novo-post');
    if (btn) btn.classList.add('visivel');
  }
  configurarModal();
  if (window.inicializarCard) {
    carregarPosts();
  } else {
    document.addEventListener('interacoes-prontas', () => carregarPosts(), { once: true });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}
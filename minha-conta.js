let _sqlConta = null;
async function sqlConta(query, params = []) {
  if (!_sqlConta) {
    const { neon } = await import('https://esm.sh/@neondatabase/serverless@0.10.4');
    _sqlConta = neon('postgresql://neondb_owner:npg_t2LcrZEXCmx8@ep-fancy-dream-actr329k-pooler.sa-east-1.aws.neon.tech/BD%2FFUTURECAST?sslmode=require&channel_binding=require');
  }
  return _sqlConta(query, params);
}

function lerLocal(c) { try { return JSON.parse(localStorage.getItem(c)) || {}; } catch { return {}; } }
function salvarLocal(c, d) { localStorage.setItem(c, JSON.stringify(d)); }
function usuario() { return lerLocal('futurecast_usuario'); }

function mostrarFeedback(msg, tipo) {
  const el = document.getElementById('msg-feedback');
  if (!el) return;
  el.textContent = msg;
  el.className = 'msg-feedback ' + tipo;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function previewFoto(url) {
  const img = document.getElementById('preview-foto');
  if (!img) return;
  if (url) {
    img.src = url;
    img.style.display = 'block';
    img.onerror = () => { img.style.display = 'none'; };
  } else {
    img.style.display = 'none';
  }
}

async function carregarDados() {
  const u = usuario();
  if (!u?.email) { window.location.href = 'index.html'; return; }

  document.getElementById('campo-nome').value           = u.nome  || '';
  document.getElementById('campo-email').value          = u.email || '';
  document.getElementById('nome-exibicao').textContent  = u.nome  || '—';
  document.getElementById('email-exibicao').textContent = u.email || '—';

  try {
    const r = await sqlConta('SELECT nome, telefone, foto_url FROM usuario WHERE email = $1', [u.email]);
    if (r.length) {
      const d = r[0];
      if (d.nome)     { document.getElementById('campo-nome').value = d.nome; document.getElementById('nome-exibicao').textContent = d.nome; }
      if (d.telefone) document.getElementById('campo-telefone').value = String(d.telefone);
      if (d.foto_url) { document.getElementById('campo-foto').value = d.foto_url; previewFoto(d.foto_url); }
    }
  } catch (err) { console.warn('minha-conta carregarDados:', err.message); }
}

async function salvarConta(e) {
  e.preventDefault();
  const novaSenha  = document.getElementById('campo-nova-senha').value;
  const confirmar  = document.getElementById('campo-confirmar-senha').value;
  if (novaSenha && novaSenha !== confirmar) { mostrarFeedback('As senhas não coincidem.', 'erro'); return; }

  const u       = usuario();
  const nome    = document.getElementById('campo-nome').value.trim();
  const telRaw  = document.getElementById('campo-telefone').value.replace(/\D/g, '');
  const fotoUrl = document.getElementById('campo-foto').value.trim() || null;
  const btn     = document.getElementById('btn-salvar');

  if (!nome) { mostrarFeedback('O nome não pode estar vazio.', 'erro'); return; }

  btn.disabled = true;
  btn.textContent = 'Salvando…';

  try {
    await sqlConta(
      'UPDATE usuario SET nome = $1, telefone = $2, foto_url = $3 WHERE email = $4',
      [nome, telRaw ? parseInt(telRaw, 10) : null, fotoUrl, u.email]
    );
    salvarLocal('futurecast_usuario', { ...u, nome, foto_url: fotoUrl || u.foto_url || null });
    document.getElementById('nome-exibicao').textContent = nome;
    document.getElementById('campo-nova-senha').value      = '';
    document.getElementById('campo-confirmar-senha').value = '';
    mostrarFeedback('Dados salvos com sucesso!', 'sucesso');
  } catch (err) {
    console.warn('minha-conta salvar:', err.message);
    mostrarFeedback('Erro ao salvar. Tente novamente.', 'erro');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar alterações';
  }
}

async function inicializar() {
  await carregarDados();
  document.getElementById('form-conta')?.addEventListener('submit', salvarConta);
  document.getElementById('campo-foto')?.addEventListener('input', e => previewFoto(e.target.value.trim()));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}
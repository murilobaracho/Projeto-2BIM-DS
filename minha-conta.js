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
  if (!u?.email) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('campo-nome').value  = u.nome  || '';
  document.getElementById('campo-email').value = u.email || '';
  document.getElementById('nome-exibicao').textContent  = u.nome  || '—';
  document.getElementById('email-exibicao').textContent = u.email || '—';

  try {
    const r = await sql(
      'SELECT nome, telefone, foto_url FROM usuario WHERE email = $1',
      [u.email]
    );
    if (r.length) {
      const dados = r[0];
      document.getElementById('campo-telefone').value = dados.telefone ? String(dados.telefone) : '';
      document.getElementById('campo-foto').value     = dados.foto_url || '';
      if (dados.foto_url) previewFoto(dados.foto_url);
      if (dados.nome) {
        document.getElementById('campo-nome').value         = dados.nome;
        document.getElementById('nome-exibicao').textContent = dados.nome;
      }
    }
  } catch (err) {
    console.warn('minha-conta carregarDados:', err.message);
  }
}

async function salvarConta(e) {
  e.preventDefault();

  const novaSenha      = document.getElementById('campo-nova-senha').value;
  const confirmarSenha = document.getElementById('campo-confirmar-senha').value;

  if (novaSenha && novaSenha !== confirmarSenha) {
    mostrarFeedback('As senhas não coincidem.', 'erro');
    return;
  }

  const u      = usuario();
  const nome   = document.getElementById('campo-nome').value.trim();
  const telRaw = document.getElementById('campo-telefone').value.replace(/\D/g, '');
  const fotoUrl = document.getElementById('campo-foto').value.trim() || null;
  const btn    = document.getElementById('btn-salvar');

  if (!nome) {
    mostrarFeedback('O nome não pode estar vazio.', 'erro');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Salvando…';

  try {
    await sql(
      `UPDATE usuario
         SET nome     = $1,
             telefone = $2,
             foto_url = $3
       WHERE email = $4`,
      [nome, telRaw ? parseInt(telRaw, 10) : null, fotoUrl, u.email]
    );

  
    salvarLocal('futurecast_usuario', { ...u, nome });
    document.getElementById('nome-exibicao').textContent = nome;

    mostrarFeedback('Dados salvos com sucesso!', 'sucesso');

    document.getElementById('campo-nova-senha').value      = '';
    document.getElementById('campo-confirmar-senha').value = '';
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

  document.getElementById('form-conta')
    ?.addEventListener('submit', salvarConta);

  document.getElementById('campo-foto')
    ?.addEventListener('input', e => previewFoto(e.target.value.trim()));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}
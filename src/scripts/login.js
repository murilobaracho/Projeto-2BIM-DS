const NEON_URL = 'postgresql://neondb_owner:npg_t2LcrZEXCmx8@ep-fancy-dream-actr329k-pooler.sa-east-1.aws.neon.tech/BD%2FFUTURECAST?sslmode=require&channel_binding=require';
let _sql = null;
async function sql(query, params = []) {
  if (!_sql) {
    const { neon } = await import('https://esm.sh/@neondatabase/serverless@0.10.4');
    _sql = neon(NEON_URL);
  }
  return _sql(query, params);
}
function salvarLocal(chave, dados) {
  localStorage.setItem(chave, JSON.stringify(dados));
}
function nomeDoEmail(email) {
  return email.split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
async function inicializarLogin() {
  const form         = document.getElementById('form-login');
  const inputEmail   = document.getElementById('user-email');
  const inputSenha   = document.getElementById('user-password');
  const btnConfirmar = document.getElementById('criar-conta');
  if (!form) return;
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = inputEmail.value.trim();
    const senha = inputSenha.value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      inputEmail.style.borderColor = '#e55';
      inputEmail.focus();
      setTimeout(() => { inputEmail.style.borderColor = ''; }, 1200);
      return;
    }
    if (senha.length < 6) {
      inputSenha.style.borderColor = '#e55';
      inputSenha.focus();
      setTimeout(() => { inputSenha.style.borderColor = ''; }, 1200);
      return;
    }
    btnConfirmar.textContent = 'Entrando…';
    btnConfirmar.disabled = true;
    const nome = nomeDoEmail(email);
    try {
      await sql(
        `INSERT INTO usuario (nome, email, senha_hash, criado_em, ultimo_acesso)
         VALUES ($1, $2, 'hash_placeholder', NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET ultimo_acesso = NOW()`,
        [nome, email]
      );
    } catch (err) {
      console.warn('Neon usuario write:', err.message);
    }
    salvarLocal('futurecast_usuario', { nome, email });
    setTimeout(() => { window.location.href = 'home.html'; }, 300);
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarLogin);
} else {
  inicializarLogin();
}

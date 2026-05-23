const NEON_URL = 'postgresql://neondb_owner:npg_t2LcrZEXCmx8@ep-fancy-dream-actr329k-pooler.sa-east-1.aws.neon.tech/BD%2FFUTURECAST?sslmode=require&channel_binding=require';
let _sql = null;
async function sql(query, params = []) {
  if (!_sql) {
    const { neon } = await import('https://esm.sh/@neondatabase/serverless@0.10.4');
    _sql = neon(NEON_URL);
  }
  return _sql(query, params);
}
function lerLocal(chave) {
  try { return JSON.parse(localStorage.getItem(chave)) || {}; } catch { return {}; }
}
function soDigitos(str) { return str.replace(/\D/g, ''); }
function mascararTelefone(e) {
  let v = soDigitos(e.target.value);
  if (v.length > 11) v = v.slice(0, 11);
  let f = '';
  if (v.length > 0)  f = '(' + v.slice(0, 2);
  if (v.length > 2)  f += ') ' + v.slice(2, 3);
  if (v.length > 3)  f += ' ' + v.slice(3, 7);
  if (v.length > 7)  f += '-' + v.slice(7, 11);
  e.target.value = f;
}
const WHATSAPP_EQUIPE = '5515997843017';
async function inicializarFormContato() {
  const form      = document.getElementById('form-contato');
  const campoNome = document.getElementById('campo-nome');
  const campoWpp  = document.getElementById('campo-whatsapp');
  const btnEnviar = document.getElementById('criar-conta');
  const feedback  = document.getElementById('msg-feedback');
  if (!form) return;
  campoWpp.addEventListener('input', mascararTelefone);
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const nome     = campoNome.value.trim();
    const telStr   = soDigitos(campoWpp.value);
    if (nome.length < 3) {
      campoNome.style.borderColor = '#e55';
      campoNome.focus();
      setTimeout(() => { campoNome.style.borderColor = ''; }, 1200);
      return;
    }
    if (telStr.length < 10 || telStr.length > 11) {
      campoWpp.style.borderColor = '#e55';
      campoWpp.focus();
      setTimeout(() => { campoWpp.style.borderColor = ''; }, 1200);
      return;
    }
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando…';
    const usuario = lerLocal('futurecast_usuario');
    const telBigint = parseInt(telStr, 10);
    try {
      await sql(
        `INSERT INTO contato (usuario_id, nome_completo, tel_contato, enviado_em)
         VALUES (
           (SELECT id FROM usuario WHERE email = $1),
           $2,
           $3,
           NOW()
         )`,
        [usuario.email || null, nome, telBigint]
      );
    } catch (err) {
      console.warn('Neon contato write:', err.message);
    }
    const mensagem = encodeURIComponent(`Olá! Meu nome é ${nome} e gostaria de saber mais sobre o FutureCast!`);
    window.open(`https://wa.me/${WHATSAPP_EQUIPE}?text=${mensagem}`, '_blank');
    btnEnviar.textContent = 'Mensagem enviada! ✓';
    btnEnviar.style.background = '#4a9e6b';
    btnEnviar.style.cursor = 'default';
    if (feedback) {
      feedback.textContent = `Obrigado, ${nome.split(' ')[0]}! O WhatsApp da equipe foi aberto. Aguarde o retorno em breve. 😊`;
      feedback.style.display = 'block';
      feedback.style.color = '#4a9e6b';
    }
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarFormContato);
} else {
  inicializarFormContato();
}

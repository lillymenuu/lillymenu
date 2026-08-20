(function(){
  const resetForm = document.getElementById('resetForm');
  const resetFormView = document.getElementById('resetFormView');
  const resetSuccessView = document.getElementById('resetSuccessView');
  const resetMsg = document.getElementById('resetMsg');
  const resetModalEl = document.getElementById('resetModal');
  if (!resetForm) return;

  resetModalEl?.addEventListener('hidden.bs.modal', () => {
    resetForm.reset();
    if (resetMsg) resetMsg.textContent = '';
    resetFormView?.classList.remove('d-none');
    resetSuccessView?.classList.add('d-none');
  });

  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmail')?.value.trim();
    if (!email) return;
    const btn = resetForm.querySelector('button[type="submit"]');
    if (resetMsg) { resetMsg.textContent = 'Enviando...'; resetMsg.className = 'small mt-2 text-muted'; }
    if (btn) btn.disabled = true;
    try {
      const params = new URLSearchParams();
      params.set('email', email);
      const resp = await fetch('reset_request.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });
      const data = await resp.json();
      if (data.ok) {
        if (resetMsg) resetMsg.textContent = '';
        resetFormView?.classList.add('d-none');
        resetSuccessView?.classList.remove('d-none');
      } else {
        resetMsg.textContent = data.msg || 'Erro ao enviar. Tente novamente.';
        resetMsg.className = 'small mt-2 text-danger';
      }
    } catch (err) {
      resetMsg.textContent = 'Erro ao enviar. Tente novamente.';
      resetMsg.className = 'small mt-2 text-danger';
    }
    if (btn) btn.disabled = false;
  });
})();

function toggleSenha(){
  var inp = document.getElementById('senha');
  var ico = document.getElementById('eyeIcon');
  if(inp.type === 'password'){
    inp.type = 'text';
    ico.className = 'bi bi-eye-slash';
  } else {
    inp.type = 'password';
    ico.className = 'bi bi-eye';
  }
}

(function(){
  const loginView = document.getElementById('lpLoginView');
  const codeView = document.getElementById('lpCodeView');
  const btnAbrir = document.getElementById('btnAbrirCodigoAcesso');
  const btnVoltar = document.getElementById('btnVoltarLogin');
  const erroEl = document.getElementById('lpCodeErro');
  const codeEmailInput = document.getElementById('lpCodeEmail');
  const digitInputs = Array.from(document.querySelectorAll('[data-code-digit]'));
  if (!loginView || !codeView || !digitInputs.length) return;

  let enviando = false;

  function limparCodigo(){
    digitInputs.forEach(inp => { inp.value = ''; });
    if (erroEl) erroEl.textContent = '';
  }

  if (btnAbrir) {
    btnAbrir.addEventListener('click', () => {
      loginView.classList.add('d-none');
      codeView.classList.remove('d-none');
      limparCodigo();
      if (codeEmailInput) {
        codeEmailInput.value = '';
        codeEmailInput.focus();
      } else {
        digitInputs[0].focus();
      }
    });
  }

  if (btnVoltar) {
    btnVoltar.addEventListener('click', () => {
      codeView.classList.add('d-none');
      loginView.classList.remove('d-none');
    });
  }

  function enviarCodigo(codigo){
    if (enviando) return;
    enviando = true;
    if (erroEl) erroEl.textContent = '';
    const params = new URLSearchParams();
    params.set('codigo', codigo);
    params.set('email', codeEmailInput ? codeEmailInput.value.trim() : '');
    fetch('auth_codigo.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    })
      .then(r => r.json())
      .then(resp => {
        if (resp && resp.ok && resp.redirect) {
          window.location.href = resp.redirect;
          return;
        }
        if (erroEl) erroEl.textContent = (resp && resp.msg) || 'Codigo invalido.';
        limparCodigo();
        digitInputs[0].focus();
        enviando = false;
      })
      .catch(() => {
        if (erroEl) erroEl.textContent = 'Erro ao validar codigo. Tente novamente.';
        enviando = false;
      });
  }

  function tentarEnviar(){
    const codigo = digitInputs.map(inp => inp.value).join('');
    const emailPreenchido = codeEmailInput ? codeEmailInput.value.trim() : '';
    if (codigo.length === digitInputs.length && emailPreenchido) enviarCodigo(codigo);
  }

  if (codeEmailInput) {
    codeEmailInput.addEventListener('input', tentarEnviar);
  }

  digitInputs.forEach((input, idx) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 1);
      if (input.value && idx < digitInputs.length - 1) {
        digitInputs[idx + 1].focus();
      }
      tentarEnviar();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        digitInputs[idx - 1].focus();
      }
    });
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const dados = (e.clipboardData || window.clipboardData).getData('text');
      const texto = dados.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, digitInputs.length);
      texto.split('').forEach((ch, i) => { if (digitInputs[i]) digitInputs[i].value = ch; });
      const proximo = Math.min(texto.length, digitInputs.length - 1);
      digitInputs[proximo].focus();
      tentarEnviar();
    });
  });
})();

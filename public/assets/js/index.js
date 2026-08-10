const menuToggle = document.getElementById('menuToggle');
const mobileNav = document.getElementById('mobileNav');
function closeMobileMenu(){
  mobileNav?.classList.remove('open');
  menuToggle?.classList.remove('is-open');
}
if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
    menuToggle.classList.toggle('is-open');
  });
}

const revealTargets = document.querySelectorAll('.solucao-media img, .reveal');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  revealTargets.forEach((el) => revealObserver.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add('in-view'));
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const targetId = link.getAttribute('href');
    if (!targetId || targetId === '#') return;
    const target = document.querySelector(targetId);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    closeMobileMenu();
  });
});

const backTop = document.getElementById('backTop');
function toggleBackTop(){
  if (!backTop) return;
  backTop.classList.toggle('show', window.scrollY > 400);
}
toggleBackTop();
window.addEventListener('scroll', toggleBackTop);
backTop?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

const leadForm = document.getElementById('teste');
const leadMsg = document.getElementById('leadMsg');
const leadWhatsapp = document.getElementById('leadWhatsapp');
const leadCnpj = document.getElementById('leadCnpj');
const leadCep = document.getElementById('leadCep');
const leadRua = document.getElementById('leadRua');
const leadNumero = document.getElementById('leadNumero');
const leadBairro = document.getElementById('leadBairro');
const leadCidade = document.getElementById('leadCidade');
const leadEstado = document.getElementById('leadEstado');
const leadAddressBtn = document.getElementById('leadAddressBtn');
const leadAddressModal = document.getElementById('leadAddressModal');
const leadAddressClose = document.getElementById('leadAddressClose');
const leadAddressSave = document.getElementById('leadAddressSave');

function toggleLeadAddress(open){
  if (!leadAddressModal) return;
  const isOpen = typeof open === 'boolean' ? open : !leadAddressModal.classList.contains('show');
  leadAddressModal.classList.toggle('show', isOpen);
  leadAddressModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

if (leadAddressBtn) {
  leadAddressBtn.addEventListener('click', () => toggleLeadAddress(true));
}
if (leadAddressClose) {
  leadAddressClose.addEventListener('click', () => toggleLeadAddress(false));
}
if (leadAddressSave) {
  leadAddressSave.addEventListener('click', () => toggleLeadAddress(false));
}
if (leadAddressModal) {
  leadAddressModal.addEventListener('click', (e) => {
    if (e.target === leadAddressModal) toggleLeadAddress(false);
  });
}

document.querySelectorAll('.lead-dropdown').forEach((dropdown) => {
  const btn = dropdown.querySelector('.lead-drop-btn');
  const menu = dropdown.querySelector('.lead-drop-menu');
  const input = dropdown.querySelector('input[type="hidden"]');
  const text = dropdown.querySelector('.lead-drop-text');
  if (!btn || !menu || !input || !text) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.lead-dropdown.open').forEach((openEl) => {
      if (openEl !== dropdown) openEl.classList.remove('open');
    });
    dropdown.classList.toggle('open');
    btn.setAttribute('aria-expanded', dropdown.classList.contains('open') ? 'true' : 'false');
  });

  menu.querySelectorAll('.lead-drop-item').forEach((item) => {
    item.addEventListener('click', () => {
      const value = item.getAttribute('data-value') || '';
      input.value = value;
      text.textContent = item.textContent.trim() || value || 'Selecionar';
      dropdown.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });
});

document.addEventListener('click', () => {
  document.querySelectorAll('.lead-dropdown.open').forEach((openEl) => openEl.classList.remove('open'));
});

function formatLeadWhatsapp(value){
  let digits = (value || '').replace(/\D/g,'');
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0,11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
}

if (leadWhatsapp) {
  leadWhatsapp.addEventListener('input', () => {
    leadWhatsapp.value = formatLeadWhatsapp(leadWhatsapp.value);
  });
}
document.querySelectorAll('.js-phone-mask').forEach((input) => {
  input.addEventListener('input', () => {
    input.value = formatLeadWhatsapp(input.value);
  });
});
function formatCpfCnpj(value){
  const d = (value || '').replace(/\D/g,'').slice(0,14);
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return d.slice(0,3) + '.' + d.slice(3);
    if (d.length <= 9) return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6);
    return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6,9) + '-' + d.slice(9,11);
  }
  if (d.length <= 2) return d;
  if (d.length <= 5) return d.slice(0,2) + '.' + d.slice(2);
  if (d.length <= 8) return d.slice(0,2) + '.' + d.slice(2,5) + '.' + d.slice(5);
  if (d.length <= 12) return d.slice(0,2) + '.' + d.slice(2,5) + '.' + d.slice(5,8) + '/' + d.slice(8);
  return d.slice(0,2) + '.' + d.slice(2,5) + '.' + d.slice(5,8) + '/' + d.slice(8,12) + '-' + d.slice(12,14);
}

function wireCnpjMask(input){
  if (!input) return;
  input.addEventListener('input', () => {
    input.value = formatCpfCnpj(input.value);
  });
}
wireCnpjMask(leadCnpj);
document.querySelectorAll('.js-cnpj-mask').forEach(wireCnpjMask);

function wireCepLookup(cepInput, ruaInput, bairroInput, cidadeInput, estadoInput, msgEl){
  if (!cepInput) return;

  async function buscarCep(){
    const digits = cepInput.value.replace(/\D/g,'');
    if (digits.length !== 8) return;
    if (!ruaInput || !bairroInput || !cidadeInput || !estadoInput) return;
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await resp.json();
      if (data.erro) {
        if (msgEl) { msgEl.textContent = 'CEP nao encontrado.'; msgEl.className = 'lead-msg error'; }
        return;
      }
      ruaInput.value = data.logradouro || '';
      bairroInput.value = data.bairro || '';
      cidadeInput.value = data.localidade || '';
      estadoInput.value = data.uf || '';
    } catch (err) {
      if (msgEl) { msgEl.textContent = 'Erro ao buscar CEP.'; msgEl.className = 'lead-msg error'; }
    }
  }

  cepInput.addEventListener('input', () => {
    const digits = cepInput.value.replace(/\D/g,'').slice(0,8);
    cepInput.value = digits.length > 5 ? digits.slice(0,5) + '-' + digits.slice(5) : digits;
    if (digits.length === 8) {
      buscarCep();
    }
  });
  cepInput.addEventListener('blur', buscarCep);
}
wireCepLookup(leadCep, leadRua, leadBairro, leadCidade, leadEstado, leadMsg);

function wireSignupForm(formEl, msgEl, aceiteEl){
  formEl?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!msgEl) return;
    const formData = new FormData(formEl);
    const nome = (formData.get('nome') || '').toString().trim();
    const empresa = (formData.get('empresa') || '').toString().trim();
    const email = (formData.get('email') || '').toString().trim();
    const contato = (formData.get('contato') || '').toString().trim();
    const senha = (formData.get('senha') || '').toString();
    const senha2 = (formData.get('senha2') || '').toString();
    const cnpj = (formData.get('cnpj') || '').toString();
    const cep = (formData.get('cep') || '').toString();
    const rua = (formData.get('rua') || '').toString().trim();
    const numero = (formData.get('numero') || '').toString().trim();
    const bairro = (formData.get('bairro') || '').toString().trim();
    const cidade = (formData.get('cidade') || '').toString().trim();
    const estado = (formData.get('estado') || '').toString().trim();
    const aceite = aceiteEl?.checked;
    const faturamento = (formData.get('faturamento') || '').toString().trim();
    const segmento = (formData.get('segmento') || '').toString().trim();
    const planoId = (formData.get('plano_id') || '').toString().trim();

    if (!nome || !empresa || !email || !contato || !senha || !senha2 || !cnpj || !cep || !rua || !numero || !bairro || !cidade || !estado || !aceite) {
      msgEl.textContent = 'Preencha todos os campos e aceite o contato no WhatsApp.';
      msgEl.className = 'lead-msg error';
      return;
    }
    if (!planoId) {
      msgEl.textContent = 'Selecione um plano.';
      msgEl.className = 'lead-msg error';
      return;
    }
    if (!faturamento || faturamento.toLowerCase() === 'selecionar') {
      msgEl.textContent = 'Selecione o faturamento mensal.';
      msgEl.className = 'lead-msg error';
      return;
    }
    if (senha !== senha2) {
      msgEl.textContent = 'As senhas nao conferem.';
      msgEl.className = 'lead-msg error';
      return;
    }

    const digits = contato.replace(/\D/g,'');
    formData.set('contato', digits);
    formData.set('cnpj', cnpj.replace(/\D/g,''));
    formData.set('cep', cep.replace(/\D/g,''));
    formData.set('estado', estado.toUpperCase());

    msgEl.textContent = 'Enviando cadastro...';
    msgEl.className = 'lead-msg';
    const btn = formEl.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    try {
      const resp = await fetch('api/cadastro_loja.php', { method: 'POST', body: formData });
      const data = await resp.json();
      if (data.ok) {
        msgEl.textContent = 'Cadastro efetuado com sucesso. Aguarde a liberacao do acesso a sua loja.';
        msgEl.className = 'lead-msg success';
        formEl.reset();
      } else {
        msgEl.textContent = data.msg || 'Erro ao cadastrar. Tente novamente.';
        msgEl.className = 'lead-msg error';
      }
    } catch (err) {
      msgEl.textContent = 'Erro ao cadastrar. Tente novamente.';
      msgEl.className = 'lead-msg error';
    }
    if (btn) btn.disabled = false;
  });
}

wireSignupForm(leadForm, leadMsg, document.getElementById('leadAceite'));

const especialistaModal = document.getElementById('especialistaModal');
const especialistaForm = document.getElementById('especialistaForm');
const especialistaMsg = document.getElementById('especialistaMsg');
const especialistaClose = document.getElementById('especialistaClose');

function toggleEspecialistaModal(open){
  if (!especialistaModal) return;
  const isOpen = typeof open === 'boolean' ? open : !especialistaModal.classList.contains('show');
  especialistaModal.classList.toggle('show', isOpen);
  especialistaModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  if (isOpen) closeMobileMenu();
}

document.getElementById('btnFalarEspecialista')?.addEventListener('click', () => toggleEspecialistaModal(true));
document.getElementById('btnFalarEspecialistaMobile')?.addEventListener('click', () => toggleEspecialistaModal(true));
especialistaClose?.addEventListener('click', () => toggleEspecialistaModal(false));
especialistaModal?.addEventListener('click', (e) => {
  if (e.target === especialistaModal) toggleEspecialistaModal(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    toggleEspecialistaModal(false);
    toggleLeadAddress(false);
  }
});

especialistaForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!especialistaMsg) return;
  const formData = new FormData(especialistaForm);
  const nome = (formData.get('nome') || '').toString().trim();
  const email = (formData.get('email') || '').toString().trim();
  const telefone = (formData.get('telefone') || '').toString().trim();
  const empresa = (formData.get('empresa') || '').toString().trim();
  const faturamento = (formData.get('faturamento') || '').toString().trim();

  if (!nome || !email || !telefone || !empresa) {
    especialistaMsg.textContent = 'Preencha nome, e-mail, telefone e empresa.';
    especialistaMsg.className = 'lead-msg error';
    return;
  }
  if (!faturamento || faturamento.toLowerCase() === 'selecionar') {
    especialistaMsg.textContent = 'Selecione o faturamento mensal.';
    especialistaMsg.className = 'lead-msg error';
    return;
  }

  formData.set('telefone', telefone.replace(/\D/g,''));
  formData.set('aceite_whatsapp', document.getElementById('especialistaAceite')?.checked ? '1' : '0');

  especialistaMsg.textContent = 'Enviando...';
  especialistaMsg.className = 'lead-msg';
  const btn = especialistaForm.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  try {
    const resp = await fetch('api/lead_especialista.php', { method: 'POST', body: formData });
    const data = await resp.json();
    if (data.ok) {
      especialistaMsg.textContent = 'Recebemos seus dados. Em breve um especialista vai falar com voce.';
      especialistaMsg.className = 'lead-msg success';
      especialistaForm.reset();
      especialistaForm.querySelectorAll('.lead-dropdown').forEach((dropdown) => {
        const text = dropdown.querySelector('.lead-drop-text');
        const input = dropdown.querySelector('input[type="hidden"]');
        if (text) text.textContent = 'Selecionar';
        if (input) input.value = 'Selecionar';
      });
    } else {
      especialistaMsg.textContent = data.msg || 'Erro ao enviar. Tente novamente.';
      especialistaMsg.className = 'lead-msg error';
    }
  } catch (err) {
    especialistaMsg.textContent = 'Erro ao enviar. Tente novamente.';
    especialistaMsg.className = 'lead-msg error';
  }
  if (btn) btn.disabled = false;
});

const cadastroModal = document.getElementById('cadastroModal');
const cadastroClose = document.getElementById('cadastroClose');
const leadMsgModal = document.getElementById('leadMsgModal');

function toggleCadastroModal(open){
  if (!cadastroModal) return;
  const isOpen = typeof open === 'boolean' ? open : !cadastroModal.classList.contains('show');
  cadastroModal.classList.toggle('show', isOpen);
  cadastroModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  if (isOpen) closeMobileMenu();
}

document.getElementById('btnCadastreSe')?.addEventListener('click', () => toggleCadastroModal(true));
document.getElementById('btnCadastreSeMobile')?.addEventListener('click', () => toggleCadastroModal(true));
cadastroClose?.addEventListener('click', () => toggleCadastroModal(false));
cadastroModal?.addEventListener('click', (e) => {
  if (e.target === cadastroModal) toggleCadastroModal(false);
});

const leadAddressModalCadastro = document.getElementById('leadAddressModalCadastro');
const leadAddressBtnModal = document.getElementById('leadAddressBtnModal');
const leadAddressCloseCadastro = document.getElementById('leadAddressCloseCadastro');
const leadAddressSaveCadastro = document.getElementById('leadAddressSaveCadastro');

function toggleLeadAddressCadastro(open){
  if (!leadAddressModalCadastro) return;
  const isOpen = typeof open === 'boolean' ? open : !leadAddressModalCadastro.classList.contains('show');
  leadAddressModalCadastro.classList.toggle('show', isOpen);
  leadAddressModalCadastro.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

leadAddressBtnModal?.addEventListener('click', () => toggleLeadAddressCadastro(true));
leadAddressCloseCadastro?.addEventListener('click', () => toggleLeadAddressCadastro(false));
leadAddressSaveCadastro?.addEventListener('click', () => toggleLeadAddressCadastro(false));
leadAddressModalCadastro?.addEventListener('click', (e) => {
  if (e.target === leadAddressModalCadastro) toggleLeadAddressCadastro(false);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    toggleCadastroModal(false);
    toggleLeadAddressCadastro(false);
  }
});

wireCepLookup(
  document.getElementById('leadCepModal'),
  document.getElementById('leadRuaModal'),
  document.getElementById('leadBairroModal'),
  document.getElementById('leadCidadeModal'),
  document.getElementById('leadEstadoModal'),
  leadMsgModal
);

wireSignupForm(document.getElementById('testeModal'), leadMsgModal, document.getElementById('leadAceiteModal'));

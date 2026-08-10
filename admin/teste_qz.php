<?php
require_once __DIR__ . '/protect.php';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Teste QZ Tray</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body{font-family:Arial,sans-serif;background:#f1f5f9;padding:24px;color:#0f172a}
  .card{max-width:640px;margin:0 auto;background:#fff;border-radius:14px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.08)}
  h1{font-size:1.3rem;margin:0 0 16px}
  .linha{display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #e2e8f0;gap:12px}
  .status{font-weight:800;padding:4px 12px;border-radius:999px;font-size:.85rem}
  .status.ok{background:#dcfce7;color:#166534}
  .status.erro{background:#fee2e2;color:#991b1b}
  .status.pendente{background:#f1f5f9;color:#64748b}
  button{padding:10px 18px;border-radius:10px;border:1px solid #9C5523;background:#9C5523;color:#fff;font-weight:700;cursor:pointer;margin-top:16px}
  button:disabled{opacity:.5;cursor:not-allowed}
  #detalhe{margin-top:16px;background:#0f172a;color:#e2e8f0;padding:14px;border-radius:10px;font-family:monospace;font-size:.82rem;white-space:pre-wrap;word-break:break-all;max-height:300px;overflow:auto;display:none}
  #impressoras{margin-top:16px}
  #impressoras div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin-bottom:6px}
</style>
</head>
<body>
<div class="card">
  <h1>Teste isolado de conexão com o QZ Tray</h1>

  <div class="linha">
    <span>1. Biblioteca qz-tray.js carregou no navegador?</span>
    <span class="status pendente" id="statusLib">Verificando...</span>
  </div>
  <div class="linha">
    <span>2. Conexão com o QZ Tray (websocket)</span>
    <span class="status pendente" id="statusConexao">Aguardando</span>
  </div>
  <div class="linha">
    <span>3. Lista de impressoras do sistema</span>
    <span class="status pendente" id="statusImpressoras">Aguardando</span>
  </div>

  <button id="btnTestar">Testar conexão agora</button>
  <div id="impressoras"></div>
  <div id="detalhe"></div>
</div>

<script src="./assets/js/vendor/qz-tray.js"></script>
<script>
  const statusLib = document.getElementById('statusLib');
  const statusConexao = document.getElementById('statusConexao');
  const statusImpressoras = document.getElementById('statusImpressoras');
  const detalhe = document.getElementById('detalhe');
  const impressorasDiv = document.getElementById('impressoras');
  const btn = document.getElementById('btnTestar');

  function setStatus(el, texto, classe) {
    el.textContent = texto;
    el.className = 'status ' + classe;
  }

  function mostrarDetalhe(texto) {
    detalhe.style.display = 'block';
    detalhe.textContent += texto + '\n\n';
  }

  if (typeof qz === 'undefined') {
    setStatus(statusLib, 'NÃO carregou', 'erro');
    mostrarDetalhe('ERRO: o arquivo qz-tray.js não definiu o objeto "qz" neste navegador.\nIsso acontece ANTES de qualquer tentativa de conexão — o problema é o arquivo em si não estar chegando/rodando aqui.');
    btn.disabled = true;
  } else {
    setStatus(statusLib, 'Carregou OK', 'ok');
  }

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    setStatus(statusConexao, 'Conectando...', 'pendente');
    setStatus(statusImpressoras, 'Aguardando', 'pendente');
    impressorasDiv.innerHTML = '';
    try {
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect();
      }
      setStatus(statusConexao, 'Conectado!', 'ok');
    } catch (e) {
      setStatus(statusConexao, 'Falhou', 'erro');
      mostrarDetalhe('ERRO AO CONECTAR: ' + (e && e.message ? e.message : String(e)));
      btn.disabled = false;
      return;
    }

    setStatus(statusImpressoras, 'Buscando...', 'pendente');
    try {
      const impressoras = await qz.printers.find('');
      const lista = Array.isArray(impressoras) ? impressoras : [impressoras];
      setStatus(statusImpressoras, lista.length + ' encontrada(s)', 'ok');
      impressorasDiv.innerHTML = lista.map(nome => `<div>🖨️ ${nome}</div>`).join('') || '<div>Nenhuma impressora retornada.</div>';
    } catch (e) {
      setStatus(statusImpressoras, 'Falhou', 'erro');
      mostrarDetalhe('ERRO AO LISTAR IMPRESSORAS: ' + (e && e.message ? e.message : String(e)));
    }
    btn.disabled = false;
  });
</script>
</body>
</html>

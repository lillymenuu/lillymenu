<?php
require_once '../config/database.php';
require_once '../admin/helpers/config.php';
require_once '../helpers/loja_context.php';

$pedidoId = (int) ($_GET['pedido'] ?? 0);
$lojaId = definirLojaIdSessao($conn);
$whatsapp = preg_replace('/\D+/', '', (string) config($conn, 'loja_contato', config($conn, 'whatsapp_numero', '')));
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Finalizar Pedido</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>

<div class="container py-4">
  <h4 class="mb-3">Pedido recebido 🎉</h4>

  <div id="resumoPedido" class="mb-3"></div>

  <button class="btn btn-success w-100" onclick="enviarWhatsApp()">
    Enviar pedido no WhatsApp
  </button>
</div>

<script>
const pedidoId = <?= (int)$pedidoId ?>;
const lojaId = <?= (int)$lojaId ?>;
let mensagem = "";

fetch(`../controllers/pedido_detalhe.php?id=${pedidoId}&loja_id=${lojaId}`)
  .then(res => res.json())
  .then(data => {
    let texto = `🧁 *Novo pedido*\n\n`;
    texto += `👤 Cliente: ${data.pedido.cliente}\n`;
    texto += `📞 ${data.pedido.telefone}\n\n`;
    texto += `📦 *Itens:*\n`;

    data.itens.forEach(i => {
      texto += `• ${i.quantidade}x ${i.produto_nome} - R$ ${i.preco}\n`;
    });

    texto += `\n🚚 ${data.pedido.tipo_entrega.toUpperCase()}\n`;
    if (data.pedido.endereco) {
      texto += `📍 ${data.pedido.endereco}\n`;
    }

    texto += `\n💳 Pagamento: ${data.pedido.forma_pagamento}\n`;
    texto += `💰 Total: R$ ${data.pedido.total}\n`;

    mensagem = encodeURIComponent(texto);

    document.getElementById("resumoPedido").innerHTML =
      texto.replace(/\n/g, "<br>");
  });

function enviarWhatsApp() {
  const whatsapp = "<?= htmlspecialchars($whatsapp ?: '5585999999999', ENT_QUOTES) ?>";
  window.location.href = `https://wa.me/${whatsapp}?text=${mensagem}`;
}
</script>

</body>
</html>

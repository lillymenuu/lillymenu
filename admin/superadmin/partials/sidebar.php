<?php
$rota = basename($_SERVER['PHP_SELF']);
?>
  <aside class="sidebar">
    <div class="brand">
      <div class="dot">
        <svg viewBox="0 0 24 24"><path d="M3 4h7v7H3z"/><path d="M14 4h7v7h-7z"/><path d="M3 13h7v7H3z"/><path d="M14 13h7v7h-7z"/></svg>
      </div>
      <div class="brand-text">LillyMenu Admin</div>
    </div>

    <?php
      $superadminNome = trim((string) ($_SESSION['admin_nome'] ?? 'Admin'));
      $superadminIniciais = dashIniciais($superadminNome);
      $superadminFoto = null;
      try {
        $stmtFoto = $conn->prepare("SELECT foto FROM admins WHERE id = ? LIMIT 1");
        $stmtFoto->execute([(int) ($_SESSION['admin_id'] ?? 0)]);
        $superadminFoto = $stmtFoto->fetchColumn() ?: null;
      } catch (Exception $e) {
        $superadminFoto = null;
      }
      $superadminFotoUrl = $superadminFoto ? '../' . $superadminFoto : '';
    ?>
    <div class="sidebar-profile" id="btnEditarPerfil">
      <div class="avatar" data-iniciais="<?= htmlspecialchars($superadminIniciais) ?>" data-foto="<?= htmlspecialchars($superadminFotoUrl) ?>">
        <?php if ($superadminFotoUrl): ?>
          <img src="<?= htmlspecialchars($superadminFotoUrl) ?>" alt="">
        <?php else: ?>
          <?= htmlspecialchars($superadminIniciais) ?>
        <?php endif; ?>
      </div>
      <div class="name"><?= htmlspecialchars($superadminNome) ?></div>
      <svg class="chev" viewBox="0 0 24 24"></svg>
    </div>

    <div class="sidebar-divider"></div>
    <div>
      <div class="nav-title">Dashboard</div>
      <nav>
        <a class="nav-item <?= $rota === 'dashboard.php' ? 'active' : '' ?>" href="dashboard" data-tooltip="Dashboard">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="7" height="7" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/><rect x="3" y="13" width="7" height="7" rx="1"/><rect x="14" y="13" width="7" height="7" rx="1"/></svg>
          <span class="nav-label">Dashboard</span>
          <svg class="chevron" viewBox="0 0 24 24"></svg>
        </a>
        <a class="nav-item <?= $rota === 'painel.php' ? 'active' : '' ?>" href="painel" data-tooltip="Painel">
          <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="12" rx="2"/><path d="M8 20h8"/><path d="M9 14h6"/></svg>
          <span class="nav-label">Painel</span>
          <svg class="chevron" viewBox="0 0 24 24"></svg>
        </a>
        <a class="nav-item <?= $rota === 'suporte.php' ? 'active' : '' ?>" href="suporte" data-tooltip="Suporte">
          <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          <span class="nav-label">Suporte</span>
          <span class="nav-badge" id="suporteNavBadge" style="display:none">0</span>
          <svg class="chevron" viewBox="0 0 24 24"></svg>
        </a>
        <a class="nav-item <?= $rota === 'integracoes.php' ? 'active' : '' ?>" href="integracoes" data-tooltip="Integracoes">
          <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
          <span class="nav-label">Integrações</span>
          <svg class="chevron" viewBox="0 0 24 24"></svg>
        </a>
        <a class="nav-item <?= $rota === 'notificacoes.php' ? 'active' : '' ?>" href="notificacoes" data-tooltip="Notificações">
          <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M9 21h6"/></svg>
          <span class="nav-label">Notificações</span>
          <svg class="chevron" viewBox="0 0 24 24"></svg>
        </a>
        <a class="nav-item <?= $rota === 'configuracoes.php' ? 'active' : '' ?>" href="configuracoes" data-tooltip="Configurações">
          <svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"/><path d="M19.4 15a1.6 1.6 0 01.3 1.7l-.5.9a1.6 1.6 0 01-1.6.8l-1.1-.2a7 7 0 01-1.5.9l-.4 1a1.6 1.6 0 01-1.4 1h-1a1.6 1.6 0 01-1.4-1l-.4-1a7 7 0 01-1.5-.9l-1.1.2a1.6 1.6 0 01-1.6-.8l-.5-.9a1.6 1.6 0 01.3-1.7l.7-.8a7 7 0 010-1.8l-.7-.8a1.6 1.6 0 01-.3-1.7l.5-.9a1.6 1.6 0 011.6-.8l1.1.2a7 7 0 011.5-.9l.4-1a1.6 1.6 0 011.4-1h1a1.6 1.6 0 011.4 1l.4 1a7 7 0 011.5.9l1.1-.2a1.6 1.6 0 011.6.8l.5.9a1.6 1.6 0 01-.3 1.7l-.7.8a7 7 0 010 1.8z"/></svg>
          <span class="nav-label">Configurações</span>
          <svg class="chevron" viewBox="0 0 24 24"></svg>
        </a>
      </nav>
    </div>
    <div class="sidebar-divider"></div>
    <div>
      <nav>
        <a class="nav-item" href="../logout" data-tooltip="Sair">
          <svg viewBox="0 0 24 24"><path d="M5 5h14v14H5z"/><path d="M8 9h8"/><path d="M8 13h8"/></svg>
          <span class="nav-label">Sair</span>
        </a>
      </nav>
    </div>
    <div class="sidebar-footer">&copy; <?= date('Y') ?> LillyMenu</div>
  </aside>

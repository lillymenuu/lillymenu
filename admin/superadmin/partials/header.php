    <section class="header-card">
      <div class="header-left">
        <button class="burger-btn" id="toggleSidebar" type="button" aria-label="Ocultar menu">
          <svg viewBox="0 0 24 24"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>
        </button>
        <div class="header-text">
          <div class="breadcrumb">
            <svg viewBox="0 0 24 24"><path d="M3 12l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>
            <span><?= htmlspecialchars($paginaAtual ?? 'Dashboard') ?></span>
          </div>

        </div>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <input type="text" placeholder="Search" id="searchGlobal">
        </div>
        <button class="icon-btn" type="button" title="Configuracoes" id="btnOpenSettings">
          <svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"/><path d="M19.4 15a1.6 1.6 0 01.3 1.7l-.5.9a1.6 1.6 0 01-1.6.8l-1.1-.2a7 7 0 01-1.5.9l-.4 1a1.6 1.6 0 01-1.4 1h-1a1.6 1.6 0 01-1.4-1l-.4-1a7 7 0 01-1.5-.9l-1.1.2a1.6 1.6 0 01-1.6-.8l-.5-.9a1.6 1.6 0 01.3-1.7l.7-.8a7 7 0 010-1.8l-.7-.8a1.6 1.6 0 01-.3-1.7l.5-.9a1.6 1.6 0 011.6-.8l1.1.2a7 7 0 011.5-.9l.4-1a1.6 1.6 0 011.4-1h1a1.6 1.6 0 011.4 1l.4 1a7 7 0 011.5.9l1.1-.2a1.6 1.6 0 011.6.8l.5.9a1.6 1.6 0 01-.3 1.7l-.7.8a7 7 0 010 1.8z"/></svg>
        </button>
        <div class="notif-wrap">
          <button class="icon-btn <?= $notifCount ? 'has-dot' : '' ?>" type="button" title="Notificacoes" id="btnNotif">
            <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M9 21h6"/></svg>
          </button>
          <div class="notif-menu" id="notifMenu">
            <?php if (!$notificacoes): ?>
              <div class="notif-empty">Nenhuma notificacao.</div>
            <?php else: ?>
              <?php foreach ($notificacoes as $n): ?>
                <?php if ($n['tipo'] === 'suporte'): ?>
                  <a href="suporte.php?loja_id=<?= (int) $n['loja_id'] ?>" class="notif-item">
                    <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    <div>
                      <div class="notif-item-title"><?= htmlspecialchars($n['loja_nome']) ?></div>
                      <div class="notif-item-sub"><?= htmlspecialchars($n['texto']) ?></div>
                    </div>
                  </a>
                <?php else: ?>
                  <div class="notif-item">
                    <?php if ($n['tipo'] === 'email'): ?>
                      <svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/><path d="M4 7l8 5 8-5"/></svg>
                    <?php elseif ($n['tipo'] === 'pagamento'): ?>
                      <svg viewBox="0 0 24 24"><path d="M6 6h12l1 6H5l1-6z"/><path d="M6 12l1 6h10l1-6"/><path d="M9 18v2h6v-2"/></svg>
                    <?php else: ?>
                      <svg viewBox="0 0 24 24"><path d="M12 3a3 3 0 013 3v6a3 3 0 01-6 0V6a3 3 0 013-3z"/><path d="M5 11a7 7 0 0014 0"/><path d="M12 18v3"/></svg>
                    <?php endif; ?>
                    <div><?= htmlspecialchars($n['texto']) ?></div>
                  </div>
                <?php endif; ?>
              <?php endforeach; ?>
            <?php endif; ?>
          </div>
        </div>
        <div class="profile-wrap">
          <button class="profile-trigger" type="button" id="btnHeaderProfile">
            <div class="profile-trigger-avatar" data-iniciais="<?= htmlspecialchars($superadminIniciais ?? 'A') ?>" data-foto="<?= htmlspecialchars($superadminFotoUrl ?? '') ?>">
              <?php if (!empty($superadminFotoUrl)): ?>
                <img src="<?= htmlspecialchars($superadminFotoUrl) ?>" alt="">
              <?php else: ?>
                <?= htmlspecialchars($superadminIniciais ?? 'A') ?>
              <?php endif; ?>
            </div>
            <span class="profile-trigger-name"><?= htmlspecialchars($superadminNome ?? 'Admin') ?></span>
          </button>
          <div class="profile-menu" id="headerProfileMenu">
            <div class="profile-menu-header">
              <div class="profile-menu-name"><?= htmlspecialchars($superadminNome ?? 'Admin') ?></div>
              <div class="profile-menu-email"><?= htmlspecialchars($_SESSION['admin_email'] ?? '') ?></div>
            </div>
            <button type="button" class="profile-menu-item" id="btnHeaderProfilePerfil">
              <span class="profile-menu-item-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg></span>
              Perfil
            </button>
            <a href="suporte.php" class="profile-menu-item">
              <span class="profile-menu-item-icon"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></span>
              Mensagens
            </a>
            <a href="#" class="profile-menu-item">
              <span class="profile-menu-item-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 0c0 2-2.5 1.8-2.5 4.2"/><path d="M12 17.5v.1"/></svg></span>
              Ajuda
            </a>
            <button type="button" class="profile-menu-item" id="btnHeaderProfileConfig">
              <span class="profile-menu-item-icon"><svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"/><path d="M19.4 15a1.6 1.6 0 01.3 1.7l-.5.9a1.6 1.6 0 01-1.6.8l-1.1-.2a7 7 0 01-1.5.9l-.4 1a1.6 1.6 0 01-1.4 1h-1a1.6 1.6 0 01-1.4-1l-.4-1a7 7 0 01-1.5-.9l-1.1.2a1.6 1.6 0 01-1.6-.8l-.5-.9a1.6 1.6 0 01.3-1.7l.7-.8a7 7 0 010-1.8l-.7-.8a1.6 1.6 0 01-.3-1.7l.5-.9a1.6 1.6 0 011.6-.8l1.1.2a7 7 0 011.5-.9l.4-1a1.6 1.6 0 011.4-1h1a1.6 1.6 0 011.4 1l.4 1a7 7 0 011.5.9l1.1-.2a1.6 1.6 0 011.6.8l.5.9a1.6 1.6 0 01-.3 1.7l-.7.8a7 7 0 010 1.8z"/></svg></span>
              Configurações
              <span class="profile-menu-badge">Novo</span>
            </button>
            <a href="auth-lock-screen.php" class="profile-menu-item">
              <span class="profile-menu-item-icon"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg></span>
              Tela de bloqueio
            </a>
            <div class="profile-menu-divider"></div>
            <a href="../logout.php" class="profile-menu-item">
              <span class="profile-menu-item-icon"><svg viewBox="0 0 24 24"><path d="M9 5H5v14h4"/><path d="M13 12h8m0 0l-3-3m3 3l-3 3"/></svg></span>
              Sair
            </a>
          </div>
        </div>
      </div>
    </section>

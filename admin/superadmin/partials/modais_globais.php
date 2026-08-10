<div class="modal-backdrop" id="perfilModal" aria-hidden="true">
  <div class="modal-card" role="dialog" aria-modal="true">
    <div class="modal-header">
      <div class="modal-title">Editar usuario e senha</div>
      <button class="action-btn ghost" type="button" data-close-modal>Fechar</button>
    </div>
    <form id="perfilForm">
      <div class="perfil-foto-row">
        <div class="perfil-foto-preview" id="perfilFotoPreview">
          <?php if (!empty($superadminFotoUrl)): ?>
            <img src="<?= htmlspecialchars($superadminFotoUrl) ?>" alt="" id="perfilFotoPreviewImg">
          <?php else: ?>
            <span id="perfilFotoPreviewIniciais"><?= htmlspecialchars($superadminIniciais ?? 'A') ?></span>
          <?php endif; ?>
        </div>
        <div class="perfil-foto-actions">
          <button class="action-btn ghost" type="button" id="perfilFotoBtn">Alterar foto</button>
          <button class="perfil-foto-remover" type="button" id="perfilFotoRemoverBtn" style="<?= empty($superadminFotoUrl) ? 'display:none' : '' ?>">Remover foto</button>
          <input type="file" id="perfilFotoInput" name="foto" accept="image/jpeg,image/png,image/webp" hidden>
          <input type="hidden" id="perfilFotoRemoverFlag" name="foto_remover" value="0">
        </div>
      </div>
      <div class="form-grid">
        <div>
          <label class="form-label">Nome</label>
          <input class="form-control" type="text" name="nome" value="<?= htmlspecialchars($_SESSION['admin_nome'] ?? '') ?>" required>
        </div>
        <div>
          <label class="form-label">Usuario</label>
          <input class="form-control" type="text" id="perfilUsuario" name="usuario" value="<?= htmlspecialchars($_SESSION['admin_email'] ?? '') ?>" required>
        </div>
        <div>
          <label class="form-label">Email</label>
          <input class="form-control" type="email" name="email" value="<?= htmlspecialchars($_SESSION['admin_email'] ?? '') ?>" required>
        </div>
        <div>
          <label class="form-label">Nova senha</label>
          <div class="password-group">
            <input class="form-control" type="password" name="senha" id="perfilSenha">
            <button class="password-toggle" type="button" data-toggle="perfilSenha" aria-label="Mostrar senha">
              <svg viewBox="0 0 24 24"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="3.5"/></svg>
            </button>
          </div>
        </div>
        <div>
          <label class="form-label">Repita a senha</label>
          <div class="password-group">
            <input class="form-control" type="password" name="senha2" id="perfilSenha2">
            <button class="password-toggle" type="button" data-toggle="perfilSenha2" aria-label="Mostrar senha">
              <svg viewBox="0 0 24 24"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="3.5"/></svg>
            </button>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="action-btn ghost" type="button" data-close-modal>Cancelar</button>
        <button class="action-btn primary" type="submit">Salvar</button>
      </div>
      <div class="modal-msg" id="perfilMsg" aria-live="polite"></div>
    </form>
  </div>
</div>

<div class="settings-backdrop" id="settingsBackdrop" aria-hidden="true"></div>
<aside class="settings-drawer" id="settingsDrawer" aria-hidden="true">
  <div class="settings-header">
    <div>
      <h3>Personalizar painel</h3>
      <p>Ajuste a aparência do menu lateral.</p>
    </div>
    <button class="settings-close" type="button" id="closeSettings" aria-label="Fechar">&times;</button>
  </div>
  <div class="settings-body">
    <div>
      <div class="settings-title">Cor do menu</div>
      <div class="color-row" id="sidenavColors">
        <button class="color-dot" type="button" data-color="#405189" style="background:#405189" aria-label="Azul"></button>
        <button class="color-dot" type="button" data-color="#0ab39c" style="background:#0ab39c" aria-label="Verde"></button>
        <button class="color-dot" type="button" data-color="#7367f0" style="background:#7367f0" aria-label="Roxo"></button>
        <button class="color-dot" type="button" data-color="#f1963a" style="background:#f1963a" aria-label="Laranja"></button>
        <button class="color-dot" type="button" data-color="#e63770" style="background:#e63770" aria-label="Rosa"></button>
        <button class="color-dot" type="button" data-color="#64748b" style="background:#64748b" aria-label="Slate"></button>
      </div>
    </div>
    <div class="settings-divider"></div>
    <div>
      <div class="settings-title">Tipo do menu</div>
      <div class="settings-sub">Escolha entre os estilos de menu lateral.</div>
      <div class="type-row" id="sidenavTypes" style="margin-top:10px">
        <button class="type-btn" type="button" data-sidenav-type="dark">ESCURO</button>
        <button class="type-btn" type="button" data-sidenav-type="transparent">TRANSPARENTE</button>
        <button class="type-btn" type="button" data-sidenav-type="white">CLARO</button>
      </div>
    </div>
    <div class="settings-divider"></div>
    <div class="toggle-row" style="display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div class="settings-title" style="margin:0">Cabeçalho fixo</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="toggleNavbarFixed">
        <span class="slider"></span>
      </label>
    </div>
  </div>
</aside>

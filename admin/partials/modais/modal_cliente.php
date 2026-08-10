<div class="modal fade" id="modalCliente" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content rounded-4 border-0">

      <div class="modal-header border-0">
        <h5 class="modal-title">Novo cliente</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>

      <div class="modal-body">

        <div class="mb-3">
          <label class="form-label">Nome</label>
          <input type="text" id="cliNome" class="form-control rounded-pill">
        </div>

        <div class="mb-3">
          <label class="form-label">Telefone</label>
          <input type="text" id="cliTelefone" class="form-control rounded-pill">
        </div>

        <div class="mb-3">
          <label class="form-label">Endereço</label>
          <textarea id="cliEndereco" class="form-control rounded-3"></textarea>
        </div>

      </div>

      <div class="modal-footer border-0">
        <button class="btn btn-secondary rounded-pill" data-bs-dismiss="modal">
          Cancelar
        </button>
        <button class="btn btn-dark rounded-pill" onclick="salvarCliente()">
          Salvar cliente
        </button>
      </div>

    </div>
  </div>
</div>

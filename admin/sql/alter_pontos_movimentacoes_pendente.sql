ALTER TABLE pontos_movimentacoes
  MODIFY tipo ENUM('ganho','resgate','expirado','ajuste','pendente') NOT NULL;

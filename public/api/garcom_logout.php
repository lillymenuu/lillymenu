<?php
session_start();
$lojaId = (int) ($_SESSION['garcom_loja_id'] ?? 0);
unset($_SESSION['garcom_id'], $_SESSION['garcom_nome'], $_SESSION['garcom_loja_id']);
header('Location: ../garcom_login.php' . ($lojaId > 0 ? '?loja_id=' . $lojaId : ''));

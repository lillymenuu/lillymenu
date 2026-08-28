<?php
session_start();
$perfil = $_SESSION['admin_perfil'] ?? '';
session_destroy();
header("Location: " . ($perfil === 'superadmin' ? 'superadmin_login' : 'index.php'));

<?php
require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();
$dotenv->required(['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS']);

$host = $_ENV['DB_HOST'];
$db   = $_ENV['DB_NAME'];
$user = $_ENV['DB_USER'];
$pass = $_ENV['DB_PASS'];

try {
    $conn = new PDO(
        "mysql:host=$host;dbname=$db;charset=utf8mb4",
        $user,
        $pass
    );
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Sem isso, NOW()/CURDATE()/CURRENT_TIMESTAMP do MySQL seguem o fuso do
    // SERVIDOR do banco (SYSTEM), que raramente bate com o fuso do Brasil usado
    // no PHP (date_default_timezone_set('America/Fortaleza') em varios arquivos)
    // — causa pedidos/caixa com data/hora adiantada ou atrasada. -03:00 fixo
    // porque o Brasil nao tem mais horario de verao.
    $conn->exec("SET time_zone = '-03:00'");
} catch (PDOException $e) {
    die("Erro na conexão: " . $e->getMessage());
}

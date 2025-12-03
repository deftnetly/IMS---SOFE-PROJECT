<?php
$DB_HOST = 'localhost';
$DB_USER = 'root';  // Change to your actual user
$DB_PASS = '';      // Change to your actual password
$DB_NAME = 'ims_db';
$DB_PORT = 3306;

try {
    $pdo = new PDO("mysql:host={$DB_HOST};port={$DB_PORT};dbname={$DB_NAME};charset=utf8mb4",
                   $DB_USER, $DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    
    // Also create mysqli for backward compatibility with existing scripts
    $mysqli = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME, $DB_PORT);
    if ($mysqli->connect_error) {
        throw new Exception("MySQLi connection failed: " . $mysqli->connect_error);
    }
    $mysqli->set_charset("utf8mb4");
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>'DB connection failed: ' . $e->getMessage()]);
    exit;
}
?>

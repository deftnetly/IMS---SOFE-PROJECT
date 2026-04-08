<?php
// get_employees.php
header('Content-Type: application/json; charset=utf-8');

$paths = [
    __DIR__ . '/../../../database/db_connect.php',
    __DIR__ . '/../../database/db_connect.php',
    __DIR__ . '/../../../../src/database/db_connect.php'
];

$included = false;
foreach ($paths as $p) {
    if (file_exists($p)) {
        require_once $p;
        $included = true;
        break;
    }
}

if (!$included) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'db_connect.php not found']);
    exit;
}

try {
    $stmt = $pdo->query("SELECT employee_id, employee_code, full_name, email, phone, username, DATE_FORMAT(date_created, '%Y-%m-%d') AS date_created FROM employees ORDER BY employee_id DESC");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'employees' => $rows]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB error: '.$e->getMessage()]);
}
?>

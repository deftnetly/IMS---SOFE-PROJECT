<?php
// delete_employee.php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success'=>false,'message'=>'Only POST allowed']);
    exit;
}

$employee_code = trim($_POST['employee_code'] ?? '');
if (!$employee_code) {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'employee_code required']);
    exit;
}

try {
    $stmt = $pdo->prepare("DELETE FROM employees WHERE employee_code = ?");
    $stmt->execute([$employee_code]);
    echo json_encode(['success'=>true,'message'=>'Employee deleted']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'DB error: '.$e->getMessage()]);
}

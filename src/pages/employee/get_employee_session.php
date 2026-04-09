<?php
header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$isEmployee = ($_SESSION['role'] ?? '') === 'employee';

echo json_encode([
    'success' => true,
    'is_logged_in' => $isEmployee,
    'full_name' => $isEmployee ? ($_SESSION['full_name'] ?? '') : '',
    'username' => $isEmployee ? ($_SESSION['username'] ?? '') : '',
]);

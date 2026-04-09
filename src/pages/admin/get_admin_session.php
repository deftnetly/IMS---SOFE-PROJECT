<?php
header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$isAdmin = ($_SESSION['role'] ?? '') === 'admin';
$displayName = '';

if ($isAdmin) {
    $displayName = trim((string)($_SESSION['full_name'] ?? ''));
    if ($displayName === '') {
        $displayName = trim((string)($_SESSION['username'] ?? ''));
    }
}

echo json_encode([
    'success' => true,
    'is_logged_in' => $isAdmin,
    'display_name' => $displayName,
    'username' => $isAdmin ? ($_SESSION['username'] ?? '') : '',
]);

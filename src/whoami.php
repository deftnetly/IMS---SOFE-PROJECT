<?php
// whoami.php
header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) session_start();

// Safe JSON with minimal info (no secrets)
echo json_encode([
  'logged_in'    => !empty($_SESSION['username']) || !empty($_SESSION['employee_id']) || !empty($_SESSION['user_id']),
  'role'         => $_SESSION['role'] ?? null,
  'username'     => $_SESSION['username'] ?? null,
  'employee_id'  => isset($_SESSION['employee_id']) ? intval($_SESSION['employee_id']) : null,
  'full_name'    => $_SESSION['full_name'] ?? null
]);

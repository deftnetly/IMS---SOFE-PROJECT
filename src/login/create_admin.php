<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

$username = 'admin';
$password_plain = 'admin123'; // change this immediately
$email = 'admin@example.com';
$full_name = 'Administrator';

// check exists
$stmt = $pdo->prepare("SELECT admin_id FROM admins WHERE username = ?");
$stmt->execute([$username]);
if ($stmt->fetch()) {
    echo json_encode(['success' => false, 'message' => 'Admin already exists']);
    exit;
}

// hash password
$hash = password_hash($password_plain, PASSWORD_DEFAULT);

$ins = $pdo->prepare("INSERT INTO admins (username, password_hash, email, full_name) VALUES (?, ?, ?, ?)");
$ins->execute([$username, $hash, $email, $full_name]);

echo json_encode(['success' => true, 'message' => 'Admin created']);

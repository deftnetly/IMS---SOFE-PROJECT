<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../../../database/db_connect.php';

$input = json_decode(file_get_contents("php://input"), true);
$id = isset($input['id']) ? (int)$input['id'] : 0;
$name = trim($input['category_name'] ?? '');
$desc = trim($input['description'] ?? '');

if (!$id || $name === '') {
  echo json_encode(['success' => false, 'error' => 'Invalid input']);
  exit;
}

$stmt = $mysqli->prepare("UPDATE categories SET category_name = ?, description = ? WHERE id = ?");
$stmt->bind_param("ssi", $name, $desc, $id);

if ($stmt->execute()) {
  echo json_encode(['success' => true]);
} else {
  echo json_encode(['success' => false, 'error' => $mysqli->error]);
}

<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../../../database/db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);
$id = isset($input['id']) ? (int)$input['id'] : 0;
if (!$id) { echo json_encode(['success'=>false,'error'=>'Invalid ID']); exit; }

$stmt = $mysqli->prepare("DELETE FROM products WHERE id = ?");
$stmt->bind_param("i", $id);
if ($stmt->execute()) {
  echo json_encode(['success'=>true]);
} else {
  echo json_encode(['success'=>false,'error'=>$mysqli->error]);
}

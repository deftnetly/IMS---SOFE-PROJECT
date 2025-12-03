<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../../../database/db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);
$id = isset($input['id']) ? (int)$input['id'] : 0;
$name = trim($input['product_name'] ?? '');
$category_internal_id = isset($input['category_internal_id']) ? (int)$input['category_internal_id'] : null;
$price = isset($input['price']) ? (float)$input['price'] : 0.00;
$stock = isset($input['stock']) ? (int)$input['stock'] : 0;

if (!$id || $name === '') {
  echo json_encode(['success'=>false,'error'=>'Invalid input']);
  exit;
}

$stmt = $mysqli->prepare("UPDATE products SET product_name = ?, category_internal_id = ?, price = ?, stock = ? WHERE id = ?");
$stmt->bind_param("sidii", $name, $category_internal_id, $price, $stock, $id);

if ($stmt->execute()) {
  echo json_encode(['success'=>true]);
} else {
  echo json_encode(['success'=>false,'error'=>$mysqli->error]);
}

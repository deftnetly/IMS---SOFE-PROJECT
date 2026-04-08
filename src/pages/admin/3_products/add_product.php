<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../../../database/db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);
$name = trim($input['product_name'] ?? '');
$category_internal_id = isset($input['category_internal_id']) ? (int)$input['category_internal_id'] : null;
$price = isset($input['price']) ? (float)$input['price'] : 0.00;
$stock = isset($input['stock']) ? (int)$input['stock'] : 0;

if ($name === '') {
  echo json_encode(['success'=>false,'error'=>'Product name required']);
  exit;
}

$stmt = $mysqli->prepare("INSERT INTO products (product_name, category_internal_id, price, stock) VALUES (?, ?, ?, ?)");
if (!$stmt) {
    echo json_encode(['success'=>false,'error'=>$mysqli->error]);
    exit;
}
$stmt->bind_param("sidi", $name, $category_internal_id, $price, $stock);

if ($stmt->execute()) {
  $new_id = $mysqli->insert_id;
  $code = 'P' . str_pad($new_id, 3, '0', STR_PAD_LEFT);
  $mysqli->query("UPDATE products SET product_code = '" . $mysqli->real_escape_string($code) . "' WHERE id = " . $new_id);

  // return created product (joined with category info) — build category_code if needed
  $q = "
    SELECT p.id, p.product_code, p.product_name, p.price, p.stock, p.date_added,
           c.id AS category_internal_id, c.category_id AS category_number,
           CONCAT('C', LPAD(COALESCE(c.category_id,0),3,'0')) AS category_code, c.category_name
    FROM products p
    LEFT JOIN categories c ON p.category_internal_id = c.id
    WHERE p.id = " . (int)$new_id . " LIMIT 1";
  $r = $mysqli->query($q);
  if ($r) {
      $row = $r->fetch_assoc();
      echo json_encode(['success'=>true,'data'=>$row]);
  } else {
      echo json_encode(['success'=>true,'data'=>['id'=>$new_id,'product_code'=>$code,'product_name'=>$name,'price'=>$price,'stock'=>$stock]]);
  }
} else {
  echo json_encode(['success'=>false,'error'=>$mysqli->error]);
}

<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../../../database/db_connect.php';

$input = json_decode(file_get_contents("php://input"), true);
$name = trim($input['category_name'] ?? '');
$desc = trim($input['description'] ?? '');

if ($name === '') {
  echo json_encode(['success' => false, 'error' => 'Category name required']);
  exit;
}

// find smallest missing category_id (fills gaps)
$q = "
SELECT COALESCE(
  (SELECT t.category_id + 1
   FROM categories t
   LEFT JOIN categories t2 ON t.category_id + 1 = t2.category_id
   WHERE t2.category_id IS NULL
   ORDER BY t.category_id
   LIMIT 1),
  1
) AS next_id;
";
$r = $mysqli->query($q);
$row = $r->fetch_assoc();
$next_id = (int)$row['next_id'];

// prepare insert using internal id (auto) and given category_id
$stmt = $mysqli->prepare("INSERT INTO categories (category_id, category_name, description) VALUES (?, ?, ?)");
$stmt->bind_param("iss", $next_id, $name, $desc);

if ($stmt->execute()) {
  $new_internal_id = $mysqli->insert_id;
  echo json_encode([
    'success' => true,
    'data' => [
      'id' => $new_internal_id,
      'category_id' => $next_id,
      'category_name' => $name,
      'description' => $desc,
      'code' => 'C' . str_pad($next_id, 3, '0', STR_PAD_LEFT)
    ]
  ]);
} else {
  echo json_encode(['success' => false, 'error' => $mysqli->error]);
}

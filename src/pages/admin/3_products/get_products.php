<?php
header("Content-Type: application/json; charset=utf-8");

// try likely db_connect paths
$paths = [
    __DIR__ . '/../../../database/db_connect.php',
    __DIR__ . '/../../database/db_connect.php',
    __DIR__ . '/../../../../src/database/db_connect.php'
];

$included = false;
foreach ($paths as $p) {
    if (file_exists($p)) {
        require_once $p;
        $included = true;
        break;
    }
}

if (!$included) {
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>'db_connect.php not found']);
    exit;
}

if (!isset($mysqli) || !($mysqli instanceof mysqli)) {
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>'DB connection not available']);
    exit;
}

try {
    $sql = "
    SELECT 
      p.id, p.product_code, p.product_name, p.price, p.stock, p.date_added,
      c.id AS category_internal_id,
      c.category_id AS category_number,
      CONCAT('C', LPAD(COALESCE(c.category_id,0), 3, '0')) AS category_code,
      c.category_name
    FROM products p
    LEFT JOIN categories c ON p.category_internal_id = c.id
    ORDER BY p.id DESC
    ";

    $res = $mysqli->query($sql);
    if ($res === false) {
        throw new Exception("Query failed: " . $mysqli->error);
    }

    $data = [];
    while ($row = $res->fetch_assoc()) {
        $data[] = $row;
    }

    echo json_encode(['success'=>true,'data'=>$data]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
}
?>

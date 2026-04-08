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

try {
    $sql = "SELECT id, category_id, category_name, description
            FROM categories
            ORDER BY category_id ASC";
    $res = $mysqli->query($sql);
    
    if ($res === false) {
        throw new Exception("Query failed: " . $mysqli->error);
    }
    
    $data = [];
    while ($row = $res->fetch_assoc()) {
        $row['code'] = 'C' . str_pad($row['category_id'], 3, '0', STR_PAD_LEFT);
        $data[] = $row;
    }
    echo json_encode(['success' => true, 'data' => $data]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
}
?>

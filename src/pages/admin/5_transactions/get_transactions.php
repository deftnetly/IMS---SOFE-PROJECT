<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$paths = [
    __DIR__ . '/../../../database/db_connect.php',
    __DIR__ . '/../../database/db_connect.php',
    __DIR__ . '/../../../../src/database/db_connect.php'
];

$included = false;
$usedPath = null;
foreach ($paths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $included = true;
        $usedPath = $path;
        break;
    }
}

if (!$included) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'db_connect.php not found']);
    exit;
}

try {
    $whereParts = [];
    $params = [];

    if (!empty($_GET['date'])) {
        $whereParts[] = "DATE(t.date_time) = ?";
        $params[] = $_GET['date'];
    }

    if (!empty($_GET['employee'])) {
        $whereParts[] = "e.full_name = ?";
        $params[] = $_GET['employee'];
    }

    $whereSql = '';
    if (!empty($whereParts)) {
        $whereSql = ' WHERE ' . implode(' AND ', $whereParts);
    }

    $sql = "
      SELECT
        t.txn_id AS transaction_id,
        DATE_FORMAT(t.date_time, '%Y-%m-%d %H:%i:%s') AS transaction_date,
        COALESCE(t.total, t.subtotal, 0) AS total_amount,
        e.full_name AS employee_name
      FROM transactions t
      LEFT JOIN employees e ON e.employee_id = t.employee_id
      {$whereSql}
      ORDER BY t.date_time DESC
      LIMIT 1000
    ";

    if (isset($pdo) && $pdo instanceof PDO) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'transactions' => $rows, 'used_db_connect' => realpath($usedPath)]);
        exit;
    }

    if (isset($conn)) {
        if (!empty($params)) {
            $stmt = $conn->prepare($sql);
            $types = str_repeat('s', count($params));
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();
            $rows = $result->fetch_all(MYSQLI_ASSOC);
        } else {
            $result = $conn->query($sql);
            if ($result === false) {
                throw new Exception('MySQL error: ' . $conn->error);
            }
            $rows = $result->fetch_all(MYSQLI_ASSOC);
        }

        echo json_encode(['success' => true, 'transactions' => $rows, 'used_db_connect' => realpath($usedPath)]);
        exit;
    }

    throw new Exception('No DB connection ($pdo or $conn) found in db_connect.php');
} catch (Exception $ex) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB error: ' . $ex->getMessage()]);
    exit;
}

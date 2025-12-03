<?php
// get_transactions.php (robust replacement)
// Save this file and then hard-refresh the browser.

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// try common db_connect locations (adjust to your structure if needed)
$paths = [
    __DIR__ . '/db_connect.php',
    __DIR__ . '/../../../database/db_connect.php',
    __DIR__ . '/../../database/db_connect.php',
    __DIR__ . '/../../../../database/db_connect.php'
];

$inc = false;
$used_path = null;
foreach ($paths as $p) {
    if (file_exists($p)) {
        require_once $p;
        $inc = true;
        $used_path = $p;
        break;
    }
}

if (!$inc) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'db_connect.php not found','tried'=>$paths]);
    exit;
}

try {
    // date filter (optional)
    $where = '';
    $params = [];

    if (!empty($_GET['date'])) {
        // expect YYYY-MM-DD
        $where = " WHERE DATE(t.date_time) = ?";
        $params[] = $_GET['date'];
    }

    // Only select columns that exist in your schema.
    $sql = "
      SELECT
        t.txn_id AS transaction_id,
        DATE_FORMAT(t.date_time, '%Y-%m-%d %H:%i:%s') AS transaction_date,
        COALESCE(t.total, t.subtotal, 0) AS total_amount,
        e.full_name AS employee_name
      FROM transactions t
      LEFT JOIN employees e ON e.employee_id = t.employee_id
      {$where}
      ORDER BY t.date_time DESC
      LIMIT 1000
    ";

    if (isset($pdo) && $pdo instanceof PDO) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success'=>true,'transactions'=>$rows,'used_db_connect'=>realpath($used_path)]);
        exit;
    }

    if (isset($conn)) { // mysqli
        if (!empty($params)) {
            $stmt = $conn->prepare($sql);
            $stmt->bind_param('s', $params[0]);
            $stmt->execute();
            $res = $stmt->get_result();
            $rows = $res->fetch_all(MYSQLI_ASSOC);
        } else {
            $res = $conn->query($sql);
            if ($res === false) throw new Exception('MySQL error: ' . $conn->error);
            $rows = $res->fetch_all(MYSQLI_ASSOC);
        }
        echo json_encode(['success'=>true,'transactions'=>$rows,'used_db_connect'=>realpath($used_path)]);
        exit;
    }

    throw new Exception('No DB connection ($pdo or $conn) found in db_connect.php');

} catch (Exception $ex) {
    http_response_code(500);
    // debug friendly message for local dev; remove message content or hide in production
    echo json_encode(['success'=>false,'message'=>'DB error: '.$ex->getMessage()]);
    exit;
}

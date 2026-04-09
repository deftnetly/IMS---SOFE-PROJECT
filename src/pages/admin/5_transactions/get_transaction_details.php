<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 1);
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

$id = isset($_GET['id']) ? trim($_GET['id']) : null;
if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing id']);
    exit;
}

try {
    $transaction = null;
    $transactionNumericId = null;
    $transactionStringId = null;
    $items = [];

    if (isset($pdo) && $pdo instanceof PDO) {
        $stmt = $pdo->prepare("SELECT id, txn_id, DATE_FORMAT(date_time,'%Y-%m-%d %H:%i:%s') AS transaction_date, subtotal, tax, total, employee_id FROM transactions WHERE txn_id = ? LIMIT 1");
        $stmt->execute([$id]);
        $transaction = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$transaction && is_numeric($id)) {
            $stmt = $pdo->prepare("SELECT id, txn_id, DATE_FORMAT(date_time,'%Y-%m-%d %H:%i:%s') AS transaction_date, subtotal, tax, total, employee_id FROM transactions WHERE id = ? LIMIT 1");
            $stmt->execute([intval($id)]);
            $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        if (!$transaction) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Transaction not found']);
            exit;
        }

        $transactionNumericId = intval($transaction['id']);
        $transactionStringId = $transaction['txn_id'];

        $employeeName = null;
        if (!empty($transaction['employee_id'])) {
            $employeeStmt = $pdo->prepare("SELECT full_name FROM employees WHERE employee_id = ? LIMIT 1");
            $employeeStmt->execute([intval($transaction['employee_id'])]);
            $employeeRow = $employeeStmt->fetch(PDO::FETCH_ASSOC);
            $employeeName = $employeeRow['full_name'] ?? null;
        }

        $stmt = $pdo->prepare("SELECT ti.*, COALESCE(p.product_name, ti.product_name, '') AS product_name FROM transaction_items ti LEFT JOIN products p ON ti.product_id = p.id WHERE ti.transaction_id = ?");
        $stmt->execute([$transactionNumericId]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($items) && !empty($transactionStringId)) {
            $stmt = $pdo->prepare("SELECT ti.*, COALESCE(p.product_name, ti.product_name, '') AS product_name FROM transaction_items ti LEFT JOIN products p ON ti.product_id = p.id WHERE COALESCE(ti.txn_id, ti.txn, ti.transaction_id) = ?");
            $stmt->execute([$transactionStringId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        $outputTransaction = [
            'transaction_id' => $transaction['txn_id'] ?? null,
            'transaction_date' => $transaction['transaction_date'] ?? null,
            'subtotal' => $transaction['subtotal'] ?? null,
            'tax' => $transaction['tax'] ?? null,
            'total' => $transaction['total'] ?? $transaction['subtotal'] ?? null,
            'employee_id' => $transaction['employee_id'] ?? null,
            'employee_name' => $employeeName
        ];

        echo json_encode(['success' => true, 'transaction' => $outputTransaction, 'items' => $items, 'used_db_connect' => realpath($usedPath)]);
        exit;
    }

    if (isset($conn)) {
        $idEsc = $conn->real_escape_string($id);
        $query = "SELECT id, txn_id, DATE_FORMAT(date_time,'%Y-%m-%d %H:%i:%s') AS transaction_date, subtotal, tax, total, employee_id FROM transactions WHERE txn_id = '$idEsc' LIMIT 1";
        $result = $conn->query($query);

        if ((!$result || $result->num_rows === 0) && is_numeric($id)) {
            $query = "SELECT id, txn_id, DATE_FORMAT(date_time,'%Y-%m-%d %H:%i:%s') AS transaction_date, subtotal, tax, total, employee_id FROM transactions WHERE id = " . intval($id) . " LIMIT 1";
            $result = $conn->query($query);
        }

        if (!$result || $result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Transaction not found']);
            exit;
        }

        $transaction = $result->fetch_assoc();
        $transactionNumericId = intval($transaction['id']);
        $transactionStringId = $transaction['txn_id'];

        $employeeName = null;
        if (!empty($transaction['employee_id'])) {
            $employeeId = intval($transaction['employee_id']);
            $employeeResult = $conn->query("SELECT full_name FROM employees WHERE employee_id = $employeeId LIMIT 1");
            if ($employeeResult && $employeeRow = $employeeResult->fetch_assoc()) {
                $employeeName = $employeeRow['full_name'];
            }
        }

        $items = [];
        $itemsQuery = "SELECT ti.*, COALESCE(p.product_name, ti.product_name, '') AS product_name FROM transaction_items ti LEFT JOIN products p ON ti.product_id = p.id WHERE ti.transaction_id = " . intval($transactionNumericId);
        $itemsResult = $conn->query($itemsQuery);
        if ($itemsResult) {
            while ($row = $itemsResult->fetch_assoc()) {
                $items[] = $row;
            }
        }

        if (empty($items) && !empty($transactionStringId)) {
            $txnEsc = $conn->real_escape_string($transactionStringId);
            $itemsQuery = "SELECT ti.*, COALESCE(p.product_name, ti.product_name, '') AS product_name FROM transaction_items ti LEFT JOIN products p ON ti.product_id = p.id WHERE COALESCE(ti.txn_id, ti.txn, ti.transaction_id) = '$txnEsc'";
            $itemsResult = $conn->query($itemsQuery);
            if ($itemsResult) {
                while ($row = $itemsResult->fetch_assoc()) {
                    $items[] = $row;
                }
            }
        }

        $outputTransaction = [
            'transaction_id' => $transaction['txn_id'] ?? null,
            'transaction_date' => $transaction['transaction_date'] ?? null,
            'subtotal' => $transaction['subtotal'] ?? null,
            'tax' => $transaction['tax'] ?? null,
            'total' => $transaction['total'] ?? $transaction['subtotal'] ?? null,
            'employee_id' => $transaction['employee_id'] ?? null,
            'employee_name' => $employeeName
        ];

        echo json_encode(['success' => true, 'transaction' => $outputTransaction, 'items' => $items, 'used_db_connect' => realpath($usedPath)]);
        exit;
    }

    throw new Exception('No DB connection');
} catch (Exception $ex) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB error: ' . $ex->getMessage()]);
    exit;
}

<?php
// get_transaction_details.php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors',1);
error_reporting(E_ALL);

// include db_connect (try common relative paths)
$paths = [
  __DIR__ . '/db_connect.php',
  __DIR__ . '/../../../database/db_connect.php',
  __DIR__ . '/../../database/db_connect.php',
  __DIR__ . '/../../../../database/db_connect.php'
];
$inc = false;
$used_path = null;
foreach ($paths as $p) {
  if (file_exists($p)) { require_once $p; $inc = true; $used_path = $p; break; }
}
if (!$inc) { http_response_code(500); echo json_encode(['success'=>false,'message'=>'db_connect.php not found']); exit; }

$id = isset($_GET['id']) ? trim($_GET['id']) : null;
if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Missing id']); exit; }

try {
  // We'll locate transaction and include employee name
  $transaction = null;
  $txNumericId = null;
  $txnString = null;
  $items = [];

  if (isset($pdo) && $pdo instanceof PDO) {
    // try by txn_id (string)
    $stmt = $pdo->prepare("SELECT id, txn_id, DATE_FORMAT(date_time,'%Y-%m-%d %H:%i:%s') AS transaction_date, subtotal, tax, total, employee_id FROM transactions WHERE txn_id = ? LIMIT 1");
    $stmt->execute([$id]);
    $transaction = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$transaction && is_numeric($id)) {
      $stmt = $pdo->prepare("SELECT id, txn_id, DATE_FORMAT(date_time,'%Y-%m-%d %H:%i:%s') AS transaction_date, subtotal, tax, total, employee_id FROM transactions WHERE id = ? LIMIT 1");
      $stmt->execute([intval($id)]);
      $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$transaction) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'Transaction not found']); exit; }

    $txNumericId = intval($transaction['id']);
    $txnString = $transaction['txn_id'];

    // get employee name if exists
    $employee_name = null;
    if (!empty($transaction['employee_id'])) {
      $s = $pdo->prepare("SELECT full_name FROM employees WHERE employee_id = ? LIMIT 1");
      $s->execute([intval($transaction['employee_id'])]);
      $er = $s->fetch(PDO::FETCH_ASSOC);
      $employee_name = $er['full_name'] ?? null;
    }

    // fetch items by numeric fk first
    $stmt = $pdo->prepare("SELECT ti.*, COALESCE(p.product_name, ti.product_name, '') AS product_name FROM transaction_items ti LEFT JOIN products p ON ti.product_id = p.id WHERE ti.transaction_id = ?");
    $stmt->execute([$txNumericId]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // fallback: if no items found, try matching string txn id columns
    if (empty($items) && !empty($txnString)) {
      $stmt = $pdo->prepare("SELECT ti.*, COALESCE(p.product_name, ti.product_name, '') AS product_name FROM transaction_items ti LEFT JOIN products p ON ti.product_id = p.id WHERE COALESCE(ti.txn_id, ti.txn, ti.transaction_id) = ?");
      $stmt->execute([$txnString]);
      $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    $outTransaction = [
      'transaction_id' => $transaction['txn_id'] ?? null,
      'transaction_date' => $transaction['transaction_date'] ?? null,
      'subtotal' => $transaction['subtotal'] ?? null,
      'tax' => $transaction['tax'] ?? null,
      'total' => $transaction['total'] ?? $transaction['subtotal'] ?? null,
      'employee_id' => $transaction['employee_id'] ?? null,
      'employee_name' => $employee_name
    ];

    echo json_encode(['success'=>true,'transaction'=>$outTransaction,'items'=>$items,'used_db_connect'=>realpath($used_path)]);
    exit;
  }

  // mysqli path
  if (isset($conn)) {
    $idEsc = $conn->real_escape_string($id);
    $q = "SELECT id, txn_id, DATE_FORMAT(date_time,'%Y-%m-%d %H:%i:%s') AS transaction_date, subtotal, tax, total, employee_id FROM transactions WHERE txn_id = '$idEsc' LIMIT 1";
    $res = $conn->query($q);
    if (!$res || $res->num_rows === 0) {
      if (is_numeric($id)) {
        $q2 = "SELECT id, txn_id, DATE_FORMAT(date_time,'%Y-%m-%d %H:%i:%s') AS transaction_date, subtotal, tax, total, employee_id FROM transactions WHERE id = " . intval($id) . " LIMIT 1";
        $res = $conn->query($q2);
      }
    }
    if (!$res || $res->num_rows === 0) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'Transaction not found']); exit; }
    $transaction = $res->fetch_assoc();
    $txNumericId = intval($transaction['id']);
    $txnString = $transaction['txn_id'];

    // employee
    $employee_name = null;
    if (!empty($transaction['employee_id'])) {
      $eEsc = intval($transaction['employee_id']);
      $re = $conn->query("SELECT full_name FROM employees WHERE employee_id = $eEsc LIMIT 1");
      if ($re && $er = $re->fetch_assoc()) $employee_name = $er['full_name'];
    }

    // items by numeric id
    $items = [];
    $q3 = "SELECT ti.*, COALESCE(p.product_name, ti.product_name, '') AS product_name FROM transaction_items ti LEFT JOIN products p ON ti.product_id = p.id WHERE ti.transaction_id = " . intval($txNumericId);
    $res3 = $conn->query($q3);
    if ($res3) while ($r = $res3->fetch_assoc()) $items[] = $r;

    if (empty($items) && !empty($txnString)) {
      $txnEsc = $conn->real_escape_string($txnString);
      $q4 = "SELECT ti.*, COALESCE(p.product_name, ti.product_name, '') AS product_name FROM transaction_items ti LEFT JOIN products p ON ti.product_id = p.id WHERE COALESCE(ti.txn_id, ti.txn, ti.transaction_id) = '$txnEsc'";
      $res4 = $conn->query($q4);
      if ($res4) while ($r = $res4->fetch_assoc()) $items[] = $r;
    }

    $outTransaction = [
      'transaction_id' => $transaction['txn_id'] ?? null,
      'transaction_date' => $transaction['transaction_date'] ?? null,
      'subtotal' => $transaction['subtotal'] ?? null,
      'tax' => $transaction['tax'] ?? null,
      'total' => $transaction['total'] ?? $transaction['subtotal'] ?? null,
      'employee_id' => $transaction['employee_id'] ?? null,
      'employee_name' => $employee_name
    ];

    echo json_encode(['success'=>true,'transaction'=>$outTransaction,'items'=>$items,'used_db_connect'=>realpath($used_path)]);
    exit;
  }

  throw new Exception('No DB connection');

} catch (Exception $ex) {
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'DB error: '.$ex->getMessage()]);
  exit;
}

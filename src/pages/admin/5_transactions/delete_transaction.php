<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors',1);
ini_set('display_startup_errors',1);
error_reporting(E_ALL);

// INCLUDE DB
$paths = [
  __DIR__ . '/../../../database/db_connect.php',
  __DIR__ . '/../../database/db_connect.php',
  __DIR__ . '/../../../../src/database/db_connect.php'
];
foreach ($paths as $p) {
  if (file_exists($p)) { require_once $p; break; }
}

$id = $_POST['id'] ?? null;
if (!$id) {
  echo json_encode(['success'=>false,'message'=>'Missing ID']);
  exit;
}

// DELETE: transaction_items → purchase_history → transactions
try {
  if (isset($pdo)) {
    $pdo->prepare("DELETE FROM transaction_items WHERE txn_id = ?")->execute([$id]);
    $pdo->prepare("DELETE FROM purchase_history WHERE transactionID = ?")->execute([$id]);
    $pdo->prepare("DELETE FROM transactions WHERE txn_id = ?")->execute([$id]);

  } else {
    $st = $conn->prepare("DELETE FROM transaction_items WHERE txn_id = ?");
    $st->bind_param("s",$id);
    $st->execute();

    $st = $conn->prepare("DELETE FROM purchase_history WHERE transactionID = ?");
    $st->bind_param("s",$id);
    $st->execute();

    $st = $conn->prepare("DELETE FROM transactions WHERE txn_id = ?");
    $st->bind_param("s",$id);
    $st->execute();
  }

  echo json_encode(['success'=>true]);
} catch (Exception $e) {
  echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
}

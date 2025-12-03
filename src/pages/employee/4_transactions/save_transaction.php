<?php
// save_transaction.php
// Accepts JSON { txn_id, items: [{ product_id|productid|product, product_name?, qty|quantity|qty, price }], subtotal?, tax?, total? }
// Inserts into transactions and transaction_items and decrements product stock atomically.
// Prevents checkout when stock is insufficient.
// Defensive: checks prepare() results before calling ->close()

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Shutdown handler to return fatal errors as JSON (debugging)
register_shutdown_function(function(){
    $err = error_get_last();
    if ($err !== null) {
        http_response_code(500);
        $resp = [
            'success' => false,
            'fatal' => true,
            'type' => $err['type'] ?? null,
            'message' => $err['message'] ?? 'Unknown fatal error',
            'file' => $err['file'] ?? null,
            'line' => $err['line'] ?? null
        ];
        echo json_encode($resp);
        exit;
    }
});
set_error_handler(function($errno, $errstr, $errfile, $errline){
    // convert non-fatal errors to exceptions so shutdown handler can catch
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

// --- locate db_connect.php (flexible path approach) ---
$paths = [
    __DIR__ . '/db_connect.php',
    __DIR__ . '/../../../database/db_connect.php',
    __DIR__ . '/../../database/db_connect.php',
    __DIR__ . '/../../../../database/db_connect.php'
];
$found = false; $used_db = null;
foreach ($paths as $p) {
    if (file_exists($p)) { require_once $p; $found = true; $used_db = $p; break; }
}
if (!$found) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'db_connect.php not found','tried'=>$paths]);
    exit;
}

// read JSON payload
$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'Invalid JSON payload']);
    exit;
}

$txnId = trim($payload['txn_id'] ?? '');
$items = $payload['items'] ?? [];
if ($txnId === '' || !is_array($items) || count($items) === 0) {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'txn_id and items required']);
    exit;
}

// compute totals if not provided
$subtotal = isset($payload['subtotal']) ? floatval($payload['subtotal']) : 0.0;
if ($subtotal <= 0) {
    foreach ($items as $it) {
        $q = floatval($it['quantity'] ?? ($it['qty'] ?? 0));
        $p = floatval($it['price'] ?? ($it['unit_price'] ?? 0));
        $subtotal += $q * $p;
    }
}
$tax = isset($payload['tax']) ? floatval($payload['tax']) : round($subtotal * 0.12, 2);
$total = isset($payload['total']) ? floatval($payload['total']) : round($subtotal + $tax, 2);

// find employee id from session
if (session_status() === PHP_SESSION_NONE) session_start();
$employeeId = null;
$employeeName = null;

if (!empty($_SESSION['employee_id'])) {
    $employeeId = intval($_SESSION['employee_id']);
} elseif (!empty($_SESSION['username'])) {
    $username = $_SESSION['username'];
    if (isset($mysqli) && $mysqli instanceof mysqli) {
        $stmt = $mysqli->prepare("SELECT employee_id, full_name FROM employees WHERE username = ? LIMIT 1");
        if ($stmt) {
            $stmt->bind_param("s", $username);
            $stmt->execute();
            $res = $stmt->get_result();
            if ($row = $res->fetch_assoc()) {
                $employeeId = intval($row['employee_id']);
                $employeeName = $row['full_name'] ?? null;
            }
            $stmt->close();
        }
    } elseif (isset($pdo) && $pdo instanceof PDO) {
        $s = $pdo->prepare("SELECT employee_id, full_name FROM employees WHERE username = ? LIMIT 1");
        $s->execute([$username]);
        if ($r = $s->fetch(PDO::FETCH_ASSOC)) {
            $employeeId = intval($r['employee_id']);
            $employeeName = $r['full_name'] ?? null;
        }
    }
}
if (empty($employeeName) && !empty($_SESSION['full_name'])) $employeeName = $_SESSION['full_name'];

// --- Helper: respond with JSON and exit ---
function fail_json($code, $payload) {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

try {
    // --------- MySQLi path (preferred if available) ----------
    if (isset($mysqli) && $mysqli instanceof mysqli) {
        // Start transaction
        if (!$mysqli->begin_transaction()) {
            throw new Exception("Failed to start DB transaction: " . $mysqli->error);
        }

        // Insert transaction header
        if ($employeeId === null) {
            $ins = $mysqli->prepare("INSERT INTO transactions (txn_id, date_time, subtotal, tax, total) VALUES (?, NOW(), ?, ?, ?)");
            if (!$ins) throw new Exception("Prepare failed (transactions): " . $mysqli->error);
            $ins->bind_param("sddd", $txnId, $subtotal, $tax, $total);
        } else {
            $ins = $mysqli->prepare("INSERT INTO transactions (txn_id, employee_id, date_time, subtotal, tax, total) VALUES (?, ?, NOW(), ?, ?, ?)");
            if (!$ins) throw new Exception("Prepare failed (transactions): " . $mysqli->error);
            $ins->bind_param("siddd", $txnId, $employeeId, $subtotal, $tax, $total);
        }
        if (!$ins->execute()) {
            $ins->close();
            $mysqli->rollback();
            throw new Exception("Insert transaction failed: " . $ins->error);
        }
        $transNumericId = (int)$mysqli->insert_id;
        $ins->close();

        // prepare insert for transaction_items
        $itStmt = $mysqli->prepare("INSERT INTO transaction_items (transaction_id, product_id, product_name, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?)");
        if (!$itStmt) {
            $mysqli->rollback();
            throw new Exception("Prepare failed (items): " . $mysqli->error);
        }

        // prepare stock update statements (three variants: product_code, id, productid)
        $updByCode = $mysqli->prepare("UPDATE products SET stock = stock - ? WHERE product_code = ? AND stock >= ?");
        if (!$updByCode) { $updByCode = null; } // normalize to null if prepare failed

        $updById = $mysqli->prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?");
        if (!$updById) { $updById = null; }

        $updByProductId = $mysqli->prepare("UPDATE products SET stock = stock - ? WHERE productid = ? AND stock >= ?");
        if (!$updByProductId) { $updByProductId = null; }

        // If none of the update statements prepared successfully, that's a problem.
        if ($updByCode === null && $updById === null && $updByProductId === null) {
            $itStmt->close();
            $mysqli->rollback();
            throw new Exception("Failed to prepare any stock-update statements. Check your products table columns.");
        }

        // iterate items: insert item row then decrement stock (fail if insufficient)
        foreach ($items as $it) {
            $prodIdRaw = (string)($it['product_id'] ?? $it['productid'] ?? $it['product'] ?? $it['id'] ?? '');
            $prodName = (string)($it['product_name'] ?? $it['productname'] ?? $it['name'] ?? '');
            $qty = intval($it['quantity'] ?? $it['qty'] ?? 0);
            $price = floatval($it['price'] ?? $it['unit_price'] ?? $it['amount'] ?? 0);
            $sub = floatval($it['subtotal'] ?? ($qty * $price));

            // validate
            if ($qty <= 0) {
                if (is_object($itStmt) && $itStmt instanceof mysqli_stmt) $itStmt->close();
                if (is_object($updByCode) && $updByCode instanceof mysqli_stmt) $updByCode->close();
                if (is_object($updById) && $updById instanceof mysqli_stmt) $updById->close();
                if (is_object($updByProductId) && $updByProductId instanceof mysqli_stmt) $updByProductId->close();
                $mysqli->rollback();
                throw new Exception("Invalid quantity for product: " . $prodIdRaw);
            }

            // insert transaction_items
            $itStmt->bind_param("issidd", $transNumericId, $prodIdRaw, $prodName, $qty, $price, $sub);
            if (!$itStmt->execute()) {
                if (is_object($itStmt) && $itStmt instanceof mysqli_stmt) $itStmt->close();
                if (is_object($updByCode) && $updByCode instanceof mysqli_stmt) $updByCode->close();
                if (is_object($updById) && $updById instanceof mysqli_stmt) $updById->close();
                if (is_object($updByProductId) && $updByProductId instanceof mysqli_stmt) $updByProductId->close();
                $mysqli->rollback();
                throw new Exception("Insert item failed: " . $itStmt->error);
            }

            // attempt to decrement stock:
            $updated = 0;

            // 1) try product_code if prepared
            if (is_object($updByCode) && $updByCode instanceof mysqli_stmt) {
                $updByCode->bind_param("isi", $qty, $prodIdRaw, $qty);
                if (!$updByCode->execute()) {
                    if (is_object($itStmt) && $itStmt instanceof mysqli_stmt) $itStmt->close();
                    if (is_object($updByCode) && $updByCode instanceof mysqli_stmt) $updByCode->close();
                    if (is_object($updById) && $updById instanceof mysqli_stmt) $updById->close();
                    if (is_object($updByProductId) && $updByProductId instanceof mysqli_stmt) $updByProductId->close();
                    $mysqli->rollback();
                    throw new Exception("Update stock (by code) failed: " . $updByCode->error);
                }
                $updated = $updByCode->affected_rows;
            }

            // 2) fallback to numeric id if nothing updated and prodIdRaw is numeric
            if ($updated === 0 && ctype_digit($prodIdRaw) && is_object($updById) && $updById instanceof mysqli_stmt) {
                $prodIdInt = intval($prodIdRaw);
                $updById->bind_param("iii", $qty, $prodIdInt, $qty);
                if (!$updById->execute()) {
                    if (is_object($itStmt) && $itStmt instanceof mysqli_stmt) $itStmt->close();
                    if (is_object($updByCode) && $updByCode instanceof mysqli_stmt) $updByCode->close();
                    if (is_object($updById) && $updById instanceof mysqli_stmt) $updById->close();
                    if (is_object($updByProductId) && $updByProductId instanceof mysqli_stmt) $updByProductId->close();
                    $mysqli->rollback();
                    throw new Exception("Update stock (by id) failed: " . $updById->error);
                }
                $updated = $updById->affected_rows;
            }

            // 3) fallback to productid column (string) if still zero and statement exists
            if ($updated === 0 && is_object($updByProductId) && $updByProductId instanceof mysqli_stmt) {
                $updByProductId->bind_param("isi", $qty, $prodIdRaw, $qty);
                if (!$updByProductId->execute()) {
                    if (is_object($itStmt) && $itStmt instanceof mysqli_stmt) $itStmt->close();
                    if (is_object($updByCode) && $updByCode instanceof mysqli_stmt) $updByCode->close();
                    if (is_object($updById) && $updById instanceof mysqli_stmt) $updById->close();
                    if (is_object($updByProductId) && $updByProductId instanceof mysqli_stmt) $updByProductId->close();
                    $mysqli->rollback();
                    throw new Exception("Update stock (by productid) failed: " . $updByProductId->error);
                }
                $updated = $updByProductId->affected_rows;
            }

            // if still 0 -> insufficient stock or product not found
            if ($updated === 0) {
                if (is_object($itStmt) && $itStmt instanceof mysqli_stmt) $itStmt->close();
                if (is_object($updByCode) && $updByCode instanceof mysqli_stmt) $updByCode->close();
                if (is_object($updById) && $updById instanceof mysqli_stmt) $updById->close();
                if (is_object($updByProductId) && $updByProductId instanceof mysqli_stmt) $updByProductId->close();
                $mysqli->rollback();
                throw new Exception("Insufficient stock or product not found for identifier '{$prodIdRaw}' (needed {$qty}).");
            }
        } // end foreach items

        // close stmt handles (only if valid objects)
        if (is_object($itStmt) && $itStmt instanceof mysqli_stmt) $itStmt->close();
        if (is_object($updByCode) && $updByCode instanceof mysqli_stmt) $updByCode->close();
        if (is_object($updById) && $updById instanceof mysqli_stmt) $updById->close();
        if (is_object($updByProductId) && $updByProductId instanceof mysqli_stmt) $updByProductId->close();

        // commit
        if (!$mysqli->commit()) {
            $mysqli->rollback();
            throw new Exception("Commit failed: " . $mysqli->error);
        }

        // success response
        echo json_encode([
            'success' => true,
            'transaction_id' => $txnId,
            'transaction_numeric_id' => $transNumericId,
            'subtotal' => number_format((float)$subtotal, 2, '.', ''),
            'tax' => number_format((float)$tax, 2, '.', ''),
            'total' => number_format((float)$total, 2, '.', ''),
            'employee_id' => $employeeId,
            'employee_name' => $employeeName
        ]);
        exit;
    }

    // --------- PDO fallback ----------
    if (isset($pdo) && $pdo instanceof PDO) {
        $pdo->beginTransaction();

        if ($employeeId === null) {
            $stmt = $pdo->prepare("INSERT INTO transactions (txn_id, date_time, subtotal, tax, total) VALUES (?, NOW(), ?, ?, ?)");
            $stmt->execute([$txnId, $subtotal, $tax, $total]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO transactions (txn_id, employee_id, date_time, subtotal, tax, total) VALUES (?, ?, NOW(), ?, ?, ?)");
            $stmt->execute([$txnId, $employeeId, $subtotal, $tax, $total]);
        }
        $transNumericId = intval($pdo->lastInsertId());

        $itStmt = $pdo->prepare("INSERT INTO transaction_items (transaction_id, product_id, product_name, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?)");

        // prepare update statements
        $updByCodeStmt = $pdo->prepare("UPDATE products SET stock = stock - :qty WHERE product_code = :code AND stock >= :qty_check");
        $updByIdStmt   = $pdo->prepare("UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :qty_check");
        // productid variant (if column exists)
        try {
            $updByProductIdStmt = $pdo->prepare("UPDATE products SET stock = stock - :qty WHERE productid = :pid AND stock >= :qty_check");
        } catch (Exception $e) {
            $updByProductIdStmt = null;
        }

        if ($updByCodeStmt === false && $updByIdStmt === false && $updByProductIdStmt === null) {
            $pdo->rollBack();
            throw new Exception("Failed to prepare any stock-update statements (PDO). Check your products table columns.");
        }

        foreach ($items as $it) {
            $prodIdRaw = (string)($it['product_id'] ?? $it['productid'] ?? $it['product'] ?? $it['id'] ?? '');
            $prodName = (string)($it['product_name'] ?? $it['productname'] ?? $it['name'] ?? '');
            $qty = intval($it['quantity'] ?? $it['qty'] ?? 0);
            $price = floatval($it['price'] ?? $it['unit_price'] ?? $it['amount'] ?? 0);
            $sub = floatval($it['subtotal'] ?? ($qty * $price));

            if ($qty <= 0) {
                $pdo->rollBack();
                fail_json(400, ['success'=>false,'message'=>"Invalid quantity for product {$prodIdRaw}"]);
            }

            // insert item row
            $itStmt->execute([$transNumericId, $prodIdRaw, $prodName, $qty, $price, $sub]);

            // attempt decrement
            $updated = 0;
            // try product_code
            $updByCodeStmt->execute([':qty' => $qty, ':code' => $prodIdRaw, ':qty_check' => $qty]);
            $updated = $updByCodeStmt->rowCount();

            // fallback numeric id
            if ($updated === 0 && ctype_digit($prodIdRaw)) {
                $updByIdStmt->execute([':qty' => $qty, ':id' => intval($prodIdRaw), ':qty_check' => $qty]);
                $updated = $updByIdStmt->rowCount();
            }

            // fallback productid
            if ($updated === 0 && $updByProductIdStmt !== null) {
                $updByProductIdStmt->execute([':qty' => $qty, ':pid' => $prodIdRaw, ':qty_check' => $qty]);
                $updated = $updByProductIdStmt->rowCount();
            }

            if ($updated === 0) {
                $pdo->rollBack();
                fail_json(409, ['success'=>false,'message'=>"Insufficient stock or product not found for identifier '{$prodIdRaw}' (needed {$qty})."]);
            }
        }

        // commit
        $pdo->commit();

        echo json_encode([
            'success' => true,
            'transaction_id' => $txnId,
            'transaction_numeric_id' => $transNumericId,
            'subtotal' => number_format((float)$subtotal, 2, '.', ''),
            'tax' => number_format((float)$tax, 2, '.', ''),
            'total' => number_format((float)$total, 2, '.', ''),
            'employee_id' => $employeeId,
            'employee_name' => $employeeName
        ]);
        exit;
    }

    throw new Exception('No DB connection available ($mysqli or $pdo).');

} catch (Exception $e) {
    // try to rollback if mysqli is active and in transaction
    if (isset($mysqli) && $mysqli instanceof mysqli) {
        @ $mysqli->rollback();
    }
    if (isset($pdo) && $pdo instanceof PDO) {
        try { $pdo->rollBack(); } catch (Exception $ex) { /* ignore */ }
    }
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Server error: '.$e->getMessage()]);
    exit;
}

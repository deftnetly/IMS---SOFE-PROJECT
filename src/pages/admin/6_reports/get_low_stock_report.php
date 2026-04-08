<?php
// robust get_low_stock_report.php — status mapping: 0=Unavailable, <=20=Critical, <=40=Low, >40=Available
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', '0');
error_reporting(E_ALL);
ob_start();

try {
    // try to include db_connect.php from several likely locations
    $dbCandidates = [
        __DIR__ . '/../../../database/db_connect.php',
        __DIR__ . '/../../../../src/database/db_connect.php',
        __DIR__ . '/../../database/db_connect.php',
        __DIR__ . '/db_connect.php',
    ];
    $included = false;
    foreach ($dbCandidates as $p) {
        if (file_exists($p)) {
            require_once $p;
            $included = true;
            break;
        }
    }

    if (!$included) {
        $debug = ob_get_clean();
        echo json_encode([
            'success' => false,
            'error' => 'db_connect.php was not found. Tried paths: ' . implode(' | ', $dbCandidates),
            'debug_output' => substr($debug,0,1000)
        ]);
        exit;
    }

    // detect DB handle (PDO or mysqli) among globals
    $db_is_pdo = false; $db_is_mysqli = false;
    $pdoHandle = null; $mysqliHandle = null;

    foreach ($GLOBALS as $name => $val) {
        if ($val instanceof PDO) { $pdoHandle = $val; $db_is_pdo = true; break; }
        if ($val instanceof mysqli) { $mysqliHandle = $val; $db_is_mysqli = true; break; }
    }

    if (!$db_is_pdo && !$db_is_mysqli) {
        foreach (['db','pdo','dbh','conn','connection','mysqli','link','db_conn'] as $n) {
            if (isset($$n)) {
                if ($$n instanceof PDO) { $pdoHandle = $$n; $db_is_pdo = true; break; }
                if ($$n instanceof mysqli) { $mysqliHandle = $$n; $db_is_mysqli = true; break; }
            }
        }
    }

    if (!$db_is_pdo && !$db_is_mysqli) {
        $debug = ob_get_clean();
        $available = array_keys($GLOBALS);
        echo json_encode([
            'success' => false,
            'error' => 'No PDO or mysqli DB handle found after including db_connect.php.',
            'tried_variable_names' => ['db','pdo','dbh','conn','connection','mysqli','link','db_conn'],
            'available_globals_sample' => array_slice($available,0,30),
            'debug_output' => substr($debug,0,1000)
        ]);
        exit;
    }

    // Read request params
    $start = isset($_GET['start']) && $_GET['start'] !== '' ? trim($_GET['start']) : null;
    $end   = isset($_GET['end'])   && $_GET['end'] !== ''   ? trim($_GET['end'])   : null;
    $useDate = ($start && $end);
    $start_dt = $useDate ? ($start . ' 00:00:00') : null;
    $end_dt   = $useDate ? ($end   . ' 23:59:59') : null;

    // thresholds are implicit in status mapping below (no GET params needed)
    $sql = "
      SELECT
        p.product_code AS product_id,
        p.product_name,
        COALESCE(c.category_name, 'Uncategorized') AS category,
        COALESCE(p.stock, 0) AS current_stock,
        COALESCE((
          SELECT SUM(ti.quantity) FROM transaction_items ti
          JOIN transactions t ON ti.transaction_id = t.id
          WHERE ti.product_id = p.product_code
          " . ($useDate ? " AND (t.date_time BETWEEN ? AND ?) " : "") . "
        ), 0) AS sold_in_range
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_internal_id
      ORDER BY current_stock ASC, sold_in_range DESC
      LIMIT 1000
    ";

    $rows = [];
    if ($db_is_pdo && $pdoHandle) {
        $stmt = $pdoHandle->prepare($sql);
        if ($useDate) {
            $stmt->bindValue(1, $start_dt);
            $stmt->bindValue(2, $end_dt);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } elseif ($db_is_mysqli && $mysqliHandle) {
        if ($useDate) {
            $stmt = $mysqliHandle->prepare($sql);
            if (!$stmt) throw new Exception('mysqli prepare failed: ' . $mysqliHandle->error);
            $stmt->bind_param('ss', $start_dt, $end_dt);
            $stmt->execute();
            $res = $stmt->get_result();
            while ($r = $res->fetch_assoc()) $rows[] = $r;
            $res->free();
            $stmt->close();
        } else {
            $res = $mysqliHandle->query($sql);
            if (!$res) throw new Exception('mysqli query failed: ' . $mysqliHandle->error);
            while ($r = $res->fetch_assoc()) $rows[] = $r;
            $res->free();
        }
    } else {
        throw new Exception('No supported DB handle available.');
    }

    $items = [];
    foreach ($rows as $r) {
        $stock = intval($r['current_stock'] ?? 0);
        // status mapping per your rules:
        // 0 => Unavailable (red)
        // <=20 => Critical (red)
        // <=40 => Low/Warning (orange)
        // >40 => Available (green)
        if ($stock === 0) {
            $status = 'Unavailable';
        } elseif ($stock <= 20) {
            $status = 'Critical';
        } elseif ($stock <= 40) {
            $status = 'Low';
        } else {
            $status = 'Available';
        }

        // include only low / critical / unavailable (i.e. stock <= 40 or 0)
        if ($stock === 0 || $stock <= 40) {
            $items[] = [
                'product_id' => isset($r['product_id']) ? (string)$r['product_id'] : '',
                'product_name' => isset($r['product_name']) ? (string)$r['product_name'] : '',
                'category' => isset($r['category']) ? (string)$r['category'] : '',
                'current_stock' => $stock,
                'sold_in_range' => intval($r['sold_in_range'] ?? 0),
                'status' => $status
            ];
        }
    }

    $debug = ob_get_clean();
    echo json_encode([
        'success' => true,
        'meta' => [
            'start' => $start,
            'end' => $end,
            'returned' => count($items)
        ],
        'debug_output' => substr($debug,0,1000),
        'items' => $items
    ]);
    exit;
} catch (Exception $ex) {
    $out = ob_get_clean();
    echo json_encode(['success' => false, 'error' => $ex->getMessage(), 'debug_output' => substr($out,0,2000)]);
    exit;
}

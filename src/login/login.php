<?php
// login.php
header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) session_start();

// include DB connect
require_once __DIR__ . '/../database/db_connect.php';

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
    exit;
}

$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';

if ($username === '' || $password === '') {
    echo json_encode(['success' => false, 'message' => 'Username and password required']);
    exit;
}

try {
    // *************** ADMIN LOGIN (PLAIN TEXT) ***************
    $stmt = $pdo->prepare("
        SELECT admin_id AS id, username, password_hash
        FROM admin
        WHERE username = :u
        LIMIT 1
    ");
    $stmt->execute([':u' => $username]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($admin) {
        // Compare plain text directly (project stores admin password in plain text)
        if ($password === $admin['password_hash']) {
            // set admin session
            $_SESSION['user_id']  = $admin['id'];
            $_SESSION['username'] = $admin['username'];
            $_SESSION['role']     = 'admin';

            echo json_encode([
                'success' => true,
                'redirect' => '/smart-inventory/src/pages/admin/Admin.html'
            ]);
            exit;
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid username or password']);
            exit;
        }
    }

    // *************** EMPLOYEE LOGIN (HASHED PASSWORD) ***************
    $stmt = $pdo->prepare("
        SELECT employee_id, username, password_hash, full_name
        FROM employees
        WHERE username = :u
        LIMIT 1
    ");
    $stmt->execute([':u' => $username]);
    $emp = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($emp) {
        if (password_verify($password, $emp['password_hash'])) {
            // set employee session values used by other parts of the app
            $_SESSION['employee_id'] = (int)$emp['employee_id'];   // numeric pk used in transactions
            $_SESSION['user_id']     = (int)$emp['employee_id'];   // also keep user_id for generic uses
            $_SESSION['username']    = $emp['username'];
            $_SESSION['full_name']   = $emp['full_name'] ?? null;
            $_SESSION['role']        = 'employee';

            echo json_encode([
                'success' => true,
                'redirect' => '/smart-inventory/src/pages/employee/Employee.html'
            ]);
            exit;
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid username or password']);
            exit;
        }
    }

    // Neither admin nor employee matched
    echo json_encode(['success' => false, 'message' => 'Invalid username or password']);
    exit;

} catch (Throwable $e) {
    // For dev, you may include error details. In production keep it generic.
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error']);
    exit;
}

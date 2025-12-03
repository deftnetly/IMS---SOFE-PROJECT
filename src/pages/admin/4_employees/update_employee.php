<?php
// update_employee.php
header('Content-Type: application/json; charset=utf-8');

// ----------------------------------------------------------
// DIRECT + CORRECT DB CONNECTION PATH (YOUR ACTUAL LOCATION)
// ----------------------------------------------------------
require_once 'C:/xampp/htdocs/Smart-Inventory/src/database/db_connect.php';

// ----------------------------------------------------------
// ALLOW ONLY POST
// ----------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success'=>false,'message'=>'Only POST allowed']);
    exit;
}

// ----------------------------------------------------------
// READ INPUTS
// ----------------------------------------------------------
$employee_code = trim($_POST['employee_code'] ?? '');
$full_name     = trim($_POST['full_name'] ?? '');
$email         = trim($_POST['email'] ?? '');
$phone         = trim($_POST['phone'] ?? '');
$username      = trim($_POST['username'] ?? '');
$password      = $_POST['password'] ?? '';
$action        = $_POST['action'] ?? '';

// ----------------------------------------------------------
// RESET PASSWORD BRANCH
// ----------------------------------------------------------
if ($action === 'reset_password') {

    if (!$employee_code) {
        echo json_encode(['success'=>false,'message'=>'Missing employee_code']);
        exit;
    }

    if (!$password || strlen($password) < 8 || !preg_match('/[A-Z]/', $password)) {
        echo json_encode(['success'=>false,'message'=>'Invalid password rules']);
        exit;
    }

    try {
        $pw_hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("UPDATE employees SET password_hash = ? WHERE employee_code = ?");
        $stmt->execute([$pw_hash, $employee_code]);

        echo json_encode(['success'=>true,'message'=>'Password reset successfully']);
        exit;

    } catch (PDOException $e) {
        echo json_encode(['success'=>false,'message'=>'DB Error: '.$e->getMessage()]);
        exit;
    }
}

// ----------------------------------------------------------
// VALIDATE GENERAL UPDATE INPUTS
// ----------------------------------------------------------
if (!$employee_code || !$full_name) {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'employee_code and full_name required']);
    exit;
}

// ----------------------------------------------------------
// GENERAL EMPLOYEE UPDATE
// ----------------------------------------------------------
try {
    // check username uniqueness (if changed)
    if ($username) {
        $chk = $pdo->prepare("SELECT employee_id FROM employees WHERE username = ? AND employee_code != ?");
        $chk->execute([$username, $employee_code]);
        if ($chk->fetch()) {
            echo json_encode(['success'=>false,'message'=>'Username already used by another employee']);
            exit;
        }
    }

    // if password is provided
    if ($password !== '') {
        $pw_hash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("
            UPDATE employees 
            SET full_name = ?, email = ?, phone = ?, username = ?, password_hash = ?
            WHERE employee_code = ?
        ");

        $stmt->execute([
            $full_name,
            $email ?: null,
            $phone ?: null,
            $username ?: null,
            $pw_hash,
            $employee_code
        ]);

    } else {
        // update without password
        $stmt = $pdo->prepare("
            UPDATE employees 
            SET full_name = ?, email = ?, phone = ?, username = ?
            WHERE employee_code = ?
        ");

        $stmt->execute([
            $full_name,
            $email ?: null,
            $phone ?: null,
            $username ?: null,
            $employee_code
        ]);
    }

    echo json_encode(['success'=>true,'message'=>'Employee updated']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'DB error: '.$e->getMessage()]);
}

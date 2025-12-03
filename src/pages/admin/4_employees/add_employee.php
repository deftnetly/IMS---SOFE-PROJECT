<?php
// add_employee.php
header('Content-Type: application/json; charset=utf-8');

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
    echo json_encode(['success'=>false,'message'=>'db_connect.php not found']);
    exit;
}

// only POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success'=>false,'message'=>'Only POST allowed']);
    exit;
}

$employee_code = trim($_POST['employee_code'] ?? '');
$full_name     = trim($_POST['full_name'] ?? '');
$email         = trim($_POST['email'] ?? '');
$phone         = trim($_POST['phone'] ?? '');
$username      = trim($_POST['username'] ?? '');
$password      = $_POST['password'] ?? '';
$date_created  = date('Y-m-d');

if (!$employee_code || !$full_name) {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'employee_code and full_name required']);
    exit;
}

try {
    // check duplicates
    $chk = $pdo->prepare("SELECT employee_id FROM employees WHERE employee_code = ? OR (username IS NOT NULL AND username = ?)");
    $chk->execute([$employee_code, $username]);
    if ($chk->fetch()) {
        echo json_encode(['success'=>false,'message'=>'employee code or username already exists']);
        exit;
    }

    $pw_hash = null;
    if ($password !== '') {
        $pw_hash = password_hash($password, PASSWORD_DEFAULT);
    }

    $ins = $pdo->prepare("INSERT INTO employees (employee_code, full_name, email, phone, username, password_hash, date_created) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $ins->execute([$employee_code, $full_name, $email ?: null, $phone ?: null, $username ?: null, $pw_hash, $date_created]);

    echo json_encode(['success'=>true,'message'=>'Employee added','employee_code'=>$employee_code]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'DB error: '.$e->getMessage()]);
}
?>

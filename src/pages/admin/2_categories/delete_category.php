<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../../../database/db_connect.php';

$input = json_decode(file_get_contents("php://input"), true);
$id = isset($input['id']) ? (int)$input['id'] : 0;
if (!$id) { echo json_encode(['success'=>false,'error'=>'Invalid ID']); exit; }

try {
  $mysqli->begin_transaction();

  // delete by internal id
  $del = $mysqli->prepare("DELETE FROM categories WHERE id = ?");
  $del->bind_param("i", $id);
  if (!$del->execute()) {
    $mysqli->rollback();
    echo json_encode(['success'=>false,'error'=>$mysqli->error]);
    exit;
  }

  // resequence category_id to be 1..N (ordered by current category_id)
  $mysqli->query("DROP TEMPORARY TABLE IF EXISTS tmp_cat_map");
  $mysqli->query("CREATE TEMPORARY TABLE tmp_cat_map (old_id INT PRIMARY KEY, new_id INT)");

  $multi = "
    SET @n = 0;
    INSERT INTO tmp_cat_map (old_id, new_id)
    SELECT id AS old_id, (@n := @n + 1) AS new_id
    FROM categories
    ORDER BY category_id;
  ";
  if (!$mysqli->multi_query($multi)) {
    $mysqli->rollback();
    echo json_encode(['success'=>false,'error'=>$mysqli->error]);
    exit;
  }
  while ($mysqli->more_results()) { $mysqli->next_result(); }

  // update categories: set category_id = new_id where id = old_id
  if (!$mysqli->query("UPDATE categories c JOIN tmp_cat_map m ON c.id = m.old_id SET c.category_id = m.new_id")) {
    $mysqli->rollback();
    echo json_encode(['success'=>false,'error'=>$mysqli->error]);
    exit;
  }

  $mysqli->query("DROP TEMPORARY TABLE IF EXISTS tmp_cat_map");
  $mysqli->commit();

  echo json_encode(['success'=>true]);

} catch (Exception $e) {
  $mysqli->rollback();
  echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
}

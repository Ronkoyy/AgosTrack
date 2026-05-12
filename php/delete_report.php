<?php
include 'connection.php';
if (isset($_POST['id'])) {
    $id = (int)$_POST['id'];
    $sql = "DELETE FROM tbl_reports WHERE id = $id";
    if (mysqli_query($conn, $sql)) { echo "success"; } 
    else { echo "Error deleting record."; }
}
mysqli_close($conn);
?>
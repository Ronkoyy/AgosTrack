<?php
include 'connection.php';
if (isset($_POST['id'])) {
    $id = (int)$_POST['id'];
    $sql = "UPDATE tbl_reports SET status = 'Completed' WHERE id = $id";
    if (mysqli_query($conn, $sql)) { echo "success"; } 
    else { echo "Error updating record."; }
}
mysqli_close($conn);
?>
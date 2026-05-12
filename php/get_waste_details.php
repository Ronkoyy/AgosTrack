<?php
header('Content-Type: application/json');
include 'connection.php';

if (!isset($_GET['email'])) {
    echo json_encode([]);
    exit();
}

$email = mysqli_real_escape_string($conn, $_GET['email']);

$sql = "SELECT p.wasteType, COUNT(*) as count 
        FROM tbl_pollution p 
        JOIN tbl_reports r ON p.reportId = r.id 
        WHERE r.userEmail = '$email' 
        GROUP BY p.wasteType";

$result = mysqli_query($conn, $sql);
$data = [];

if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        $data[] = $row;
    }
}

echo json_encode($data);
mysqli_close($conn);
?>
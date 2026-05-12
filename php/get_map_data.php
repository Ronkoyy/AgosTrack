<?php
header('Content-Type: application/json');
include 'connection.php';

// Added LEFT JOIN to fetch the user's name along with the report details
$sql = "SELECT r.id, r.userEmail, r.date, r.lat, r.lng, r.placeName, r.type, r.image, r.status, u.name as rangerName 
        FROM tbl_reports r 
        LEFT JOIN tbl_users u ON r.userEmail = u.email";
        
$result = mysqli_query($conn, $sql);

$reports = [];
if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        $reports[] = $row;
    }
}

echo json_encode($reports);
mysqli_close($conn);
?>
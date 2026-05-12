<?php
header('Content-Type: application/json');
include 'connection.php';

$email = $_GET['email'] ?? '';
$search = $_GET['search'] ?? '';
$sort = $_GET['sort'] ?? 'newest';

// The "%" symbols allow SQL to search for partial matches (e.g., "Mang" finds "Mangima")
$searchParam = "%{$search}%";

// Determine the sorting order dynamically
$orderBy = "r.id DESC";
if ($sort === 'oldest') $orderBy = "r.id ASC";
if ($sort === 'pending') $orderBy = "r.status DESC, r.id DESC"; 
if ($sort === 'completed') $orderBy = "r.status ASC, r.id DESC";

// The SQL Search Query (Using LIKE)
$sql = "SELECT r.id, u.name as rangerName, r.placeName, r.date, r.type, r.status 
        FROM tbl_reports r 
        JOIN tbl_users u ON r.userEmail = u.email 
        WHERE r.userEmail = ? AND (r.placeName LIKE ? OR r.type LIKE ? OR r.id LIKE ?) 
        ORDER BY $orderBy";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ssss", $email, $searchParam, $searchParam, $searchParam);
$stmt->execute();
$result = $stmt->get_result();

$reports = [];
while ($row = $result->fetch_assoc()) {
    $row['date'] = date("M j, Y", strtotime($row['date']));
    $reports[] = $row;
}

echo json_encode($reports);
$stmt->close();
$conn->close();
?>
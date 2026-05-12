<?php
header('Content-Type: application/json');
include 'connection.php';

if (!isset($_GET['email'])) {
    echo json_encode(["error" => "No email provided"]);
    exit();
}
$email = mysqli_real_escape_string($conn, $_GET['email']);

// 1. Get Top-Level Counts
$pCount = mysqli_query($conn, "SELECT COUNT(*) as c FROM tbl_reports WHERE userEmail = '$email' AND type = 'pollution'");
$pollutionCount = $pCount ? mysqli_fetch_assoc($pCount)['c'] : 0;

$mCount = mysqli_query($conn, "SELECT COUNT(*) as c FROM tbl_reports WHERE userEmail = '$email' AND type = 'marine'");
$marineCount = $mCount ? mysqli_fetch_assoc($mCount)['c'] : 0;

// 2. Get the Ledger Data (JOIN with users to get the real Ranger Name)
$recentQuery = "SELECT r.id, u.name as rangerName, r.placeName, r.date, r.type, r.status 
                FROM tbl_reports r 
                JOIN tbl_users u ON r.userEmail = u.email 
                WHERE r.userEmail = '$email' 
                ORDER BY r.date DESC LIMIT 10";
$recentResult = mysqli_query($conn, $recentQuery);
$recentReports = [];
if ($recentResult) {
    while($row = mysqli_fetch_assoc($recentResult)) {
        $row['date'] = date("M j, Y", strtotime($row['date']));
        $recentReports[] = $row;
    }
}

// 3. Get Chart Data & Severity Counts
$chartQuery = "SELECT p.wasteType, p.severity, COUNT(*) as count 
               FROM tbl_pollution p 
               JOIN tbl_reports r ON p.reportId = r.id 
               WHERE r.userEmail = '$email' 
               GROUP BY p.wasteType, p.severity";
               
$chartResult = mysqli_query($conn, $chartQuery);
$chartData = [];
$severityCounts = ['High' => 0, 'Medium' => 0, 'Low' => 0];

if ($chartResult) {
    while($row = mysqli_fetch_assoc($chartResult)) {
        $chartData[] = ['wasteType' => $row['wasteType'], 'count' => $row['count']];
        
        // Tally severity for the Pie Chart
        if (isset($severityCounts[$row['severity']])) {
            $severityCounts[$row['severity']] += (int)$row['count'];
        }
    }
}

echo json_encode([
    "pollution" => $pollutionCount,
    "marine" => $marineCount,
    "recent" => $recentReports,
    "chart" => $chartData,
    "severity" => $severityCounts
]);
mysqli_close($conn);
?>
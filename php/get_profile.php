<?php
header('Content-Type: application/json');
include 'connection.php';

if (isset($_GET['email'])) {
    $email = mysqli_real_escape_string($conn, $_GET['email']);

    // 1. Get User Info
    $sql = "SELECT user_id, name, bio, birthday, age, rank, profilePic FROM tbl_users WHERE email = '$email'";
    $result = $conn->query($sql);

    if ($result && $result->num_rows > 0) {
        $userData = $result->fetch_assoc();
        
        // 2. Get User's Submission History for the Profile Table
        $historyQuery = "SELECT id, date, placeName, type, status FROM tbl_reports WHERE userEmail = '$email' ORDER BY date DESC";
        $historyResult = $conn->query($historyQuery);
        
        $history = [];
        if ($historyResult) {
            while($row = $historyResult->fetch_assoc()) {
                $row['date'] = date("M j, Y", strtotime($row['date']));
                $history[] = $row;
            }
        }
        
        // Attach history to user data
        $userData['history'] = $history;

        echo json_encode($userData);
    } else {
        echo json_encode(["error" => "Ranger profile not found"]);
    }
} else {
    echo json_encode(["error" => "No email provided"]);
}
$conn->close();
?>
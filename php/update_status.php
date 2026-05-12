<?php
header('Content-Type: application/json'); // Set header to JSON
require 'connection.php';

// Check if ID is provided via POST
if (isset($_POST['id'])) {
    $id = (int)$_POST['id'];

    // Use a prepared statement to update the status to 'Completed'
    $stmt = $conn->prepare("UPDATE tbl_reports SET status = 'Completed' WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        // Send JSON success response
        echo json_encode(['status' => 'success']);
    } else {
        // Send JSON error if the database query fails
        echo json_encode(['status' => 'error', 'message' => $conn->error]);
    }
    
    $stmt->close();
} else {
    // Error if no ID was sent from the frontend
    echo json_encode(['status' => 'error', 'message' => 'No ID provided.']);
}

mysqli_close($conn);
?>
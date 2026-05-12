<?php
header('Content-Type: application/json');
require 'connection.php';

$name = $_POST['fullname'] ?? '';
$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';
$rank = 'Volunteer';

// Check if email exists
$check = $conn->prepare("SELECT email FROM tbl_users WHERE email = ?");
$check->bind_param("s", $email);
$check->execute();
if ($check->get_result()->num_rows > 0) {
    echo json_encode(['status' => 'error', 'message' => 'Email already registered.']);
    exit;
}

$stmt = $conn->prepare("INSERT INTO tbl_users (email, name, password, rank) VALUES (?, ?, ?, ?)");
$stmt->bind_param("ssss", $email, $name, $password, $rank);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Database error.']);
}
?>
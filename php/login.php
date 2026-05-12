<?php
header('Content-Type: application/json');
require 'connection.php';

$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';

$stmt = $conn->prepare("SELECT name, password FROM tbl_users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

if ($user && $user['password'] === $password) { // Note: Use password_hash in production
    echo json_encode(['status' => 'success', 'name' => $user['name']]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid email or password.']);
}
?>
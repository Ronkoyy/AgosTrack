<?php
// login.php
$servername = "localhost";
$username = "root"; 
$password = ""; 
$dbname = "agostrack";

// 1. Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// 2. Check connection - DO NOT ECHO ANYTHING HERE IF IT WORKS
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// 3. Get data from the JavaScript Fetch
$email = $_POST['email'];
$pass = $_POST['password'];

// 4. Check user in database
$sql = "SELECT * FROM tbl_users WHERE email = '$email' AND password = '$pass'";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    // 🚨 ONLY echo "success" and NOTHING ELSE
    echo "success";
} else {
    echo "Invalid email or password";
}

$conn->close();
?>
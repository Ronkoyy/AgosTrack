<?php
// signup.php
$servername = "localhost";
$username = "root"; 
$password = ""; 
$dbname = "agostrack";

// 1. Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// 2. Check connection - DO NOT echo anything if it works!
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// 3. Get data from the form (matching your HTML name attributes)
$fullname = $_POST['fullname'];
$email = $_POST['email'];
$pass = $_POST['password'];

// 4. Insert into database (Defaulting rank to Volunteer Ranger)
$sql = "INSERT INTO tbl_users (email, name, password, rank) 
        VALUES ('$email', '$fullname', '$pass', 'Volunteer Ranger')";

if ($conn->query($sql) === TRUE) {
    // 🚨 ONLY echo "success" and NOTHING ELSE
    echo "success";
} else {
    echo "Error: " . $conn->error;
}

$conn->close();
?>
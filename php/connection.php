<?php
// Database configuration
$servername = "localhost"; 
$username = "root";        
$password = "";           
$database = "agostrack"; // database name

// Create the connection
$conn = mysqli_connect($servername, $username, $password, $database);

if (!$conn) {
    // If it fails, stop the page and show the exact error
    die("Database Connection Failed: " . mysqli_connect_error());
}

echo "Database Connection Successful!";
?>
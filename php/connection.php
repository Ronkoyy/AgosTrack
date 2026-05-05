<?php
// Database configuration
$servername = "localhost"; // Usually 'localhost' when testing on XAMPP/WAMP
$username = "root";        // The default username for local servers
$password = "";            // The default password is usually completely blank
$database = "agostrack"; // The exact name of your database in phpMyAdmin

// Create the connection
$conn = mysqli_connect($servername, $username, $password, $database);

if (!$conn) {
    // If it fails, stop the page and show the exact error
    die("Database Connection Failed: " . mysqli_connect_error());
}

echo "Database Connection Successful!";
?>
<?php
// Since both this file and connection.php are in the "php" folder, this path is simple
include 'connection.php'; 

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = $_POST['fullname'];
    $email = $_POST['email'];
    $pass = password_hash($_POST['password'], PASSWORD_DEFAULT);

    // Insert into your specific tbl_users table
    $sql = "INSERT INTO tbl_users (name, email, password) VALUES (?, ?, ?)";
    
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "sss", $name, $email, $pass);

    if (mysqli_stmt_execute($stmt)) {
        // CRITICAL UPDATE: Notice the "../" before login.html
        // This tells the browser to go out of the php folder to find the HTML page
        echo "<script>alert('Ranger Profile Created!'); window.location.href='../login.html';</script>";
    } else {
        echo "Error: " . mysqli_error($conn);
    }

    mysqli_stmt_close($stmt);
}
mysqli_close($conn);
?>
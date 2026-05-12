<?php
session_start();
include 'connection.php'; 

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = mysqli_real_escape_string($conn, $_POST['emailKey']);
    $name = mysqli_real_escape_string($conn, $_POST['name']);
    $bio = mysqli_real_escape_string($conn, $_POST['bio']);
    $birthday = mysqli_real_escape_string($conn, $_POST['birthday']);
    $age = (int)$_POST['age'];
    $newPass = mysqli_real_escape_string($conn, $_POST['password']);

    // Handle Image if uploaded as Base64 from the client-side compressor
    $imgSql = "";
    if (!empty($_POST['profilePicBase64'])) {
        $base64String = mysqli_real_escape_string($conn, $_POST['profilePicBase64']);
        $imgSql = ", profilePic = '$base64String'";
    }

    // Handle Password if provided
    $passSql = !empty($newPass) ? ", password = '$newPass'" : "";

    // The SQL Query
    $sql = "UPDATE tbl_users SET 
            name = '$name', 
            bio = '$bio', 
            birthday = '$birthday', 
            age = $age 
            $imgSql 
            $passSql 
            WHERE email = '$email'";

    if (mysqli_query($conn, $sql)) {
        echo "success";
    } else {
        echo "Error: " . mysqli_error($conn);
    }
}
?>
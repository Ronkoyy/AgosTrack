<?php
session_start();
include 'connection.php';

// 1. Ensure user is logged in
if (!isset($_SESSION['user_email'])) {
    echo "<script>alert('Please login first.'); window.location.href='../login.html';</script>";
    exit();
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // 2. Grab the email from the Session (this is our Primary Key)
    $email = $_SESSION['user_email']; 
    
    // 3. Grab the basic text data
    $name = $_POST['name'];
    $bio = $_POST['bio'];
    
    // Handle empty birthday/age gracefully so it doesn't crash the database
    $birthday = empty($_POST['birthday']) ? NULL : $_POST['birthday'];
    $age = empty($_POST['age']) ? NULL : (int)$_POST['age'];

    // 4. Handle Profile Picture Upload (Only if a new file was chosen)
    $updatePicSql = "";
    if (isset($_FILES['profilePic']) && $_FILES['profilePic']['error'] == 0) {
        $target_dir = "../uploads/";
        if (!file_exists($target_dir)) {
            mkdir($target_dir, 0777, true);
        }
        $fileName = time() . "_profile_" . basename($_FILES["profilePic"]["name"]);
        $profilePicPath = "uploads/" . $fileName;
        move_uploaded_file($_FILES["profilePic"]["tmp_name"], "../" . $profilePicPath);
        
        // Append this to our SQL query later
        $updatePicSql = ", profilePic='$profilePicPath'";
    }

    // 5. Handle Password Change (Only if they typed a new password)
    $updatePassSql = "";
    if (!empty($_POST['password'])) {
        $hashed_password = password_hash($_POST['password'], PASSWORD_DEFAULT);
        
        // Append this to our SQL query later
        $updatePassSql = ", password='$hashed_password'";
    }

    // 6. Build the final UPDATE query dynamically
    $sql = "UPDATE tbl_users SET name=?, bio=?, birthday=?, age=?" . $updatePicSql . $updatePassSql . " WHERE email=?";
    
    $stmt = mysqli_prepare($conn, $sql);
    
    // "sssis" = String, String, String, Integer, String
    mysqli_stmt_bind_param($stmt, "sssis", $name, $bio, $birthday, $age, $email);

    // 7. Execute and redirect
    if (mysqli_stmt_execute($stmt)) {
        // Update the session name just in case they changed it!
        $_SESSION['user_name'] = $name; 
        
        echo "<script>alert('Profile updated successfully!'); window.location.href='../profile.html';</script>";
    } else {
        echo "Error updating profile: " . mysqli_error($conn);
    }

    mysqli_stmt_close($stmt);
}
mysqli_close($conn);
?>
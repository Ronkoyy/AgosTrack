<?php
// 1. Start the session so the dashboard knows WHO logged in
session_start();

// 2. Connect to the database
include 'connection.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // 3. Grab the data from the HTML form
    $email = $_POST['email'];
    $password = $_POST['password'];

    // 4. Securely look for the user's email in the database
    $sql = "SELECT * FROM tbl_users WHERE email = ?";
    $stmt = mysqli_prepare($conn, $sql);
    
    // "s" means we are passing a String (the email)
    mysqli_stmt_bind_param($stmt, "s", $email);
    mysqli_stmt_execute($stmt);
    
    // Get the results
    $result = mysqli_stmt_get_result($stmt);

    // 5. Check if the email exists in the database
    if ($row = mysqli_fetch_assoc($result)) {
        
        // 6. check if the typed password matches the hashed password
        if (password_verify($password, $row['password'])) {
            
            // SUCCESS! Store user info in the Session variables
            $_SESSION['user_email'] = $row['email'];
            $_SESSION['user_name'] = $row['name'];
            // If you have the profile pic column ready, you can store it too:
            // $_SESSION['user_pic'] = $row['profilePic'];
            
            // Redirect them to the main dashboard app!
            echo "<script>
                    window.location.href='../app.html';
                  </script>";
                  
        } else {
            // Wrong password
            echo "<script>
                    alert('Incorrect password. Please try again.'); 
                    window.location.href='../login.html';
                  </script>";
        }
    } else {
        // Email not found
        echo "<script>
                alert('No Ranger profile found with that email. Please sign up!'); 
                window.location.href='../signup.html';
              </script>";
    }

    // Clean up
    mysqli_stmt_close($stmt);
}

// Close connection
mysqli_close($conn);
?>
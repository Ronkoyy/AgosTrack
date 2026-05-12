<?php
session_start();
include 'connection.php';

// 1. Get the email from JavaScript or Session
$raw_email = isset($_POST['userEmail']) ? $_POST['userEmail'] : (isset($_SESSION['user_email']) ? $_SESSION['user_email'] : '');
$email = mysqli_real_escape_string($conn, trim($raw_email));

if (empty($email)) {
    echo "error_not_logged_in";
    exit();
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // 2. SAFETY CHECK: Ensure the email actually exists
    $check_user = mysqli_query($conn, "SELECT email FROM tbl_users WHERE email = '$email'");
    if(mysqli_num_rows($check_user) == 0) {
        echo "Session mismatch: Your email ($email) is not in the database. Please Logout and Login again.";
        exit();
    }

    // 3. Capture main report data
    $placeName = mysqli_real_escape_string($conn, $_POST['placeName']);
    $lat = mysqli_real_escape_string($conn, $_POST['lat']);
    $lng = mysqli_real_escape_string($conn, $_POST['lng']);
    $type = mysqli_real_escape_string($conn, $_POST['reportType']); 
    $date = date('Y-m-d H:i:s'); 
    
    // 4. Handle Base64 Image String (Replaced old $_FILES logic)
    $imagePath = "NULL";
    if (!empty($_POST['reportImageBase64']) && $_POST['reportImageBase64'] !== 'NULL') {
        // We save the entire Base64 string directly into the database
        $base64String = mysqli_real_escape_string($conn, $_POST['reportImageBase64']);
        $imagePath = "'$base64String'";
    }

    // 5. Build the INSERT query for the MAIN table
    $sql = "INSERT INTO tbl_reports (userEmail, date, lat, lng, placeName, type, image, status) 
            VALUES ('$email', '$date', '$lat', '$lng', '$placeName', '$type', $imagePath, 'Pending')";

    if (mysqli_query($conn, $sql)) {
        
        // 6. Get the ID of the report we just created
        $reportId = mysqli_insert_id($conn);
        
        // Route the extra data into the correct sub-table
        if ($type === 'pollution') {
            $wasteType = mysqli_real_escape_string($conn, $_POST['wasteType']);
            $severity = mysqli_real_escape_string($conn, $_POST['severity']);
            
            $sql_pollution = "INSERT INTO tbl_pollution (reportId, wasteType, severity) VALUES ($reportId, '$wasteType', '$severity')";
            mysqli_query($conn, $sql_pollution);
            
        } else if ($type === 'marine') {
            $species = mysqli_real_escape_string($conn, $_POST['species']);
            $quantity = (int)$_POST['quantity'];
            $condition = mysqli_real_escape_string($conn, $_POST['condition']);
            
            $sql_marine = "INSERT INTO tbl_marine (reportId, species, quantity, condition) VALUES ($reportId, '$species', $quantity, '$condition')";
            mysqli_query($conn, $sql_marine);
        }

        echo "success";
        
    } else {
        echo "Database Error: " . mysqli_error($conn);
    }
}
mysqli_close($conn);
?>
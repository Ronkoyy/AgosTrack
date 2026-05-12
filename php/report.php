<?php
header('Content-Type: application/json'); // Crucial: Tells JS to expect JSON
session_start();
include 'connection.php';

// 1. Get the email from JavaScript (sent via FormData)
$raw_email = isset($_POST['userEmail']) ? $_POST['userEmail'] : '';
$email = mysqli_real_escape_string($conn, trim($raw_email));

if (empty($email)) {
    echo json_encode(['status' => 'error', 'message' => 'User email is missing.']);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // 2. Integrity Check: Ensure the email exists in your new agostracker.tbl_users
    $check_user = mysqli_query($conn, "SELECT email FROM tbl_users WHERE email = '$email'");
    if(mysqli_num_rows($check_user) == 0) {
        echo json_encode(['status' => 'error', 'message' => 'Ranger email not found in database.']);
        exit();
    }

    // 3. Capture main report data using mysqli_real_escape_string for security
    $placeName = mysqli_real_escape_string($conn, $_POST['placeName']);
    $lat = mysqli_real_escape_string($conn, $_POST['lat']);
    $lng = mysqli_real_escape_string($conn, $_POST['lng']);
    $type = mysqli_real_escape_string($conn, $_POST['reportType']); // "pollution" or "marine"
    $date = date('Y-m-d H:i:s'); 
    
    // 4. Handle Compressed Base64 Image (Matches your new script.js compressor)
    $imagePath = "NULL";
    if (!empty($_POST['reportImageBase64']) && $_POST['reportImageBase64'] !== 'NULL') {
        $base64String = mysqli_real_escape_string($conn, $_POST['reportImageBase64']);
        $imagePath = "'$base64String'"; // Wrapped in quotes for the SQL query
    }

    // 5. INSERT into the MAIN table (tbl_reports)
    $sql = "INSERT INTO tbl_reports (userEmail, date, lat, lng, placeName, type, image, status) 
            VALUES ('$email', '$date', '$lat', '$lng', '$placeName', '$type', $imagePath, 'Pending')";

    if (mysqli_query($conn, $sql)) {
        
        // 6. Get the unique ID of the report just created to link the sub-tables
        $reportId = mysqli_insert_id($conn);
        
        // Handle Pollution specific fields
        if ($type === 'pollution') {
            $wasteType = mysqli_real_escape_string($conn, $_POST['wasteType']);
            $severity = mysqli_real_escape_string($conn, $_POST['severity']);
            
            $sql_pollution = "INSERT INTO tbl_pollution (reportId, wasteType, severity) 
                              VALUES ($reportId, '$wasteType', '$severity')";
            mysqli_query($conn, $sql_pollution);
            
        } 
        // Handle Marine Life specific fields
        else if ($type === 'marine') {
            $species = mysqli_real_escape_string($conn, $_POST['species']);
            $quantity = (int)$_POST['quantity'];
            $condition = mysqli_real_escape_string($conn, $_POST['condition']);
            
            $sql_marine = "INSERT INTO tbl_marine (reportId, species, quantity, `condition`) 
                           VALUES ($reportId, '$species', $quantity, '$condition')";
            mysqli_query($conn, $sql_marine);
        }

        // 7. SUCCESS: Send JSON status back to JavaScript
        echo json_encode(['status' => 'success']);
        
    } else {
        // FAIL: Send JSON error details back
        echo json_encode(['status' => 'error', 'message' => mysqli_error($conn)]);
    }
}
mysqli_close($conn);
?>
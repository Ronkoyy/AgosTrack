<?php
session_start();
include 'connection.php';

// 1. Ensure user is logged in
if (!isset($_SESSION['user_email'])) {
    echo "<script>alert('Please login to submit a report.'); window.location.href='../login.html';</script>";
    exit();
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // 2. Grab main data from the HTML form
    $email = $_SESSION['user_email']; // From the secure login session
    $placeName = $_POST['placeName'];
    $lat = $_POST['lat'];
    $lng = $_POST['lng'];
    $type = $_POST['reportType']; // "pollution" or "marine"
    $date = date('Y-m-d H:i:s'); // Gets the exact current time
    
    // 3. Handle Evidence Image Upload safely
    $imagePath = "";
    if (isset($_FILES['reportImage']) && $_FILES['reportImage']['error'] == 0) {
        $target_dir = "../uploads/"; 
        // Ensure the directory exists
        if (!file_exists($target_dir)) {
            mkdir($target_dir, 0777, true);
        }
        $fileName = time() . "_" . basename($_FILES["reportImage"]["name"]); // Add timestamp to prevent overwriting
        $imagePath = "uploads/" . $fileName; // Path to save in the database
        move_uploaded_file($_FILES["reportImage"]["tmp_name"], "../" . $imagePath);
    }

    // 4. THE UPGRADE: Insert into tbl_reports and hardcode the 'Pending' status
    $sql_report = "INSERT INTO tbl_reports (userEmail, date, lat, lng, placeName, type, image, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')";
    $stmt1 = mysqli_prepare($conn, $sql_report);
    
    // "ssddsss" = String, String, Double, Double, String, String, String
    mysqli_stmt_bind_param($stmt1, "ssddsss", $email, $date, $lat, $lng, $placeName, $type, $imagePath);
    
    if (mysqli_stmt_execute($stmt1)) {
        
        // 5. Get the exact ID of the report we just created! (This is our Foreign Key)
        $newReportId = mysqli_insert_id($conn);
        
        // 6. Insert into the correct sub-table based on the Type of report
        if ($type == "pollution") {
            $wasteType = $_POST['wasteType'];
            $severity = $_POST['severity'];
            
            $sql_sub = "INSERT INTO tbl_pollution (reportId, wasteType, severity) VALUES (?, ?, ?)";
            $stmt2 = mysqli_prepare($conn, $sql_sub);
            mysqli_stmt_bind_param($stmt2, "iss", $newReportId, $wasteType, $severity);
            mysqli_stmt_execute($stmt2);
            
        } else if ($type == "marine") {
            $species = $_POST['species'];
            $quantity = (int)$_POST['quantity'];
            
            $sql_sub = "INSERT INTO tbl_marine (reportId, species, quantity) VALUES (?, ?, ?)";
            $stmt2 = mysqli_prepare($conn, $sql_sub);
            mysqli_stmt_bind_param($stmt2, "isi", $newReportId, $species, $quantity);
            mysqli_stmt_execute($stmt2);
        }

        // Redirect directly to the dashboard so they can see their new pending report!
        echo "<script>alert('Mission Data Logged Successfully!'); window.location.href='../dashboard.html';</script>";
    } else {
        echo "Error: " . mysqli_error($conn);
    }
}
mysqli_close($conn);
?>
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$uri = $_SERVER['REQUEST_URI'];

$categories = json_decode(file_get_contents(__DIR__ . '/data/categories.json'), true);
$doctors = json_decode(file_get_contents(__DIR__ . '/data/doctors.json'), true);

if (strpos($uri, '/categories') !== false) {
    echo json_encode($categories);
} elseif (strpos($uri, '/doctors') !== false) {
    $categoryId = isset($_GET['category_id']) ? (int)$_GET['category_id'] : 0;
    $filtered = array_values(array_filter($doctors, fn($d) => $d['category_id'] === $categoryId));
    echo json_encode($filtered);
} else {
    echo json_encode(['status' => 'ok', 'message' => 'Appointment Booking API']);
}

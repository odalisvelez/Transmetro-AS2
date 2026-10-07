<?php

$servidor = "localhost";
$usuario = "root";
$password = "sasa";
$baseDatos = "transmetro_db";

$conexion = new mysqli(
    $servidor,
    $usuario,
    $password,
    $baseDatos
);

if ($conexion->connect_error) {
    die("Error de conexión: " . $conexion->connect_error);
}

$conexion->set_charset("utf8mb4");

// echo "Conexión exitosa a la base de datos.";
?>
<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

// $sql = "SELECT * FROM acceso";

$sql= "SELECT 
        a.id_acceso,
        a.nombre AS acceso,
        a.id_estacion,
        e.nombre AS estacion
    FROM acceso a
    INNER JOIN estacion e
        on a.id_estacion=e.id_estacion
    ORDER BY a.id_acceso";

$resultado = $conexion->query($sql);

$accesos = [];

if($resultado){

    while($fila = $resultado->fetch_assoc()){
        
        $accesos[] = $fila;
    }

    echo json_encode($accesos, JSON_UNESCAPED_UNICODE);
} else{

    echo json_encode([

        "error" => "No se pudieron obtenr los accesos"
    ], JSON_UNESCAPED_UNICODE);
}
$conexion->close();
?>
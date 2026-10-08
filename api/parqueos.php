<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$sql = "SELECT
        p.id_parqueo,
        p.ubicacion,
        p.capacidad,
        p.id_estacion,
        e.nombre AS estacion
    FROM parqueo p
    INNER JOIN estacion e
    ON p.id_estacion= e.id_estacion
    ORDER BY p.id_parqueo
        ";

$resultado = $conexion->query($sql);

$parqueos = [];

if($resultado){

    while($fila = $resultado->fetch_assoc()){
        
        $parqueos[] = $fila;
    }

    echo json_encode($parqueos, JSON_UNESCAPED_UNICODE);
} else{

    echo json_encode([

        "error" => "No se pudieron obtenr los parqueos"
    ], JSON_UNESCAPED_UNICODE);
}
$conexion->close();
?>
<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$sql = "SELECT
        e.id_estacion,
        e.nombre,
        e.id_municipalidad,
        m.nombre AS municipalidad
    FROM estacion e
    INNER JOIN municipalidad m
    ON e.id_municipalidad=m.id_municipalidad
    ORDER BY e.id_estacion";

$resultado = $conexion->query($sql);

$estaciones = [];

if($resultado){

    while($fila = $resultado->fetch_assoc()){
        
        $estaciones[] = $fila;
    }

    echo json_encode($estaciones, JSON_UNESCAPED_UNICODE);
} else{

    echo json_encode([

        "error" => "No se pudieron obtenr las estaciones"
    ], JSON_UNESCAPED_UNICODE);
}
$conexion->close();
?>
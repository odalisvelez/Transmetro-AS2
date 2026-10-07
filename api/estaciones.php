<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$sql = "SELECT * FROM estacion";

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
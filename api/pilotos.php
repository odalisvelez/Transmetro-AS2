<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$sql = "SELECT
            id_piloto,
            nombre,
            direccion,
            telefono,
            correo
        FROM piloto
        ORDER BY id_piloto";

$resultado = $conexion->query($sql);

$pilotos = [];

if($resultado){

    while($fila = $resultado->fetch_assoc()){
        
        $pilotos[] = $fila;
    }

    echo json_encode($pilotos, JSON_UNESCAPED_UNICODE);
} else{

    echo json_encode([

        "error" => "No se pudieron obtenr los pilotos"
    ], JSON_UNESCAPED_UNICODE);
}
$conexion->close();
?>
<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$sql = "SELECT
            id_municipalidad,
            nombre
        FROM municipalidad
        ORDER BY id_municipalidad";

$resultado = $conexion->query($sql);

$municipalidades = [];

if($resultado){

    while($fila = $resultado->fetch_assoc()){
        
        $municipalidades[] = $fila;
    }

    echo json_encode($municipalidades, JSON_UNESCAPED_UNICODE);
} else{

    echo json_encode([

        "error" => "No se pudieron obtenr las municipalidades"
    ], JSON_UNESCAPED_UNICODE);
}
$conexion->close();
?>
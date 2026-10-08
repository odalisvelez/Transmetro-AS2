<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$sql = "SELECT
            id_rol,
            nombre
        FROM Rol
        ORDER BY id_rol";

$resultado = $conexion->query($sql);

$roles = [];

if($resultado){

    while($fila = $resultado->fetch_assoc()){
        
        $roles[] = $fila;
    }

    echo json_encode($roles, JSON_UNESCAPED_UNICODE);
} else{

    echo json_encode([

        "error" => "No se pudieron obtenr los pilotos"
    ], JSON_UNESCAPED_UNICODE);
}
$conexion->close();
?>
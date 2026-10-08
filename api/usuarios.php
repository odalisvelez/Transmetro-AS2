<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$sql = "SELECT
            u.id_usuario,
            u.username,
            u.id_rol,
            r.nombre AS rol
        FROM usuario u
        INNER JOIN rol r
            ON u.id_rol = r.id_rol
        ORDER BY u.id_usuario";

$resultado = $conexion->query($sql);

$roles = [];

if($resultado){

    while($fila = $resultado->fetch_assoc()){
        
        $roles[] = $fila;
    }

    echo json_encode($roles, JSON_UNESCAPED_UNICODE);
} else{

    echo json_encode([

        "error" => "No se pudieron obtenr los usuarios"
    ], JSON_UNESCAPED_UNICODE);
}
$conexion->close();
?>
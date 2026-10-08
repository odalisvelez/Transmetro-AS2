<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$sql = "SELECT
        c.id_pc,
        c.codigo_inventario AS Codigo,
        c.estado,
        c.id_estacion,
        e.nombre AS estacion
    FROM equipo_computo c
    INNER JOIN estacion e
    ON c.id_estacion = e.id_estacion
    ORDER BY c.id_pc";

$resultado = $conexion->query($sql);

$equipos_computo = [];

if($resultado){

    while($fila = $resultado->fetch_assoc()){
        
        $equipos_computo[] = $fila;
    }

    echo json_encode($equipos_computo, JSON_UNESCAPED_UNICODE);
} else{

    echo json_encode([

        "error" => "No se pudieron obtenr los equipos de computo"
    ], JSON_UNESCAPED_UNICODE);
}
$conexion->close();
?>
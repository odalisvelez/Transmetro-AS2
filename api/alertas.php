<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$sql = "SELECT
            a.id_alerta,
            a.estado,
            a.fecha_hora,
            a.tipo_alerta,
            a.id_estacion,
            a.id_linea,
            e.nombre AS estacion,
            l.nombre AS linea
        FROM alerta a
        INNER JOIN estacion e
            ON a.id_estacion = e.id_estacion
        INNER JOIN linea l
            ON a.id_linea = l.id_linea
        ORDER BY a.id_alerta";

$resultado = $conexion->query($sql);

$alertas = [];

if($resultado){

    while($fila = $resultado->fetch_assoc()){
        
        $alertas[] = $fila;
    }

    echo json_encode($alertas, JSON_UNESCAPED_UNICODE);
} else{

    echo json_encode([

        "error" => "No se pudieron obtenr las alertas"
    ], JSON_UNESCAPED_UNICODE);
}
$conexion->close();
?>
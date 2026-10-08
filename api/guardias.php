<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$sql = "SELECT 
      g.id_guardia,
        g.nombre,
        g.telefono,
        g.id_acceso,
        a.nombre AS acceso,
        e.id_estacion,
        e.nombre AS estacion
    FROM guardia g
    INNER JOIN acceso a
        ON g.id_acceso = a.id_acceso
    INNER JOIN estacion e
        ON a.id_estacion = e.id_estacion
    ORDER BY g.id_guardia";

$resultado = $conexion->query($sql);

$guardias = [];

if($resultado){

    while($fila = $resultado->fetch_assoc()){
        
        $guardias[] = $fila;
    }

    echo json_encode($guardias, JSON_UNESCAPED_UNICODE);
} else{

    echo json_encode([

        "error" => "No se pudieron obtenr el historial_educativo"
    ], JSON_UNESCAPED_UNICODE);
}
$conexion->close();
?>
<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$sql = "SELECT
        he.id_historial,
        he.institucion AS Institucion_Educativa,
        he.titulo,
        he.fecha_inicio,
        he.fecha_fin,
        he.id_piloto,
        p.nombre AS piloto
    FROM historial_educativo  he
    INNER JOIN piloto p
        ON he.id_piloto=p.id_piloto
    ORDER BY he.id_historial
        ";

$resultado = $conexion->query($sql);

$historial_educativo = [];

if($resultado){

    while($fila = $resultado->fetch_assoc()){
        
        $historial_educativo[] = $fila;
    }

    echo json_encode($historial_educativo, JSON_UNESCAPED_UNICODE);
} else{

    echo json_encode([

        "error" => "No se pudieron obtenr el historial_educativo"
    ], JSON_UNESCAPED_UNICODE);
}
$conexion->close();
?>
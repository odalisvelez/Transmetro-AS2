<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$sql = "SELECT
        b.id_bus,
        b.placa,
        b.capacidad_maxima,
        l.nombre AS linea,
        p.ubicacion AS parqueo,
        pi.nombre AS piloto
    FROM bus b
    INNER JOIN linea l
        on b.id_linea=l.id_linea
    INNER JOIN parqueo p
        on b.id_parqueo=p.id_parqueo
    INNER JOIN piloto pi
        on b.id_piloto=pi.id_piloto
        ";

$resultado = $conexion->query($sql);

$buses = [];

if($resultado){

    while($fila = $resultado->fetch_assoc()){
        
        $buses[] = $fila;
    }

    echo json_encode($buses, JSON_UNESCAPED_UNICODE);
} else{

    echo json_encode([

        "error" => "No se pudieron obtenr las estaciones"
    ], JSON_UNESCAPED_UNICODE);
}
$conexion->close();
?>
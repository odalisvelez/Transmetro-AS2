<?php

    require_once "../config/conexion.php";

    header("Content-Type: application/json; charset=UTF-8");

    $sql = "SELECT
            l.id_linea,
            l.nombre,
            l.id_municipalidad,
            l.estado,
            m.nombre AS municipalidad
        FROM linea l
        INNER JOIN municipalidad m
            ON l.id_municipalidad = m.id_municipalidad
        ORDER BY l.id_linea ";
    
    $resultado = $conexion->query($sql);

    $lineas = [];

    if($resultado){

        while($fila = $resultado->fetch_assoc()){
            
            $lineas[] = $fila;
        }

        echo json_encode($lineas, JSON_UNESCAPED_UNICODE);
    } else{

        echo json_encode([

            "error" => "No se pudieron obtenr las lineas"
        ], JSON_UNESCAPED_UNICODE);
    }
$conexion->close();
?>
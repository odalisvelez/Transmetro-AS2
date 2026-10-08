<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$sql = "SELECT
            dr.id_linea,
            l.nombre AS linea,
            dr.id_estacion,
            e.nombre AS estacion,
            dr.orden,
            dr.distancia_a_siguiente
        FROM Detalle_Ruta dr
        INNER JOIN Linea l
            ON dr.id_linea = l.id_linea
        INNER JOIN Estacion e
            ON dr.id_estacion = e.id_estacion
        ORDER BY dr.id_linea, dr.orden";

$resultado = $conexion->query($sql);

$detalleRutas = [];

if ($resultado) {

    while ($fila = $resultado->fetch_assoc()) {
        $detalleRutas[] = $fila;
    }

    echo json_encode($detalleRutas, JSON_UNESCAPED_UNICODE);

} else {

    echo json_encode([
        "error" => "No se pudieron obtener los detalles de las rutas."
    ], JSON_UNESCAPED_UNICODE);
}

$conexion->close();

?>
<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$metodo = $_SERVER["REQUEST_METHOD"];


//-----------GET - OBTENER OPERADORES--------------//

if ($metodo === "GET") {

    $sql = "SELECT
                o.id_operador,
                o.nombre,
                o.telefono,
                o.id_estacion,
                o.id_usuario,
                o.estado,
                e.nombre AS estacion,
                u.username AS usuario
            FROM operador o
            INNER JOIN estacion e
                ON o.id_estacion = e.id_estacion
            INNER JOIN usuario u
                ON o.id_usuario = u.id_usuario
            ORDER BY o.id_operador";

    $resultado = $conexion->query($sql);

    $operadores = [];

    if ($resultado) {

        while ($fila = $resultado->fetch_assoc()) {
            $operadores[] = $fila;
        }

        echo json_encode($operadores, JSON_UNESCAPED_UNICODE);

    } else {

        echo json_encode([
            "error" => "No se pudieron obtener los operadores."
        ], JSON_UNESCAPED_UNICODE);
    }


//-----------POST - OBTENER OPERADORES--------------//

} elseif ($metodo === "POST") {

    $datos = json_decode(file_get_contents("php://input"), true);

    $nombre = $datos["nombre"] ?? null;
    $telefono = $datos["telefono"] ?? null;
    $id_estacion = $datos["id_estacion"] ?? null;
    $id_usuario = $datos["id_usuario"] ?? null;

    if (!$nombre || !$id_estacion || !$id_usuario) {

        http_response_code(400);

        echo json_encode([
            "error" => "Nombre, id_estacion e id_usuario son obligatorios."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $sql = "INSERT INTO operador
                (nombre, telefono, id_estacion, id_usuario)
            VALUES (?, ?, ?, ?)";

    $stmt = $conexion->prepare($sql);

    $stmt->bind_param(
        "ssii",
        $nombre,
        $telefono,
        $id_estacion,
        $id_usuario
    );

    try {

        if ($stmt->execute()) {

            http_response_code(201);

            echo json_encode([
                "mensaje" => "Operador creado correctamente.",
                "id_operador" => $stmt->insert_id
            ], JSON_UNESCAPED_UNICODE);
        }

    } catch (mysqli_sql_exception $e) {

        if ($e->getCode() === 1062) {

            http_response_code(409);

            echo json_encode([
                "error" => "El usuario o la estación ya están asignados a otro operador."
            ], JSON_UNESCAPED_UNICODE);

        } else {

            http_response_code(500);

            echo json_encode([
                "error" => "No se pudo crear el operador."
            ], JSON_UNESCAPED_UNICODE);
        }
    }

    $stmt->close();


   //----MÉTODO NO PERMITIDO-----//

} else {

    http_response_code(405);

    echo json_encode([
        "error" => "Método no permitido."
    ], JSON_UNESCAPED_UNICODE);
}

$conexion->close();
?>
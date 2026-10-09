<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");


$metodo = $_SERVER["REQUEST_METHOD"];

$id_parqueo = filter_input(INPUT_GET, "id", FILTER_VALIDATE_INT);

if ($metodo === "GET") {

    // ---------- GET: CONSULTAR PARQUEOS ----------
    $sql = "SELECT
                p.id_parqueo,
                p.ubicacion,
                p.capacidad,
                p.id_estacion,
                p.estado,
                e.nombre AS estacion
            FROM parqueo p
            INNER JOIN estacion e
                ON p.id_estacion = e.id_estacion
            ORDER BY p.id_parqueo";

    $resultado = $conexion->query($sql);

    if ($resultado) {
        $parqueos = [];

        while ($fila = $resultado->fetch_assoc()) {
            $parqueos[] = $fila;
        }

        echo json_encode($parqueos, JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);

        echo json_encode([
            "error" => "No se pudieron obtener los parqueos."
        ], JSON_UNESCAPED_UNICODE);
    }

} elseif ($metodo === "POST") {

    // ---------- POST: REGISTRAR PARQUEO ----------
    $datos = json_decode(file_get_contents("php://input"), true);

    $ubicacion = $datos["ubicacion"] ?? null;
    $capacidad = filter_var(
        $datos["capacidad"] ?? null,
        FILTER_VALIDATE_INT
    );
    $id_estacion = filter_var(
        $datos["id_estacion"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (
        !is_string($ubicacion) ||
        trim($ubicacion) === "" ||
        $capacidad === false || $capacidad === null ||
        $capacidad <= 0 ||
        $id_estacion === false || $id_estacion === null ||
        $id_estacion <= 0
    ) {
        http_response_code(400);

        echo json_encode([
            "error" => "La ubicación, una capacidad mayor que cero y un ID de estación válido son obligatorios."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $ubicacion = trim($ubicacion);

    $sql = "INSERT INTO parqueo (ubicacion, capacidad, id_estacion)
            VALUES (?, ?, ?)";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("sii", $ubicacion, $capacidad, $id_estacion);

    try {
        $stmt->execute();

        http_response_code(201);

        echo json_encode([
            "mensaje" => "Parqueo registrado correctamente.",
            "id_parqueo" => $stmt->insert_id
        ], JSON_UNESCAPED_UNICODE);

    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() === 1452) {
            http_response_code(400);

            echo json_encode([
                "error" => "La estación indicada no existe."
            ], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(500);

            echo json_encode([
                "error" => "No se pudo registrar el parqueo."
            ], JSON_UNESCAPED_UNICODE);
        }
    }

    $stmt->close();

} elseif ($metodo === "PUT") {

    // ---------- PUT: ACTUALIZAR PARQUEO ----------
    if (!$id_parqueo || $id_parqueo <= 0) {
        http_response_code(400);

        echo json_encode([
            "error" => "Debes indicar un ID de parqueo válido en la URL."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $datos = json_decode(file_get_contents("php://input"), true);

    $ubicacion = $datos["ubicacion"] ?? null;
    $capacidad = filter_var(
        $datos["capacidad"] ?? null,
        FILTER_VALIDATE_INT
    );
    $id_estacion = filter_var(
        $datos["id_estacion"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (
        !is_string($ubicacion) ||
        trim($ubicacion) === "" ||
        $capacidad === false || $capacidad === null ||
        $capacidad <= 0 ||
        $id_estacion === false || $id_estacion === null ||
        $id_estacion <= 0
    ) {
        http_response_code(400);

        echo json_encode([
            "error" => "La ubicación, una capacidad mayor que cero y un ID de estación válido son obligatorios."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    // Comprobar que el parqueo exista y esté activo
    $sql = "SELECT estado
            FROM parqueo
            WHERE id_parqueo = ?";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("i", $id_parqueo);
    $stmt->execute();

    $resultado = $stmt->get_result();
    $parqueo = $resultado->fetch_assoc();

    $stmt->close();

    if (!$parqueo) {
        http_response_code(404);

        echo json_encode([
            "error" => "El parqueo no existe."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    if ((int) $parqueo["estado"] !== 1) {
        http_response_code(409);

        echo json_encode([
            "error" => "No se puede actualizar un parqueo desactivado."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $ubicacion = trim($ubicacion);

    $sql = "UPDATE parqueo
            SET ubicacion = ?,
                capacidad = ?,
                id_estacion = ?
            WHERE id_parqueo = ?";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param(
        "siii",
        $ubicacion,
        $capacidad,
        $id_estacion,
        $id_parqueo
    );

    try {
        $stmt->execute();

        http_response_code(200);

        echo json_encode([
            "mensaje" => "Parqueo actualizado correctamente."
        ], JSON_UNESCAPED_UNICODE);

    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() === 1452) {
            http_response_code(400);

            echo json_encode([
                "error" => "La estación indicada no existe."
            ], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(500);

            echo json_encode([
                "error" => "No se pudo actualizar el parqueo."
            ], JSON_UNESCAPED_UNICODE);
        }
    }

    $stmt->close();

} elseif ($metodo === "DELETE") {

    // ---------- DELETE: DESACTIVAR PARQUEO ----------
    if (!$id_parqueo || $id_parqueo <= 0) {
        http_response_code(400);

        echo json_encode([
            "error" => "Debes indicar un ID de parqueo válido en la URL."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $sql = "SELECT estado
            FROM parqueo
            WHERE id_parqueo = ?";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("i", $id_parqueo);
    $stmt->execute();

    $resultado = $stmt->get_result();
    $parqueo = $resultado->fetch_assoc();

    $stmt->close();

    if (!$parqueo) {
        http_response_code(404);

        echo json_encode([
            "error" => "El parqueo no existe."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    if ((int) $parqueo["estado"] !== 1) {
        http_response_code(409);

        echo json_encode([
            "error" => "El parqueo ya está desactivado."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $sql = "UPDATE parqueo SET estado = 0 WHERE id_parqueo = ?";
    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("i", $id_parqueo);
    $stmt->execute();
    $stmt->close();

    http_response_code(200);

    echo json_encode([
        "mensaje" => "Parqueo desactivado correctamente."
    ], JSON_UNESCAPED_UNICODE);

} else {

    http_response_code(405);

    echo json_encode([
        "error" => "Método no permitido."
    ], JSON_UNESCAPED_UNICODE);
}

$conexion->close();
?>
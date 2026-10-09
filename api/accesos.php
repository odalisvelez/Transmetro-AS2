<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");


$metodo = $_SERVER["REQUEST_METHOD"];

// Obtener el ID enviado por la URL para PUT y DELETE
$id_acceso = filter_input(INPUT_GET, "id", FILTER_VALIDATE_INT);

if ($metodo === "GET") {

    // ---------- GET: CONSULTAR ACCESOS ----------
    $sql = "SELECT
                a.id_acceso,
                a.nombre AS acceso,
                a.id_estacion,
                e.nombre AS estacion,
                a.estado
            FROM acceso a
            INNER JOIN estacion e
                ON a.id_estacion = e.id_estacion
            ORDER BY a.id_acceso";

    $resultado = $conexion->query($sql);

    if ($resultado) {
        $accesos = [];

        while ($fila = $resultado->fetch_assoc()) {
            $accesos[] = $fila;
        }

        echo json_encode($accesos, JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);

        echo json_encode([
            "error" => "No se pudieron obtener los accesos."
        ], JSON_UNESCAPED_UNICODE);
    }

} elseif ($metodo === "POST") {

    // ---------- POST: REGISTRAR ACCESO ----------
    $datos = json_decode(file_get_contents("php://input"), true);

    $nombre = $datos["nombre"] ?? null;
    $id_estacion = filter_var(
        $datos["id_estacion"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (
        !is_string($nombre) ||
        trim($nombre) === "" ||
        $id_estacion === false ||
        $id_estacion === null ||
        $id_estacion <= 0
    ) {
        http_response_code(400);

        echo json_encode([
            "error" => "El nombre y un ID de estación válido son obligatorios."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $nombre = trim($nombre);

    $sql = "INSERT INTO acceso (nombre, id_estacion)
            VALUES (?, ?)";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("si", $nombre, $id_estacion);

    try {
        $stmt->execute();

        http_response_code(201);

        echo json_encode([
            "mensaje" => "Acceso creado correctamente.",
            "id_acceso" => $stmt->insert_id
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
                "error" => "No se pudo crear el acceso."
            ], JSON_UNESCAPED_UNICODE);
        }
    }

    $stmt->close();

} elseif ($metodo === "PUT") {

    // ---------- PUT: ACTUALIZAR ACCESO ----------
    if (!$id_acceso || $id_acceso <= 0) {
        http_response_code(400);

        echo json_encode([
            "error" => "Debes indicar un ID de acceso válido en la URL."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $datos = json_decode(file_get_contents("php://input"), true);

    $nombre = $datos["nombre"] ?? null;
    $id_estacion = filter_var(
        $datos["id_estacion"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (
        !is_string($nombre) ||
        trim($nombre) === "" ||
        $id_estacion === false ||
        $id_estacion === null ||
        $id_estacion <= 0
    ) {
        http_response_code(400);

        echo json_encode([
            "error" => "El nombre y un ID de estación válido son obligatorios."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    // Comprobar que el acceso exista
    $sql = "SELECT id_acceso FROM acceso WHERE id_acceso = ?";
    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("i", $id_acceso);
    $stmt->execute();
    $resultado = $stmt->get_result();
    $existe = $resultado->num_rows > 0;
    $stmt->close();

    if (!$existe) {
        http_response_code(404);

        echo json_encode([
            "error" => "El acceso no existe."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $nombre = trim($nombre);

    $sql = "UPDATE acceso
            SET nombre = ?, id_estacion = ?
            WHERE id_acceso = ?";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("sii", $nombre, $id_estacion, $id_acceso);

    try {
        $stmt->execute();

        http_response_code(200);

        echo json_encode([
            "mensaje" => "Acceso actualizado correctamente."
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
                "error" => "No se pudo actualizar el acceso."
            ], JSON_UNESCAPED_UNICODE);
        }
    }

    $stmt->close();

} elseif ($metodo === "DELETE") {

    // ---------- DELETE: DESACTIVAR ACCESO ----------
    if (!$id_acceso || $id_acceso <= 0) {
        http_response_code(400);

        echo json_encode([
            "error" => "Debes indicar un ID de acceso válido en la URL."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    // Comprobar que el acceso exista
    $sql = "SELECT id_acceso FROM acceso WHERE id_acceso = ?";
    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("i", $id_acceso);
    $stmt->execute();
    $resultado = $stmt->get_result();
    $existe = $resultado->num_rows > 0;
    $stmt->close();

    if (!$existe) {
        http_response_code(404);

        echo json_encode([
            "error" => "El acceso no existe."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $sql = "UPDATE acceso SET estado = 0 WHERE id_acceso = ?";
    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("i", $id_acceso);
    $stmt->execute();
    $stmt->close();

    http_response_code(200);

    echo json_encode([
        "mensaje" => "Acceso desactivado correctamente."
    ], JSON_UNESCAPED_UNICODE);

} else {

    // ---------- MÉTODO NO PERMITIDO ----------
    http_response_code(405);

    echo json_encode([
        "error" => "Método no permitido."
    ], JSON_UNESCAPED_UNICODE);
}

$conexion->close();
?>
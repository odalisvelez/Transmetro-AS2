
<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$metodo = $_SERVER["REQUEST_METHOD"];
$datos = json_decode(file_get_contents("php://input"), true);

/**
 * Responder con JSON y finalizar.
 */
function responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Validar el ID de una municipalidad.
 */
function municipalidadExiste($conexion, $id) {

    $sql = "SELECT id_municipalidad
            FROM municipalidad
            WHERE id_municipalidad = ?";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("i", $id);
    $stmt->execute();

    $existe = $stmt->get_result()->num_rows > 0;

    $stmt->close();

    return $existe;
}

/**
 * Comprobar si el nombre de una línea ya existe.
 * En una actualización se excluye la línea actual.
 */
function nombreLineaExiste($conexion, $nombre, $idExcluir = 0) {

    $sql = "SELECT id_linea
            FROM linea
            WHERE nombre = ?
            AND id_linea != ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("si", $nombre, $idExcluir);
    $stmt->execute();

    $existe = $stmt->get_result()->num_rows > 0;

    $stmt->close();

    return $existe;
}

/**
 * GET: consultar todas las líneas.
 */
if ($metodo === "GET") {

    $sql = "SELECT
                l.id_linea,
                l.nombre,
                l.id_municipalidad,
                l.estado,
                m.nombre AS municipalidad
            FROM linea l
            INNER JOIN municipalidad m
                ON l.id_municipalidad = m.id_municipalidad
            ORDER BY l.id_linea";

    $resultado = $conexion->query($sql);

    if (!$resultado) {
        responder(500, [
            "error" => "No se pudieron obtener las líneas."
        ]);
    }

    $lineas = [];

    while ($fila = $resultado->fetch_assoc()) {
        $lineas[] = $fila;
    }

    responder(200, $lineas);
}

/**
 * POST: registrar una línea.
 */
elseif ($metodo === "POST") {

    if (
        !is_array($datos) ||
        !isset($datos["nombre"]) ||
        !isset($datos["id_municipalidad"])
    ) {
        responder(400, [
            "error" => "Debes enviar nombre e id_municipalidad."
        ]);
    }

    if (!is_string($datos["nombre"])) {
        responder(400, [
            "error" => "El nombre debe ser texto."
        ]);
    }

    $nombre = trim($datos["nombre"]);

    $idMunicipalidad = filter_var(
        $datos["id_municipalidad"],
        FILTER_VALIDATE_INT
    );

    if ($nombre === "") {
        responder(400, [
            "error" => "El nombre de la línea es obligatorio."
        ]);
    }

    if (mb_strlen($nombre) > 150) {
        responder(400, [
            "error" => "El nombre no puede superar los 150 caracteres."
        ]);
    }

    if (
        $idMunicipalidad === false ||
        $idMunicipalidad <= 0
    ) {
        responder(400, [
            "error" => "El ID de la municipalidad no es válido."
        ]);
    }

    if (!municipalidadExiste($conexion, $idMunicipalidad)) {
        responder(400, [
            "error" => "La municipalidad indicada no existe."
        ]);
    }

    if (nombreLineaExiste($conexion, $nombre)) {
        responder(409, [
            "error" => "Ya existe una línea con ese nombre."
        ]);
    }

    $sql = "INSERT INTO linea
                (nombre, id_municipalidad, estado)
            VALUES (?, ?, 1)";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("si", $nombre, $idMunicipalidad);

    if (!$stmt->execute()) {
        $stmt->close();

        responder(500, [
            "error" => "No se pudo registrar la línea."
        ]);
    }

    $idNuevo = $conexion->insert_id;
    $stmt->close();

    responder(201, [
        "mensaje" => "Línea registrada correctamente.",
        "id_linea" => $idNuevo,
        "nombre" => $nombre,
        "id_municipalidad" => $idMunicipalidad,
        "estado" => 1
    ]);
}

/**
 * PUT: actualizar una línea existente.
 * URL: lineas.php?id=1
 */
elseif ($metodo === "PUT") {

    $id = filter_var(
        $_GET["id"] ?? null,
        FILTER_VALIDATE_INT
    );

    if ($id === false || $id === null || $id <= 0) {
        responder(400, [
            "error" => "Debes proporcionar un ID de línea válido."
        ]);
    }

    if (
        !is_array($datos) ||
        !isset($datos["nombre"]) ||
        !isset($datos["id_municipalidad"])
    ) {
        responder(400, [
            "error" => "Debes enviar nombre e id_municipalidad."
        ]);
    }

    if (!is_string($datos["nombre"])) {
        responder(400, [
            "error" => "El nombre debe ser texto."
        ]);
    }

    $nombre = trim($datos["nombre"]);

    $idMunicipalidad = filter_var(
        $datos["id_municipalidad"],
        FILTER_VALIDATE_INT
    );

    if ($nombre === "" || mb_strlen($nombre) > 150) {
        responder(400, [
            "error" => "El nombre es obligatorio y no debe superar los 150 caracteres."
        ]);
    }

    if (
        $idMunicipalidad === false ||
        $idMunicipalidad <= 0
    ) {
        responder(400, [
            "error" => "El ID de la municipalidad no es válido."
        ]);
    }

    if (!municipalidadExiste($conexion, $idMunicipalidad)) {
        responder(400, [
            "error" => "La municipalidad indicada no existe."
        ]);
    }

    $stmt = $conexion->prepare(
        "SELECT id_linea
         FROM linea
         WHERE id_linea = ? AND estado = 1"
    );

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $existe = $stmt->get_result()->num_rows > 0;
    $stmt->close();

    if (!$existe) {
        responder(404, [
            "error" => "La línea no existe o está inactiva."
        ]);
    }

    if (nombreLineaExiste($conexion, $nombre, $id)) {
        responder(409, [
            "error" => "Otra línea ya utiliza ese nombre."
        ]);
    }

    $sql = "UPDATE linea
            SET nombre = ?,
                id_municipalidad = ?
            WHERE id_linea = ? AND estado = 1";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("sii", $nombre, $idMunicipalidad, $id);

    if (!$stmt->execute()) {
        $stmt->close();

        responder(500, [
            "error" => "No se pudo actualizar la línea."
        ]);
    }

    $stmt->close();

    responder(200, [
        "mensaje" => "Línea actualizada correctamente.",
        "id_linea" => $id,
        "nombre" => $nombre,
        "id_municipalidad" => $idMunicipalidad,
        "estado" => 1
    ]);
}

/**
 * DELETE: eliminación lógica.
 * URL: lineas.php?id=1
 */
elseif ($metodo === "DELETE") {

    $id = filter_var(
        $_GET["id"] ?? null,
        FILTER_VALIDATE_INT
    );

    if ($id === false || $id === null || $id <= 0) {
        responder(400, [
            "error" => "Debes proporcionar un ID de línea válido."
        ]);
    }

    $stmt = $conexion->prepare(
        "SELECT id_linea
         FROM linea
         WHERE id_linea = ? AND estado = 1"
    );

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $existe = $stmt->get_result()->num_rows > 0;
    $stmt->close();

    if (!$existe) {
        responder(404, [
            "error" => "La línea no existe o ya está inactiva."
        ]);
    }

    $stmt = $conexion->prepare(
        "UPDATE linea
         SET estado = 0
         WHERE id_linea = ? AND estado = 1"
    );

    $stmt->bind_param("i", $id);

    if (!$stmt->execute()) {
        $stmt->close();

        responder(500, [
            "error" => "No se pudo desactivar la línea."
        ]);
    }

    $stmt->close();

    responder(200, [
        "mensaje" => "Línea desactivada correctamente.",
        "id_linea" => $id,
        "estado" => 0
    ]);
}

/**
 * Método HTTP no permitido.
 */
else {

    header("Allow: GET, POST, PUT, DELETE");

    responder(405, [
        "error" => "Método HTTP no permitido."
    ]);
}

$conexion->close();
?>
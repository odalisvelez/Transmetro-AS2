
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
                l.estado_operativo,
                m.nombre AS municipalidad,

                (
                    SELECT COUNT(*)
                    FROM detalle_ruta dr
                    INNER JOIN estacion e
                        ON dr.id_estacion = e.id_estacion
                    WHERE dr.id_linea = l.id_linea
                      AND e.estado = 1
                ) AS total_estaciones,

                (
                    SELECT COUNT(*)
                    FROM bus b
                    WHERE b.id_linea = l.id_linea
                      AND b.estado = 1
                ) AS total_buses

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
        "estado" => 1,
        "estado_operativo" => "PREPARACION"
    ]);
}


/**
 * PUT: habilitar una línea para operar.
 * URL: lineas.php?accion=habilitar&id=1
 */
elseif (
    $metodo === "PUT" &&
    ($_GET["accion"] ?? "") === "habilitar"
) {

    $id = filter_var(
        $_GET["id"] ?? null,
        FILTER_VALIDATE_INT
    );

    if ($id === false || $id === null || $id <= 0) {
        responder(400, [
            "error" => "Debes proporcionar un ID de línea válido."
        ]);
    }

    // Verificar que la línea exista y esté activa.
    $stmt = $conexion->prepare(
        "SELECT id_linea, estado_operativo
         FROM linea
         WHERE id_linea = ? AND estado = 1"
    );

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $linea = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$linea) {
        responder(404, [
            "error" => "La línea no existe o está desactivada."
        ]);
    }

    // Evitar repetir la habilitación.
    if ($linea["estado_operativo"] === "OPERATIVA") {
        responder(200, [
            "mensaje" => "La línea ya está habilitada para operar.",
            "id_linea" => $id,
            "estado_operativo" => "OPERATIVA"
        ]);
    }

    // Contar las estaciones activas que pertenecen a la ruta.
    $stmt = $conexion->prepare(
        "SELECT COUNT(*) AS total
         FROM detalle_ruta dr
         INNER JOIN estacion e
             ON dr.id_estacion = e.id_estacion
         WHERE dr.id_linea = ?
           AND e.estado = 1"
    );

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $totalEstaciones = (int) $stmt
        ->get_result()
        ->fetch_assoc()["total"];

    $stmt->close();

    // Una línea debe tener al menos una estación.
    if ($totalEstaciones === 0) {
        responder(409, [
            "error" => "No se puede habilitar la línea porque no tiene estaciones activas en su ruta.",
            "estaciones" => 0,
            "buses_activos" => 0
        ]);
    }

    // Contar los buses activos asignados a la línea.
    $stmt = $conexion->prepare(
        "SELECT COUNT(*) AS total
         FROM bus
         WHERE id_linea = ?
           AND estado = 1"
    );

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $totalBuses = (int) $stmt
        ->get_result()
        ->fetch_assoc()["total"];

    $stmt->close();

    // RN-06: mínimo de buses igual al número de estaciones.
    if ($totalBuses < $totalEstaciones) {
        responder(409, [
            "error" => "No se puede habilitar la línea: faltan buses activos para cumplir RN-06.",
            "estaciones" => $totalEstaciones,
            "buses_activos" => $totalBuses,
            "buses_minimos_requeridos" => $totalEstaciones,
            "buses_faltantes" => $totalEstaciones - $totalBuses
        ]);
    }

    // RN-07: máximo de buses igual al doble de las estaciones.
    $maximoBuses = $totalEstaciones * 2;

    if ($totalBuses > $maximoBuses) {
        responder(409, [
            "error" => "No se puede habilitar la línea: se supera el máximo de buses permitido por RN-07.",
            "estaciones" => $totalEstaciones,
            "buses_activos" => $totalBuses,
            "buses_maximos_permitidos" => $maximoBuses
        ]);
    }

    // Ambas reglas se cumplen: habilitar la línea.
    $stmt = $conexion->prepare(
        "UPDATE linea
         SET estado_operativo = 'OPERATIVA'
         WHERE id_linea = ?
           AND estado = 1
           AND estado_operativo = 'PREPARACION'"
    );

    $stmt->bind_param("i", $id);

    if (!$stmt->execute()) {
        $stmt->close();

        responder(500, [
            "error" => "No se pudo habilitar la línea."
        ]);
    }

    $actualizado = $stmt->affected_rows;
    $stmt->close();

    if ($actualizado !== 1) {
        responder(409, [
            "error" => "No se pudo habilitar la línea. Es posible que su estado haya cambiado."
        ]);
    }

    responder(200, [
        "mensaje" => "La línea cumple RN-06 y RN-07 y está habilitada para operar.",
        "id_linea" => $id,
        "estado_operativo" => "OPERATIVA",
        "estaciones" => $totalEstaciones,
        "buses_activos" => $totalBuses,
        "buses_minimos_requeridos" => $totalEstaciones,
        "buses_maximos_permitidos" => $maximoBuses
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
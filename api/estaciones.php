
<?php

require_once "../config/conexion.php";
require_once "../config/autenticacion.php";

header("Content-Type: application/json; charset=UTF-8");

$metodo = $_SERVER["REQUEST_METHOD"];
$datos = json_decode(file_get_contents("php://input"), true);

/**
 * Enviar respuesta JSON y finalizar.
 */
function responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Permisos para el modulo de estaciones solo admin.
 */
$usuarioAutenticado = exigirAutenticacion($conexion);

if ((int) $usuarioAutenticado["id_rol"] !== 1) {
    responder(403, [
        "error" => "No tiene permisos para acceder al módulo de estaciones."
    ]);
}

/**
 * Verificar que la municipalidad exista.
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
 * Verificar si ya existe una estación con ese nombre.
 * En PUT se excluye la estación actual.
 */
function nombreEstacionExiste($conexion, $nombre, $idExcluir = 0) {

    $sql = "SELECT id_estacion
            FROM estacion
            WHERE nombre = ?
              AND id_estacion != ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("si", $nombre, $idExcluir);
    $stmt->execute();

    $existe = $stmt->get_result()->num_rows > 0;

    $stmt->close();

    return $existe;
}


/**
 * Validar RN-06 y RN-07 antes de desactivar una estación.
 * Revisa todas las líneas operativas que utilizan la estación.
 */
function validarDesactivacionEstacion($conexion, $idEstacion) {

    // Obtener todas las líneas operativas que utilizan la estación.
    $stmt = $conexion->prepare(
        "SELECT DISTINCT l.id_linea
         FROM Detalle_Ruta dr
         INNER JOIN Linea l
             ON l.id_linea = dr.id_linea
         WHERE dr.id_estacion = ?
           AND l.estado = 1
           AND l.estado_operativo = 'OPERATIVA'"
    );

    $stmt->bind_param("i", $idEstacion);
    $stmt->execute();

    $resultado = $stmt->get_result();
    $lineas = [];

    while ($fila = $resultado->fetch_assoc()) {
        $lineas[] = (int)$fila["id_linea"];
    }

    $stmt->close();

    // Revisar las reglas en cada línea afectada.
    foreach ($lineas as $idLinea) {

        // Contar estaciones activas que quedarían después
        // de desactivar la estación indicada.
        $stmt = $conexion->prepare(
            "SELECT COUNT(*) AS total
             FROM Detalle_Ruta dr
             INNER JOIN Estacion e
                 ON e.id_estacion = dr.id_estacion
             WHERE dr.id_linea = ?
               AND e.estado = 1
               AND dr.id_estacion != ?"
        );

        $stmt->bind_param("ii", $idLinea, $idEstacion);
        $stmt->execute();

        $estacionesProyectadas = (int)$stmt->get_result()
            ->fetch_assoc()["total"];

        $stmt->close();

        // Contar buses activos de la línea.
        $stmt = $conexion->prepare(
            "SELECT COUNT(*) AS total
             FROM Bus
             WHERE id_linea = ?
               AND estado = 1"
        );

        $stmt->bind_param("i", $idLinea);
        $stmt->execute();

        $busesActivos = (int)$stmt->get_result()
            ->fetch_assoc()["total"];

        $stmt->close();

        // Una línea operativa debe conservar al menos
        // una estación activa.
        if ($estacionesProyectadas < 1) {
            return [
                "codigo" => 409,
                "error" => "No se puede desactivar la estación porque una línea operativa se quedaría sin estaciones activas.",
                "id_linea" => $idLinea
            ];
        }

        // RN-06: buses activos >= estaciones activas.
        if ($busesActivos < $estacionesProyectadas) {
            return [
                "codigo" => 409,
                "error" => "La operación incumple RN-06: la línea tendría más estaciones activas que buses activos.",
                "id_linea" => $idLinea,
                "estaciones_proyectadas" => $estacionesProyectadas,
                "buses_activos" => $busesActivos,
                "buses_minimos_requeridos" => $estacionesProyectadas
            ];
        }

        // RN-07: buses activos <= 2 * estaciones activas.
        $busesMaximos = 2 * $estacionesProyectadas;

        if ($busesActivos > $busesMaximos) {
            return [
                "codigo" => 409,
                "error" => "La operación incumple RN-07: la línea tendría más buses activos que el máximo permitido.",
                "id_linea" => $idLinea,
                "estaciones_proyectadas" => $estacionesProyectadas,
                "buses_activos" => $busesActivos,
                "buses_maximos_permitidos" => $busesMaximos
            ];
        }
    }

    return null;
}

/**
 * GET: consultar todas las estaciones.
 */
if ($metodo === "GET") {

    $sql = "SELECT
                e.id_estacion,
                e.nombre,
                e.id_municipalidad,
                e.estado,
                m.nombre AS municipalidad
            FROM estacion e
            INNER JOIN municipalidad m
                ON e.id_municipalidad = m.id_municipalidad
            ORDER BY e.id_estacion";

    $resultado = $conexion->query($sql);

    if (!$resultado) {
        responder(500, [
            "error" => "No se pudieron obtener las estaciones."
        ]);
    }

    $estaciones = [];

    while ($fila = $resultado->fetch_assoc()) {
        $estaciones[] = $fila;
    }

    responder(200, $estaciones);
}

/**
 * POST: registrar una estación.
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
            "error" => "El nombre de la estación es obligatorio."
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

    if (nombreEstacionExiste($conexion, $nombre)) {
        responder(409, [
            "error" => "Ya existe una estación con ese nombre."
        ]);
    }

    $sql = "INSERT INTO estacion
                (nombre, id_municipalidad, estado)
            VALUES (?, ?, 1)";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("si", $nombre, $idMunicipalidad);

    if (!$stmt->execute()) {
        $stmt->close();

        responder(500, [
            "error" => "No se pudo registrar la estación."
        ]);
    }

    $idNuevo = $conexion->insert_id;
    $stmt->close();

    responder(201, [
        "mensaje" => "Estación registrada correctamente.",
        "id_estacion" => $idNuevo,
        "nombre" => $nombre,
        "id_municipalidad" => $idMunicipalidad,
        "estado" => 1
    ]);
}

/**
 * PUT: actualizar una estación activa.
 * URL: estaciones.php?id=1
 */
elseif ($metodo === "PUT") {

    $id = filter_var(
        $_GET["id"] ?? null,
        FILTER_VALIDATE_INT
    );

    if ($id === false || $id === null || $id <= 0) {
        responder(400, [
            "error" => "Debes proporcionar un ID de estación válido."
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
        "SELECT id_estacion
         FROM estacion
         WHERE id_estacion = ? AND estado = 1"
    );

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $existe = $stmt->get_result()->num_rows > 0;
    $stmt->close();

    if (!$existe) {
        responder(404, [
            "error" => "La estación no existe o está inactiva."
        ]);
    }

    if (nombreEstacionExiste($conexion, $nombre, $id)) {
        responder(409, [
            "error" => "Otra estación ya utiliza ese nombre."
        ]);
    }

    $sql = "UPDATE estacion
            SET nombre = ?,
                id_municipalidad = ?
            WHERE id_estacion = ? AND estado = 1";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("sii", $nombre, $idMunicipalidad, $id);

    if (!$stmt->execute()) {
        $stmt->close();

        responder(500, [
            "error" => "No se pudo actualizar la estación."
        ]);
    }

    $stmt->close();

    responder(200, [
        "mensaje" => "Estación actualizada correctamente.",
        "id_estacion" => $id,
        "nombre" => $nombre,
        "id_municipalidad" => $idMunicipalidad,
        "estado" => 1
    ]);
}

/**
 * DELETE: eliminación lógica.
 * URL: estaciones.php?id=1
 */
elseif ($metodo === "DELETE") {

    $id = filter_var(
        $_GET["id"] ?? null,
        FILTER_VALIDATE_INT
    );

    if ($id === false || $id === null || $id <= 0) {
        responder(400, [
            "error" => "Debes proporcionar un ID de estación válido."
        ]);
    }

    $stmt = $conexion->prepare(
        "SELECT id_estacion
         FROM estacion
         WHERE id_estacion = ? AND estado = 1"
    );

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $existe = $stmt->get_result()->num_rows > 0;
    $stmt->close();

    if (!$existe) {
        responder(404, [
            "error" => "La estación no existe o ya está inactiva."
        ]);
    }

    
    // Comprobar RN-06 y RN-07 en todas las líneas
    // operativas afectadas por la desactivación.
    $errorReglas = validarDesactivacionEstacion(
        $conexion,
        $id
    );

    if ($errorReglas !== null) {
        $codigo = $errorReglas["codigo"];
        unset($errorReglas["codigo"]);

        responder($codigo, $errorReglas);
    }

    $stmt = $conexion->prepare(
        "UPDATE estacion
         SET estado = 0
         WHERE id_estacion = ? AND estado = 1"
    );

    $stmt->bind_param("i", $id);

    if (!$stmt->execute()) {
        $stmt->close();

        responder(500, [
            "error" => "No se pudo desactivar la estación."
        ]);
    }

    $stmt->close();

    responder(200, [
        "mensaje" => "Estación desactivada correctamente.",
        "id_estacion" => $id,
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
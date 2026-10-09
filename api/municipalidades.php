
<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$metodo = $_SERVER["REQUEST_METHOD"];

$datos = json_decode(file_get_contents("php://input"), true);

/**
 * Enviar respuesta JSON y finalizar la ejecución.
 */
function responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Verificar si el nombre ya existe.
 * En PUT se excluye el identificador actual.
 */
function nombreExiste($conexion, $nombre, $idExcluir = 0) {

    $sql = "SELECT id_municipalidad
            FROM municipalidad
            WHERE nombre = ?
            AND id_municipalidad != ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("si", $nombre, $idExcluir);
    $stmt->execute();

    $resultado = $stmt->get_result();
    $existe = $resultado->num_rows > 0;

    $stmt->close();

    return $existe;
}

/**
 * GET: consultar todas las municipalidades.
 */
if ($metodo === "GET") {

    $sql = "SELECT id_municipalidad, nombre
            FROM municipalidad
            ORDER BY id_municipalidad";

    $resultado = $conexion->query($sql);

    if (!$resultado) {
        responder(500, [
            "error" => "No se pudieron obtener las municipalidades."
        ]);
    }

    $municipalidades = [];

    while ($fila = $resultado->fetch_assoc()) {
        $municipalidades[] = $fila;
    }

    responder(200, $municipalidades);
}

/**
 * POST: registrar una municipalidad.
 */
elseif ($metodo === "POST") {

    if (!is_array($datos) || !isset($datos["nombre"])) {
        responder(400, [
            "error" => "Debes enviar el nombre de la municipalidad."
        ]);
    }

    $nombre = trim($datos["nombre"]);

    if ($nombre === "") {
        responder(400, [
            "error" => "El nombre es obligatorio."
        ]);
    }

    if (mb_strlen($nombre) > 150) {
        responder(400, [
            "error" => "El nombre no puede superar los 150 caracteres."
        ]);
    }

    if (nombreExiste($conexion, $nombre)) {
        responder(409, [
            "error" => "Ya existe una municipalidad con ese nombre."
        ]);
    }

    $sql = "INSERT INTO municipalidad (nombre)
            VALUES (?)";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("s", $nombre);

    if (!$stmt->execute()) {
        $stmt->close();

        responder(500, [
            "error" => "No se pudo registrar la municipalidad."
        ]);
    }

    $idNuevo = $conexion->insert_id;
    $stmt->close();

    responder(201, [
        "mensaje" => "Municipalidad registrada correctamente.",
        "id_municipalidad" => $idNuevo,
        "nombre" => $nombre
    ]);
}

/**
 * PUT: actualizar una municipalidad.
 * Se envía el ID mediante ?id=1
 */
elseif ($metodo === "PUT") {

    $id = filter_var(
        $_GET["id"] ?? null,
        FILTER_VALIDATE_INT
    );

    if ($id === false || $id === null || $id <= 0) {
        responder(400, [
            "error" => "Debes proporcionar un ID válido en la URL."
        ]);
    }

    if (!is_array($datos) || !isset($datos["nombre"])) {
        responder(400, [
            "error" => "Debes enviar el nuevo nombre."
        ]);
    }

    $nombre = trim($datos["nombre"]);

    if ($nombre === "") {
        responder(400, [
            "error" => "El nombre es obligatorio."
        ]);
    }

    if (mb_strlen($nombre) > 150) {
        responder(400, [
            "error" => "El nombre no puede superar los 150 caracteres."
        ]);
    }

    $stmt = $conexion->prepare(
        "SELECT id_municipalidad
         FROM municipalidad
         WHERE id_municipalidad = ?"
    );

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $existe = $stmt->get_result()->num_rows > 0;
    $stmt->close();

    if (!$existe) {
        responder(404, [
            "error" => "La municipalidad no existe."
        ]);
    }

    if (nombreExiste($conexion, $nombre, $id)) {
        responder(409, [
            "error" => "Otra municipalidad ya utiliza ese nombre."
        ]);
    }

    $sql = "UPDATE municipalidad
            SET nombre = ?
            WHERE id_municipalidad = ?";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("si", $nombre, $id);

    if (!$stmt->execute()) {
        $stmt->close();

        responder(500, [
            "error" => "No se pudo actualizar la municipalidad."
        ]);
    }

    $stmt->close();

    responder(200, [
        "mensaje" => "Municipalidad actualizada correctamente.",
        "id_municipalidad" => $id,
        "nombre" => $nombre
    ]);
}

/**
 * DELETE: eliminar únicamente si no tiene líneas
 * ni estaciones asociadas.
 */
elseif ($metodo === "DELETE") {

    $id = filter_var(
        $_GET["id"] ?? null,
        FILTER_VALIDATE_INT
    );

    if ($id === false || $id === null || $id <= 0) {
        responder(400, [
            "error" => "Debes proporcionar un ID válido en la URL."
        ]);
    }

    $stmt = $conexion->prepare(
        "SELECT id_municipalidad
         FROM municipalidad
         WHERE id_municipalidad = ?"
    );

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $existe = $stmt->get_result()->num_rows > 0;
    $stmt->close();

    if (!$existe) {
        responder(404, [
            "error" => "La municipalidad no existe."
        ]);
    }

    // Comprobar si tiene líneas asociadas.
    $stmt = $conexion->prepare(
        "SELECT COUNT(*) AS total
         FROM linea
         WHERE id_municipalidad = ?"
    );

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $totalLineas = (int) $stmt->get_result()
                               ->fetch_assoc()["total"];

    $stmt->close();

    // Comprobar si tiene estaciones asociadas.
    $stmt = $conexion->prepare(
        "SELECT COUNT(*) AS total
         FROM estacion
         WHERE id_municipalidad = ?"
    );

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $totalEstaciones = (int) $stmt->get_result()
                                  ->fetch_assoc()["total"];

    $stmt->close();

    if ($totalLineas > 0 || $totalEstaciones > 0) {
        responder(409, [
            "error" => "No se puede eliminar la municipalidad porque tiene líneas o estaciones asociadas.",
            "lineas_asociadas" => $totalLineas,
            "estaciones_asociadas" => $totalEstaciones
        ]);
    }

    $stmt = $conexion->prepare(
        "DELETE FROM municipalidad
         WHERE id_municipalidad = ?"
    );

    $stmt->bind_param("i", $id);

    if (!$stmt->execute()) {
        $stmt->close();

        responder(500, [
            "error" => "No se pudo eliminar la municipalidad."
        ]);
    }

    $stmt->close();

    responder(200, [
        "mensaje" => "Municipalidad eliminada correctamente.",
        "id_municipalidad" => $id
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
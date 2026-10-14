<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$metodo = $_SERVER["REQUEST_METHOD"];

// Función para enviar respuestas JSON
function responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

// Obtener y validar el ID de la URL
$id = filter_input(INPUT_GET, "id", FILTER_VALIDATE_INT);

// Leer los datos JSON enviados en el cuerpo
$datos = json_decode(file_get_contents("php://input"), true);

// GET: consultar todos los guardias
if ($metodo === "GET") {

    $sql = "SELECT
                g.id_guardia,
                g.nombre,
                g.telefono,
                g.id_acceso,
                g.estado,
                a.nombre AS acceso,
                e.id_estacion,
                e.nombre AS estacion
            FROM guardia g
            INNER JOIN acceso a
                ON g.id_acceso = a.id_acceso
            INNER JOIN estacion e
                ON a.id_estacion = e.id_estacion
            WHERE g.estado = 1
            ORDER BY g.id_guardia";

    $resultado = $conexion->query($sql);

    if ($resultado) {
        $guardias = [];

        while ($fila = $resultado->fetch_assoc()) {
            $guardias[] = $fila;
        }

        responder(200, $guardias);
    }

    responder(500, [
        "error" => "No se pudieron obtener los guardias"
    ]);
}

// POST: registrar un guardia
if ($metodo === "POST") {

    if (
        !is_array($datos) ||
        !isset($datos["nombre"], $datos["id_acceso"]) ||
        !is_string($datos["nombre"]) ||
        trim($datos["nombre"]) === "" ||
        filter_var($datos["id_acceso"], FILTER_VALIDATE_INT) === false ||
        (int)$datos["id_acceso"] <= 0
    ) {
        responder(400, [
            "error" => "El nombre y un id_acceso válido son obligatorios"
        ]);
    }

    $nombre = trim($datos["nombre"]);
    $id_acceso = (int)$datos["id_acceso"];

    // El teléfono es opcional
    $telefono = null;

    if (isset($datos["telefono"])) {
        if (!is_string($datos["telefono"])) {
            responder(400, [
                "error" => "El teléfono debe ser texto"
            ]);
        }

        $telefono = trim($datos["telefono"]);

        if ($telefono === "") {
            $telefono = null;
        }
    }

    // Verificar que el acceso exista y esté activo
    $verificar = $conexion->prepare(
        "SELECT id_acceso FROM acceso
         WHERE id_acceso = ? AND estado = 1"
    );

    $verificar->bind_param("i", $id_acceso);
    $verificar->execute();
    $resultado = $verificar->get_result();

    if ($resultado->num_rows === 0) {
        responder(400, [
            "error" => "El acceso no existe o está inactivo"
        ]);
    }

    $sql = "INSERT INTO guardia (nombre, telefono, id_acceso)
            VALUES (?, ?, ?)";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("ssi", $nombre, $telefono, $id_acceso);

    if ($stmt->execute()) {
        responder(201, [
            "mensaje" => "Guardia registrado correctamente",
            "id_guardia" => $conexion->insert_id
        ]);
    }

    if ($conexion->errno === 1452) {
        responder(400, [
            "error" => "El acceso indicado no es válido"
        ]);
    }

    responder(500, [
        "error" => "No se pudo registrar el guardia"
    ]);
}

// PUT: actualizar un guardia existente
if ($metodo === "PUT") {

    if (!$id || $id <= 0) {
        responder(400, [
            "error" => "Debes indicar un id_guardia válido en la URL"
        ]);
    }

    if (
        !is_array($datos) ||
        !isset($datos["nombre"], $datos["id_acceso"]) ||
        !is_string($datos["nombre"]) ||
        trim($datos["nombre"]) === "" ||
        filter_var($datos["id_acceso"], FILTER_VALIDATE_INT) === false ||
        (int)$datos["id_acceso"] <= 0
    ) {
        responder(400, [
            "error" => "El nombre y un id_acceso válido son obligatorios"
        ]);
    }

    $nombre = trim($datos["nombre"]);
    $id_acceso = (int)$datos["id_acceso"];

    $telefono = null;

    if (isset($datos["telefono"])) {
        if (!is_string($datos["telefono"])) {
            responder(400, [
                "error" => "El teléfono debe ser texto"
            ]);
        }

        $telefono = trim($datos["telefono"]);

        if ($telefono === "") {
            $telefono = null;
        }
    }

    // Verificar que el guardia exista y esté activo
    $verificar = $conexion->prepare(
        "SELECT estado FROM guardia WHERE id_guardia = ?"
    );

    $verificar->bind_param("i", $id);
    $verificar->execute();
    $resultado = $verificar->get_result();

    if ($resultado->num_rows === 0) {
        responder(404, [
            "error" => "El guardia no existe"
        ]);
    }

    $guardia = $resultado->fetch_assoc();

    if ((int)$guardia["estado"] !== 1) {
        responder(409, [
            "error" => "No se puede actualizar un guardia inactivo"
        ]);
    }

    // Verificar que el acceso exista y esté activo
    $verificarAcceso = $conexion->prepare(
        "SELECT id_acceso FROM acceso
         WHERE id_acceso = ? AND estado = 1"
    );

    $verificarAcceso->bind_param("i", $id_acceso);
    $verificarAcceso->execute();
    $resultadoAcceso = $verificarAcceso->get_result();

    if ($resultadoAcceso->num_rows === 0) {
        responder(400, [
            "error" => "El acceso no existe o está inactivo"
        ]);
    }

    $sql = "UPDATE guardia
            SET nombre = ?, telefono = ?, id_acceso = ?
            WHERE id_guardia = ? AND estado = 1";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param(
        "ssii",
        $nombre,
        $telefono,
        $id_acceso,
        $id
    );

    if ($stmt->execute()) {
        responder(200, [
            "mensaje" => "Guardia actualizado correctamente",
            "id_guardia" => $id
        ]);
    }

    responder(500, [
        "error" => "No se pudo actualizar el guardia"
    ]);
}


 // DELETE: eliminación lógica
if ($metodo === "DELETE") {

    if (!$id || $id <= 0) {
        responder(400, [
            "error" => "Debes indicar un id_guardia válido en la URL"
        ]);
    }

    // 1. Comprobar si el guardia existe y obtener su acceso
    $verificar = $conexion->prepare(
        "SELECT estado, id_acceso
         FROM guardia
         WHERE id_guardia = ?"
    );

    $verificar->bind_param("i", $id);
    $verificar->execute();
    $resultado = $verificar->get_result();

    if ($resultado->num_rows === 0) {
        responder(404, [
            "error" => "El guardia no existe"
        ]);
    }

    $guardia = $resultado->fetch_assoc();

    // 2. Comprobar que el guardia esté activo
    if ((int)$guardia["estado"] !== 1) {
        responder(409, [
            "error" => "El guardia ya está inactivo"
        ]);
    }

    $id_acceso = (int)$guardia["id_acceso"];

    // 3. Consultar el estado del acceso al que pertenece el guardia
    $consultaAcceso = $conexion->prepare(
        "SELECT estado
         FROM acceso
         WHERE id_acceso = ?"
    );

    $consultaAcceso->bind_param("i", $id_acceso);
    $consultaAcceso->execute();
    $resultadoAcceso = $consultaAcceso->get_result();
    $acceso = $resultadoAcceso->fetch_assoc();

    // 4. Si el acceso está activo, verificar sus guardias activos
    if ($acceso && (int)$acceso["estado"] === 1) {

        $consultaGuardias = $conexion->prepare(
            "SELECT COUNT(*) AS total_guardias
             FROM guardia
             WHERE id_acceso = ?
               AND estado = 1"
        );

        $consultaGuardias->bind_param("i", $id_acceso);
        $consultaGuardias->execute();
        $resultadoGuardias = $consultaGuardias->get_result();
        $datosGuardias = $resultadoGuardias->fetch_assoc();

        $totalGuardias = (int)$datosGuardias["total_guardias"];

        // No permitir desactivar al último guardia del acceso
        if ($totalGuardias <= 1) {
            responder(409, [
                "error" => "No se puede desactivar este guardia porque es el último guardia activo del acceso. Asigna primero otro guardia activo a este acceso."
            ]);
        }
    }

    // 5. Desactivar el guardia sin eliminarlo físicamente
    $sql = "UPDATE guardia
            SET estado = 0
            WHERE id_guardia = ?
              AND estado = 1";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {

        if ($stmt->affected_rows === 1) {
            responder(200, [
                "mensaje" => "Guardia desactivado correctamente",
                "id_guardia" => $id,
                "estado" => 0
            ]);
        }

        responder(409, [
            "error" => "El guardia ya no está activo o fue modificado"
        ]);
    }

    responder(500, [
        "error" => "No se pudo desactivar el guardia"
    ]);
}


// Método HTTP no permitido
responder(405, [
    "error" => "Método HTTP no permitido"
]);
$conexion->close();
?>
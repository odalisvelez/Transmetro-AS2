

<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$metodo = $_SERVER["REQUEST_METHOD"];

// Leer el JSON enviado por Postman
$datos = json_decode(file_get_contents("php://input"), true);

// Comprobar que una entidad relacionada exista y esté activa
function registroActivo($conexion, $tabla, $campoId, $id) {

    $sql = "SELECT $campoId FROM $tabla
            WHERE $campoId = ? AND estado = 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $resultado = $stmt->get_result();
    $existe = $resultado->num_rows > 0;

    $stmt->close();

    return $existe;
}

// Comprobar si la placa ya pertenece a otro bus
function placaExiste($conexion, $placa, $idExcluir = null) {

    if ($idExcluir === null) {
        $sql = "SELECT id_bus FROM bus WHERE placa = ?";
        $stmt = $conexion->prepare($sql);
        $stmt->bind_param("s", $placa);
    } else {
        $sql = "SELECT id_bus FROM bus
                WHERE placa = ? AND id_bus <> ?";
        $stmt = $conexion->prepare($sql);
        $stmt->bind_param("si", $placa, $idExcluir);
    }

    $stmt->execute();
    $resultado = $stmt->get_result();
    $existe = $resultado->num_rows > 0;

    $stmt->close();

    return $existe;
}

// Validar datos comunes para registrar y modificar
function validarDatosBus($conexion, $datos) {

    if (
        !isset($datos["placa"]) ||
        trim($datos["placa"]) === "" ||
        !isset($datos["capacidad_maxima"]) ||
        !is_numeric($datos["capacidad_maxima"]) ||
        (int)$datos["capacidad_maxima"] <= 0 ||
        !isset($datos["id_parqueo"]) ||
        !filter_var($datos["id_parqueo"], FILTER_VALIDATE_INT) ||
        (int)$datos["id_parqueo"] <= 0
    ) {
        return "La placa, capacidad positiva y parqueo son obligatorios.";
    }

    if (
        isset($datos["id_linea"]) &&
        $datos["id_linea"] !== null &&
        (
            !filter_var($datos["id_linea"], FILTER_VALIDATE_INT) ||
            (int)$datos["id_linea"] <= 0
        )
    ) {
        return "El identificador de línea no es válido.";
    }

    if (
        isset($datos["id_piloto"]) &&
        $datos["id_piloto"] !== null &&
        (
            !filter_var($datos["id_piloto"], FILTER_VALIDATE_INT) ||
            (int)$datos["id_piloto"] <= 0
        )
    ) {
        return "El identificador del piloto no es válido.";
    }

    $idParqueo = (int)$datos["id_parqueo"];

    if (!registroActivo(
        $conexion, "parqueo", "id_parqueo", $idParqueo
    )) {
        return "El parqueo no existe o está inactivo.";
    }

    if (
        isset($datos["id_linea"]) &&
        $datos["id_linea"] !== null &&
        !registroActivo(
            $conexion,
            "linea",
            "id_linea",
            (int)$datos["id_linea"]
        )
    ) {
        return "La línea no existe o está inactiva.";
    }

    if (
        isset($datos["id_piloto"]) &&
        $datos["id_piloto"] !== null &&
        !registroActivo(
            $conexion,
            "piloto",
            "id_piloto",
            (int)$datos["id_piloto"]
        )
    ) {
        return "El piloto no existe o está inactivo.";
    }

    return null;
}

// GET: Consultar buses

if ($metodo === "GET") {

    $sql = "SELECT
                b.id_bus,
                b.placa,
                b.capacidad_maxima,
                b.estado,
                b.id_linea,
                b.id_parqueo,
                b.id_piloto,
                l.nombre AS linea,
                p.ubicacion AS parqueo,
                pi.nombre AS piloto
            FROM bus b
            INNER JOIN parqueo p
                ON b.id_parqueo = p.id_parqueo
            LEFT JOIN linea l
                ON b.id_linea = l.id_linea
            LEFT JOIN piloto pi
                ON b.id_piloto = pi.id_piloto";

    $resultado = $conexion->query($sql);

    if ($resultado) {
        $buses = [];

        while ($fila = $resultado->fetch_assoc()) {
            $buses[] = $fila;
        }

        echo json_encode($buses, JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);

        echo json_encode([
            "error" => "No se pudieron obtener los buses"
        ], JSON_UNESCAPED_UNICODE);
    }

// POST: Registrar un bus

} elseif ($metodo === "POST") {

    if (!is_array($datos)) {
        http_response_code(400);
        echo json_encode([
            "error" => "Envía un JSON válido."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        $error = validarDatosBus($conexion, $datos);

        if ($error !== null) {
            http_response_code(400);
            echo json_encode([
                "error" => $error
            ], JSON_UNESCAPED_UNICODE);

        } else {

            $placa = trim($datos["placa"]);
            $capacidad = (int)$datos["capacidad_maxima"];
            $idParqueo = (int)$datos["id_parqueo"];
            $idLinea = $datos["id_linea"] ?? null;
            $idPiloto = $datos["id_piloto"] ?? null;

            if (placaExiste($conexion, $placa)) {
                http_response_code(409);
                echo json_encode([
                    "error" => "Ya existe un bus con esa placa."
                ], JSON_UNESCAPED_UNICODE);

            } else {

                $sql = "INSERT INTO bus
                        (placa, capacidad_maxima, estado,
                         id_linea, id_parqueo, id_piloto)
                        VALUES (?, ?, 1, ?, ?, ?)";

                $stmt = $conexion->prepare($sql);

                $stmt->bind_param(
                    "siiii",
                    $placa,
                    $capacidad,
                    $idLinea,
                    $idParqueo,
                    $idPiloto
                );

                if ($stmt->execute()) {
                    http_response_code(201);

                    echo json_encode([
                        "mensaje" => "Bus registrado correctamente.",
                        "id_bus" => $conexion->insert_id
                    ], JSON_UNESCAPED_UNICODE);

                } else {
                    http_response_code(500);

                    echo json_encode([
                        "error" => "No se pudo registrar el bus."
                    ], JSON_UNESCAPED_UNICODE);
                }

                $stmt->close();
            }
        }
    }


// PUT: Modificar un bus activo

} elseif ($metodo === "PUT") {

    $idBus = filter_var(
        $_GET["id"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (!$idBus || $idBus <= 0 || !is_array($datos)) {
        http_response_code(400);

        echo json_encode([
            "error" => "Indica un ID válido en la URL y envía un JSON válido."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        $stmt = $conexion->prepare(
            "SELECT id_bus FROM bus
             WHERE id_bus = ? AND estado = 1"
        );

        $stmt->bind_param("i", $idBus);
        $stmt->execute();

        $resultado = $stmt->get_result();
        $existe = $resultado->num_rows > 0;

        $stmt->close();

        if (!$existe) {
            http_response_code(404);

            echo json_encode([
                "error" => "El bus no existe o está inactivo."
            ], JSON_UNESCAPED_UNICODE);

        } else {

            $error = validarDatosBus($conexion, $datos);

            if ($error !== null) {
                http_response_code(400);

                echo json_encode([
                    "error" => $error
                ], JSON_UNESCAPED_UNICODE);

            } else {

                $placa = trim($datos["placa"]);
                $capacidad = (int)$datos["capacidad_maxima"];
                $idParqueo = (int)$datos["id_parqueo"];
                $idLinea = $datos["id_linea"] ?? null;
                $idPiloto = $datos["id_piloto"] ?? null;

                if (placaExiste($conexion, $placa, $idBus)) {
                    http_response_code(409);

                    echo json_encode([
                        "error" => "La placa ya está registrada en otro bus."
                    ], JSON_UNESCAPED_UNICODE);

                } else {

                    $sql = "UPDATE bus
                            SET placa = ?,
                                capacidad_maxima = ?,
                                id_linea = ?,
                                id_parqueo = ?,
                                id_piloto = ?
                            WHERE id_bus = ? AND estado = 1";

                    $stmt = $conexion->prepare($sql);

                    $stmt->bind_param(
                        "siiiii",
                        $placa,
                        $capacidad,
                        $idLinea,
                        $idParqueo,
                        $idPiloto,
                        $idBus
                    );

                    if ($stmt->execute()) {
                        echo json_encode([
                            "mensaje" => "Bus actualizado correctamente."
                        ], JSON_UNESCAPED_UNICODE);

                    } else {
                        http_response_code(500);

                        echo json_encode([
                            "error" => "No se pudo actualizar el bus."
                        ], JSON_UNESCAPED_UNICODE);
                    }

                    $stmt->close();
                }
            }
        }
    }


// DELETE: Desactivar un bus lógicamente

} elseif ($metodo === "DELETE") {

    $idBus = filter_var(
        $_GET["id"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (!$idBus || $idBus <= 0) {
        http_response_code(400);

        echo json_encode([
            "error" => "Indica un ID válido en la URL."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        $stmt = $conexion->prepare(
            "SELECT id_bus FROM bus
             WHERE id_bus = ? AND estado = 1"
        );

        $stmt->bind_param("i", $idBus);
        $stmt->execute();

        $resultado = $stmt->get_result();
        $existe = $resultado->num_rows > 0;

        $stmt->close();

        if (!$existe) {
            http_response_code(404);

            echo json_encode([
                "error" => "El bus no existe o ya está inactivo."
            ], JSON_UNESCAPED_UNICODE);

        } else {

            $stmt = $conexion->prepare(
                "UPDATE bus SET estado = 0
                 WHERE id_bus = ? AND estado = 1"
            );

            $stmt->bind_param("i", $idBus);

            if ($stmt->execute() && $stmt->affected_rows === 1) {
                echo json_encode([
                    "mensaje" => "Bus desactivado correctamente."
                ], JSON_UNESCAPED_UNICODE);

            } else {
                http_response_code(500);

                echo json_encode([
                    "error" => "No se pudo desactivar el bus."
                ], JSON_UNESCAPED_UNICODE);
            }

            $stmt->close();
        }
    }


// Método HTTP no permitido

} else {

    header("Allow: GET, POST, PUT, DELETE");
    http_response_code(405);

    echo json_encode([
        "error" => "Método HTTP no permitido."
    ], JSON_UNESCAPED_UNICODE);
}

$conexion->close();

?>

<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$metodo = $_SERVER["REQUEST_METHOD"];

//-----------GET - OBTENER PILOTOS--------------//
if ($metodo === "GET") {

    $sql = "SELECT
                id_piloto,
                nombre,
                direccion,
                telefono,
                correo,
                estado
            FROM piloto
            ORDER BY id_piloto";

    $resultado = $conexion->query($sql);

    if ($resultado) {
        $pilotos = [];

        while ($fila = $resultado->fetch_assoc()) {
            $pilotos[] = $fila;
        }

        echo json_encode($pilotos, JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);
        echo json_encode([
            "error" => "No se pudieron consultar los pilotos."
        ], JSON_UNESCAPED_UNICODE);
    }

//-----------POST - REGISTRAR PILOTOS-------------//
} elseif ($metodo === "POST") {

    $datos = json_decode(file_get_contents("php://input"), true);

    $nombre = $datos["nombre"] ?? null;
    $direccion = $datos["direccion"] ?? null;
    $telefono = $datos["telefono"] ?? null;
    $correo = $datos["correo"] ?? null;

    if (
        !is_string($nombre) || trim($nombre) === "" ||
        !is_string($direccion) || trim($direccion) === "" ||
        !is_string($telefono) || trim($telefono) === ""
    ) {
        http_response_code(400);
        echo json_encode([
            "error" => "El nombre, la dirección y el teléfono son obligatorios."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        $nombre = trim($nombre);
        $direccion = trim($direccion);
        $telefono = trim($telefono);

        if ($correo !== null) {
            if (!is_string($correo)) {
                http_response_code(400);
                echo json_encode([
                    "error" => "El correo debe ser una cadena de texto."
                ], JSON_UNESCAPED_UNICODE);
                $conexion->close();
                exit;
            }

            $correo = trim($correo);

            if ($correo === "") {
                $correo = null;
            } elseif (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode([
                    "error" => "El formato del correo no es válido."
                ], JSON_UNESCAPED_UNICODE);
                $conexion->close();
                exit;
            }
        }

        $sql = "INSERT INTO piloto
                    (nombre, direccion, telefono, correo)
                VALUES (?, ?, ?, ?)";

        $stmt = $conexion->prepare($sql);
        $stmt->bind_param(
            "ssss",
            $nombre,
            $direccion,
            $telefono,
            $correo
        );

        try {
            if ($stmt->execute()) {
                http_response_code(201);
                echo json_encode([
                    "mensaje" => "Piloto creado correctamente.",
                    "id_piloto" => $stmt->insert_id
                ], JSON_UNESCAPED_UNICODE);
            }
        } catch (mysqli_sql_exception $e) {
            http_response_code(500);
            echo json_encode([
                "error" => "No se pudo crear el piloto."
            ], JSON_UNESCAPED_UNICODE);
        }

        $stmt->close();
    }

//-----------PUT - ACTUALIZAR PILOTO-------------//
} elseif ($metodo === "PUT") {

    $datos = json_decode(file_get_contents("php://input"), true);

    $id_piloto = filter_var(
        $datos["id_piloto"] ?? $_GET["id_piloto"] ?? null,
        FILTER_VALIDATE_INT
    );

    $nombre = $datos["nombre"] ?? null;
    $direccion = $datos["direccion"] ?? null;
    $telefono = $datos["telefono"] ?? null;
    $correo = $datos["correo"] ?? null;

    if (
        !$id_piloto ||
        !is_string($nombre) || trim($nombre) === "" ||
        !is_string($direccion) || trim($direccion) === "" ||
        !is_string($telefono) || trim($telefono) === ""
    ) {
        http_response_code(400);
        echo json_encode([
            "error" => "Se requiere un ID válido, nombre, dirección y teléfono."
        ], JSON_UNESCAPED_UNICODE);

    } elseif (
        $correo !== null &&
        !is_string($correo)
    ) {
        http_response_code(400);
        echo json_encode([
            "error" => "El correo debe ser una cadena de texto o null."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        $nombre = trim($nombre);
        $direccion = trim($direccion);
        $telefono = trim($telefono);

        if ($correo !== null) {
            $correo = trim($correo);

            if ($correo === "") {
                $correo = null;
            } elseif (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode([
                    "error" => "El formato del correo no es válido."
                ], JSON_UNESCAPED_UNICODE);
                $conexion->close();
                exit;
            }
        }

        $sql = "UPDATE piloto
                SET nombre = ?,
                    direccion = ?,
                    telefono = ?,
                    correo = ?
                WHERE id_piloto = ? AND estado = 1";

        $stmt = $conexion->prepare($sql);
        $stmt->bind_param(
            "ssssi",
            $nombre,
            $direccion,
            $telefono,
            $correo,
            $id_piloto
        );

        try {
            if ($stmt->execute()) {

                if ($stmt->affected_rows > 0) {
                    echo json_encode([
                        "mensaje" => "Piloto actualizado correctamente."
                    ], JSON_UNESCAPED_UNICODE);

                } else {
                    $verificar = $conexion->prepare(
                        "SELECT id_piloto
                         FROM piloto
                         WHERE id_piloto = ? AND estado = 1"
                    );
                    $verificar->bind_param("i", $id_piloto);
                    $verificar->execute();
                    $verificar->store_result();

                    if ($verificar->num_rows > 0) {
                        echo json_encode([
                            "mensaje" => "El piloto existe y está activo, pero los datos no cambiaron."
                        ], JSON_UNESCAPED_UNICODE);
                    } else {
                        http_response_code(404);
                        echo json_encode([
                            "error" => "El piloto no existe o está inactivo."
                        ], JSON_UNESCAPED_UNICODE);
                    }

                    $verificar->close();
                }

            } else {
                http_response_code(500);
                echo json_encode([
                    "error" => "No se pudo actualizar el piloto."
                ], JSON_UNESCAPED_UNICODE);
            }

        } catch (mysqli_sql_exception $e) {
            http_response_code(500);
            echo json_encode([
                "error" => "Ocurrió un problema al actualizar el piloto."
            ], JSON_UNESCAPED_UNICODE);
        }

        $stmt->close();
    }

//-----------DELETE - DESACTIVAR PILOTO-------------//
} elseif ($metodo === "DELETE") {

    $datos = json_decode(file_get_contents("php://input"), true);

    $id_piloto = filter_var(
        $datos["id_piloto"] ?? $_GET["id_piloto"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (!$id_piloto) {
        http_response_code(400);
        echo json_encode([
            "error" => "Se requiere un id_piloto válido."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        // Evitar desactivar un piloto asignado a un bus activo
        $verificarBus = $conexion->prepare(
            "SELECT id_bus
             FROM Bus
             WHERE id_piloto = ? AND estado = 1
             LIMIT 1"
        );
        $verificarBus->bind_param("i", $id_piloto);
        $verificarBus->execute();
        $verificarBus->store_result();

        if ($verificarBus->num_rows > 0) {
            http_response_code(409);
            echo json_encode([
                "error" => "No se puede desactivar el piloto porque está asignado a un bus activo."
            ], JSON_UNESCAPED_UNICODE);

        } else {

            $stmt = $conexion->prepare(
                "UPDATE piloto
                 SET estado = 0
                 WHERE id_piloto = ? AND estado = 1"
            );
            $stmt->bind_param("i", $id_piloto);

            try {
                if ($stmt->execute()) {

                    if ($stmt->affected_rows > 0) {
                        echo json_encode([
                            "mensaje" => "Piloto desactivado correctamente."
                        ], JSON_UNESCAPED_UNICODE);
                    } else {
                        http_response_code(404);
                        echo json_encode([
                            "error" => "El piloto no existe o ya está inactivo."
                        ], JSON_UNESCAPED_UNICODE);
                    }

                } else {
                    http_response_code(500);
                    echo json_encode([
                        "error" => "No se pudo desactivar el piloto."
                    ], JSON_UNESCAPED_UNICODE);
                }

            } catch (mysqli_sql_exception $e) {
                http_response_code(500);
                echo json_encode([
                    "error" => "Ocurrió un problema al desactivar el piloto."
                ], JSON_UNESCAPED_UNICODE);
            }

            $stmt->close();
        }

        $verificarBus->close();
    }

//-----------MÉTODO NO PERMITIDO-------------//
} else {

    header("Allow: GET, POST, PUT, DELETE");
    http_response_code(405);

    echo json_encode([
        "error" => "Método HTTP no permitido."
    ], JSON_UNESCAPED_UNICODE);
}

$conexion->close();
?>
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

    if ($resultado) {
        $operadores = [];

        while ($fila = $resultado->fetch_assoc()) {
            $operadores[] = $fila;
        }

        echo json_encode($operadores, JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);
        echo json_encode([
            "error" => "No se pudieron obtener los operadores."
        ], JSON_UNESCAPED_UNICODE);
    }

//-----------POST - REGISTRAR OPERADOR--------------//
} 
elseif ($metodo === "POST") {

    $datos = json_decode(file_get_contents("php://input"), true);

    $nombre = $datos["nombre"] ?? null;
    $telefono = $datos["telefono"] ?? null;

    $id_estacion = filter_var(
        $datos["id_estacion"] ?? null,
        FILTER_VALIDATE_INT
    );

    $id_usuario = filter_var(
        $datos["id_usuario"] ?? null,
        FILTER_VALIDATE_INT
    );

    // Validar campos obligatorios
    if (
        !is_string($nombre) || trim($nombre) === "" ||
        !$id_estacion ||
        !$id_usuario
    ) {
        http_response_code(400);
        echo json_encode([
            "error" => "Nombre, id_estacion e id_usuario son obligatorios."
        ], JSON_UNESCAPED_UNICODE);

    } elseif ($telefono !== null && !is_string($telefono)) {

        http_response_code(400);
        echo json_encode([
            "error" => "El teléfono debe ser texto o null."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        $nombre = trim($nombre);

        if ($telefono !== null) {
            $telefono = trim($telefono);

            if ($telefono === "") {
                $telefono = null;
            }
        }

        // 1. Verificar que la estación exista y esté activa
        $sql = "SELECT id_estacion
                FROM estacion
                WHERE id_estacion = ? AND estado = 1";

        $verificarEstacion = $conexion->prepare($sql);
        $verificarEstacion->bind_param("i", $id_estacion);
        $verificarEstacion->execute();
        $verificarEstacion->store_result();

        if ($verificarEstacion->num_rows === 0) {

            http_response_code(400);
            echo json_encode([
                "error" => "La estación no existe o está inactiva."
            ], JSON_UNESCAPED_UNICODE);

        } else {

            // 2. Verificar que no exista otro operador activo
            //    asignado a esta estación
            $sql = "SELECT id_operador
                    FROM operador
                    WHERE id_estacion = ? AND estado = 1";

            $verificarAsignacion = $conexion->prepare($sql);
            $verificarAsignacion->bind_param("i", $id_estacion);
            $verificarAsignacion->execute();
            $verificarAsignacion->store_result();

            if ($verificarAsignacion->num_rows > 0) {

                http_response_code(409);
                echo json_encode([
                    "error" => "La estación ya tiene un operador activo asignado."
                ], JSON_UNESCAPED_UNICODE);

            } else {

                // 3. Verificar que el usuario exista y esté activo
                $sql = "SELECT id_usuario
                        FROM usuario
                        WHERE id_usuario = ? AND estado = 1";

                $verificarUsuario = $conexion->prepare($sql);
                $verificarUsuario->bind_param("i", $id_usuario);
                $verificarUsuario->execute();
                $verificarUsuario->store_result();

                if ($verificarUsuario->num_rows === 0) {

                    http_response_code(400);
                    echo json_encode([
                        "error" => "El usuario no existe o está inactivo."
                    ], JSON_UNESCAPED_UNICODE);

                } else {

                    // 4. Verificar si el usuario ya está registrado
                    //    en cualquier operador, incluso inactivo
                    $sql = "SELECT id_operador
                            FROM operador
                            WHERE id_usuario = ?";

                    $verificarUsuarioAsignado =
                        $conexion->prepare($sql);

                    $verificarUsuarioAsignado->bind_param(
                        "i",
                        $id_usuario
                    );

                    $verificarUsuarioAsignado->execute();
                    $verificarUsuarioAsignado->store_result();

                    if ($verificarUsuarioAsignado->num_rows > 0) {

                        http_response_code(409);
                        echo json_encode([
                            "error" => "El usuario ya está asociado a otro operador. Utiliza un usuario diferente."
                        ], JSON_UNESCAPED_UNICODE);

                    } else {

                        // 5. Crear el operador
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
                                    "error" => "La estación o el usuario fueron asignados a otro operador. Verifica las asignaciones actuales."
                                ], JSON_UNESCAPED_UNICODE);

                            } else {

                                http_response_code(500);
                                echo json_encode([
                                    "error" => "No se pudo crear el operador."
                                ], JSON_UNESCAPED_UNICODE);
                            }
                        }

                        $stmt->close();
                    }

                    $verificarUsuarioAsignado->close();
                }

                $verificarUsuario->close();
            }

            $verificarAsignacion->close();
        }

        $verificarEstacion->close();
    }


//-----------PUT - ACTUALIZAR OPERADOR--------------//

} elseif ($metodo === "PUT") {

    $datos = json_decode(file_get_contents("php://input"), true);

    $id_operador = filter_var(
        $datos["id_operador"] ?? $_GET["id_operador"] ?? null,
        FILTER_VALIDATE_INT
    );

    $nombre = $datos["nombre"] ?? null;
    $telefono = $datos["telefono"] ?? null;

    $id_estacion = filter_var(
        $datos["id_estacion"] ?? null,
        FILTER_VALIDATE_INT
    );

    $id_usuario = filter_var(
        $datos["id_usuario"] ?? null,
        FILTER_VALIDATE_INT
    );

    // 1. Validar los datos recibidos
    if (
        !$id_operador ||
        !is_string($nombre) || trim($nombre) === "" ||
        !$id_estacion ||
        !$id_usuario
    ) {
        http_response_code(400);
        echo json_encode([
            "error" => "Se requiere id_operador, nombre, id_estacion e id_usuario válidos."
        ], JSON_UNESCAPED_UNICODE);

    } elseif ($telefono !== null && !is_string($telefono)) {

        http_response_code(400);
        echo json_encode([
            "error" => "El teléfono debe ser texto o null."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        $nombre = trim($nombre);

        if ($telefono !== null) {
            $telefono = trim($telefono);

            if ($telefono === "") {
                $telefono = null;
            }
        }

        // 2. Verificar que el operador exista y esté activo
        $sql = "SELECT id_operador
                FROM operador
                WHERE id_operador = ? AND estado = 1";

        $verificarOperador = $conexion->prepare($sql);
        $verificarOperador->bind_param("i", $id_operador);
        $verificarOperador->execute();
        $verificarOperador->store_result();

        if ($verificarOperador->num_rows === 0) {

            http_response_code(404);
            echo json_encode([
                "error" => "El operador no existe o está inactivo."
            ], JSON_UNESCAPED_UNICODE);

        } else {

            // 3. Verificar que la estación exista y esté activa
            $sql = "SELECT id_estacion
                    FROM estacion
                    WHERE id_estacion = ? AND estado = 1";

            $verificarEstacion = $conexion->prepare($sql);
            $verificarEstacion->bind_param("i", $id_estacion);
            $verificarEstacion->execute();
            $verificarEstacion->store_result();

            if ($verificarEstacion->num_rows === 0) {

                http_response_code(400);
                echo json_encode([
                    "error" => "La estación no existe o está inactiva."
                ], JSON_UNESCAPED_UNICODE);

            } else {

                // 4. Verificar que ningún OTRO operador activo
                //    tenga asignada la estación solicitada
                $sql = "SELECT id_operador
                        FROM operador
                        WHERE id_estacion = ?
                          AND estado = 1
                          AND id_operador <> ?";

                $verificarAsignacion = $conexion->prepare($sql);
                $verificarAsignacion->bind_param(
                    "ii",
                    $id_estacion,
                    $id_operador
                );
                $verificarAsignacion->execute();
                $verificarAsignacion->store_result();

                if ($verificarAsignacion->num_rows > 0) {

                    http_response_code(409);
                    echo json_encode([
                        "error" => "La estación ya tiene otro operador activo asignado."
                    ], JSON_UNESCAPED_UNICODE);

                } else {

                    // 5. Verificar que el usuario exista y esté activo
                    $sql = "SELECT id_usuario
                            FROM usuario
                            WHERE id_usuario = ? AND estado = 1";

                    $verificarUsuario = $conexion->prepare($sql);
                    $verificarUsuario->bind_param("i", $id_usuario);
                    $verificarUsuario->execute();
                    $verificarUsuario->store_result();

                    if ($verificarUsuario->num_rows === 0) {

                        http_response_code(400);
                        echo json_encode([
                            "error" => "El usuario no existe o está inactivo."
                        ], JSON_UNESCAPED_UNICODE);

                    } else {

                        // 6. Verificar que el usuario no esté
                        //    asociado a otro registro de operador
                        $sql = "SELECT id_operador
                                FROM operador
                                WHERE id_usuario = ?
                                  AND id_operador <> ?";

                        $verificarUsuarioAsignado =
                            $conexion->prepare($sql);

                        $verificarUsuarioAsignado->bind_param(
                            "ii",
                            $id_usuario,
                            $id_operador
                        );

                        $verificarUsuarioAsignado->execute();
                        $verificarUsuarioAsignado->store_result();

                        if ($verificarUsuarioAsignado->num_rows > 0) {

                            http_response_code(409);
                            echo json_encode([
                                "error" => "El usuario ya está asociado a otro operador. Utiliza un usuario diferente."
                            ], JSON_UNESCAPED_UNICODE);

                        } else {

                            // 7. Actualizar el operador
                            $sql = "UPDATE operador
                                    SET nombre = ?,
                                        telefono = ?,
                                        id_estacion = ?,
                                        id_usuario = ?
                                    WHERE id_operador = ?
                                      AND estado = 1";

                            $stmt = $conexion->prepare($sql);

                            $stmt->bind_param(
                                "ssiii",
                                $nombre,
                                $telefono,
                                $id_estacion,
                                $id_usuario,
                                $id_operador
                            );

                            try {

                                if ($stmt->execute()) {

                                    http_response_code(200);
                                    echo json_encode([
                                        "mensaje" => "Operador actualizado correctamente."
                                    ], JSON_UNESCAPED_UNICODE);
                                }

                            } catch (mysqli_sql_exception $e) {

                                if ($e->getCode() === 1062) {

                                    http_response_code(409);
                                    echo json_encode([
                                        "error" => "La estación o el usuario entraron en conflicto con otra asignación. Verifica las asignaciones actuales."
                                    ], JSON_UNESCAPED_UNICODE);

                                } else {

                                    http_response_code(500);
                                    echo json_encode([
                                        "error" => "No se pudo actualizar el operador."
                                    ], JSON_UNESCAPED_UNICODE);
                                }
                            }

                            $stmt->close();
                        }

                        $verificarUsuarioAsignado->close();
                    }

                    $verificarUsuario->close();
                }

                $verificarAsignacion->close();
            }

            $verificarEstacion->close();
        }

        $verificarOperador->close();
    }

//-----------DELETE - DESACTIVAR OPERADOR--------------//
} elseif ($metodo === "DELETE") {

    $datos = json_decode(file_get_contents("php://input"), true);

    $id_operador = filter_var(
        $datos["id_operador"] ?? $_GET["id_operador"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (!$id_operador) {
        http_response_code(400);
        echo json_encode([
            "error" => "Se requiere un id_operador válido."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        $stmt = $conexion->prepare(
            "UPDATE operador
             SET estado = 0
             WHERE id_operador = ? AND estado = 1"
        );
        $stmt->bind_param("i", $id_operador);

        if ($stmt->execute()) {

            if ($stmt->affected_rows > 0) {
                echo json_encode([
                    "mensaje" => "Operador desactivado correctamente."
                ], JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(404);
                echo json_encode([
                    "error" => "El operador no existe o ya está inactivo."
                ], JSON_UNESCAPED_UNICODE);
            }

        } else {
            http_response_code(500);
            echo json_encode([
                "error" => "No se pudo desactivar el operador."
            ], JSON_UNESCAPED_UNICODE);
        }

        $stmt->close();
        
//-----------MÉTODO NO PERMITIDO--------------//
    }

} else {

    header("Allow: GET, POST, PUT, DELETE");
    http_response_code(405);

    echo json_encode([
        "error" => "Método no permitido."
    ], JSON_UNESCAPED_UNICODE);
}

$conexion->close();
?>
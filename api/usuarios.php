
<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$metodo = $_SERVER["REQUEST_METHOD"];

// GET - OBTENER USUARIOS
if ($metodo === "GET") {

    $sql = "SELECT
                u.id_usuario,
                u.username,
                u.id_rol,
                r.nombre AS rol,
                u.estado
            FROM usuario u
            INNER JOIN rol r
                ON u.id_rol = r.id_rol
            WHERE u.id_rol = 2
            ORDER BY u.id_usuario";

    $resultado = $conexion->query($sql);

    if ($resultado) {
        $usuarios = [];

        while ($fila = $resultado->fetch_assoc()) {
            $usuarios[] = $fila;
        }

        echo json_encode($usuarios, JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);
        echo json_encode([
            "error" => "No se pudieron obtener los usuarios."
        ], JSON_UNESCAPED_UNICODE);
    }

// POST - CREAR USUARIO
} elseif ($metodo === "POST") {

    $datos = json_decode(file_get_contents("php://input"), true);

    $username = $datos["username"] ?? null;
    $password = $datos["password"] ?? null;
    $id_rol = filter_var(
        $datos["id_rol"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (
        !is_string($username) || trim($username) === "" ||
        !is_string($password) || $password === "" ||
        !$id_rol
    ) {
        http_response_code(400);
        echo json_encode([
            "error" => "Username, password e id_rol son obligatorios."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        $username = trim($username);
        $password_hash = password_hash($password, PASSWORD_DEFAULT);

        // Verificar que el rol exista
        $verificarRol = $conexion->prepare(
            "SELECT id_rol FROM rol WHERE id_rol = ?"
        );
        $verificarRol->bind_param("i", $id_rol);
        $verificarRol->execute();
        $verificarRol->store_result();

        if ($verificarRol->num_rows === 0) {
            http_response_code(400);
            echo json_encode([
                "error" => "El rol indicado no existe."
            ], JSON_UNESCAPED_UNICODE);

        } else {

            $sql = "INSERT INTO usuario
                        (username, password_hash, id_rol)
                    VALUES (?, ?, ?)";

            $stmt = $conexion->prepare($sql);
            $stmt->bind_param(
                "ssi",
                $username,
                $password_hash,
                $id_rol
            );

            try {
                if ($stmt->execute()) {
                    http_response_code(201);
                    echo json_encode([
                        "mensaje" => "Usuario creado correctamente.",
                        "id_usuario" => $stmt->insert_id
                    ], JSON_UNESCAPED_UNICODE);
                }
            } catch (mysqli_sql_exception $e) {
                if ($e->getCode() === 1062) {
                    http_response_code(409);
                    echo json_encode([
                        "error" => "El username ya está registrado."
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        "error" => "No se pudo crear el usuario."
                    ], JSON_UNESCAPED_UNICODE);
                }
            }

            $stmt->close();
        }

        $verificarRol->close();
    }
// PUT - ACTUALIZAR USUARIO
} elseif ($metodo === "PUT") {

    $datos = json_decode(file_get_contents("php://input"), true);

    $id_usuario = filter_var(
        $datos["id_usuario"] ?? $_GET["id_usuario"] ?? null,
        FILTER_VALIDATE_INT
    );

    $username = $datos["username"] ?? null;
    $id_rol = filter_var(
        $datos["id_rol"] ?? null,
        FILTER_VALIDATE_INT
    );

    // La contraseña es opcional al actualizar
    $password = $datos["password"] ?? null;

    if (
        !$id_usuario ||
        !is_string($username) || trim($username) === "" ||
        !$id_rol
    ) {
        http_response_code(400);
        echo json_encode([
            "error" => "Se requiere id_usuario, username e id_rol válidos."
        ], JSON_UNESCAPED_UNICODE);

    } elseif (
        $password !== null &&
        (!is_string($password) || $password === "")
    ) {
        http_response_code(400);
        echo json_encode([
            "error" => "Si envías una contraseña, debe ser una cadena no vacía."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        $username = trim($username);

        // Comprobar que el usuario exista y esté activo
        $verificarUsuario = $conexion->prepare(
            "SELECT id_usuario
             FROM usuario
             WHERE id_usuario = ? AND estado = 1"
        );
        $verificarUsuario->bind_param("i", $id_usuario);
        $verificarUsuario->execute();
        $verificarUsuario->store_result();

        if ($verificarUsuario->num_rows === 0) {
            http_response_code(404);
            echo json_encode([
                "error" => "El usuario no existe o está inactivo."
            ], JSON_UNESCAPED_UNICODE);

        } else {

            // Comprobar que el rol exista
            $verificarRol = $conexion->prepare(
                "SELECT id_rol FROM rol WHERE id_rol = ?"
            );
            $verificarRol->bind_param("i", $id_rol);
            $verificarRol->execute();
            $verificarRol->store_result();

            if ($verificarRol->num_rows === 0) {
                http_response_code(400);
                echo json_encode([
                    "error" => "El rol indicado no existe."
                ], JSON_UNESCAPED_UNICODE);

            } else {

                // Si se envía contraseña, también se actualiza
                if ($password !== null) {

                    $password_hash = password_hash(
                        $password,
                        PASSWORD_DEFAULT
                    );

                    $sql = "UPDATE usuario
                            SET username = ?,
                                password_hash = ?,
                                id_rol = ?
                            WHERE id_usuario = ? AND estado = 1";

                    $stmt = $conexion->prepare($sql);
                    $stmt->bind_param(
                        "ssii",
                        $username,
                        $password_hash,
                        $id_rol,
                        $id_usuario
                    );

                } else {

                    $sql = "UPDATE usuario
                            SET username = ?,
                                id_rol = ?
                            WHERE id_usuario = ? AND estado = 1";

                    $stmt = $conexion->prepare($sql);
                    $stmt->bind_param(
                        "sii",
                        $username,
                        $id_rol,
                        $id_usuario
                    );
                }

                try {
                    if ($stmt->execute()) {
                        echo json_encode([
                            "mensaje" => "Usuario actualizado correctamente."
                        ], JSON_UNESCAPED_UNICODE);
                    }
                } catch (mysqli_sql_exception $e) {
                    if ($e->getCode() === 1062) {
                        http_response_code(409);
                        echo json_encode([
                            "error" => "El username ya está registrado."
                        ], JSON_UNESCAPED_UNICODE);
                    } else {
                        http_response_code(500);
                        echo json_encode([
                            "error" => "No se pudo actualizar el usuario."
                        ], JSON_UNESCAPED_UNICODE);
                    }
                }

                $stmt->close();
            }

            $verificarRol->close();
        }

        $verificarUsuario->close();
    }
// DELETE - DESACTIVAR USUARIO (ELIMINACIÓN LÓGICA)
} elseif ($metodo === "DELETE") {

    $datos = json_decode(file_get_contents("php://input"), true);

    $id_usuario = filter_var(
        $datos["id_usuario"] ?? $_GET["id_usuario"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (!$id_usuario) {
        http_response_code(400);
        echo json_encode([
            "error" => "Se requiere un id_usuario válido."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        $stmt = $conexion->prepare(
            "UPDATE usuario
             SET estado = 0
             WHERE id_usuario = ? AND estado = 1"
        );
        $stmt->bind_param("i", $id_usuario);

        if ($stmt->execute()) {

            if ($stmt->affected_rows > 0) {
                echo json_encode([
                    "mensaje" => "Usuario desactivado correctamente."
                ], JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(404);
                echo json_encode([
                    "error" => "El usuario no existe o ya está inactivo."
                ], JSON_UNESCAPED_UNICODE);
            }

        } else {
            http_response_code(500);
            echo json_encode([
                "error" => "No se pudo desactivar el usuario."
            ], JSON_UNESCAPED_UNICODE);
        }

        $stmt->close();
    }

// =====================================================
// MÉTODO NO PERMITIDO
// =====================================================
} else {

    header("Allow: GET, POST, PUT, DELETE");
    http_response_code(405);

    echo json_encode([
        "error" => "Método HTTP no permitido."
    ], JSON_UNESCAPED_UNICODE);
}

$conexion->close();

?>
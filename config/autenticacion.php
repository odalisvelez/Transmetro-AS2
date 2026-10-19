
<?php

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        "httponly" => true,
        "secure" => !empty($_SERVER["HTTPS"])
            && $_SERVER["HTTPS"] !== "off",
        "samesite" => "Lax",
        "path" => "/"
    ]);

    session_start();
}

/**
 * comprueba que exista una sesion autenticada
  * y que el usuario siga activo
 */
function exigirAutenticacion(mysqli $conexion): array
{
    if (
        !isset($_SESSION["id_usuario"]) ||
        !isset($_SESSION["id_rol"])
    ) {
        http_response_code(401);

        echo json_encode([
            "error" => "Debe iniciar sesión para acceder."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $sql = "SELECT id_usuario, username, id_rol, estado
            FROM usuario
            WHERE id_usuario = ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        http_response_code(500);

        echo json_encode([
            "error" => "No fue posible verificar la sesión."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $idUsuario = (int) $_SESSION["id_usuario"];

    $stmt->bind_param("i", $idUsuario);
    $stmt->execute();

    $resultado = $stmt->get_result();
    $usuario = $resultado->fetch_assoc();

    $stmt->close();

    if (!$usuario || (int) $usuario["estado"] !== 1) {
        $_SESSION = [];
        session_destroy();

        http_response_code(401);

        echo json_encode([
            "error" => "La cuenta está inactiva o ya no existe."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $idRol = (int) $usuario["id_rol"];

    if (!in_array($idRol, [1, 2], true)) {
        http_response_code(403);

        echo json_encode([
            "error" => "No tiene permiso para acceder al sistema."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    // actualizar los datos del usuario en la sesion
    $_SESSION["username"] = $usuario["username"];
    $_SESSION["id_rol"] = $idRol;

    return $usuario;
}

/**
 * comprueba que el usuario tenga el rol requerido.
 * 1 = Administrador, 2 = Operador
 */
function exigirRol(array $usuario, array $rolesPermitidos): void
{
    if (!in_array((int) $usuario["id_rol"], $rolesPermitidos, true)) {
        http_response_code(403);

        echo json_encode([
            "error" => "No tiene permisos para realizar esta acción."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }
}

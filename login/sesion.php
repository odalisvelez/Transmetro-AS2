
<?php

header("Content-Type: application/json; charset=UTF-8");

session_set_cookie_params([
    "httponly" => true,
    "secure" => !empty($_SERVER["HTTPS"])
        && $_SERVER["HTTPS"] !== "off",
    "samesite" => "Lax",
    "path" => "/"
]);

session_start();

// comprobar que exista una sesion autenticada
if (
    !isset($_SESSION["id_usuario"]) ||
    !isset($_SESSION["id_rol"])
) {
    http_response_code(401);

    echo json_encode([
        "autenticado" => false,
        "error" => "No hay una sesión activa."
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

// comprobar que la cuenta siga activa
require_once "../config/conexion.php";

$sql = "SELECT estado
        FROM usuario
        WHERE id_usuario = ?
        LIMIT 1";

$stmt = $conexion->prepare($sql);
$stmt->bind_param("i", $_SESSION["id_usuario"]);
$stmt->execute();

$resultado = $stmt->get_result();
$usuario = $resultado->fetch_assoc();

if (!$usuario || (int) $usuario["estado"] !== 1) {
    $_SESSION = [];

    if (ini_get("session.use_cookies")) {
        $parametros = session_get_cookie_params();

        setcookie(session_name(), "", [
            "expires" => time() - 42000,
            "path" => $parametros["path"],
            "secure" => $parametros["secure"],
            "httponly" => $parametros["httponly"],
            "samesite" => $parametros["samesite"]
        ]);
    }

    session_destroy();

    http_response_code(401);

    echo json_encode([
        "autenticado" => false,
        "error" => "La cuenta está inactiva o ya no existe."
    ], JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conexion->close();
    exit;
}

echo json_encode([
    "autenticado" => true,
    "usuario" => [
        "id_usuario" => (int) $_SESSION["id_usuario"],
        "username" => $_SESSION["username"],
        "id_rol" => (int) $_SESSION["id_rol"],
        "rol" => $_SESSION["rol"]
    ]
], JSON_UNESCAPED_UNICODE);

$stmt->close();
$conexion->close();

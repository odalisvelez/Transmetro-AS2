<?php

// CARGAR CONEXION A LA BD
require_once "../config/conexion.php";

// CONFIG RESPUESTA
header("Content-Type: application/json; charset=UTF-8");

// INICIAR SESION
session_set_cookie_params([
    "httponly" => true,
    "secure" => !empty($_SERVER["HTTPS"])
        && $_SERVER["HTTPS"] !== "off",
    "samesite" => "Lax",
    "path" => "/"
]);

session_start();

// PERMITIR POST

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Allow: POST");
    http_response_code(405);

    echo json_encode([
        "error" => "Método HTTP no permitido."
    ], JSON_UNESCAPED_UNICODE);

    $conexion->close();
    exit;
}

// RECIBIR CREDENCIALES

$datos = json_decode(file_get_contents("php://input"), true);

if (!is_array($datos)) {
    http_response_code(400);

    echo json_encode([
        "error" => "La solicitud debe contener un JSON válido."
    ], JSON_UNESCAPED_UNICODE);

    $conexion->close();
    exit;
}

$username = $datos["username"] ?? null;
$passwordIngresada = $datos["password"] ?? null;

if (
    !is_string($username) ||
    trim($username) === "" ||
    !is_string($passwordIngresada) ||
    $passwordIngresada === ""
) {
    http_response_code(400);

    echo json_encode([
        "error" => "usuario y contraseña son obligatorios."
    ], JSON_UNESCAPED_UNICODE);

    $conexion->close();
    exit;
}

$username = trim($username);

// BUSCAR USUARIO Y ROL
$sql = "SELECT
            u.id_usuario,
            u.username,
            u.password_hash,
            u.id_rol,
            u.estado,
            r.nombre AS rol
        FROM usuario u
        INNER JOIN rol r
            ON u.id_rol = r.id_rol
        WHERE u.username = ?
        LIMIT 1";

$stmt = $conexion->prepare($sql);

if (!$stmt) {
    http_response_code(500);

    echo json_encode([
        "error" => "No fue posible procesar el inicio de sesión."
    ], JSON_UNESCAPED_UNICODE);

    $conexion->close();
    exit;
}

$stmt->bind_param("s", $username);
$stmt->execute();

$resultado = $stmt->get_result();
$usuarioEncontrado = $resultado->fetch_assoc();

// VALIDAR CREDENCIALES Y ESTADO
if (
    !$usuarioEncontrado ||
    (int) $usuarioEncontrado["estado"] !== 1 ||
    !password_verify(
        $passwordIngresada,
        $usuarioEncontrado["password_hash"]
    )
) {
    http_response_code(401);

    echo json_encode([
        "error" => "Usuario o contraseña incorrectos, o cuenta inactiva."
    ], JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conexion->close();
    exit;
}

// VERIFICAR ROL PERMITIDO
$idRol = (int) $usuarioEncontrado["id_rol"];

if (!in_array($idRol, [1, 2], true)) {
    http_response_code(403);

    echo json_encode([
        "error" => "El rol de esta cuenta no tiene acceso al sistema."
    ], JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conexion->close();
    exit;
}

//crear sesion autenticada
session_regenerate_id(true);

$_SESSION["id_usuario"] = (int) $usuarioEncontrado["id_usuario"];
$_SESSION["username"] = $usuarioEncontrado["username"];
$_SESSION["id_rol"] = $idRol;
$_SESSION["rol"] = $usuarioEncontrado["rol"];

// respuesta exitosa
echo json_encode([
    "mensaje" => "Inicio de sesión exitoso.",
    "usuario" => [
        "id_usuario" => (int) $usuarioEncontrado["id_usuario"],
        "username" => $usuarioEncontrado["username"],
        "id_rol" => $idRol,
        "rol" => $usuarioEncontrado["rol"]
    ]
], JSON_UNESCAPED_UNICODE);

$stmt->close();
$conexion->close();

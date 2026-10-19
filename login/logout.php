
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

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Allow: POST");
    http_response_code(405);

    echo json_encode([
        "error" => "Método HTTP no permitido."
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

// eliminar los datos de la sesion

// eliminar la cookie de sesión del navegador
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

// destruir la sesioon
session_destroy();

echo json_encode([
    "mensaje" => "Cierre de sesión exitoso."
], JSON_UNESCAPED_UNICODE);

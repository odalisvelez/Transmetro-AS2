<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$metodo = $_SERVER["REQUEST_METHOD"];

//-----------GET - OBTENER OPERADORES--------------//

if($metodo==="GET"){
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

    $pilotos = [];

    if($resultado){

        while($fila = $resultado->fetch_assoc()){
            
            $pilotos[] = $fila;
        }

        echo json_encode($pilotos, JSON_UNESCAPED_UNICODE);
    } else{

        echo json_encode([

            "error" => "No se pudieron obtenr los pilotos"
        ], JSON_UNESCAPED_UNICODE);
    }

    //-----------POST - REGISTRAR PILOTOS-------------//
} elseif ($metodo === "POST"){

     $datos = json_decode(file_get_contents("php://input"), true);

     $nombre = $datos["nombre"] ?? null;
     $direccion = $datos["direccion"] ?? null;
     $telefono = $datos["telefono"] ?? null;
     $correo= $datos["correo"] ?? null;

     // Validar campo obligatorio
        if (
            !is_string($nombre) || trim($nombre) === "" ||
            !is_string($direccion) || trim($direccion) === "" ||
            !is_string($telefono) || trim($telefono) === ""
        ) {
            http_response_code(400);

            echo json_encode([
                "error" => "El nombre, la dirección y el teléfono son obligatorios."
            ], JSON_UNESCAPED_UNICODE);

            exit;
        }

        $nombre = trim($nombre);
        $direccion = trim($direccion);
        $telefono = trim($telefono);

        // Validar formato del correo si fue proporcionado
        if ($correo !== null) {
        if (!is_string($correo)) {
            http_response_code(400);

            echo json_encode([
                "error" => "El correo debe ser una cadena de texto."
            ], JSON_UNESCAPED_UNICODE);

            exit;
        }

        $correo = trim($correo);

        if ($correo === "") {
            $correo = null;
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
} else {

    http_response_code(405);

    echo json_encode([
        "error" => "Método no permitido."
    ], JSON_UNESCAPED_UNICODE);
}

$conexion->close();
?>
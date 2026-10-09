<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$metodo = $_SERVER["REQUEST_METHOD"];


    /* =====================================================
    GET - OBTENER USUARIOS
    ===================================================== */

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
                ORDER BY u.id_usuario";

        $resultado = $conexion->query($sql);

        $usuarios = [];

        if ($resultado) {

            while ($fila = $resultado->fetch_assoc()) {
                $usuarios[] = $fila;
            }

            echo json_encode($usuarios, JSON_UNESCAPED_UNICODE);

        } else {

            echo json_encode([
                "error" => "No se pudieron obtener los usuarios."
            ], JSON_UNESCAPED_UNICODE);
        }
    }


    /* =====================================================
    POST - CREAR USUARIO
    ===================================================== */

    elseif ($metodo === "POST") {

    //Lee el json
        $datos = json_decode(file_get_contents("php://input"), true);

        $username = $datos["username"] ?? null;
        $password = $datos["password"] ?? null;
        $id_rol = $datos["id_rol"] ?? null;

        if (!$username || !$password || !$id_rol) {

            http_response_code(400);

            echo json_encode([
                "error" => "Username, password e id_rol son obligatorios."
            ], JSON_UNESCAPED_UNICODE);

            exit;
        }
    //password no se guarda directamente
        $password_hash = password_hash($password, PASSWORD_DEFAULT);

        $sql = "INSERT INTO usuario (username, password_hash, id_rol)
                VALUES (?, ?, ?)";

    // Consulta preparada
        $stmt = $conexion->prepare($sql);

        $stmt->bind_param(
            "ssi",
            $username,
            $password_hash,
            $id_rol
        );
        
        try {

            if ($stmt->execute()) {

               // http_response_code(201);
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

    /* =====================================================
    MÉTODO NO PERMITIDO
    ===================================================== */

    else {

        http_response_code(405);

        echo json_encode([
            "error" => "Método no permitido."
        ], JSON_UNESCAPED_UNICODE);
    }

$conexion->close();

?>
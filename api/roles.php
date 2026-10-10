
<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$metodo = $_SERVER["REQUEST_METHOD"];
$datos = json_decode(file_get_contents("php://input"), true);

// GET: consultar roles
if ($metodo === "GET") {

    $sql = "SELECT id_rol, nombre
            FROM Rol
            ORDER BY id_rol";

    $resultado = $conexion->query($sql);

    if ($resultado) {
        $roles = [];

        while ($fila = $resultado->fetch_assoc()) {
            $roles[] = $fila;
        }

        echo json_encode($roles, JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);
        echo json_encode([
            "error" => "No se pudieron consultar los roles."
        ], JSON_UNESCAPED_UNICODE);
    }

// POST: crear un rol
} elseif ($metodo === "POST") {

    $nombre = trim($datos["nombre"] ?? "");

    if ($nombre === "") {
        http_response_code(400);
        echo json_encode([
            "error" => "El nombre del rol es obligatorio."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        $verificar = $conexion->prepare(
            "SELECT id_rol FROM Rol WHERE nombre = ?"
        );
        $verificar->bind_param("s", $nombre);
        $verificar->execute();
        $verificar->store_result();

        if ($verificar->num_rows > 0) {
            http_response_code(409);
            echo json_encode([
                "error" => "Ya existe un rol con ese nombre."
            ], JSON_UNESCAPED_UNICODE);

        } else {

            $stmt = $conexion->prepare(
                "INSERT INTO Rol (nombre) VALUES (?)"
            );
            $stmt->bind_param("s", $nombre);

            if ($stmt->execute()) {
                http_response_code(201);
                echo json_encode([
                    "mensaje" => "Rol creado correctamente.",
                    "id_rol" => $conexion->insert_id
                ], JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(500);
                echo json_encode([
                    "error" => "No se pudo crear el rol."
                ], JSON_UNESCAPED_UNICODE);
            }

            $stmt->close();
        }

        $verificar->close();
    }

// PUT: actualizar un rol
} elseif ($metodo === "PUT") {

    $id_rol = filter_var(
        $datos["id_rol"] ?? $_GET["id_rol"] ?? null,
        FILTER_VALIDATE_INT
    );

    $nombre = trim($datos["nombre"] ?? "");

    if (!$id_rol || $nombre === "") {
        http_response_code(400);
        echo json_encode([
            "error" => "Se requiere un id_rol válido y el nombre del rol."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        // Comprobar que el rol exista
        $verificar = $conexion->prepare(
            "SELECT id_rol FROM Rol WHERE id_rol = ?"
        );
        $verificar->bind_param("i", $id_rol);
        $verificar->execute();
        $verificar->store_result();

        if ($verificar->num_rows === 0) {
            http_response_code(404);
            echo json_encode([
                "error" => "El rol no existe."
            ], JSON_UNESCAPED_UNICODE);

        } else {

            // Comprobar que el nombre no pertenezca a otro rol
            $duplicado = $conexion->prepare(
                "SELECT id_rol
                 FROM Rol
                 WHERE nombre = ? AND id_rol <> ?"
            );
            $duplicado->bind_param("si", $nombre, $id_rol);
            $duplicado->execute();
            $duplicado->store_result();

            if ($duplicado->num_rows > 0) {
                http_response_code(409);
                echo json_encode([
                    "error" => "Otro rol ya utiliza ese nombre."
                ], JSON_UNESCAPED_UNICODE);

            } else {

                $stmt = $conexion->prepare(
                    "UPDATE Rol SET nombre = ? WHERE id_rol = ?"
                );
                $stmt->bind_param("si", $nombre, $id_rol);

                if ($stmt->execute()) {
                    echo json_encode([
                        "mensaje" => "Rol actualizado correctamente. Si el nombre no cambió, no fue necesario modificar el registro."
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        "error" => "No se pudo actualizar el rol."
                    ], JSON_UNESCAPED_UNICODE);
                }

                $stmt->close();
            }

            $duplicado->close();
        }

        $verificar->close();
    }

// DELETE: eliminar un rol
} elseif ($metodo === "DELETE") {

    $id_rol = filter_var(
        $datos["id_rol"] ?? $_GET["id_rol"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (!$id_rol) {
        http_response_code(400);
        echo json_encode([
            "error" => "Se requiere un id_rol válido."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        // Comprobar que el rol exista
        $verificar = $conexion->prepare(
            "SELECT id_rol FROM Rol WHERE id_rol = ?"
        );
        $verificar->bind_param("i", $id_rol);
        $verificar->execute();
        $verificar->store_result();

        if ($verificar->num_rows === 0) {
            http_response_code(404);
            echo json_encode([
                "error" => "El rol no existe."
            ], JSON_UNESCAPED_UNICODE);

        } else {

            // No permitir eliminar roles asignados a usuarios
            $asignados = $conexion->prepare(
                "SELECT id_usuario
                 FROM Usuario
                 WHERE id_rol = ?
                 LIMIT 1"
            );
            $asignados->bind_param("i", $id_rol);
            $asignados->execute();
            $asignados->store_result();

            if ($asignados->num_rows > 0) {
                http_response_code(409);
                echo json_encode([
                    "error" => "No se puede eliminar el rol porque está asignado a uno o más usuarios."
                ], JSON_UNESCAPED_UNICODE);

            } else {

                $stmt = $conexion->prepare(
                    "DELETE FROM Rol WHERE id_rol = ?"
                );
                $stmt->bind_param("i", $id_rol);

                if ($stmt->execute() && $stmt->affected_rows > 0) {
                    echo json_encode([
                        "mensaje" => "Rol eliminado correctamente."
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        "error" => "No se pudo eliminar el rol."
                    ], JSON_UNESCAPED_UNICODE);
                }

                $stmt->close();
            }

            $asignados->close();
        }

        $verificar->close();
    }

// Método no permitido
} else {

    header("Allow: GET, POST, PUT, DELETE");
    http_response_code(405);

    echo json_encode([
        "error" => "Método HTTP no permitido."
    ], JSON_UNESCAPED_UNICODE);
}

$conexion->close();
?>
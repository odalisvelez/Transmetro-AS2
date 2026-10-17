
<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$metodo = $_SERVER["REQUEST_METHOD"];
$datos = json_decode(file_get_contents("php://input"), true);

// GET: consultar historiales educativos
if ($metodo === "GET") {

    $sql = "SELECT
                he.id_historial,
                he.institucion,
                he.titulo,
                he.fecha_inicio,
                he.fecha_fin,
                he.id_piloto,
                p.nombre AS piloto
            FROM historial_educativo he
            INNER JOIN piloto p
                ON he.id_piloto = p.id_piloto
            ORDER BY he.id_historial";

    $resultado = $conexion->query($sql);

    if ($resultado) {
        $historiales = [];

        while ($fila = $resultado->fetch_assoc()) {
            $historiales[] = $fila;
        }

        echo json_encode($historiales, JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);
        echo json_encode([
            "error" => "No se pudieron consultar los historiales educativos."
        ], JSON_UNESCAPED_UNICODE);
    }

// POST: registrar un historial educativo
} elseif ($metodo === "POST") {

    $institucion = trim($datos["institucion"] ?? "");
    $titulo = trim($datos["titulo"] ?? "");
    $fecha_inicio = $datos["fecha_inicio"] ?? null;
    $fecha_fin = $datos["fecha_fin"] ?? null;
    $id_piloto = filter_var(
        $datos["id_piloto"] ?? null,
        FILTER_VALIDATE_INT
    );

    if ($institucion === "" || $titulo === "" || !$id_piloto) {
        http_response_code(400);
        echo json_encode([
            "error" => "Institución, título e id_piloto son obligatorios."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        // Verificar que el piloto exista
        $consulta = $conexion->prepare(
            "SELECT id_piloto FROM piloto WHERE id_piloto = ?"
        );
        $consulta->bind_param("i", $id_piloto);
        $consulta->execute();
        $consulta->store_result();

        if ($consulta->num_rows === 0) {
            http_response_code(404);
            echo json_encode([
                "error" => "El piloto indicado no existe."
            ], JSON_UNESCAPED_UNICODE);

        } else {

            $sql = "INSERT INTO historial_educativo
                    (institucion, titulo, fecha_inicio, fecha_fin, id_piloto)
                    VALUES (?, ?, ?, ?, ?)";

            $stmt = $conexion->prepare($sql);
            $stmt->bind_param(
                "ssssi",
                $institucion,
                $titulo,
                $fecha_inicio,
                $fecha_fin,
                $id_piloto
            );

            if ($stmt->execute()) {
                http_response_code(201);
                echo json_encode([
                    "mensaje" => "Historial educativo registrado correctamente.",
                    "id_historial" => $conexion->insert_id
                ], JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(500);
                echo json_encode([
                    "error" => "No se pudo registrar el historial educativo."
                ], JSON_UNESCAPED_UNICODE);
            }

            $stmt->close();
        }

        $consulta->close();
    }

// PUT: actualizar un historial educativo
} elseif ($metodo === "PUT") {

    $id_historial = filter_var(
        $datos["id_historial"] ?? $_GET["id_historial"] ?? null,
        FILTER_VALIDATE_INT
    );

    $institucion = trim($datos["institucion"] ?? "");
    $titulo = trim($datos["titulo"] ?? "");
    $fecha_inicio = $datos["fecha_inicio"] ?? null;
    $fecha_fin = $datos["fecha_fin"] ?? null;
    $id_piloto = filter_var(
        $datos["id_piloto"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (
        !$id_historial ||
        $institucion === "" ||
        $titulo === "" ||
        !$id_piloto
    ) {
        http_response_code(400);
        echo json_encode([
            "error" => "Se requiere id_historial, institución, título e id_piloto."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        $consulta = $conexion->prepare(
            "SELECT id_piloto FROM piloto WHERE id_piloto = ?"
        );
        $consulta->bind_param("i", $id_piloto);
        $consulta->execute();
        $consulta->store_result();

        if ($consulta->num_rows === 0) {
            http_response_code(404);
            echo json_encode([
                "error" => "El piloto indicado no existe."
            ], JSON_UNESCAPED_UNICODE);

        } else {

            $sql = "UPDATE historial_educativo
                    SET institucion = ?,
                        titulo = ?,
                        fecha_inicio = ?,
                        fecha_fin = ?,
                        id_piloto = ?
                    WHERE id_historial = ?";

            $stmt = $conexion->prepare($sql);
            $stmt->bind_param(
                "ssssii",
                $institucion,
                $titulo,
                $fecha_inicio,
                $fecha_fin,
                $id_piloto,
                $id_historial
            );

            if ($stmt->execute()) {

                if ($stmt->affected_rows > 0) {
                    echo json_encode([
                        "mensaje" => "Historial educativo actualizado correctamente."
                    ], JSON_UNESCAPED_UNICODE);
                } else {

                    // Distinguir entre registro inexistente y datos sin cambios
                    $verificar = $conexion->prepare(
                        "SELECT id_historial
                         FROM historial_educativo
                         WHERE id_historial = ?"
                    );
                    $verificar->bind_param("i", $id_historial);
                    $verificar->execute();
                    $verificar->store_result();

                    if ($verificar->num_rows > 0) {
                        echo json_encode([
                            "mensaje" => "El historial existe, pero no hubo cambios."
                        ], JSON_UNESCAPED_UNICODE);
                    } else {
                        http_response_code(404);
                        echo json_encode([
                            "error" => "El historial educativo no existe."
                        ], JSON_UNESCAPED_UNICODE);
                    }

                    $verificar->close();
                }

            } else {
                http_response_code(500);
                echo json_encode([
                    "error" => "No se pudo actualizar el historial educativo."
                ], JSON_UNESCAPED_UNICODE);
            }

            $stmt->close();
        }

        $consulta->close();
    }

// DELETE: eliminar un historial educativo
} elseif ($metodo === "DELETE") {

    $id_historial = filter_var(
        $datos["id_historial"] ?? $_GET["id_historial"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (!$id_historial) {
        http_response_code(400);
        echo json_encode([
            "error" => "Se requiere un id_historial válido."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        $stmt = $conexion->prepare(
            "DELETE FROM historial_educativo
             WHERE id_historial = ?"
        );
        $stmt->bind_param("i", $id_historial);

        if ($stmt->execute()) {

            if ($stmt->affected_rows > 0) {
                echo json_encode([
                    "mensaje" => "Historial educativo eliminado correctamente."
                ], JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(404);
                echo json_encode([
                    "error" => "El historial educativo no existe."
                ], JSON_UNESCAPED_UNICODE);
            }

        } else {
            http_response_code(500);
            echo json_encode([
                "error" => "No se pudo eliminar el historial educativo. Verifica si existen restricciones relacionadas."
            ], JSON_UNESCAPED_UNICODE);
        }

        $stmt->close();
    }

// Método HTTP no permitido
} else {

    header("Allow: GET, POST, PUT, DELETE");
    http_response_code(405);

    echo json_encode([
        "error" => "Método HTTP no permitido."
    ], JSON_UNESCAPED_UNICODE);
}

$conexion->close();
?>
<?php

require_once "../config/conexion.php";
require_once "../config/autenticacion.php";

header("Content-Type: application/json; charset=UTF-8");

function responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Permisos para el modulo, solo admin.
 */
$usuarioAutenticado = exigirAutenticacion($conexion);

if ((int) $usuarioAutenticado["id_rol"] !== 1) {
    responder(403, [
        "error" => "No tiene permisos para acceder al módulo"
    ]);
}

$metodo = $_SERVER["REQUEST_METHOD"];

$estadosPermitidos = [
    "Operativo",
    "En mantenimiento",
    "Fuera de servicio"
];

$id_pc = filter_input(INPUT_GET, "id", FILTER_VALIDATE_INT);

if ($metodo === "GET") {

    // ---------- GET: CONSULTAR EQUIPOS ----------
    $sql = "SELECT
                c.id_pc,
                c.codigo_inventario,
                c.estado,
                c.estado_registro,
                c.id_estacion,
                e.nombre AS estacion
            FROM equipo_computo c
            INNER JOIN estacion e
                ON c.id_estacion = e.id_estacion
            WHERE c.estado_registro = 1
            ORDER BY c.id_pc";

    $resultado = $conexion->query($sql);

    if ($resultado) {
        $equipos_computo = [];

        while ($fila = $resultado->fetch_assoc()) {
            $equipos_computo[] = $fila;
        }

        echo json_encode($equipos_computo, JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);

        echo json_encode([
            "error" => "No se pudieron obtener los equipos de cómputo."
        ], JSON_UNESCAPED_UNICODE);
    }

} elseif ($metodo === "POST") {

    // ---------- POST: REGISTRAR EQUIPO ----------
    $datos = json_decode(file_get_contents("php://input"), true);

    $codigo = $datos["codigo_inventario"] ?? null;
    $estado = $datos["estado"] ?? null;
    $id_estacion = filter_var(
        $datos["id_estacion"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (
        !is_string($codigo) || trim($codigo) === "" ||
        !is_string($estado) || 
        !in_array($estado, $estadosPermitidos, true) ||
        $id_estacion === false || $id_estacion === null ||
        $id_estacion <= 0
    ) {
        http_response_code(400);

        echo json_encode([
            "error" => "El código de inventario, el estado y un ID de estación válido son obligatorios."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $codigo = trim($codigo);
    $estado = trim($estado);

    $sql = "INSERT INTO equipo_computo
                (codigo_inventario, estado, id_estacion)
            VALUES (?, ?, ?)";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("ssi", $codigo, $estado, $id_estacion);

    try {
        $stmt->execute();

        http_response_code(201);

        echo json_encode([
            "mensaje" => "Equipo de cómputo registrado correctamente.",
            "id_pc" => $stmt->insert_id
        ], JSON_UNESCAPED_UNICODE);

    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() === 1062) {
            http_response_code(409);

            echo json_encode([
                "error" => "El código de inventario o la estación ya están asignados a otro equipo."
            ], JSON_UNESCAPED_UNICODE);
        } elseif ($e->getCode() === 1452) {
            http_response_code(400);

            echo json_encode([
                "error" => "La estación indicada no existe."
            ], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(500);

            echo json_encode([
                "error" => "No se pudo registrar el equipo de cómputo."
            ], JSON_UNESCAPED_UNICODE);
        }
    }

    $stmt->close();

} elseif ($metodo === "PUT") {

    // ---------- PUT: ACTUALIZAR EQUIPO ----------
    if (!$id_pc || $id_pc <= 0) {
        http_response_code(400);

        echo json_encode([
            "error" => "Debes indicar un ID de equipo válido en la URL."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $datos = json_decode(file_get_contents("php://input"), true);

    $codigo = $datos["codigo_inventario"] ?? null;
    $estado = $datos["estado"] ?? null;
    $id_estacion = filter_var(
        $datos["id_estacion"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (
        !is_string($codigo) || trim($codigo) === "" ||
        !is_string($estado) || 
        !in_array($estado, $estadosPermitidos, true) ||
        $id_estacion === false || $id_estacion === null ||
        $id_estacion <= 0
    ) {
        http_response_code(400);

        echo json_encode([
            "error" => "El código de inventario, el estado y un ID de estación válido son obligatorios."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    // Comprobar que el equipo exista
    //$sql = "SELECT id_pc FROM equipo_computo WHERE id_pc = ?";
    $sql = "SELECT id_pc, estado_registro
        FROM equipo_computo
        WHERE id_pc = ?";
    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("i", $id_pc);
    $stmt->execute();

    $resultado = $stmt->get_result();
    $existe = $resultado->num_rows > 0;

    $equipo = $resultado->fetch_assoc();
    $existe = $equipo !== null;

    $stmt->close();

    if (!$existe) {
        http_response_code(404);

        echo json_encode([
            "error" => "El equipo de cómputo no existe."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }
    if ((int) $equipo["estado_registro"] === 0) {
        http_response_code(409);

        echo json_encode([
            "error" => "No se puede actualizar un equipo dado de baja."
        ], JSON_UNESCAPED_UNICODE);

    exit;
    }

    $codigo = trim($codigo);
    $estado = trim($estado);

    $sql = "UPDATE equipo_computo
            SET codigo_inventario = ?,
                estado = ?,
                id_estacion = ?
            WHERE id_pc = ?";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("ssii", $codigo, $estado, $id_estacion, $id_pc);

    try {
        $stmt->execute();

        http_response_code(200);

        echo json_encode([
            "mensaje" => "Equipo de cómputo actualizado correctamente."
        ], JSON_UNESCAPED_UNICODE);

    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() === 1062) {
            http_response_code(409);

            echo json_encode([
                "error" => "El código de inventario o la estación ya están asignados a otro equipo."
            ], JSON_UNESCAPED_UNICODE);
        } elseif ($e->getCode() === 1452) {
            http_response_code(400);

            echo json_encode([
                "error" => "La estación indicada no existe."
            ], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(500);

            echo json_encode([
                "error" => "No se pudo actualizar el equipo de cómputo."
            ], JSON_UNESCAPED_UNICODE);
        }
    }

    $stmt->close();

} elseif ($metodo === "DELETE") {

    // ---------- DELETE: BAJA LÓGICA DEL EQUIPO ----------

        if (!$id_pc || $id_pc <= 0) {
            http_response_code(400);

            echo json_encode([
                "error" => "Debes indicar un ID de equipo válido en la URL."
            ], JSON_UNESCAPED_UNICODE);

            exit;
        }

        // Comprobar que el equipo exista
        $sql = "SELECT estado_registro
                FROM equipo_computo
                WHERE id_pc = ?";

        $stmt = $conexion->prepare($sql);
        $stmt->bind_param("i", $id_pc);
        $stmt->execute();

        $resultado = $stmt->get_result();
        $equipo = $resultado->fetch_assoc();

        $stmt->close();

        if (!$equipo) {
            http_response_code(404);

            echo json_encode([
                "error" => "El equipo de cómputo no existe."
            ], JSON_UNESCAPED_UNICODE);

            exit;
        }

        if ((int) $equipo["estado_registro"] === 0) {
            http_response_code(409);

            echo json_encode([
                "error" => "El equipo ya está dado de baja."
            ], JSON_UNESCAPED_UNICODE);

            exit;
        }

        // Desactivar el registro sin eliminarlo físicamente
        $sql = "UPDATE equipo_computo
                SET estado_registro = 0
                WHERE id_pc = ?";

        $stmt = $conexion->prepare($sql);
        $stmt->bind_param("i", $id_pc);

        try {
            $stmt->execute();

            http_response_code(200);

            echo json_encode([
                "mensaje" => "Equipo dado de baja correctamente."
            ], JSON_UNESCAPED_UNICODE);

        } catch (mysqli_sql_exception $e) {
            http_response_code(500);

            echo json_encode([
                "error" => "No se pudo dar de baja el equipo."
            ], JSON_UNESCAPED_UNICODE);
        }

        $stmt->close();
}else {

    // ---------- MÉTODO NO PERMITIDO ----------
    http_response_code(405);

    echo json_encode([
        "error" => "Método no permitido."
    ], JSON_UNESCAPED_UNICODE);
}


$conexion->close();
?>
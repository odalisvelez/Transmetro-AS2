<?php

require_once "../config/conexion.php";

header("Content-Type: application/json; charset=UTF-8");

$metodo = $_SERVER["REQUEST_METHOD"];
$datos = json_decode(file_get_contents("php://input"), true);

/**
 * Enviar una respuesta JSON y finalizar la petición.
 */
function responder($codigo, $contenido) {
    http_response_code($codigo);
    echo json_encode($contenido, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Comprobar si un registro existe y está activo.
 */
function registroActivo($conexion, $tabla, $campoId, $id) {

    $tablasPermitidas = [
        "parqueo" => "id_parqueo",
        "linea" => "id_linea",
        "piloto" => "id_piloto"
    ];

    if (
        !isset($tablasPermitidas[$tabla]) ||
        $tablasPermitidas[$tabla] !== $campoId
    ) {
        return false;
    }

    $sql = "SELECT $campoId FROM $tabla
            WHERE $campoId = ? AND estado = 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $resultado = $stmt->get_result();
    $existe = $resultado->num_rows > 0;

    $stmt->close();

    return $existe;
}

/**
 * Comprobar si la placa ya está registrada.
 */
function placaExiste($conexion, $placa, $idExcluir = null) {

    if ($idExcluir === null) {
        $sql = "SELECT id_bus FROM bus WHERE placa = ?";
        $stmt = $conexion->prepare($sql);
        $stmt->bind_param("s", $placa);
    } else {
        $sql = "SELECT id_bus FROM bus
                WHERE placa = ? AND id_bus <> ?";
        $stmt = $conexion->prepare($sql);
        $stmt->bind_param("si", $placa, $idExcluir);
    }

    $stmt->execute();
    $resultado = $stmt->get_result();
    $existe = $resultado->num_rows > 0;

    $stmt->close();

    return $existe;
}

/**
 * Obtener el estado operativo, las estaciones activas
 * y los buses activos de una línea.
 */
function obtenerResumenLinea($conexion, $idLinea) {

    $sql = "SELECT
                l.estado_operativo,
                (
                    SELECT COUNT(*)
                    FROM detalle_ruta dr
                    INNER JOIN estacion e
                        ON e.id_estacion = dr.id_estacion
                    WHERE dr.id_linea = l.id_linea
                      AND e.estado = 1
                ) AS estaciones,
                (
                    SELECT COUNT(*)
                    FROM bus b
                    WHERE b.id_linea = l.id_linea
                      AND b.estado = 1
                ) AS buses
            FROM linea l
            WHERE l.id_linea = ?
              AND l.estado = 1";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("i", $idLinea);
    $stmt->execute();

    $resultado = $stmt->get_result();
    $resumen = $resultado->fetch_assoc();

    $stmt->close();

    if (!$resumen) {
        return null;
    }

    $resumen["estaciones"] = (int)$resumen["estaciones"];
    $resumen["buses"] = (int)$resumen["buses"];

    return $resumen;
}

/**
 * Comprobar si un cambio en la cantidad de buses
 * mantendría las reglas de una línea operativa.
 *
 * $variacion:
 *   1  = agregar un bus activo
 *  -1  = retirar un bus activo
 */
function validarReglasLinea($conexion, $idLinea, $variacion) {

    if ($idLinea === null) {
        return null;
    }

    $resumen = obtenerResumenLinea($conexion, $idLinea);

    if ($resumen === null) {
        return [
            "codigo" => 409,
            "error" => "No se pudo verificar la línea asignada."
        ];
    }

    // Durante la preparación se permite configurar gradualmente.
    if ($resumen["estado_operativo"] !== "OPERATIVA") {
        return null;
    }

    $estaciones = $resumen["estaciones"];
    $busesActuales = $resumen["buses"];
    $busesProyectados = $busesActuales + $variacion;

    if ($estaciones < 1) {
        return [
            "codigo" => 409,
            "error" => "La línea operativa no tiene estaciones activas.",
            "estaciones" => $estaciones,
            "buses_activos" => $busesActuales
        ];
    }

    // RN-06: buses activos >= estaciones activas.
    if ($busesProyectados < $estaciones) {
        return [
            "codigo" => 409,
            "error" => "La operación incumple RN-06: no se pueden retirar buses porque la línea quedaría con menos buses activos que estaciones activas.",
            "estaciones" => $estaciones,
            "buses_activos_actuales" => $busesActuales,
            "buses_activos_proyectados" => $busesProyectados,
            "buses_minimos_requeridos" => $estaciones
        ];
    }

    // RN-07: buses activos <= dos veces las estaciones activas.
        $maximoBuses = $estaciones * 2;

    if ($busesProyectados > $maximoBuses) {
        return [
            "codigo" => 409,
            "error" => "La operación incumple RN-07: se superaría el máximo de buses permitido para la línea.",
            "estaciones" => $estaciones,
            "buses_activos_actuales" => $busesActuales,
            "buses_activos_proyectados" => $busesProyectados,
            "buses_maximos_permitidos" => $maximoBuses
        ];
    }

    return null;
}

/**
 * Validar los datos recibidos para registrar o modificar un bus.
 */
function validarDatosBus($conexion, $datos) {

    if (
        !isset($datos["placa"]) ||
        !is_string($datos["placa"]) ||
        trim($datos["placa"]) === "" ||
        !isset($datos["capacidad_maxima"]) ||
        !is_numeric($datos["capacidad_maxima"]) ||
        (int)$datos["capacidad_maxima"] <= 0 ||
        !isset($datos["id_parqueo"]) ||
        filter_var(
            $datos["id_parqueo"],
            FILTER_VALIDATE_INT
        ) === false ||
        (int)$datos["id_parqueo"] <= 0
    ) {
        return "La placa, capacidad positiva y parqueo son obligatorios.";
    }

    if (
        isset($datos["id_linea"]) &&
        $datos["id_linea"] !== null &&
        (
            filter_var(
                $datos["id_linea"],
                FILTER_VALIDATE_INT
            ) === false ||
            (int)$datos["id_linea"] <= 0
        )
    ) {
        return "El identificador de línea no es válido.";
    }

    if (
        isset($datos["id_piloto"]) &&
        $datos["id_piloto"] !== null &&
        (
            filter_var(
                $datos["id_piloto"],
                FILTER_VALIDATE_INT
            ) === false ||
            (int)$datos["id_piloto"] <= 0
        )
    ) {
        return "El identificador del piloto no es válido.";
    }

    if (
        !registroActivo(
            $conexion,
            "parqueo",
            "id_parqueo",
            (int)$datos["id_parqueo"]
        )
    ) {
        return "El parqueo no existe o está inactivo.";
    }

    if (
        isset($datos["id_linea"]) &&
        $datos["id_linea"] !== null &&
        !registroActivo(
            $conexion,
            "linea",
            "id_linea",
            (int)$datos["id_linea"]
        )
    ) {
        return "La línea no existe o está inactiva.";
    }

    if (
        isset($datos["id_piloto"]) &&
        $datos["id_piloto"] !== null &&
        !registroActivo(
            $conexion,
            "piloto",
            "id_piloto",
            (int)$datos["id_piloto"]
        )
    ) {
        return "El piloto no existe o está inactivo.";
    }

    return null;
}


// ==================================================
// GET: Consultar buses
// ==================================================

if ($metodo === "GET") {

    $sql = "SELECT
                b.id_bus,
                b.placa,
                b.capacidad_maxima,
                b.estado,
                b.id_linea,
                b.id_parqueo,
                b.id_piloto,
                l.nombre AS linea,
                p.ubicacion AS parqueo,
                pi.nombre AS piloto
            FROM bus b
            INNER JOIN parqueo p
                ON b.id_parqueo = p.id_parqueo
            LEFT JOIN linea l
                ON b.id_linea = l.id_linea
            LEFT JOIN piloto pi
                ON b.id_piloto = pi.id_piloto
            WHERE b.estado = 1
            ORDER BY b.id_bus";

    $resultado = $conexion->query($sql);

    if ($resultado) {
        $buses = [];

        while ($fila = $resultado->fetch_assoc()) {
            $buses[] = $fila;
        }

        responder(200, $buses);
    } else {
        responder(500, [
            "error" => "No se pudieron obtener los buses."
        ]);
    }


// ==================================================
// POST: Registrar un bus
// ==================================================

} elseif ($metodo === "POST") {

    if (!is_array($datos)) {
        responder(400, [
            "error" => "Envía un JSON válido."
        ]);
    }

    $error = validarDatosBus($conexion, $datos);

    if ($error !== null) {
        responder(400, ["error" => $error]);
    }

    $placa = trim($datos["placa"]);
    $capacidad = (int)$datos["capacidad_maxima"];
    $idParqueo = (int)$datos["id_parqueo"];
    $idLinea = (
        isset($datos["id_linea"]) &&
        $datos["id_linea"] !== null
    ) ? (int)$datos["id_linea"] : null;

    $idPiloto = (
        isset($datos["id_piloto"]) &&
        $datos["id_piloto"] !== null
    ) ? (int)$datos["id_piloto"] : null;

    if (placaExiste($conexion, $placa)) {
        responder(409, [
            "error" => "Ya existe un bus con esa placa."
        ]);
    }

    // Un bus nuevo se registra activo: variación +1.
    $errorReglas = validarReglasLinea(
        $conexion,
        $idLinea,
        1
    );

    if ($errorReglas !== null) {
        responder(
            $errorReglas["codigo"],
            $errorReglas
        );
    }

    $sql = "INSERT INTO bus
            (placa, capacidad_maxima, estado,
             id_linea, id_parqueo, id_piloto)
            VALUES (?, ?, 1, ?, ?, ?)";

    $stmt = $conexion->prepare($sql);

    $stmt->bind_param(
        "siiii",
        $placa,
        $capacidad,
        $idLinea,
        $idParqueo,
        $idPiloto
    );

    if ($stmt->execute()) {
        $idNuevo = $conexion->insert_id;
        $stmt->close();

        responder(201, [
            "mensaje" => "Bus registrado correctamente.",
            "id_bus" => $idNuevo
        ]);
    } else {
        $stmt->close();

        responder(500, [
            "error" => "No se pudo registrar el bus."
        ]);
    }


// ==================================================
// PUT: Modificar un bus activo
// ==================================================

} elseif ($metodo === "PUT") {

    $idBus = filter_var(
        $_GET["id"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (
        $idBus === false ||
        $idBus === null ||
        $idBus <= 0 ||
        !is_array($datos)
    ) {
        responder(400, [
            "error" => "Indica un ID válido en la URL y envía un JSON válido."
        ]);
    }

    $stmt = $conexion->prepare(
        "SELECT id_bus, id_linea
         FROM bus
         WHERE id_bus = ? AND estado = 1"
    );

    $stmt->bind_param("i", $idBus);
    $stmt->execute();

    $busActual = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$busActual) {
        responder(404, [
            "error" => "El bus no existe o está inactivo."
        ]);
    }

    $error = validarDatosBus($conexion, $datos);

    if ($error !== null) {
        responder(400, ["error" => $error]);
    }

    $placa = trim($datos["placa"]);
    $capacidad = (int)$datos["capacidad_maxima"];
    $idParqueo = (int)$datos["id_parqueo"];

    $idLineaNueva = (
        isset($datos["id_linea"]) &&
        $datos["id_linea"] !== null
    ) ? (int)$datos["id_linea"] : null;

    $idPiloto = (
        isset($datos["id_piloto"]) &&
        $datos["id_piloto"] !== null
    ) ? (int)$datos["id_piloto"] : null;

    $idLineaAnterior = (
        $busActual["id_linea"] !== null
    ) ? (int)$busActual["id_linea"] : null;

    if (placaExiste($conexion, $placa, $idBus)) {
        responder(409, [
            "error" => "La placa ya está registrada en otro bus."
        ]);
    }

    // Si cambia de línea, validar la retirada del bus
    // en la línea anterior y su incorporación a la nueva.
    if ($idLineaAnterior !== $idLineaNueva) {

        if ($idLineaAnterior !== null) {
            $errorReglas = validarReglasLinea(
                $conexion,
                $idLineaAnterior,
                -1
            );

            if ($errorReglas !== null) {
                responder(
                    $errorReglas["codigo"],
                    $errorReglas
                );
            }
        }

        if ($idLineaNueva !== null) {
            $errorReglas = validarReglasLinea(
                $conexion,
                $idLineaNueva,
                1
            );

            if ($errorReglas !== null) {
                responder(
                    $errorReglas["codigo"],
                    $errorReglas
                );
            }
        }
    }

    $sql = "UPDATE bus
            SET placa = ?,
                capacidad_maxima = ?,
                id_linea = ?,
                id_parqueo = ?,
                id_piloto = ?
            WHERE id_bus = ? AND estado = 1";

    $stmt = $conexion->prepare($sql);

    $stmt->bind_param(
        "siiiii",
        $placa,
        $capacidad,
        $idLineaNueva,
        $idParqueo,
        $idPiloto,
        $idBus
    );

    if ($stmt->execute()) {
        $stmt->close();

        responder(200, [
            "mensaje" => "Bus actualizado correctamente."
        ]);
    } else {
        $stmt->close();

        responder(500, [
            "error" => "No se pudo actualizar el bus."
        ]);
    }


// ==================================================
// DELETE: Desactivar un bus lógicamente
// ==================================================

} elseif ($metodo === "DELETE") {

    $idBus = filter_var(
        $_GET["id"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (
        $idBus === false ||
        $idBus === null ||
        $idBus <= 0
    ) {
        responder(400, [
            "error" => "Indica un ID válido en la URL."
        ]);
    }

    $stmt = $conexion->prepare(
        "SELECT id_bus, id_linea
         FROM bus
         WHERE id_bus = ? AND estado = 1"
    );

    $stmt->bind_param("i", $idBus);
    $stmt->execute();

    $busActual = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$busActual) {
        responder(404, [
            "error" => "El bus no existe o ya está inactivo."
        ]);
    }

    $idLinea = (
        $busActual["id_linea"] !== null
    ) ? (int)$busActual["id_linea"] : null;

    // Desactivar un bus activo equivale a retirar uno.
    if ($idLinea !== null) {
        $errorReglas = validarReglasLinea(
            $conexion,
            $idLinea,
            -1
        );

        if ($errorReglas !== null) {
            responder(
                $errorReglas["codigo"],
                $errorReglas
            );
        }
    }

    $stmt = $conexion->prepare(
        "UPDATE bus
         SET estado = 0
         WHERE id_bus = ? AND estado = 1"
    );

    $stmt->bind_param("i", $idBus);

    if ($stmt->execute() && $stmt->affected_rows === 1) {
        $stmt->close();

        responder(200, [
            "mensaje" => "Bus desactivado correctamente."
        ]);
    } else {
        $stmt->close();

        responder(500, [
            "error" => "No se pudo desactivar el bus."
        ]);
    }


// ==================================================
// Método HTTP no permitido
// ==================================================

} else {

    header("Allow: GET, POST, PUT, DELETE");

    responder(405, [
        "error" => "Método HTTP no permitido."
    ]);
}

$conexion->close();

?>
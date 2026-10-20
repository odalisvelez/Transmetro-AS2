<?php

require_once "../config/conexion.php";
require_once "../config/autenticacion.php";

header("Content-Type: application/json; charset=UTF-8");

$metodo = $_SERVER["REQUEST_METHOD"];
$datos = json_decode(file_get_contents("php://input"), true);

$usuarioAutenticado = exigirAutenticacion($conexion);

/**
 * Permisos para el modulo de lineas
 * Operador (2): unicamente consultas GET
 */
if ((int) $usuarioAutenticado["id_rol"] === 2
    && $metodo !== "GET") {

    responder(403, [
        "error" => "El operador solo tiene permiso para consultar las rutas."
    ]);
}

/**
 * Responder en JSON y finalizar.
 */
function responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Validar que la línea exista y esté activa.
 */
function lineaActiva($conexion, $idLinea) {

    $stmt = $conexion->prepare(
        "SELECT id_linea
         FROM linea
         WHERE id_linea = ? AND estado = 1"
    );

    $stmt->bind_param("i", $idLinea);
    $stmt->execute();

    $existe = $stmt->get_result()->num_rows > 0;
    $stmt->close();

    return $existe;
}

/**
 * Validar que la estación exista y esté activa.
 */
function estacionActiva($conexion, $idEstacion) {

    $stmt = $conexion->prepare(
        "SELECT id_estacion
         FROM estacion
         WHERE id_estacion = ? AND estado = 1"
    );

    $stmt->bind_param("i", $idEstacion);
    $stmt->execute();

    $existe = $stmt->get_result()->num_rows > 0;
    $stmt->close();

    return $existe;
}

/**
 * Obtener el estado operativo de la línea y contar
 * sus estaciones y buses activos.
 */
function obtenerResumenReglasRuta($conexion, $idLinea) {

    $stmt = $conexion->prepare(
        "SELECT estado_operativo
         FROM Linea
         WHERE id_linea = ? AND estado = 1"
    );

    $stmt->bind_param("i", $idLinea);
    $stmt->execute();

    $resultado = $stmt->get_result();
    $linea = $resultado->fetch_assoc();
    $stmt->close();

    if (!$linea) {
        return null;
    }

    $stmt = $conexion->prepare(
        "SELECT COUNT(*) AS total
         FROM Detalle_Ruta dr
         INNER JOIN Estacion e
             ON e.id_estacion = dr.id_estacion
         WHERE dr.id_linea = ?
           AND e.estado = 1"
    );

    $stmt->bind_param("i", $idLinea);
    $stmt->execute();

    $estaciones = (int)$stmt->get_result()
        ->fetch_assoc()["total"];

    $stmt->close();

    $stmt = $conexion->prepare(
        "SELECT COUNT(*) AS total
         FROM Bus
         WHERE id_linea = ?
           AND estado = 1"
    );

    $stmt->bind_param("i", $idLinea);
    $stmt->execute();

    $buses = (int)$stmt->get_result()
        ->fetch_assoc()["total"];

    $stmt->close();

    return [
        "estado_operativo" => $linea["estado_operativo"],
        "estaciones" => $estaciones,
        "buses" => $buses
    ];
}

/**
 * Validar RN-06 y RN-07 ante un cambio en la cantidad
 * de estaciones de la ruta.
 *
 * $variacion: +1 al agregar, -1 al quitar.
 */
function validarReglasRuta(
    $conexion,
    $idLinea,
    $variacion
) {

    $resumen = obtenerResumenReglasRuta(
        $conexion,
        $idLinea
    );

    if ($resumen === null) {
        return [
            "codigo" => 400,
            "error" => "La línea no existe o está inactiva."
        ];
    }

    // Permitir configurar la ruta gradualmente.
    if ($resumen["estado_operativo"] !== "OPERATIVA") {
        return null;
    }

    $estacionesActuales = $resumen["estaciones"];
    $buses = $resumen["buses"];

    $estacionesProyectadas =
        $estacionesActuales + $variacion;

    if ($estacionesProyectadas < 1) {
        return [
            "codigo" => 409,
            "error" => "Una línea operativa debe conservar al menos una estación activa."
        ];
    }

    // RN-06: buses activos >= estaciones activas.
    if ($buses < $estacionesProyectadas) {
        return [
            "codigo" => 409,
            "error" => "La operación incumple RN-06: la cantidad de buses activos sería inferior a las estaciones activas.",
            "estaciones_proyectadas" => $estacionesProyectadas,
            "buses_activos" => $buses,
            "buses_minimos_requeridos" => $estacionesProyectadas
        ];
    }

    // RN-07: buses activos <= 2 * estaciones activas.
    $busesMaximos = 2 * $estacionesProyectadas;

    if ($buses > $busesMaximos) {
        return [
            "codigo" => 409,
            "error" => "La operación incumple RN-07: la cantidad de buses activos superaría el doble de las estaciones activas.",
            "estaciones_proyectadas" => $estacionesProyectadas,
            "buses_activos" => $buses,
            "buses_maximos_permitidos" => $busesMaximos
        ];
    }

    return null;
}

/**
 * Validar si una estación ya pertenece a una línea.
 */
function relacionExiste($conexion, $idLinea, $idEstacion) {

    $stmt = $conexion->prepare(
        "SELECT id_linea
         FROM Detalle_Ruta
         WHERE id_linea = ? AND id_estacion = ?"
    );

    $stmt->bind_param("ii", $idLinea, $idEstacion);
    $stmt->execute();

    $existe = $stmt->get_result()->num_rows > 0;
    $stmt->close();

    return $existe;
}

/**
 * Comprobar si el orden ya está ocupado en una línea.
 * Se excluye la relación actual al actualizar.
 */
function ordenExiste(
    $conexion,
    $idLinea,
    $orden,
    $idEstacionExcluir = 0
) {

    $stmt = $conexion->prepare(
        "SELECT id_estacion
         FROM Detalle_Ruta
         WHERE id_linea = ?
           AND orden = ?
           AND id_estacion != ?
         LIMIT 1"
    );

    $stmt->bind_param(
        "iii",
        $idLinea,
        $orden,
        $idEstacionExcluir
    );

    $stmt->execute();

    $existe = $stmt->get_result()->num_rows > 0;
    $stmt->close();

    return $existe;
}

/**
 * Validar distancia.
 * Se permite null cuando no se ha definido.
 */
function validarDistancia($datos) {

    if (!array_key_exists("distancia_a_siguiente", $datos)) {
        return [
            "valida" => false,
            "valor" => null
        ];
    }

    $valor = $datos["distancia_a_siguiente"];

    if ($valor === null || $valor === "") {
        return [
            "valida" => true, "valor" => null];
    }

    if (!is_numeric($valor) || (float)$valor < 0) {
        return [
            "valida" => false, "valor" => null];
    }

    return [
        "valida" => true, "valor" => (float)$valor];
}

/**
 * GET: consultar todos los detalles de las rutas.
 */
if ($metodo === "GET") {

    $sql = "SELECT
                dr.id_linea,
                l.nombre AS linea,
                dr.id_estacion,
                e.nombre AS estacion,
                dr.orden,
                dr.distancia_a_siguiente
            FROM Detalle_Ruta dr
            INNER JOIN Linea l
                ON dr.id_linea = l.id_linea
            INNER JOIN Estacion e
                ON dr.id_estacion = e.id_estacion
            ORDER BY dr.id_linea, dr.orden";

    $resultado = $conexion->query($sql);

    if (!$resultado) {
        responder(500, [
            "error" => "No se pudieron obtener los detalles de las rutas."
        ]);
    }

    $detalleRutas = [];

    while ($fila = $resultado->fetch_assoc()) {
        $detalleRutas[] = $fila;
    }

    responder(200, $detalleRutas);
}

/**
 * POST: agregar una estación a una línea.
 */
elseif ($metodo === "POST") {

    if (
        !is_array($datos) ||
        !isset($datos["id_linea"]) ||
        !isset($datos["id_estacion"]) ||
        !isset($datos["orden"])
    ) {
        responder(400, [
            "error" => "Debes enviar id_linea, id_estacion y orden."
        ]);
    }

    $idLinea = filter_var(
        $datos["id_linea"],
        FILTER_VALIDATE_INT
    );

    $idEstacion = filter_var(
        $datos["id_estacion"],
        FILTER_VALIDATE_INT
    );

    $orden = filter_var(
        $datos["orden"],
        FILTER_VALIDATE_INT
    );

    if (
        $idLinea === false || $idLinea <= 0 ||
        $idEstacion === false || $idEstacion <= 0 ||
        $orden === false || $orden <= 0
    ) {
        responder(400, [
            "error" => "Los IDs y el orden deben ser enteros positivos."
        ]);
    }

    $distancia = validarDistancia($datos);

    if (!$distancia["valida"]) {
        responder(400, [
            "error" => "La distancia debe ser un número no negativo o null."
        ]);
    }

    if (!lineaActiva($conexion, $idLinea)) {
        responder(400, [
            "error" => "La línea no existe o está inactiva."
        ]);
    }

    if (!estacionActiva($conexion, $idEstacion)) {
        responder(400, [
            "error" => "La estación no existe o está inactiva."
        ]);
    }

    if (relacionExiste($conexion, $idLinea, $idEstacion)) {
        responder(409, [
            "error" => "Esta estación ya pertenece a la línea indicada."
        ]);
    }

    if (ordenExiste($conexion, $idLinea, $orden)) {
        responder(409, [
            "error" => "Ya existe una estación con ese orden en la línea."
        ]);
    }

    
    // Validar RN-06 y RN-07 antes de agregar la estación.
    $errorReglas = validarReglasRuta(
        $conexion,
        $idLinea,
        1
    );

    if ($errorReglas !== null) {
        $codigo = $errorReglas["codigo"];
        unset($errorReglas["codigo"]);

        responder($codigo, $errorReglas);
    }

    $valorDistancia = $distancia["valor"];

    $sql = "INSERT INTO Detalle_Ruta
                (id_linea, id_estacion, orden, distancia_a_siguiente)
            VALUES (?, ?, ?, ?)";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param(
        "iiid",
        $idLinea,
        $idEstacion,
        $orden,
        $valorDistancia
    );

    if (!$stmt->execute()) {
        $stmt->close();

        responder(500, [
            "error" => "No se pudo registrar el detalle de la ruta."
        ]);
    }

    $stmt->close();

    responder(201, [
        "mensaje" => "Detalle de ruta registrado correctamente.",
        "id_linea" => $idLinea,
        "id_estacion" => $idEstacion,
        "orden" => $orden,
        "distancia_a_siguiente" => $valorDistancia
    ]);
}


/**
 * PUT: reordenar todas las estaciones de una línea.
 * URL: detalle_ruta.php?accion=reordenar
 */
if (
    $metodo === "PUT" &&
    ($_GET["accion"] ?? "") === "reordenar"
) {

    if (
        !is_array($datos) ||
        !isset($datos["id_linea"]) ||
        !isset($datos["estaciones"]) ||
        !is_array($datos["estaciones"])
    ) {
        responder(400, [
            "error" => "Debes enviar id_linea y una lista de estaciones."
        ]);
    }

    $idLinea = filter_var(
        $datos["id_linea"],
        FILTER_VALIDATE_INT
    );

    if ($idLinea === false || $idLinea <= 0) {
        responder(400, [
            "error" => "El ID de la línea debe ser un entero positivo."
        ]);
    }

    if (!lineaActiva($conexion, $idLinea)) {
        responder(400, [
            "error" => "La línea no existe o está inactiva."
        ]);
    }

    if (count($datos["estaciones"]) === 0) {
        responder(400, [
            "error" => "La lista de estaciones no puede estar vacía."
        ]);
    }

    $estacionesNuevas = [];
    $idsVistos = [];
    $ordenesVistos = [];

    foreach ($datos["estaciones"] as $estacion) {

        if (
            !is_array($estacion) ||
            !isset($estacion["id_estacion"]) ||
            !isset($estacion["orden"])
        ) {
            responder(400, [
                "error" => "Cada estación debe incluir id_estacion y orden."
            ]);
        }

        $idEstacion = filter_var(
            $estacion["id_estacion"],
            FILTER_VALIDATE_INT
        );

        $orden = filter_var(
            $estacion["orden"],
            FILTER_VALIDATE_INT
        );

        if (
            $idEstacion === false || $idEstacion <= 0 ||
            $orden === false || $orden <= 0
        ) {
            responder(400, [
                "error" => "Los IDs y órdenes deben ser enteros positivos."
            ]);
        }

        if (
            isset($idsVistos[$idEstacion]) ||
            isset($ordenesVistos[$orden])
        ) {
            responder(400, [
                "error" => "No se permiten estaciones ni órdenes duplicados."
            ]);
        }

        $idsVistos[$idEstacion] = true;
        $ordenesVistos[$orden] = true;

        $estacionesNuevas[] = [
            "id_estacion" => $idEstacion,
            "orden" => $orden
        ];
    }

    // Obtener las estaciones que actualmente pertenecen a la línea.
    $stmt = $conexion->prepare(
        "SELECT id_estacion
         FROM Detalle_Ruta
         WHERE id_linea = ?
         ORDER BY orden"
    );

    $stmt->bind_param("i", $idLinea);
    $stmt->execute();

    $resultado = $stmt->get_result();
    $idsActuales = [];

    while ($fila = $resultado->fetch_assoc()) {
        $idsActuales[] = (int)$fila["id_estacion"];
    }

    $stmt->close();

    $idsNuevos = array_column(
        $estacionesNuevas,
        "id_estacion"
    );

    sort($idsActuales);
    $idsNuevosOrdenados = $idsNuevos;
    sort($idsNuevosOrdenados);

    // La operación solo reordena; no agrega ni quita estaciones.
    if ($idsActuales !== $idsNuevosOrdenados) {
        responder(400, [
            "error" => "La lista debe contener exactamente las estaciones actuales de la línea."
        ]);
    }

    foreach ($idsNuevos as $idEstacion) {
        if (!estacionActiva($conexion, $idEstacion)) {
            responder(400, [
                "error" => "Todas las estaciones deben estar activas."
            ]);
        }
    }

    // Ordenar temporalmente para evitar conflictos con el índice UNIQUE.
    $conexion->begin_transaction();

    try {

        $stmtTemporal = $conexion->prepare(
            "UPDATE Detalle_Ruta
             SET orden = orden + 1000000
             WHERE id_linea = ?"
        );

        $stmtTemporal->bind_param("i", $idLinea);
        $stmtTemporal->execute();
        $stmtTemporal->close();

        // Aplicar los nuevos órdenes y dejar las distancias pendientes.
        $stmtActualizar = $conexion->prepare(
            "UPDATE Detalle_Ruta
             SET orden = ?,
                 distancia_a_siguiente = NULL
             WHERE id_linea = ?
               AND id_estacion = ?"
        );

        foreach ($estacionesNuevas as $estacion) {

            $orden = $estacion["orden"];
            $idEstacion = $estacion["id_estacion"];

            $stmtActualizar->bind_param(
                "iii",
                $orden,
                $idLinea,
                $idEstacion
            );

            $stmtActualizar->execute();

            if ($stmtActualizar->affected_rows < 0) {
                throw new Exception(
                    "No se pudo actualizar una estación."
                );
            }
        }

        $stmtActualizar->close();

        $conexion->commit();

        responder(200, [
            "mensaje" => "El recorrido se reordenó correctamente. Registra nuevamente las distancias.",
            "id_linea" => $idLinea,
            "estaciones_actualizadas" => count($estacionesNuevas)
        ]);

    } catch (Throwable $error) {

        $conexion->rollback();

        responder(500, [
            "error" => "No se pudo reordenar el recorrido. Los cambios fueron revertidos."
        ]);
    }
}

/**
 * PUT: actualizar el orden y la distancia.
 * URL: detalles_ruta.php?id_linea=1&id_estacion=1
 *
 * Los identificadores de la clave compuesta no se cambian.
 */
elseif ($metodo === "PUT") {

    $idLinea = filter_var(
        $_GET["id_linea"] ?? null,
        FILTER_VALIDATE_INT
    );

    $idEstacion = filter_var(
        $_GET["id_estacion"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (
        $idLinea === false || $idLinea === null || $idLinea <= 0 ||
        $idEstacion === false || $idEstacion === null || $idEstacion <= 0
    ) {
        responder(400, [
            "error" => "Debes proporcionar id_linea e id_estacion válidos en la URL."
        ]);
    }

    if (
        !is_array($datos) ||
        !isset($datos["orden"])
    ) {
        responder(400, [
            "error" => "Debes enviar el nuevo orden y distancia_a_siguiente."
        ]);
    }

    $orden = filter_var(
        $datos["orden"],
        FILTER_VALIDATE_INT
    );

    if ($orden === false || $orden <= 0) {
        responder(400, [
            "error" => "El orden debe ser un entero positivo."
        ]);
    }

    $distancia = validarDistancia($datos);

    if (!$distancia["valida"]) {
        responder(400, [
            "error" => "La distancia debe ser un número no negativo o null."
        ]);
    }

    if (!lineaActiva($conexion, $idLinea)) {
        responder(400, [
            "error" => "La línea no existe o está inactiva."
        ]);
    }

    if (!estacionActiva($conexion, $idEstacion)) {
        responder(400, [
            "error" => "La estación no existe o está inactiva."
        ]);
    }

    if (!relacionExiste($conexion, $idLinea, $idEstacion)) {
        responder(404, [
            "error" => "La relación entre la línea y la estación no existe."
        ]);
    }

    if (ordenExiste($conexion, $idLinea, $orden, $idEstacion)) {
        responder(409, [
            "error" => "Otra estación de esta línea ya tiene ese orden."
        ]);
    }

    $valorDistancia = $distancia["valor"];

    $sql = "UPDATE Detalle_Ruta
            SET orden = ?,
                distancia_a_siguiente = ?
            WHERE id_linea = ?
              AND id_estacion = ?";

    $stmt = $conexion->prepare($sql);
    $stmt->bind_param(
        "idii",
        $orden,
        $valorDistancia,
        $idLinea,
        $idEstacion
    );

    if (!$stmt->execute()) {
        $stmt->close();

        responder(500, [
            "error" => "No se pudo actualizar el detalle de la ruta."
        ]);
    }

    $stmt->close();

    responder(200, [
        "mensaje" => "Detalle de ruta actualizado correctamente.",
        "id_linea" => $idLinea,
        "id_estacion" => $idEstacion,
        "orden" => $orden,
        "distancia_a_siguiente" => $valorDistancia
    ]);
}

/**
 * DELETE: eliminar la relación línea-estación.
 * URL: detalles_ruta.php?id_linea=1&id_estacion=1
 */
elseif ($metodo === "DELETE") {

    $idLinea = filter_var(
        $_GET["id_linea"] ?? null,
        FILTER_VALIDATE_INT
    );

    $idEstacion = filter_var(
        $_GET["id_estacion"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (
        $idLinea === false || $idLinea === null || $idLinea <= 0 ||
        $idEstacion === false || $idEstacion === null || $idEstacion <= 0
    ) {
        responder(400, [
            "error" => "Debes proporcionar id_linea e id_estacion válidos en la URL."
        ]);
    }

    if (!relacionExiste($conexion, $idLinea, $idEstacion)) {
        responder(404, [
            "error" => "La relación entre la línea y la estación no existe."
        ]);
    }

    // No eliminar una relación utilizada por una alerta.
    $stmt = $conexion->prepare(
        "SELECT id_alerta
         FROM Alerta
         WHERE id_linea = ? AND id_estacion = ?
         LIMIT 1"
    );

    $stmt->bind_param("ii", $idLinea, $idEstacion);
    $stmt->execute();

    $tieneAlertas = $stmt->get_result()->num_rows > 0;
    $stmt->close();

    if ($tieneAlertas) {
        responder(409, [
            "error" => "No se puede eliminar esta relación porque tiene alertas asociadas."
        ]);
    }

    
    // Si la estación está activa, la eliminación reduce
    // en uno el total de estaciones activas de la ruta.
    $variacionEstaciones = estacionActiva(
        $conexion,
        $idEstacion
    ) ? -1 : 0;

    $errorReglas = validarReglasRuta(
        $conexion,
        $idLinea,
        $variacionEstaciones
    );

    if ($errorReglas !== null) {
        $codigo = $errorReglas["codigo"];
        unset($errorReglas["codigo"]);

        responder($codigo, $errorReglas);
    }

    $stmt = $conexion->prepare(
        "DELETE FROM Detalle_Ruta
         WHERE id_linea = ? AND id_estacion = ?"
    );

    $stmt->bind_param("ii", $idLinea, $idEstacion);

    if (!$stmt->execute()) {
        $stmt->close();

        responder(500, [
            "error" => "No se pudo eliminar el detalle de la ruta. Verifica las relaciones asociadas."
        ]);
    }

    $stmt->close();

    responder(200, [
        "mensaje" => "Detalle de ruta eliminado correctamente.",
        "id_linea" => $idLinea,
        "id_estacion" => $idEstacion
    ]);
}

/**
 * Método HTTP no permitido.
 */
else {

    header("Allow: GET, POST, PUT, DELETE");

    responder(405, [
        "error" => "Método HTTP no permitido."
    ]);
}

$conexion->close();

?>
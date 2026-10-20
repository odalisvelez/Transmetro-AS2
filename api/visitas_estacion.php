
<?php

require_once "../config/conexion.php";
require_once "../config/autenticacion.php";

header("Content-Type: application/json; charset=UTF-8");

$usuarioAutenticado = exigirAutenticacion($conexion);
$metodo = $_SERVER["REQUEST_METHOD"];


// ==================================================
// GET: Consultar visitas registradas
// ==================================================
if ($metodo === "GET") {

    $sql = "SELECT
                v.id_visita,
                v.id_bus,
                v.id_estacion,
                v.fecha_hora,
                v.pasajeros_esperando,
                b.placa AS bus,
                e.nombre AS estacion
            FROM visita_estacion v
            INNER JOIN bus b
                ON v.id_bus = b.id_bus
            INNER JOIN estacion e
                ON v.id_estacion = e.id_estacion
            ORDER BY v.id_visita";

    $resultado = $conexion->query($sql);

    if ($resultado) {

        $visitas = [];

        while ($fila = $resultado->fetch_assoc()) {
            $visitas[] = $fila;
        }

        echo json_encode(
            $visitas,
            JSON_UNESCAPED_UNICODE
        );

    } else {

        http_response_code(500);

        echo json_encode([
            "error" => "No se pudieron obtener las visitas."
        ], JSON_UNESCAPED_UNICODE);
    }


// ==================================================
// POST: Registrar visita y evaluar reglas
// ==================================================
} elseif ($metodo === "POST") {

    $datos = json_decode(
        file_get_contents("php://input"),
        true
    );

    // Validar formato JSON
    if (!is_array($datos)) {

        http_response_code(400);

        echo json_encode([
            "error" => "Envía un JSON válido."
        ], JSON_UNESCAPED_UNICODE);

    } else {

        // Validar campos obligatorios
        $idBus = filter_var(
            $datos["id_bus"] ?? null,
            FILTER_VALIDATE_INT
        );

        $idEstacion = filter_var(
            $datos["id_estacion"] ?? null,
            FILTER_VALIDATE_INT
        );

        $pasajeros = filter_var(
            $datos["pasajeros_esperando"] ?? null,
            FILTER_VALIDATE_INT
        );

        if (
            !$idBus || $idBus <= 0 ||
            !$idEstacion || $idEstacion <= 0 ||
            $pasajeros === false ||
            $pasajeros === null ||
            $pasajeros < 0
        ) {

            http_response_code(400);

            echo json_encode([
                "error" => "Debes enviar id_bus, id_estacion y pasajeros_esperando válidos. Los pasajeros no pueden ser negativos."
            ], JSON_UNESCAPED_UNICODE);

        } else {

            /*
             * Comprobar que el bus esté activo y tenga una línea
             * asignada, y que la estación pertenezca a esa línea.
             */
            $sql = "SELECT
                        b.id_bus,
                        b.capacidad_maxima,
                        b.id_linea
                    FROM bus b
                    INNER JOIN linea l
                        ON b.id_linea = l.id_linea
                    INNER JOIN detalle_ruta dr
                        ON dr.id_linea = b.id_linea
                    INNER JOIN estacion e
                        ON e.id_estacion = dr.id_estacion
                    WHERE b.id_bus = ?
                      AND b.estado = 1
                      AND l.estado = 1
                      AND dr.id_estacion = ?
                      AND e.estado = 1";

            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("ii", $idBus, $idEstacion);
            $stmt->execute();

            $resultado = $stmt->get_result();
            $bus = $resultado->fetch_assoc();

            $stmt->close();

            if (!$bus) {

                http_response_code(400);

                echo json_encode([
                    "error" => "El bus debe estar activo, tener una línea asignada y la estación debe pertenecer a su ruta y estar activa."
                ], JSON_UNESCAPED_UNICODE);

            } else {

                $capacidad = (int)$bus["capacidad_maxima"];
                $idLinea = (int)$bus["id_linea"];

                if ($capacidad <= 0) {

                    http_response_code(400);

                    echo json_encode([
                        "error" => "La capacidad máxima del bus debe ser mayor que cero."
                    ], JSON_UNESCAPED_UNICODE);

                } else {

                    // ------------------------------------------
                    // Evaluar RN-14 y RN-15
                    // ------------------------------------------

                    // RN-14: demanda igual o superior al 150 %
                    $generaAlerta = (
                        $pasajeros >= ($capacidad * 1.5)
                    );

                    // RN-15: demanda inferior al 25 %
                    $esperaAdicional = (
                        $pasajeros < ($capacidad * 0.25)
                    ) ? 5 : 0;

                    // ------------------------------------------
                    // Registrar visita y alerta en una transacción
                    // ------------------------------------------

                    $conexion->begin_transaction();

                    try {

                        $sqlVisita = "INSERT INTO visita_estacion
                                      (id_bus, id_estacion,
                                       pasajeros_esperando)
                                      VALUES (?, ?, ?)";

                        $stmtVisita = $conexion->prepare($sqlVisita);

                        $stmtVisita->bind_param(
                            "iii",
                            $idBus,
                            $idEstacion,
                            $pasajeros
                        );

                        if (!$stmtVisita->execute()) {
                            throw new Exception(
                                "No se pudo registrar la visita."
                            );
                        }

                        $idVisita = $conexion->insert_id;
                        $stmtVisita->close();

                        $alertaGenerada = false;
                        $idAlerta = null;

                        if ($generaAlerta) {

                            $tipoAlerta = "Demanda alta de pasajeros";

                            /*
                             * No crear otra alerta activa del mismo tipo
                             * para esa estación y línea.
                             */
                            $sqlDuplicada = "SELECT id_alerta
                                             FROM alerta
                                             WHERE id_estacion = ?
                                               AND id_linea = ?
                                               AND tipo_alerta = ?
                                               AND estado IN ('Pendiente', 'En proceso')
                                             LIMIT 1";

                            $stmtDuplicada = $conexion->prepare(
                                $sqlDuplicada
                            );

                            $stmtDuplicada->bind_param(
                                "iis",
                                $idEstacion,
                                $idLinea,
                                $tipoAlerta
                            );

                            $stmtDuplicada->execute();

                            $resultadoDuplicada =
                                $stmtDuplicada->get_result();

                            $alertaExistente =
                                $resultadoDuplicada->fetch_assoc();

                            $stmtDuplicada->close();

                            if (!$alertaExistente) {

                                $estadoAlerta =  "Pendiente";

                                $sqlAlerta = "INSERT INTO alerta
                                              (id_estacion, id_linea,
                                               tipo_alerta, estado)
                                              VALUES (?, ?, ?, ?)";

                                $stmtAlerta = $conexion->prepare(
                                    $sqlAlerta
                                );

                                $stmtAlerta->bind_param(
                                    "iiss",
                                    $idEstacion,
                                    $idLinea,
                                    $tipoAlerta,
                                    $estadoAlerta
                                );

                                if (!$stmtAlerta->execute()) {
                                    throw new Exception(
                                        "No se pudo generar la alerta."
                                    );
                                }

                                $idAlerta = $conexion->insert_id;
                                $alertaGenerada = true;

                                $stmtAlerta->close();

                            } else {

                                $idAlerta =
                                    (int)$alertaExistente["id_alerta"];
                            }
                        }

                        $conexion->commit();

                        http_response_code(201);

                        echo json_encode([
                            "mensaje" => "Visita registrada correctamente.",
                            "id_visita" => $idVisita,
                            "pasajeros_esperando" => $pasajeros,
                            "capacidad_maxima_bus" => $capacidad,
                            "rn14" => [
                                "condicion_cumplida" => $generaAlerta,
                                "alerta_generada" => $alertaGenerada,
                                "id_alerta" => $idAlerta
                            ],
                            
                            // ajustamos mensaje
                            "rn15" => [
                                "condicion_cumplida" => $esperaAdicional === 5,
                                "espera_adicional_minutos" => $esperaAdicional,
                                "mensaje" => $esperaAdicional === 5
                                    ? "Demanda baja: se deben añadir 5 minutos de espera."
                                    : "No corresponde tiempo de espera adicional.",
                                "criterio" => "La regla se evalúa comparando los pasajeros esperando en la estación con el 25 % de la capacidad máxima del bus."
                            ]

                        ], JSON_UNESCAPED_UNICODE);

                    } catch (Throwable $e) {

                        $conexion->rollback();

                        http_response_code(500);

                        echo json_encode([
                            "error" => "No se pudo completar el registro de la visita y la evaluación de reglas."
                        ], JSON_UNESCAPED_UNICODE);
                    }
                }
            }
        }
    }


// ==================================================
// Método HTTP no permitido
// ==================================================
} else {

    header("Allow: GET, POST");
    http_response_code(405);

    echo json_encode([
        "error" => "Método HTTP no permitido."
    ], JSON_UNESCAPED_UNICODE);
}

$conexion->close();

?>
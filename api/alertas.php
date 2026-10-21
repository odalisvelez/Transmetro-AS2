<?php

require_once "../config/conexion.php";
require_once "../config/autenticacion.php";

header("Content-Type: application/json; charset=UTF-8");

$usuarioAutenticado = exigirAutenticacion($conexion);

$metodo = $_SERVER["REQUEST_METHOD"];

if ($metodo === "GET"){

    $sql = "SELECT
            a.id_alerta,
            a.estado,
            a.fecha_hora,
            a.tipo_alerta,
            a.id_estacion,
            a.id_linea,
            e.nombre AS estacion,
            l.nombre AS linea
        FROM alerta a
        INNER JOIN estacion e
            ON a.id_estacion = e.id_estacion
        INNER JOIN linea l
            ON a.id_linea = l.id_linea
        ORDER BY a.id_alerta";

    $resultado = $conexion->query($sql);

    $alertas = [];

    if($resultado){

        while($fila = $resultado->fetch_assoc()){
            
            $alertas[] = $fila;
        }

        echo json_encode($alertas, JSON_UNESCAPED_UNICODE);
    } else{

        echo json_encode([

            "error" => "No se pudieron obtenr las alertas"
        ], JSON_UNESCAPED_UNICODE);
    }

} elseif ($metodo === "PUT") {

        $datos = json_decode(
            file_get_contents("php://input"),
            true
        );

        $idAlerta = filter_var(
            $datos["id_alerta"] ?? $_GET["id_alerta"] ?? null,
            FILTER_VALIDATE_INT
        );

        $estado = $datos["estado"] ?? null;

        // Validar identificador y estado solicitado
        // Estados permitidos para una alerta
        $estadosPermitidos = [
            "Pendiente",
            "En proceso",
            "Atendida"
        ];

        // Validar identificador y estado solicitado
        if (
            !$idAlerta ||
            $idAlerta <= 0 ||
            !in_array($estado, $estadosPermitidos, true)
        )
        /*if (
            !$idAlerta ||
            $idAlerta <= 0 ||
            $estado !== "Atendida"
        ) */
        
        {
            http_response_code(400);

            echo json_encode([
                "error" => "Debes proporcionar un id_alerta válido y el estado Atendida."
            ], JSON_UNESCAPED_UNICODE);

        } else {

            // Actualizar alertas que todavía no estén atendidas
            $sql = "UPDATE alerta
                    SET estado = ?
                    WHERE id_alerta = ?
                    AND estado IN ('Pendiente', 'En proceso')";

            $stmt = $conexion->prepare($sql);
            $stmt->bind_param("si", $estado, $idAlerta);

            $stmt->execute();

            if ($stmt->affected_rows > 0) {

                http_response_code(200);

                echo json_encode([
                    "mensaje" => "Estado de la alerta actualizado correctamente.",
                    "id_alerta" => $idAlerta,
                    "estado" => $estado    
                /*"mensaje" => "Alerta marcada como atendida.",
                    "id_alerta" => $idAlerta,
                    "estado" => "Atendida"*/
                ], JSON_UNESCAPED_UNICODE);

            } else {

                // Diferenciar entre alerta inexistente y ya atendida
                $sqlVerificar = "SELECT estado
                                FROM alerta
                                WHERE id_alerta = ?";

                $verificar = $conexion->prepare($sqlVerificar);
                $verificar->bind_param("i", $idAlerta);
                $verificar->execute();

                $resultado = $verificar->get_result();
                $alerta = $resultado->fetch_assoc();

                if (!$alerta) {

                    http_response_code(404);

                    echo json_encode([
                        "error" => "La alerta no existe."
                    ], JSON_UNESCAPED_UNICODE);

                } else {
                    http_response_code(409);

                    echo json_encode([
                        "error" => $alerta["estado"] === "Atendida"
                            ? "La alerta ya fue atendida y no puede modificarse."
                            : "No se pudo actualizar el estado de la alerta.",
                        "estado_actual" => $alerta["estado"]
                    ], JSON_UNESCAPED_UNICODE);
                }

                $verificar->close();
            }

            $stmt->close();
        }
}
else {

    header("Allow: GET, PUT");

    responder(405, [
        "error" => "Método HTTP no permitido."
    ]);
}
$conexion->close();
?>
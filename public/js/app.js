
const API_BASE = "/Transmetro-AS/api";

// Elementos de la página
const formulario = document.getElementById("formVisita");
const selectorBus = document.getElementById("id_bus");
const selectorEstacion = document.getElementById("id_estacion");
const campoPasajeros = document.getElementById("pasajeros_esperando");
const resultadoVisita = document.getElementById("resultadoVisita");
const listaAlertas = document.getElementById("listaAlertas");
const btnActualizarAlertas = document.getElementById("btnActualizarAlertas");


// Mostrar mensajes sin interpretar el contenido como HTML
function mostrarMensaje(contenedor, mensaje, tipo = "info") {
    contenedor.replaceChildren();

    const alerta = document.createElement("div");
    alerta.className = `alert alert-${tipo}`;
    alerta.textContent = mensaje;

    contenedor.appendChild(alerta);
}


// Consultar una API y comprobar errores HTTP
async function consultarAPI(url, opciones = {}) {
    const respuesta = await fetch(url, opciones);

    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(
            datos.error || `Error HTTP ${respuesta.status}`
        );
    }

    return datos;
}


// Cargar buses activos
async function cargarBuses() {
    selectorBus.replaceChildren();

    const inicial = new Option("Selecciona un bus", "");
    selectorBus.add(inicial);

    const buses = await consultarAPI(`${API_BASE}/buses.php`);

    // Solo mostrar buses activos que tengan una línea asignada
    const busesDisponibles = buses.filter(bus =>
        Number(bus.estado) === 1 &&
        bus.id_linea !== null &&
        bus.id_linea !== ""
    );

    busesDisponibles.forEach(bus => {
        const opcion = new Option(
            `${bus.placa} - ${bus.linea || "Sin línea"}`,
            bus.id_bus
        );

        selectorBus.add(opcion);
    });

    if (busesDisponibles.length === 0) {
        selectorBus.options[0].textContent =
            "No hay buses activos con línea asignada";
    }
}


// Cargar estaciones activas
async function cargarEstaciones() {
    selectorEstacion.replaceChildren();

    selectorEstacion.add(
        new Option("Selecciona una estación", "")
    );

    const estaciones = await consultarAPI(
        `${API_BASE}/estaciones.php`
    );

    const estacionesDisponibles = estaciones.filter(estacion =>
        Number(estacion.estado) === 1
    );

    estacionesDisponibles.forEach(estacion => {
        selectorEstacion.add(
            new Option(estacion.nombre, estacion.id_estacion)
        );
    });

    if (estacionesDisponibles.length === 0) {
        selectorEstacion.options[0].textContent =
            "No hay estaciones activas";
    }
}


// Registrar visita y mostrar el resultado de las reglas
formulario.addEventListener("submit", async function(evento) {
    evento.preventDefault();

    resultadoVisita.replaceChildren();

    const datos = {
        id_bus: Number(selectorBus.value),
        id_estacion: Number(selectorEstacion.value),
        pasajeros_esperando: Number(campoPasajeros.value)
    };

    if (
        !datos.id_bus ||
        !datos.id_estacion ||
        !Number.isInteger(datos.pasajeros_esperando) ||
        datos.pasajeros_esperando < 0
    ) {
        mostrarMensaje(
            resultadoVisita,
            "Selecciona un bus, una estación e ingresa un número válido de pasajeros.",
            "warning"
        );
        return;
    }

    const boton = formulario.querySelector(
        'button[type="submit"]'
    );

    boton.disabled = true;
    boton.textContent = "Registrando...";

    try {
        const resultado = await consultarAPI(
            `${API_BASE}/visitas_estacion.php`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(datos)
            }
        );

        const panel = document.createElement("div");
        panel.className = "alert alert-success";

        const titulo = document.createElement("h3");
        titulo.className = "h6";
        titulo.textContent = resultado.mensaje;

        const detalle = document.createElement("p");
        detalle.className = "mb-2";
        detalle.textContent =
            `Visita #${resultado.id_visita}. ` +
            `Pasajeros esperando: ${resultado.pasajeros_esperando}.`;

        const regla14 = document.createElement("p");
        regla14.className = "mb-2";
        regla14.textContent = resultado.rn14.condicion_cumplida
            ? (
                resultado.rn14.alerta_generada
                    ? "RN-14: se generó una alerta de demanda alta."
                    : "RN-14: se cumple el umbral; ya existía una alerta activa."
            )
            : "RN-14: no se requiere una alerta por demanda alta.";

        const regla15 = document.createElement("p");
        regla15.className = "mb-0";
        regla15.textContent =
            `RN-15: espera adicional indicada: ` +
            `${resultado.rn15.espera_adicional_minutos} minutos.`;

        panel.append(titulo, detalle, regla14, regla15);
        resultadoVisita.appendChild(panel);

        formulario.reset();

        await cargarAlertas();

    } catch (error) {
        mostrarMensaje(
            resultadoVisita,
            `No se pudo registrar la visita: ${error.message}`,
            "danger"
        );
    } finally {
        boton.disabled = false;
        boton.textContent = "Registrar visita";
    }
});


// Consultar y mostrar alertas
async function cargarAlertas() {
    listaAlertas.replaceChildren();

    try {
        const alertas = await consultarAPI(
            `${API_BASE}/alertas.php`
        );

        if (!Array.isArray(alertas) || alertas.length === 0) {
            const mensaje = document.createElement("p");
            mensaje.className = "text-secondary mb-0";
            mensaje.textContent = "No hay alertas registradas.";
            listaAlertas.appendChild(mensaje);
            return;
        }

        const tabla = document.createElement("div");
        tabla.className = "table-responsive";

        const tablaHTML = document.createElement("table");
        tablaHTML.className =
            "table table-striped table-hover align-middle";

        const encabezado = document.createElement("thead");
        encabezado.innerHTML = `
            <tr>
                <th>ID</th>
                <th>Tipo</th>
                <th>Estación</th>
                <th>Línea</th>
                <th>Fecha y hora</th>
                <th>Estado</th>
            </tr>
        `;

        const cuerpo = document.createElement("tbody");

        alertas.forEach(alerta => {
            const fila = document.createElement("tr");

            [
                alerta.id_alerta,
                alerta.tipo_alerta,
                alerta.estacion,
                alerta.linea,
                alerta.fecha_hora,
                alerta.estado
            ].forEach(valor => {
                const celda = document.createElement("td");
                celda.textContent = valor ?? "";
                fila.appendChild(celda);
            });

            cuerpo.appendChild(fila);
        });

        tablaHTML.append(encabezado, cuerpo);
        tabla.appendChild(tablaHTML);
        listaAlertas.appendChild(tabla);

    } catch (error) {
        mostrarMensaje(
            listaAlertas,
            `No se pudieron cargar las alertas: ${error.message}`,
            "danger"
        );
    }
}


// Botón para actualizar las alertas
btnActualizarAlertas.addEventListener("click", cargarAlertas);


// Inicializar la página
async function iniciarAplicacion() {
    try {
        await Promise.all([
            cargarBuses(),
            cargarEstaciones()
        ]);
    } catch (error) {
        mostrarMensaje(
            resultadoVisita,
            `No se pudieron cargar los datos iniciales: ${error.message}`,
            "danger"
        );
    }

    await cargarAlertas();
}

iniciarAplicacion();
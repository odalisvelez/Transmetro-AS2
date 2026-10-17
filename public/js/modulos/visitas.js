
//MÓDULO: VISITAS A ESTACIONES

// Endpoints de las API
const API_BUSES = "buses.php";
const API_ESTACIONES = "estaciones.php";
const API_DETALLE_RUTAS = "detalle_ruta.php";

// Elementos del formulario
const formularioVisita = document.getElementById("formularioVisita");
const selectBus = document.getElementById("id_bus");
const selectEstacion = document.getElementById("id_estacion");
const mensaje = document.getElementById("mensaje");


// VARIABLES PARA CONSULTAR LAS VISITAS

let visitas = [];
let visitasFiltradas = [];

let paginaActual = 1;
let registrosPorPagina = 5;

let detalleRutas = [];
let estacionesDisponibles = [];
let busesDisponibles = [];

/*/ INICIALIZAR EL MÓDULO
document.addEventListener("DOMContentLoaded", () => {
    cargarBuses();
    cargarEstaciones();
}); */
document.addEventListener("DOMContentLoaded", () => {
    cargarBuses();
    cargarEstaciones();
    cargarDetalleRutas();
    cargarVisitas();

    // Botón para actualizar la tabla
    document
        .getElementById("btnActualizar")
        .addEventListener("click", cargarVisitas);

    // Búsqueda de visitas
    document
        .getElementById("buscarVisita")
        .addEventListener("input", () => {
            paginaActual = 1;
            filtrarVisitas();
        });

    // Cantidad de registros por página
    document
        .getElementById("registrosPorPagina")
        .addEventListener("change", (evento) => {
            registrosPorPagina = Number(evento.target.value);
            paginaActual = 1;
            mostrarVisitas();
        });

    selectBus.addEventListener("change", filtrarEstacionesPorBus);
});

// MOSTRAR MENSAJES
function mostrarMensaje(texto, tipo = "info") {
    mensaje.textContent = texto;
    mensaje.className = `alert alert-${tipo}`;
}


// CARGAR BUSES

async function cargarBuses() {
    try {
        selectBus.innerHTML = `
            <option value="">Cargando buses...</option>
        `;

        const buses = await solicitarAPI(API_BUSES);

        if (!Array.isArray(buses)) {
            throw new Error("La API de buses no devolvió una lista válida.");
        }

        selectBus.innerHTML = `
            <option value="">Selecciona un bus</option>
        `;

        // Mostrar únicamente buses activos cuando la API
        /*/ incluya el campo estado.
        const busesDisponibles = buses.filter(bus =>
            bus.estado === undefined || Number(bus.estado) === 1
        ); */
        busesDisponibles = buses.filter(bus =>
            bus.estado === undefined || Number(bus.estado) === 1
        );

        busesDisponibles.forEach(bus => {
            const opcion = document.createElement("option");

            opcion.value = bus.id_bus;

            opcion.textContent =
                `${bus.placa} — Capacidad: ${bus.capacidad_maxima}`;

            selectBus.appendChild(opcion);
        });

        if (busesDisponibles.length === 0) {
            selectBus.innerHTML = `
                <option value="">No hay buses disponibles</option>
            `;
        }

    } catch (error) {
        console.error("Error al cargar buses:", error);

        selectBus.innerHTML = `
            <option value="">Error al cargar buses</option>
        `;

        mostrarMensaje(
            "No se pudieron cargar los buses. Verifica la API de buses.",
            "danger"
        );
    }
}

// CARGAR ESTACIONES
/*async function cargarEstaciones() {
    try {
        selectEstacion.innerHTML = `
            <option value="">Cargando estaciones...</option>
        `;

        const estaciones = await solicitarAPI(API_ESTACIONES);

        if (!Array.isArray(estaciones)) {
            throw new Error(
                "La API de estaciones no devolvió una lista válida."
            );
        }

        selectEstacion.innerHTML = `
            <option value="">Selecciona una estación</option>
        `;

        // Mostrar únicamente estaciones activas cuando la API
        // incluya el campo estado.
        const estacionesDisponibles = estaciones.filter(estacion =>
            estacion.estado === undefined ||
            Number(estacion.estado) === 1
        );

        estacionesDisponibles.forEach(estacion => {
            const opcion = document.createElement("option");

            opcion.value = estacion.id_estacion;
            opcion.textContent = estacion.nombre;

            selectEstacion.appendChild(opcion);
        });

        if (estacionesDisponibles.length === 0) {
            selectEstacion.innerHTML = `
                <option value="">No hay estaciones disponibles</option>
            `;
        }

    } catch (error) {
        console.error("Error al cargar estaciones:", error);

        selectEstacion.innerHTML = `
            <option value="">Error al cargar estaciones</option>
        `;

        mostrarMensaje(
            "No se pudieron cargar las estaciones. Verifica la API de estaciones.",
            "danger"
        );
    }
}  */

// CARGAR ESTACIONES

async function cargarEstaciones() {
    try {
        selectEstacion.innerHTML = `
            <option value="">Cargando estaciones...</option>
        `;

        selectEstacion.disabled = true;

        const estaciones = await solicitarAPI(API_ESTACIONES);

        if (!Array.isArray(estaciones)) {
            throw new Error(
                "La API de estaciones no devolvió una lista válida."
            );
        }

        // Guardar únicamente las estaciones activas,
        // cuando la API incluya el campo estado.
        estacionesDisponibles = estaciones.filter(estacion =>
            estacion.estado === undefined ||
            Number(estacion.estado) === 1
        );

        // No mostrar todas las estaciones todavía.
        // Esperar a que el usuario seleccione un bus.
        selectEstacion.innerHTML = `
            <option value="">Primero selecciona un bus</option>
        `;

        selectEstacion.disabled = true;

    } catch (error) {
        console.error("Error al cargar estaciones:", error);

        selectEstacion.innerHTML = `
            <option value="">Error al cargar estaciones</option>
        `;

        selectEstacion.disabled = true;

        mostrarMensaje(
            "No se pudieron cargar las estaciones.",
            "danger"
        );
    }
}

//REGISTRAR UNA VISITA

// Escuchar el envío del formulario
formularioVisita.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const idBus = Number(selectBus.value);
    const idEstacion = Number(selectEstacion.value);
    const pasajeros = Number(
        document.getElementById("pasajeros_esperando").value
    );

    // Validaciones básicas del formulario
    if (!idBus || !idEstacion) {
        mostrarMensaje(
            "Debes seleccionar un bus y una estación.",
            "warning"
        );
        return;
    }

    if (!Number.isInteger(pasajeros) || pasajeros < 0) {
        mostrarMensaje(
            "Ingresa una cantidad válida de pasajeros.",
            "warning"
        );
        return;
    }

    const btnRegistrar = document.getElementById("btnRegistrar");

    try {
        btnRegistrar.disabled = true;
        btnRegistrar.innerHTML = `
            <span class="spinner-border spinner-border-sm"
                  aria-hidden="true"></span>
            Registrando...
        `;

        // Enviar los datos a la API
        const datos = {
            id_bus: idBus,
            id_estacion: idEstacion,
            pasajeros_esperando: pasajeros
        };

        const resultado = await solicitarAPI(
            "visitas_estacion.php",
            "POST",
            datos
        );

        // Mostrar el resultado de las reglas
        mostrarResultadoReglas(resultado);

        mostrarMensaje(
            resultado.mensaje || "Visita registrada correctamente.",
            "success"
        );

        // Limpiar el formulario después del registro exitoso
        formularioVisita.reset();

        // Actualizar la tabla de visitas
        await cargarVisitas();

    } catch (error) {
        console.error("Error al registrar visita:", error);

        mostrarMensaje(
            error.message || "No se pudo registrar la visita.",
            "danger"
        );

    } finally {
        btnRegistrar.disabled = false;
        btnRegistrar.innerHTML = `
            <i class="bi bi-save"></i>
            Registrar visita
        `;
    }
});


/* =========================================
   MOSTRAR RESULTADOS DE RN-14 Y RN-15
   ========================================= */

function mostrarResultadoReglas(resultado) {
    const contenedor = document.getElementById("resultadoReglas");

    contenedor.replaceChildren();

    // Resultado de RN-14: demanda alta
    if (resultado.rn14?.condicion_cumplida) {
        const alertaNueva = resultado.rn14.alerta_generada;

        const tarjeta = document.createElement("div");
        tarjeta.className = alertaNueva
            ? "alert alert-warning"
            : "alert alert-info";

        const titulo = document.createElement("h3");
        titulo.className = "h6";

        titulo.textContent = alertaNueva
            ? "Demanda alta: alerta generada"
            : "Demanda alta: ya existe una alerta pendiente o en proceso";

        const detalle = document.createElement("p");
        detalle.className = "mb-0";
        detalle.textContent = alertaNueva
         //   ? `Se registró la alerta ${resultado.rn14.id_alerta}. Requiere seguimiento.`
            ? `Se registró la alerta. Requiere seguimiento.`
            : `La alerta existente es la número ${resultado.rn14.id_alerta}. No se creó un duplicado.`;

        tarjeta.append(titulo, detalle);
        contenedor.appendChild(tarjeta);
    }

    // Resultado de RN-15: demanda baja
    if (resultado.rn15?.condicion_cumplida) {
        const tarjeta = document.createElement("div");
        tarjeta.className = "alert alert-info";

        const titulo = document.createElement("h3");
        titulo.className = "h6";
        titulo.textContent = "Demanda baja";

        const detalle = document.createElement("p");
        detalle.className = "mb-0";
        detalle.textContent =
            `Se deben añadir ${resultado.rn15.espera_adicional_minutos} minutos de espera.`;

        tarjeta.append(titulo, detalle);
        contenedor.appendChild(tarjeta);
    }

    // Si ninguna regla se cumplió
    if (
        !resultado.rn14?.condicion_cumplida &&
        !resultado.rn15?.condicion_cumplida
    ) {
        const tarjeta = document.createElement("div");
        tarjeta.className = "alert alert-secondary mb-0";
        tarjeta.textContent =
            "La visita se registró correctamente. No se activaron las reglas RN-14 ni RN-15.";

        contenedor.appendChild(tarjeta);
    }
}

// CONSULTAR VISITAS REGISTRADAS

async function cargarVisitas() {
    const tabla = document.getElementById("tablaVisitas");

    try {
        tabla.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    Cargando visitas...
                </td>
            </tr>
        `;

        const resultado = await solicitarAPI("visitas_estacion.php");

        if (!Array.isArray(resultado)) {
            throw new Error(
                "La API de visitas no devolvió una lista válida."
            );
        }

        visitas = resultado;

        // Ordenar de la más reciente a la más antigua
        visitas.sort((a, b) =>
            new Date(b.fecha_hora) - new Date(a.fecha_hora)
        );

        // Aplicar búsqueda y mostrar resultados
        filtrarVisitas();

    } catch (error) {
        console.error("Error al cargar visitas:", error);

        tabla.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    No se pudieron cargar las visitas.
                </td>
            </tr>
        `;

        document.getElementById("infoPaginacion").textContent = "";
        document.getElementById("paginacion").replaceChildren();

        mostrarMensaje(
            "No se pudieron consultar las visitas registradas.",
            "danger"
        );
    }
}


//FILTRAR VISITAS

function filtrarVisitas() {
    const textoBusqueda = document
        .getElementById("buscarVisita")
        .value
        .trim()
        .toLowerCase();

    visitasFiltradas = visitas.filter((visita) => {
        const bus = String(visita.bus ?? "").toLowerCase();
        const estacion = String(visita.estacion ?? "").toLowerCase();
        const fecha = String(visita.fecha_hora ?? "").toLowerCase();
        const pasajeros = String(
            visita.pasajeros_esperando ?? ""
        ).toLowerCase();

        return (
            bus.includes(textoBusqueda) ||
            estacion.includes(textoBusqueda) ||
            fecha.includes(textoBusqueda) ||
            pasajeros.includes(textoBusqueda) ||
            String(visita.id_visita ?? "").includes(textoBusqueda)
        );
    });

    paginaActual = 1;
    mostrarVisitas();
}

// MOSTRAR VISITAS EN LA TABLA
function mostrarVisitas() {
    const tabla = document.getElementById("tablaVisitas");
    const infoPaginacion = document.getElementById("infoPaginacion");
    const paginacion = document.getElementById("paginacion");

    tabla.replaceChildren();
    paginacion.replaceChildren();

    // Si no existen visitas que mostrar
    if (visitasFiltradas.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 5;
        celda.className = "text-center";
        celda.textContent = visitas.length === 0
            ? "Todavía no hay visitas registradas."
            : "No se encontraron visitas con ese criterio.";

        fila.appendChild(celda);
        tabla.appendChild(fila);

        infoPaginacion.textContent = "0 registros";
        return;
    }

    // Calcular los registros que corresponden a la página
    const totalRegistros = visitasFiltradas.length;
    const totalPaginas = Math.ceil(
        totalRegistros / registrosPorPagina
    );

    // Evitar que la página actual quede fuera del rango
    if (paginaActual > totalPaginas) {
        paginaActual = totalPaginas;
    }

    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = Math.min(
        inicio + registrosPorPagina,
        totalRegistros
    );

    const visitasPagina = visitasFiltradas.slice(inicio, fin);

    // Crear las filas de la tabla
    visitasPagina.forEach((visita) => {
        const fila = document.createElement("tr");

        const valores = [
            visita.id_visita,
            visita.bus,
            visita.estacion,
            visita.fecha_hora,
            visita.pasajeros_esperando
        ];

        valores.forEach((valor) => {
            const celda = document.createElement("td");
            celda.textContent = valor ?? "";
            fila.appendChild(celda);
        });

        tabla.appendChild(fila);
    });

    // Mostrar el rango de registros
    infoPaginacion.textContent =
        `Mostrando ${inicio + 1}–${fin} de ${totalRegistros} registros`;

    // Crear los controles de paginación
    crearPaginacion(totalPaginas);
}


/* =========================================
   CREAR PAGINACIÓN
   ========================================= */

function crearPaginacion(totalPaginas) {
    const paginacion = document.getElementById("paginacion");

    paginacion.replaceChildren();

    if (totalPaginas <= 1) {
        return;
    }

    // Botón Anterior
    agregarBotonPagina(
        paginacion,
        "Anterior",
        paginaActual - 1,
        paginaActual === 1
    );

    // Botones numerados
    for (let numero = 1; numero <= totalPaginas; numero++) {
        agregarBotonPagina(
            paginacion,
            numero,
            numero,
            false,
            numero === paginaActual
        );
    }

    // Botón Siguiente
    agregarBotonPagina(
        paginacion,
        "Siguiente",
        paginaActual + 1,
        paginaActual === totalPaginas
    );
}

//CREAR UN BOTÓN DE PÁGINA
 
function agregarBotonPagina(
    contenedor,
    texto,
    destino,
    deshabilitado = false,
    activo = false
) {
    const elemento = document.createElement("li");
    elemento.className = `page-item${activo ? " active" : ""}`;

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "page-link";
    boton.textContent = texto;
    boton.disabled = deshabilitado;

    if (activo) {
        boton.setAttribute("aria-current", "page");
    }

    boton.addEventListener("click", () => {
        paginaActual = destino;
        mostrarVisitas();
    });

    elemento.appendChild(boton);
    contenedor.appendChild(elemento);
}

//CARGAR DETALLE DE RUTAS
async function cargarDetalleRutas() {
    try {
        const resultado = await solicitarAPI(API_DETALLE_RUTAS);

        if (!Array.isArray(resultado)) {
            throw new Error(
                "La API de detalle de rutas no devolvió una lista válida."
            );
        }

        detalleRutas = resultado;

    } catch (error) {
        console.error("Error al cargar el detalle de rutas:", error);

        detalleRutas = [];

        mostrarMensaje(
            "No se pudieron cargar las rutas. No es posible filtrar las estaciones.",
            "danger"
        );
    }
}

//FILTRAR ESTACIONES SEGÚN LA LÍNEA DEL BUS

function filtrarEstacionesPorBus() {
    const idBus = Number(selectBus.value);

    // Reiniciar el selector
    selectEstacion.replaceChildren();

    if (!idBus) {
        selectEstacion.innerHTML = `
            <option value="">Primero selecciona un bus</option>
        `;

        selectEstacion.disabled = true;
        return;
    }

    // Buscar el bus seleccionado
    const busSeleccionado = busesDisponibles.find(
        bus => Number(bus.id_bus) === idBus
    );

    if (!busSeleccionado || !busSeleccionado.id_linea) {
        selectEstacion.innerHTML = `
            <option value="">El bus no tiene una línea asignada</option>
        `;

        selectEstacion.disabled = true;
        return;
    }

    // Identificar las estaciones que pertenecen a su línea
    const estacionesDeLaLinea = detalleRutas.filter(
        ruta =>
            Number(ruta.id_linea) === Number(busSeleccionado.id_linea)
    );

    // Conservar únicamente estaciones activas
    const idsEstaciones = new Set(
        estacionesDeLaLinea.map(ruta => Number(ruta.id_estacion))
    );

    const estacionesFiltradas = estacionesDisponibles.filter(
        estacion => idsEstaciones.has(Number(estacion.id_estacion))
    );

    selectEstacion.innerHTML = `
        <option value="">Selecciona una estación</option>
    `;

    estacionesFiltradas.forEach(estacion => {
        const opcion = document.createElement("option");

        opcion.value = estacion.id_estacion;
        opcion.textContent = estacion.nombre;

        selectEstacion.appendChild(opcion);
    });

    if (estacionesFiltradas.length === 0) {
        selectEstacion.innerHTML = `
            <option value="">Esta línea no tiene estaciones disponibles</option>
        `;

        selectEstacion.disabled = true;
        return;
    }

    selectEstacion.disabled = false;
}



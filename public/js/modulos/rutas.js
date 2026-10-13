
// ============================================
// API
// ============================================

const API_RUTAS = "detalle_ruta.php";
const API_LINEAS_RUTAS = "lineas.php";
const API_ESTACIONES_RUTAS = "estaciones.php";

// ============================================
// ELEMENTOS HTML
// ============================================

const seleccionLinea = document.getElementById("seleccionLinea");
const seleccionEstacion = document.getElementById("seleccionEstacion");

const tablaRuta = document.getElementById("tablaRuta");
const contadorEstaciones = document.getElementById("contadorEstaciones");

const botonAgregarEstacion = document.getElementById("btnAgregarEstacion");
const botonRecargarRuta = document.getElementById("btnRecargarRuta");
const botonConfirmarAgregar = document.getElementById("btnConfirmarAgregar");
const botonGuardarCambios = document.getElementById("btnGuardarCambios");

const panelAgregarEstacion = document.getElementById("panelAgregarEstacion");

const distanciaTotal = document.getElementById("distanciaTotal");
const estadoDistancia = document.getElementById("estadoDistancia");

// ============================================
// ESTADO DEL MÓDULO
// ============================================

let lineasActivas = [];
let estacionesActivas = [];
let rutaActual = [];

// ============================================
// CARGAR LÍNEAS ACTIVAS
// ============================================

async function cargarLineasRuta() {

    seleccionLinea.innerHTML = `
        <option value="">Cargando líneas...</option>
    `;

    try {

        const lineas = await solicitarAPI(API_LINEAS_RUTAS);

        lineasActivas = lineas.filter(
            linea => Number(linea.estado) === 1
        );

        seleccionLinea.innerHTML = `
            <option value="">Selecciona una línea</option>
        `;

        if (lineasActivas.length === 0) {

            seleccionLinea.innerHTML = `
                <option value="">No hay líneas activas</option>
            `;

            return;
        }

        lineasActivas.forEach(linea => {

            const opcion = document.createElement("option");

            opcion.value = linea.id_linea;
            opcion.textContent = linea.nombre;

            seleccionLinea.appendChild(opcion);

        });

    } catch (error) {

        console.error("Error al cargar las líneas:", error);

        seleccionLinea.innerHTML = `
            <option value="">Error al cargar las líneas</option>
        `;

        alert("No se pudieron cargar las líneas de Transmetro.");
    }
}

// ============================================
// INICIAR MÓDULO
// ============================================

cargarLineasRuta();


// ============================================
// CARGAR RECORRIDO DE LA LÍNEA SELECCIONADA
// ============================================

async function cargarRutaActual() {

    const idLinea = seleccionLinea.value;

    rutaActual = [];

    botonAgregarEstacion.disabled = !idLinea;
    botonRecargarRuta.disabled = !idLinea;
    botonGuardarCambios.disabled = true;

    panelAgregarEstacion.hidden = true;

    if (!idLinea) {

        tablaRuta.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    Selecciona una línea para consultar su recorrido.
                </td>
            </tr>
        `;

        contadorEstaciones.textContent = "0 estaciones";

        return;
    }

    tablaRuta.innerHTML = `
        <tr>
            <td colspan="4" class="text-center">
                Cargando recorrido...
            </td>
        </tr>
    `;

    try {

        const detalles = await solicitarAPI(API_RUTAS);

        rutaActual = detalles
            .filter(detalle => Number(detalle.id_linea) === Number(idLinea))
            .sort((a, b) => Number(a.orden) - Number(b.orden));

        mostrarRutaActual();

    } catch (error) {

        console.error("Error al cargar el recorrido:", error);

        tablaRuta.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-danger">
                    No se pudo cargar el recorrido.
                </td>
            </tr>
        `;

        contadorEstaciones.textContent = "Error";
    }
}

// ============================================
// MOSTRAR ESTACIONES DEL RECORRIDO
// ============================================

/*
function mostrarRutaActual() {
    tablaRuta.innerHTML = "";
    contadorEstaciones.textContent = `${rutaActual.length} estaciones`;

    if (rutaActual.length === 0) {
        tablaRuta.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    Esta línea todavía no tiene estaciones asociadas.
                </td>
            </tr>
        `;
        return;
    }

    calcularDistanciaTotal();

    rutaActual.forEach(detalle => {
        const fila = document.createElement("tr");

        // Orden
        const celdaOrden = document.createElement("td");
        celdaOrden.textContent = detalle.orden;

        // Estación
        const celdaEstacion = document.createElement("td");
        celdaEstacion.textContent = detalle.estacion;

        // Distancia a la siguiente estación
        const celdaDistancia = document.createElement("td");

        if (
            detalle.distancia_a_siguiente === null ||
            detalle.distancia_a_siguiente === ""
        ) {
            celdaDistancia.textContent = "No definida";
        } else {
            celdaDistancia.textContent =
                `${detalle.distancia_a_siguiente} km`;
        }

        // Acciones
        const celdaAcciones = document.createElement("td");
        celdaAcciones.className = "text-end";

        const botonEditar = document.createElement("button");
        botonEditar.type = "button";
        botonEditar.className =
            "btn btn-sm btn-outline-primary me-2";
        botonEditar.textContent = "Editar";
        botonEditar.dataset.accion = "editar";
        botonEditar.dataset.idEstacion = detalle.id_estacion;

        const botonQuitar = document.createElement("button");
        botonQuitar.type = "button";
        botonQuitar.className =
            "btn btn-sm btn-outline-danger";
        botonQuitar.textContent = "Quitar";
        botonQuitar.dataset.accion = "quitar";
        botonQuitar.dataset.idEstacion = detalle.id_estacion;

        celdaAcciones.append(botonEditar, botonQuitar);

        fila.append(
            celdaOrden,
            celdaEstacion,
            celdaDistancia,
            celdaAcciones
        );

        tablaRuta.appendChild(fila);
    });
} */

    
function mostrarRutaActual() {
    tablaRuta.innerHTML = "";

    if (rutaActual.length === 0) {
        tablaRuta.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-4">
                    Esta línea todavía no tiene estaciones.
                </td>
            </tr>
        `;

        contadorEstaciones.textContent = "0 estaciones";
        botonGuardarCambios.disabled = true;
        calcularDistanciaTotal();
        return;
    }

    rutaActual.forEach(detalle => {
        const fila = document.createElement("tr");

        const distancia = detalle.distancia_a_siguiente === null ||
                          detalle.distancia_a_siguiente === ""
            ? "No definida"
            : `${Number(detalle.distancia_a_siguiente).toFixed(2)} km`;

        fila.innerHTML = `
            <td>
                <input
                    type="number"
                    class="form-control form-control-sm campo-orden-ruta"
                    min="1"
                    step="1"
                    value="${Number(detalle.orden)}"
                    data-id-estacion="${Number(detalle.id_estacion)}"
                    aria-label="Orden de ${detalle.estacion}"
                >
            </td>

            <td>${detalle.estacion}</td>

            <td>${distancia}</td>

            <td class="text-end">
                <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    data-accion="editar"
                    data-id-estacion="${Number(detalle.id_estacion)}">
                    <i class="bi bi-pencil"></i> Editar distancia
                </button>

                <button
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    data-accion="quitar"
                    data-id-estacion="${Number(detalle.id_estacion)}">
                    <i class="bi bi-trash"></i> Quitar
                </button>
            </td>
        `;

        tablaRuta.appendChild(fila);
    });

    contadorEstaciones.textContent =
        `${rutaActual.length} estación(es)`;

    botonGuardarCambios.disabled = true;

    calcularDistanciaTotal();
}
// ============================================
// EVENTOS
// ============================================

seleccionLinea.addEventListener("change", cargarRutaActual);

botonRecargarRuta.addEventListener("click", cargarRutaActual);


/* =========================================
   CARGAR ESTACIONES DISPONIBLES
========================================= */

async function cargarEstacionesDisponibles() {
    const idLinea = seleccionLinea.value;

    if (!idLinea) {
        return;
    }

    seleccionEstacion.innerHTML =
        `<option value="">Cargando estaciones...</option>`;

    try {
        // Consultar todas las estaciones
        const estaciones = await solicitarAPI(API_ESTACIONES_RUTAS);

        // Conservar solamente las estaciones activas
        estacionesActivas = estaciones.filter(
            estacion => Number(estacion.estado) === 1
        );

        // Obtener los IDs de las estaciones que ya están en esta ruta
        const idsEnRuta = new Set(
            rutaActual.map(detalle => Number(detalle.id_estacion))
        );

        // Excluir las estaciones que ya pertenecen al recorrido
        const disponibles = estacionesActivas.filter(
            estacion => !idsEnRuta.has(Number(estacion.id_estacion))
        );

        // Limpiar las opciones anteriores
        seleccionEstacion.innerHTML =
            `<option value="">Selecciona una estación</option>`;

        if (disponibles.length === 0) {
            seleccionEstacion.innerHTML =
                `<option value="">No hay estaciones disponibles</option>`;
            return;
        }

        // Mostrar las estaciones disponibles
        disponibles.forEach(estacion => {
            const opcion = document.createElement("option");

            opcion.value = estacion.id_estacion;
            opcion.textContent = estacion.nombre;

            seleccionEstacion.appendChild(opcion);
        });

    } catch (error) {
        console.error("Error al cargar estaciones:", error);

        seleccionEstacion.innerHTML =
            `<option value="">Error al cargar estaciones</option>`;

        alert("No se pudieron cargar las estaciones disponibles.");
    }
}


/* =========================================
   MOSTRAR PANEL PARA AGREGAR ESTACIÓN
========================================= */

botonAgregarEstacion.addEventListener("click", async () => {
    panelAgregarEstacion.hidden = false;

    await cargarEstacionesDisponibles();
});


/* =========================================
   AGREGAR ESTACIÓN AL RECORRIDO
========================================= */

botonConfirmarAgregar.addEventListener("click", async () => {
    const idLinea = seleccionLinea.value;
    const idEstacion = seleccionEstacion.value;

    // Validar que exista una línea seleccionada
    if (!idLinea) {
        alert("Primero debes seleccionar una línea.");
        return;
    }

    // Validar que exista una estación seleccionada
    if (!idEstacion) {
        alert("Selecciona una estación para agregar.");
        return;
    }

    // Calcular el siguiente número de orden
    const ordenNuevo = Math.max(
        0,
        ...rutaActual.map(detalle => Number(detalle.orden))
    ) + 1;

    // Preparar los datos que recibirá la API
    const datos = {
        id_linea: Number(idLinea),
        id_estacion: Number(idEstacion),
        orden: ordenNuevo,
        distancia_a_siguiente: null
    };

    botonConfirmarAgregar.disabled = true;

    try {
        // Guardar la relación en la base de datos
        await solicitarAPI(API_RUTAS, "POST", datos);

        alert("La estación se agregó correctamente al recorrido.");

        // Actualizar la ruta y el contador
        await cargarRutaActual();

    } catch (error) {
        console.error("Error al agregar estación:", error);

        alert(
            "No se pudo agregar la estación.\n" +
            error.message
        );

    } finally {
        botonConfirmarAgregar.disabled = false;
    }
});


/* =========================================
   EDITAR ORDEN Y DISTANCIA
========================================= */


tablaRuta.addEventListener("click", (evento) => {
    const boton = evento.target.closest("button[data-accion]");

    if (!boton) return;

    const accion = boton.dataset.accion;

    if (accion !== "editar") return;

    const idEstacion = Number(boton.dataset.idEstacion);

    const detalle = rutaActual.find(
        elemento => Number(elemento.id_estacion) === idEstacion
    );

    if (!detalle) return;

    const fila = boton.closest("tr");
    const campoOrden = fila.querySelector(".campo-orden-ruta");
    const celdaDistancia = fila.cells[2];
    const celdaAcciones = fila.cells[3];

    // Evitar modificar el orden mientras se edita la distancia.
    campoOrden.disabled = true;

    const distanciaActual =
        detalle.distancia_a_siguiente === null ||
        detalle.distancia_a_siguiente === ""
            ? ""
            : Number(detalle.distancia_a_siguiente);

    celdaDistancia.innerHTML = `
        <input
            type="number"
            class="form-control form-control-sm campo-distancia"
            min="0"
            step="0.01"
            value="${distanciaActual}"
            placeholder="Distancia en km"
        >
    `;

    celdaAcciones.innerHTML = `
        <button
            type="button"
            class="btn btn-sm btn-success"
            data-accion="guardar-distancia"
            data-id-estacion="${idEstacion}">
            <i class="bi bi-check-lg"></i> Guardar
        </button>

        <button
            type="button"
            class="btn btn-sm btn-secondary"
            data-accion="cancelar-distancia"
            data-id-estacion="${idEstacion}">
            Cancelar
        </button>
    `;
});


/* =========================================
   GUARDAR O CANCELAR EDICIÓN
========================================= */


tablaRuta.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("button[data-accion]");

    if (!boton) return;

    const accion = boton.dataset.accion;

    if (
        accion !== "guardar-distancia" &&
        accion !== "cancelar-distancia"
    ) {
        return;
    }

    const idEstacion = Number(boton.dataset.idEstacion);

    // Si el usuario cancela, restauramos la fila original.
    if (accion === "cancelar-distancia") {
        mostrarRutaActual();
        return;
    }

    const fila = boton.closest("tr");
    const campoDistancia = fila.querySelector(".campo-distancia");

    const valorDistancia = campoDistancia.value.trim();

    let distancia = null;

    if (valorDistancia !== "") {
        distancia = Number(valorDistancia);

        if (!Number.isFinite(distancia) || distancia < 0) {
            alert("La distancia debe ser un número mayor o igual a cero.");
            return;
        }

        if (Math.round(distancia * 100) !== distancia * 100) {
            alert("La distancia debe tener como máximo dos decimales.");
            return;
        }
    }

    const detalle = rutaActual.find(
        elemento => Number(elemento.id_estacion) === idEstacion
    );

    if (!detalle) {
        alert("No se encontró la estación seleccionada.");
        return;
    }

    const idLinea = Number(seleccionLinea.value);

    try {
        await solicitarAPI(
            `${API_RUTAS}?id_linea=${idLinea}&id_estacion=${idEstacion}`,
            "PUT",
            {
                orden: Number(detalle.orden),
                distancia_a_siguiente: distancia
            }
        );

        alert("Distancia actualizada correctamente.");

        await cargarRutaActual();

    } catch (error) {
        alert(`No se pudo actualizar la distancia: ${error.message}`);
    }
});

// --------------EVENTO Guardar recorrido,

function detectarCambiosOrden() {
    const camposOrden = tablaRuta.querySelectorAll(".campo-orden-ruta");

    const hayCambios = Array.from(camposOrden).some(campo => {
        const idEstacion = Number(campo.dataset.idEstacion);

        const detalleOriginal = rutaActual.find(
            elemento => Number(elemento.id_estacion) === idEstacion
        );

        return detalleOriginal &&
            Number(campo.value) !== Number(detalleOriginal.orden);
    });

    botonGuardarCambios.disabled = !hayCambios;
}

// Habilitar Guardar recorrido cuando se modifica algún orden.
tablaRuta.addEventListener("input", (evento) => {
    if (evento.target.matches(".campo-orden-ruta")) {
        detectarCambiosOrden();
    }
});

// Guardar el orden completo del recorrido.
botonGuardarCambios.addEventListener("click", async () => {
    const idLinea = Number(seleccionLinea.value);

    if (!idLinea || rutaActual.length === 0) {
        alert("Selecciona una línea que tenga estaciones.");
        return;
    }

    const camposOrden = Array.from(
        tablaRuta.querySelectorAll(".campo-orden-ruta")
    );

    const estaciones = camposOrden.map(campo => ({
        id_estacion: Number(campo.dataset.idEstacion),
        orden: Number(campo.value)
    }));

    // Validar que todos los órdenes sean enteros positivos.
    const ordenesValidos = estaciones.every(estacion =>
        Number.isInteger(estacion.orden) && estacion.orden > 0
    );

    if (!ordenesValidos) {
        alert("Todos los órdenes deben ser números enteros positivos.");
        return;
    }

    // Evitar posiciones duplicadas.
    const ordenes = estaciones.map(estacion => estacion.orden);
    const ordenesUnicos = new Set(ordenes);

    if (ordenesUnicos.size !== ordenes.length) {
        alert("No puede haber dos estaciones con el mismo orden.");
        return;
    }

    // Confirmar que realmente cambió el orden.
    const hayCambios = estaciones.some(estacion => {
        const original = rutaActual.find(
            detalle =>
                Number(detalle.id_estacion) === estacion.id_estacion
        );

        return original &&
            Number(original.orden) !== estacion.orden;
    });

    if (!hayCambios) {
        botonGuardarCambios.disabled = true;
        alert("No hay cambios en el orden del recorrido.");
        return;
    }

    const confirmar = confirm(
        "¿Deseas guardar el nuevo orden? Las distancias registradas " +
        "se restablecerán y tendrás que ingresarlas nuevamente."
    );

    if (!confirmar) return;

    botonGuardarCambios.disabled = true;

    try {
        await solicitarAPI(
            `${API_RUTAS}?accion=reordenar`,
            "PUT",
            {
                id_linea: idLinea,
                estaciones: estaciones
            }
        );

        alert("El orden del recorrido se actualizó correctamente.");

        await cargarRutaActual();

    } catch (error) {
        alert(`No se pudo reordenar el recorrido: ${error.message}`);

        detectarCambiosOrden();
    }
});

//------EVENTO para quitar una estación del recorrido

tablaRuta.addEventListener("click", async (evento) => {
    const boton = evento.target.closest('button[data-accion="quitar"]');

    if (!boton) return;

    const idLinea = Number(seleccionLinea.value);
    const idEstacion = Number(boton.dataset.idEstacion);

    if (!idLinea || !idEstacion) {
        alert("No se pudo identificar la línea o la estación.");
        return;
    }

    const detalle = rutaActual.find(
        elemento =>
            Number(elemento.id_estacion) === idEstacion
    );

    if (!detalle) {
        alert("La estación ya no forma parte de este recorrido.");
        return;
    }

    const confirmar = confirm(
        `¿Deseas quitar la estación "${detalle.estacion}" de esta línea?`
    );

    if (!confirmar) return;

    try {
        await solicitarAPI(
            `${API_RUTAS}?id_linea=${idLinea}&id_estacion=${idEstacion}`,
            "DELETE"
        );

        alert("Estación quitada del recorrido correctamente.");

        await cargarRutaActual();

    } catch (error) {
        alert(`No se pudo quitar la estación: ${error.message}`);
    }
});

/* =========================================
   CALCULAR DISTANCIA TOTAL DE LA LÍNEA
========================================= */

function calcularDistanciaTotal() {
    if (!seleccionLinea.value) {
        distanciaTotal.textContent = "-- km";
        estadoDistancia.textContent = "Selecciona una línea";
        estadoDistancia.className = "badge text-bg-secondary";
        return;
    }

    if (rutaActual.length === 0) {
        distanciaTotal.textContent = "-- km";
        estadoDistancia.textContent = "Sin estaciones";
        estadoDistancia.className = "badge text-bg-secondary";
        return;
    }

    // No existe ningún tramo si hay menos de dos estaciones.
    if (rutaActual.length < 2) {
        distanciaTotal.textContent = "0.00 km";
        estadoDistancia.textContent = "Sin tramos por calcular";
        estadoDistancia.className = "badge text-bg-secondary";
        return;
    }

    // Solo contamos las estaciones que tienen una siguiente.
    // La última estación no representa un tramo.
    const tramos = rutaActual.slice(0, -1);

    const distancias = tramos.map(detalle => {
        const valor = detalle.distancia_a_siguiente;

        if (valor === null || valor === "") {
            return null;
        }

        const numero = Number(valor);

        return Number.isFinite(numero) && numero >= 0
            ? numero
            : null;
    });

    const hayDistanciasPendientes = distancias.some(
        distancia => distancia === null
    );

    const total = distancias.reduce(
        (suma, distancia) => suma + (distancia ?? 0),
        0
    );

    distanciaTotal.textContent = `${total.toFixed(2)} km`;

    if (hayDistanciasPendientes) {
        estadoDistancia.textContent =
            "Distancia parcial: hay tramos pendientes";

        estadoDistancia.className = "badge text-bg-warning";
    } else {
        estadoDistancia.textContent = "Distancia completa";
        estadoDistancia.className = "badge text-bg-success";
    }
}




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

tablaRuta.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("button[data-accion]");

    if (!boton) {
        return;
    }

    const accion = boton.dataset.accion;
    const idEstacion = Number(boton.dataset.idEstacion);

    // Buscar la estación seleccionada en la ruta actual
    const detalle = rutaActual.find(
        elemento => Number(elemento.id_estacion) === idEstacion
    );

    if (!detalle) {
        return;
    }

    // Por ahora, programaremos solamente Editar
    if (accion !== "editar") {
        return;
    }

    const fila = boton.closest("tr");

    // Evitar crear el formulario más de una vez
    if (fila.dataset.editando === "true") {
        return;
    }

    fila.dataset.editando = "true";

    // Campo para el orden
    const celdaOrden = fila.cells[0];
    celdaOrden.innerHTML = "";

    const campoOrden = document.createElement("input");
    campoOrden.type = "number";
    campoOrden.min = "1";
    campoOrden.step = "1";
    campoOrden.className = "form-control form-control-sm";
    campoOrden.value = detalle.orden;

    celdaOrden.appendChild(campoOrden);

    // Campo para la distancia
    const celdaDistancia = fila.cells[2];
    celdaDistancia.innerHTML = "";

    const campoDistancia = document.createElement("input");
    campoDistancia.type = "number";
    campoDistancia.min = "0";
    campoDistancia.step = "0.01";
    campoDistancia.className = "form-control form-control-sm";
    campoDistancia.placeholder = "Distancia en km";
    campoDistancia.value =
        detalle.distancia_a_siguiente ?? "";

    celdaDistancia.appendChild(campoDistancia);

    // Reemplazar botones por Guardar y Cancelar
    const celdaAcciones = fila.cells[3];
    celdaAcciones.innerHTML = "";

    const botonGuardar = document.createElement("button");
    botonGuardar.type = "button";
    botonGuardar.className = "btn btn-sm btn-success me-2";
    botonGuardar.textContent = "Guardar";
    botonGuardar.dataset.accion = "guardar";
    botonGuardar.dataset.idEstacion = idEstacion;

    const botonCancelar = document.createElement("button");
    botonCancelar.type = "button";
    botonCancelar.className = "btn btn-sm btn-secondary";
    botonCancelar.textContent = "Cancelar";
    botonCancelar.dataset.accion = "cancelar";
    botonCancelar.dataset.idEstacion = idEstacion;

    celdaAcciones.append(botonGuardar, botonCancelar);
});


/* =========================================
   GUARDAR O CANCELAR EDICIÓN
========================================= */

tablaRuta.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("button[data-accion]");

    if (!boton) {
        return;
    }

    const accion = boton.dataset.accion;

    // Procesar solamente Guardar o Cancelar
    if (accion !== "guardar" && accion !== "cancelar") {
        return;
    }

    const idEstacion = Number(boton.dataset.idEstacion);

    if (accion === "cancelar") {
        mostrarRutaActual();
        return;
    }

    const fila = boton.closest("tr");
    const campoOrden = fila.cells[0].querySelector("input");
    const campoDistancia = fila.cells[2].querySelector("input");

    const orden = Number(campoOrden.value);
    const distanciaTexto = campoDistancia.value.trim();

    // Validar el orden
    if (
        campoOrden.value.trim() === "" ||
        !Number.isInteger(orden) ||
        orden < 1
    ) {
        alert("El orden debe ser un número entero mayor que cero.");
        campoOrden.focus();
        return;
    }

    // Validar la distancia, que puede quedar vacía
    let distancia = null;

    if (distanciaTexto !== "") {
        distancia = Number(distanciaTexto);

        if (!Number.isFinite(distancia) || distancia < 0) {
            alert("La distancia debe ser un número mayor o igual a cero.");
            campoDistancia.focus();
            return;
        }

        // Limitar a dos decimales
        if (Math.round(distancia * 100) !== distancia * 100) {
            alert("La distancia debe tener como máximo dos decimales.");
            campoDistancia.focus();
            return;
        }
    }

    const idLinea = Number(seleccionLinea.value);

    const datos = {
        orden: orden,
        distancia_a_siguiente: distancia
    };

    boton.disabled = true;

    try {
        const url =
            `${API_RUTAS}?id_linea=${idLinea}&id_estacion=${idEstacion}`;

        await solicitarAPI(url, "PUT", datos);

        alert("Los cambios se guardaron correctamente.");

        await cargarRutaActual();

    } catch (error) {
        console.error("Error al guardar los cambios:", error);

        alert(
            "No se pudieron guardar los cambios.\n" +
            error.message
        );

    } finally {
        boton.disabled = false;
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

    const distancias = rutaActual.map(detalle => {
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
        estadoDistancia.textContent = "Distancia parcial: hay tramos pendientes";
        estadoDistancia.className = "badge text-bg-warning";
    } else {
        estadoDistancia.textContent = "Distancia completa";
        estadoDistancia.className = "badge text-bg-success";
    }
}

const API_BUSES = "buses.php";
const API_LINEAS_BUSES = "lineas.php";
const API_PARQUEOS_BUSES = "parqueos.php";
const API_PILOTOS_BUSES = "pilotos.php";

const tablaBuses = document.getElementById("tablaBuses");
const formularioBus = document.getElementById("formularioBus");
const modalBusElemento = document.getElementById("modalBus");

const modalBus = new bootstrap.Modal(modalBusElemento);

const mensajeBuses = document.getElementById("mensajeBuses");
const mensajeFormularioBus = document.getElementById(
    "mensajeFormularioBus"
);

const btnNuevoBus = document.getElementById("btnNuevoBus");
const btnGuardarBus = document.getElementById("btnGuardarBus");

let busesActuales = [];
let lineasActivas = [];
let parqueosActivos = [];
let pilotosActivos = [];

let modoEdicionBus = false;

// --------------------------------------------------
// MENSAJES
// --------------------------------------------------

function mostrarMensaje(elemento, mensaje, tipo = "danger") {
    elemento.textContent = mensaje;
    elemento.className = `alert alert-${tipo}`;
}

function ocultarMensaje(elemento) {
    elemento.textContent = "";
    elemento.className = "alert d-none";
}

// --------------------------------------------------
// SOLICITUDES A LAS API
// --------------------------------------------------

async function solicitarDatos(archivo, metodo = "GET", datos = null) {
    return await solicitarAPI(archivo, metodo, datos);
}

// --------------------------------------------------
// CARGAR LISTAS PARA EL FORMULARIO
// --------------------------------------------------

async function cargarListasBus() {
    const [lineas, parqueos, pilotos] = await Promise.all([
        solicitarAPI(API_LINEAS_BUSES),
        solicitarAPI(API_PARQUEOS_BUSES),
        solicitarAPI(API_PILOTOS_BUSES)
    ]);

    lineasActivas = lineas.filter(
        linea => Number(linea.estado) === 1
    );

    parqueosActivos = parqueos.filter(
        parqueo => Number(parqueo.estado) === 1
    );

    pilotosActivos = pilotos.filter(
        piloto => Number(piloto.estado) === 1
    );

    llenarSelect(
        "id_linea",
        lineasActivas,
        "id_linea",
        linea => `${linea.nombre} (${linea.estado_operativo === "OPERATIVA"
            ? "Operativa"
            : "En preparación"})`,
        "Sin asignar"
    );

    llenarSelect(
        "id_parqueo",
        parqueosActivos,
        "id_parqueo",
        parqueo => `${parqueo.ubicacion} — ${parqueo.estacion}`,
        "Selecciona un parqueo"
    );

    llenarSelect(
        "id_piloto",
        pilotosActivos,
        "id_piloto",
        piloto => piloto.nombre,
        "Sin asignar"
    );
}

function llenarSelect(
    idSelect,
    registros,
    campoId,
    obtenerTexto,
    textoInicial
) {
    const select = document.getElementById(idSelect);

    select.replaceChildren();

    const opcionInicial = document.createElement("option");
    opcionInicial.value = "";
    opcionInicial.textContent = textoInicial;

    select.appendChild(opcionInicial);

    registros.forEach(registro => {
        const opcion = document.createElement("option");

        opcion.value = registro[campoId];
        opcion.textContent = obtenerTexto(registro);

        select.appendChild(opcion);
    });
}

// --------------------------------------------------
// CONSULTAR BUSES
// --------------------------------------------------

async function cargarBuses() {
    tablaBuses.innerHTML = `
        <tr>
            <td colspan="8" class="text-center">
                Cargando buses...
            </td>
        </tr>
    `;

    try {
        const buses = await solicitarAPI(API_BUSES);

        busesActuales = buses;
        mostrarBuses();

        ocultarMensaje(mensajeBuses);

    } catch (error) {
        console.error("Error al cargar buses:", error);

        tablaBuses.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-danger">
                    No se pudieron cargar los buses.
                </td>
            </tr>
        `;

        mostrarMensaje(mensajeBuses, error.message);
    }
}

// --------------------------------------------------
// MOSTRAR TABLA
// --------------------------------------------------

function mostrarBuses() {
    tablaBuses.replaceChildren();

    if (busesActuales.length === 0) {
        tablaBuses.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    No hay buses registrados.
                </td>
            </tr>
        `;
        return;
    }

    busesActuales.forEach(bus => {
        const fila = document.createElement("tr");
        const activo = Number(bus.estado) === 1;

        const celdas = [
            bus.id_bus,
            bus.placa,
            bus.capacidad_maxima,
            bus.linea ?? "Sin asignar",
            bus.parqueo ?? "Sin asignar",
            bus.piloto ?? "Sin asignar"
        ];

        celdas.forEach(valor => {
            const celda = document.createElement("td");
            celda.textContent = valor;
            fila.appendChild(celda);
        });

        const celdaEstado = document.createElement("td");
        const insignia = document.createElement("span");

        insignia.className = `badge ${
            activo ? "text-bg-success" : "text-bg-secondary"
        }`;

        insignia.textContent = activo ? "Activo" : "Desactivado";

        celdaEstado.appendChild(insignia);
        fila.appendChild(celdaEstado);

        const celdaAcciones = document.createElement("td");
        celdaAcciones.className = "text-center";

        const btnEditar = document.createElement("button");
        btnEditar.type = "button";
        btnEditar.className = "btn btn-sm btn-outline-primary me-1";
        btnEditar.textContent = "Editar";
        btnEditar.disabled = !activo;
        btnEditar.addEventListener("click", () => abrirEdicionBus(bus));

        const btnDesactivar = document.createElement("button");
        btnDesactivar.type = "button";
        btnDesactivar.className = "btn btn-sm btn-outline-danger";
        btnDesactivar.textContent = "Eliminar";
        btnDesactivar.disabled = !activo;
        btnDesactivar.addEventListener(
            "click",
            () => desactivarBus(bus)
        );

        celdaAcciones.append(btnEditar, btnDesactivar);
        fila.appendChild(celdaAcciones);

        tablaBuses.appendChild(fila);
    });
}

// --------------------------------------------------
// NUEVO BUS
// --------------------------------------------------

btnNuevoBus.addEventListener("click", async () => {
    formularioBus.reset();
    modoEdicionBus = false;

    document.getElementById("id_bus").value = "";
    document.getElementById("tituloModalBus").textContent = "Nuevo bus";
    btnGuardarBus.textContent = "Guardar bus";

    ocultarMensaje(mensajeFormularioBus);

    try {
        await cargarListasBus();

        if (parqueosActivos.length === 0) {
            mostrarMensaje(
                mensajeFormularioBus,
                "No hay parqueos activos. Debes registrar o activar un parqueo antes de crear un bus.",
                "warning"
            );
        }

        modalBus.show();

    } catch (error) {
        mostrarMensaje(mensajeBuses, error.message);
    }
});

// --------------------------------------------------
// EDITAR BUS
// --------------------------------------------------

async function abrirEdicionBus(bus) {
    formularioBus.reset();
    modoEdicionBus = true;

    ocultarMensaje(mensajeFormularioBus);

    try {
        await cargarListasBus();

        document.getElementById("id_bus").value = bus.id_bus;
        document.getElementById("placa").value = bus.placa;
        document.getElementById("capacidad_maxima").value =
            bus.capacidad_maxima;

        seleccionarValor("id_linea", bus.id_linea);
        seleccionarValor("id_parqueo", bus.id_parqueo);
        seleccionarValor("id_piloto", bus.id_piloto);

        document.getElementById("tituloModalBus").textContent =
            "Editar bus";

        btnGuardarBus.textContent = "Guardar cambios";

        modalBus.show();

    } catch (error) {
        mostrarMensaje(mensajeBuses, error.message);
    }
}

function seleccionarValor(idSelect, valor) {
    const select = document.getElementById(idSelect);
    const valorBuscado = valor == null ? "" : String(valor);

    const existe = Array.from(select.options).some(
        opcion => opcion.value === valorBuscado
    );

    select.value = existe ? valorBuscado : "";
}

// --------------------------------------------------
// GUARDAR BUS: POST O PUT
// --------------------------------------------------

formularioBus.addEventListener("submit", async evento => {
    evento.preventDefault();

    ocultarMensaje(mensajeFormularioBus);

    const capacidadTexto =
        document.getElementById("capacidad_maxima").value.trim();

    const capacidad = Number(capacidadTexto);

    if (
        capacidadTexto === "" ||
        !Number.isInteger(capacidad) ||
        capacidad <= 0
    ) {
        mostrarMensaje(
            mensajeFormularioBus,
            "La capacidad máxima debe ser un número entero mayor que cero."
        );
        return;
    }

    const idBus = document.getElementById("id_bus").value;
    const valLinea = document.getElementById("id_linea").value;
    const valPiloto = document.getElementById("id_piloto").value;

    const datos = {
        placa: document.getElementById("placa").value.trim(),
        capacidad_maxima: capacidad,
        id_linea: valLinea !== "" ? Number(valLinea) : null,
        id_parqueo: Number(document.getElementById("id_parqueo").value),
        id_piloto: valPiloto !== "" ? Number(valPiloto) : null
    };

    // Si estás editando y tu PHP necesita el ID también en el JSON, descomenta la siguiente línea:
    // if (modoEdicionBus) { datos.id_bus = Number(idBus); }

    if (!datos.placa) {
        mostrarMensaje(
            mensajeFormularioBus,
            "La placa del bus es obligatoria."
        );
        return;
    }

    if (!datos.id_parqueo) {
        mostrarMensaje(
            mensajeFormularioBus,
            "Debes seleccionar un parqueo activo."
        );
        return;
    }

    const archivo = modoEdicionBus
        ? `${API_BUSES}?id=${encodeURIComponent(idBus)}`
        : API_BUSES;

    const metodo = modoEdicionBus ? "PUT" : "POST";

    btnGuardarBus.disabled = true;
    btnGuardarBus.textContent = "Guardando...";

    try {
        const resultado = await solicitarDatos(
            archivo,
            metodo,
            datos
        );

        modalBus.hide();

        mostrarMensaje(
            mensajeBuses,
            resultado.mensaje || "Operación realizada correctamente.",
            "success"
        );

        await cargarBuses();

    } catch (error) {
        mostrarMensaje(mensajeFormularioBus, error.message);

    } finally {
        btnGuardarBus.disabled = false;

        btnGuardarBus.textContent = modoEdicionBus
            ? "Guardar cambios"
            : "Guardar bus";
    }
});

// --------------------------------------------------
// DESACTIVAR BUS: DELETE
// --------------------------------------------------

async function desactivarBus(bus) {
    const confirmar = confirm(
        `¿Deseas desactivar el bus con placa ${bus.placa}?`
    );

    if (!confirmar) {
        return;
    }

    try {
        const resultado = await solicitarDatos(
        `${API_BUSES}?id=${encodeURIComponent(bus.id_bus)}`,
        "DELETE"
    );

        mostrarMensaje(
            mensajeBuses,
            resultado.mensaje || "Bus desactivado correctamente.",
            "success"
        );

        await cargarBuses();

    } catch (error) {
        mostrarMensaje(mensajeBuses, error.message);
    }
}

// --------------------------------------------------
// INICIALIZACIÓN
// --------------------------------------------------

cargarBuses();
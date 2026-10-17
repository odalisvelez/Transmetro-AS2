
const API_ALERTAS = "alertas.php";

const ESTADOS_ALERTA = [
    "Pendiente",
    "En proceso",
    "Atendida"
];

let alertas = [];
let alertasFiltradas = [];
let paginaActual = 1;
//const alertasPorPagina = 5;
let alertasPorPagina = 10;

// ==================================================
// INICIALIZAR MÓDULO
// ==================================================

document.addEventListener("DOMContentLoaded", () => {
    document
        .getElementById("btnActualizar")
        .addEventListener("click", cargarAlertas);

    document
        .getElementById("buscarAlerta")
        .addEventListener("input", () => {
            paginaActual = 1;
            filtrarAlertas();
        });

    document
    .getElementById("registrosPorPagina")
    .addEventListener("change", (evento) => {
        alertasPorPagina = Number(evento.target.value);
        paginaActual = 1;
        filtrarAlertas();
    });

    cargarAlertas();
});

// ==================================================
// CARGAR ALERTAS DESDE LA API
// ==================================================

async function cargarAlertas() {
    const tabla = document.getElementById("tablaAlertas");

    tabla.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-4">
                Cargando alertas...
            </td>
        </tr>
    `;

    try {
        alertas = await solicitarAPI(API_ALERTAS);
        paginaActual = 1;
        filtrarAlertas();
        mostrarMensaje("", "");
    } catch (error) {
        tabla.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger py-4">
                    No se pudieron cargar las alertas.
                </td>
            </tr>
        `;

        mostrarMensaje(error.message, "danger");
    }
}

// ==================================================
// BUSCAR Y FILTRAR ALERTAS
// ==================================================

function filtrarAlertas() {
    const busqueda = document
        .getElementById("buscarAlerta")
        .value
        .trim()
        .toLowerCase();

    alertasFiltradas = alertas.filter(alerta => {
        return [
            alerta.id_alerta,
            alerta.estacion,
            alerta.linea,
            alerta.tipo_alerta,
            alerta.fecha_hora,
            alerta.estado
        ].some(valor =>
            String(valor ?? "")
                .toLowerCase()
                .includes(busqueda)
        );
    });

    const totalPaginas = Math.max(
        1,
        Math.ceil(alertasFiltradas.length / alertasPorPagina)
    );

    if (paginaActual > totalPaginas) {
        paginaActual = totalPaginas;
    }

    mostrarAlertas();
    mostrarPaginacion();
}

// ==================================================
// MOSTRAR ALERTAS EN LA TABLA
// ==================================================

function mostrarAlertas() {
    const tabla = document.getElementById("tablaAlertas");

    tabla.replaceChildren();

    const inicio = (paginaActual - 1) * alertasPorPagina;

    const alertasPagina = alertasFiltradas.slice(
        inicio,
        inicio + alertasPorPagina
    );

    if (alertasPagina.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 7;
        celda.className = "text-center py-4";
        celda.textContent = "No se encontraron alertas.";

        fila.appendChild(celda);
        tabla.appendChild(fila);

        return;
    }

    alertasPagina.forEach(alerta => {
        const fila = document.createElement("tr");

        agregarCelda(fila, alerta.id_alerta);
        agregarCelda(fila, alerta.estacion);
        agregarCelda(fila, alerta.linea);
        agregarCelda(fila, alerta.tipo_alerta);
        agregarCelda(fila, alerta.fecha_hora);

        // Columna del estado
        const celdaEstado = document.createElement("td");
        const selector = document.createElement("select");

        selector.className = "form-select form-select-sm";
        selector.setAttribute(
            "aria-label",
            `Estado de la alerta ${alerta.id_alerta}`
        );

        ESTADOS_ALERTA.forEach(estado => {
            const opcion = document.createElement("option");

            opcion.value = estado;
            opcion.textContent = estado;
            selector.appendChild(opcion);
        });

        selector.value = alerta.estado;

        // Las alertas atendidas ya no se pueden modificar
        selector.disabled = alerta.estado === "Atendida";

        selector.addEventListener("change", () => {
            actualizarEstadoAlerta(
                alerta.id_alerta,
                selector.value,
                selector
            );
        });

        celdaEstado.appendChild(selector);
        fila.appendChild(celdaEstado);

        // Columna de acción
        const celdaAccion = document.createElement("td");
        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = "btn btn-outline-primary btn-sm";
        boton.textContent = "Guardar";
        boton.disabled = alerta.estado === "Atendida";

        boton.addEventListener("click", () => {
            actualizarEstadoAlerta(
                alerta.id_alerta,
                selector.value,
                selector,
                boton
            );
        });

        celdaAccion.appendChild(boton);
        fila.appendChild(celdaAccion);

        tabla.appendChild(fila);
    });
}

// ==================================================
// AGREGAR CELDA DE TEXTO
// ==================================================

function agregarCelda(fila, valor) {
    const celda = document.createElement("td");
    celda.textContent = valor ?? "";
    fila.appendChild(celda);
}

// ==================================================
// ACTUALIZAR ESTADO DE ALERTA
// ==================================================

async function actualizarEstadoAlerta(
    idAlerta,
    nuevoEstado,
    selector,
    boton = null
) {
    const alerta = alertas.find(
        elemento => String(elemento.id_alerta) === String(idAlerta)
    );

    if (!alerta) {
        mostrarMensaje("No se encontró la alerta seleccionada.", "danger");
        return;
    }

    const estadoAnterior = alerta.estado;

    if (nuevoEstado === estadoAnterior) {
        mostrarMensaje("La alerta conserva el mismo estado.", "info");
        return;
    }

    if (estadoAnterior === "Atendida") {
        mostrarMensaje(
            "Una alerta atendida no puede modificarse.",
            "warning"
        );
        return;
    }

    if (!ESTADOS_ALERTA.includes(nuevoEstado)) {
        mostrarMensaje("El estado seleccionado no es válido.", "danger");
        return;
    }

    selector.disabled = true;

    if (boton) {
        boton.disabled = true;
    }

    try {
        await solicitarAPI(API_ALERTAS, "PUT", {
            id_alerta: Number(idAlerta),
            estado: nuevoEstado
        });

        alerta.estado = nuevoEstado;

        mostrarMensaje(
            `La alerta ${idAlerta} se actualizó a "${nuevoEstado}".`,
            "success"
        );

        mostrarAlertas();
    } catch (error) {
        selector.value = estadoAnterior;

        mostrarMensaje(error.message, "danger");

        selector.disabled = estadoAnterior === "Atendida";

        if (boton) {
            boton.disabled = estadoAnterior === "Atendida";
        }
    }
}

// ==================================================
// MOSTRAR PAGINACIÓN
// ==================================================

function mostrarPaginacion() {
    const contenedor = document.getElementById("paginacion");
    const informacion = document.getElementById("infoPaginacion");

    contenedor.replaceChildren();

    const total = alertasFiltradas.length;
    const totalPaginas = Math.ceil(total / alertasPorPagina);

    informacion.textContent = total === 0
        ? "Sin alertas"
        : `Mostrando ${
            (paginaActual - 1) * alertasPorPagina + 1
        }–${Math.min(
            paginaActual * alertasPorPagina,
            total
        )} de ${total} alertas`;

    if (totalPaginas <= 1) {
        return;
    }

    agregarBotonPagina(
        contenedor,
        "Anterior",
        paginaActual - 1,
        paginaActual === 1
    );

    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
        agregarBotonPagina(
            contenedor,
            String(pagina),
            pagina,
            false,
            pagina === paginaActual
        );
    }

    agregarBotonPagina(
        contenedor,
        "Siguiente",
        paginaActual + 1,
        paginaActual === totalPaginas
    );
}

function agregarBotonPagina(
    contenedor,
    texto,
    pagina,
    deshabilitado,
    activo = false
) {
    const elemento = document.createElement("li");
    elemento.className = `page-item${activo ? " active" : ""}`;

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "page-link";
    boton.textContent = texto;
    boton.disabled = deshabilitado;

    boton.addEventListener("click", () => {
        paginaActual = pagina;
        mostrarAlertas();
        mostrarPaginacion();
    });

    elemento.appendChild(boton);
    contenedor.appendChild(elemento);
}

// ==================================================
// MOSTRAR MENSAJES
// ==================================================

function mostrarMensaje(texto, tipo) {
    const mensaje = document.getElementById("mensaje");

    mensaje.textContent = texto;
    mensaje.className = "alert";

    if (!texto) {
        mensaje.classList.add("d-none");
        return;
    }

    mensaje.classList.add(`alert-${tipo}`);
}

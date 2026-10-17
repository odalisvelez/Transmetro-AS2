
const API_HISTORIALES = "historial_educativo.php";
const API_PILOTOS = "pilotos.php";

// REFERENCIAS HTML
const tablaHistoriales = document.getElementById("tablaHistoriales");
const btnNuevoHistorial = document.getElementById("btnNuevoHistorial");
// REFERENCIAS DEL FORMULARIO
const modalHistorialElemento = document.getElementById("modalHistorial");
const formHistorial = document.getElementById("formHistorial");
const tituloModalHistorial = document.getElementById("tituloModalHistorial");

const institucionHistorial = document.getElementById("institucionHistorial");
const tituloHistorial = document.getElementById("tituloHistorial");
const fechaInicioHistorial = document.getElementById("fechaInicioHistorial");
const fechaFinHistorial = document.getElementById("fechaFinHistorial");
const pilotoHistorial = document.getElementById("pilotoHistorial");

const modalHistorial = bootstrap.Modal.getOrCreateInstance(modalHistorialElemento);

const btnGuardarHistorial = document.getElementById("btnGuardarHistorial");

const buscarHistoriales = document.getElementById("buscarHistoriales");
const registrosPorPaginaHistoriales = document.getElementById("registrosPorPaginaHistoriales");

const infoPaginacionHistoriales = document.getElementById("infoPaginacionHistoriales");
const paginacionHistoriales = document.getElementById("paginacionHistoriales");

// VARIABLES
let listaHistoriales = [];
let paginaActualHistoriales = 1;
let textoBusquedaHistoriales = "";
let limiteHistoriales = 10;

// Piloto seleccionado desde el modilo pilotos
const parametrosURL = new URLSearchParams(window.location.search);
const idPilotoSeleccionado = parametrosURL.get("id_piloto");

let listaPilotosHistorial = [];
let idHistorialEdicion = null;

// CONSULTAR HISTORIAL
async function cargarHistoriales() {
    tablaHistoriales.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                Cargando historiales educativos...
            </td>
        </tr>
    `;

    try {
        const historiales = await solicitarAPI(API_HISTORIALES);

        if (!Array.isArray(historiales)) {
            throw new Error(
                "La API no devolvió una lista de historiales válida."
            );
        }

        listaHistoriales = historiales;
        paginaActualHistoriales = 1;

        mostrarHistoriales();

    } catch (error) {
        console.error(
            "Error al cargar historiales educativos:",
            error
        );

        tablaHistoriales.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    No se pudieron cargar los historiales educativos.
                </td>
            </tr>
        `;

        infoPaginacionHistoriales.textContent =
            "No se pudieron cargar los registros.";

        paginacionHistoriales.replaceChildren();

        alert(
            "Error al consultar los historiales educativos: " +
            error.message
        );
    }
}
// CONSULTAR PILOTOS PARA EL SELECTOR
async function cargarPilotosHistorial() {
    const pilotos = await solicitarAPI(API_PILOTOS);

    if (!Array.isArray(pilotos)) {
        throw new Error("La API no devolvió una lista válida de pilotos.");
    }

    // Mostrar solamente pilotos activos
    listaPilotosHistorial = pilotos.filter(
        piloto => Number(piloto.estado) === 1
    );

    pilotoHistorial.replaceChildren();

    const opcionInicial = document.createElement("option");
    opcionInicial.value = "";
    opcionInicial.textContent = "Selecciona un piloto...";
    pilotoHistorial.appendChild(opcionInicial);

    listaPilotosHistorial.forEach(piloto => {
        const opcion = document.createElement("option");
        opcion.value = piloto.id_piloto;
        opcion.textContent = piloto.nombre;

        pilotoHistorial.appendChild(opcion);
    });
}
// MOSTRAR HISTORIALES CON BÚSQUEDA Y PAGINACIÓN
    function mostrarHistoriales() {tablaHistoriales.replaceChildren();

        const texto = textoBusquedaHistoriales.trim().toLowerCase();

        const historialesFiltrados = listaHistoriales.filter(historial => {
        // Si venimos desde Pilotos, filtrar por el ID seleccionado.
            const coincidePiloto =
                !idPilotoSeleccionado ||
                String(historial.id_piloto) === String(idPilotoSeleccionado);

            if (!coincidePiloto) {
                return false;
            }

            const valores = [
                historial.id_historial,
                historial.institucion,
                historial.titulo,
                historial.fecha_inicio,
                historial.fecha_fin,
                historial.piloto
            ];

            return valores.some(valor =>
                String(valor ?? "").toLowerCase().includes(texto)
            );
        });

        const totalRegistros = historialesFiltrados.length;

        const totalPaginas = Math.ceil(
            totalRegistros / limiteHistoriales
        );

        if (totalRegistros === 0) {
            tablaHistoriales.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        ${
                            texto
                                ? "No se encontraron historiales con esa búsqueda."
                                : "No hay historiales educativos registrados."
                        }
                    </td>
                </tr>
            `;

            infoPaginacionHistoriales.textContent =
                "Mostrando 0 registros.";

            renderizarPaginacionHistoriales(0);
            return;
        }

        if (paginaActualHistoriales > totalPaginas) {
            paginaActualHistoriales = totalPaginas;
        }

        const inicio =
            (paginaActualHistoriales - 1) * limiteHistoriales;

        const fin = Math.min(
            inicio + limiteHistoriales,
            totalRegistros
        );

        const historialesPagina = historialesFiltrados.slice(
            inicio,
            fin
        );

        historialesPagina.forEach(historial => {
            const fila = document.createElement("tr");

            // ID
            const celdaId = document.createElement("td");
            celdaId.textContent = historial.id_historial;

            // Institución
            const celdaInstitucion = document.createElement("td");
            celdaInstitucion.textContent = historial.institucion;

            // Título
            const celdaTitulo = document.createElement("td");
            celdaTitulo.textContent = historial.titulo;

            // Fecha de inicio
            const celdaFechaInicio = document.createElement("td");
            celdaFechaInicio.textContent =
                historial.fecha_inicio || "—";

            // Fecha de finalización
            const celdaFechaFin = document.createElement("td");
            celdaFechaFin.textContent =
                historial.fecha_fin || "—";

            // Piloto
            const celdaPiloto = document.createElement("td");
            celdaPiloto.textContent = historial.piloto || "—";

            // Acciones
                const celdaAcciones = document.createElement("td");
                celdaAcciones.className = "text-center";

                const btnEditar = document.createElement("button");
                btnEditar.type = "button";
                btnEditar.className = "btn btn-sm btn-outline-primary me-1";
                btnEditar.innerHTML = 'Editar';

                btnEditar.addEventListener("click", () => {
                    abrirModalEditarHistorial(historial);
                });

                const btnEliminar = document.createElement("button");
                btnEliminar.type = "button";
                btnEliminar.className = "btn btn-sm btn-outline-danger";
                btnEliminar.innerHTML = 'Eliminar';

                btnEliminar.addEventListener("click", () => {
                    eliminarHistorial(historial);
                });

            celdaAcciones.append(btnEditar, btnEliminar);

                fila.append(
                    celdaId,
                    celdaInstitucion,
                    celdaTitulo,
                    celdaFechaInicio,
                    celdaFechaFin,
                    celdaPiloto,
                    celdaAcciones
                );

                tablaHistoriales.appendChild(fila);
            });

        infoPaginacionHistoriales.textContent =
            `Mostrando ${inicio + 1} a ${fin} de ${totalRegistros} registros.`;

        renderizarPaginacionHistoriales(totalPaginas);
    }

// PAGINACIÓN
function renderizarPaginacionHistoriales(totalPaginas) {
    paginacionHistoriales.replaceChildren();

    function agregarBoton(
        texto,
        pagina,
        deshabilitado = false,
        activo = false
    ) {
        const elemento = document.createElement("li");

        elemento.className =
            `page-item${deshabilitado ? " disabled" : ""}` +
            `${activo ? " active" : ""}`;

        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = "page-link";
        boton.textContent = texto;
        boton.disabled = deshabilitado;

        boton.addEventListener("click", () => {
            paginaActualHistoriales = pagina;
            mostrarHistoriales();
        });

        elemento.appendChild(boton);
        paginacionHistoriales.appendChild(elemento);
    }

    agregarBoton(
        "Anterior",
        paginaActualHistoriales - 1,
        paginaActualHistoriales === 1
    );

    const inicioPaginas = Math.max(
        1,
        paginaActualHistoriales - 2
    );

    const finPaginas = Math.min(
        totalPaginas,
        inicioPaginas + 4
    );

    const inicioAjustado = Math.max(
        1,
        finPaginas - 4
    );

    for (
        let pagina = inicioAjustado;
        pagina <= finPaginas;
        pagina++
    ) {
        agregarBoton(
            String(pagina),
            pagina,
            false,
            pagina === paginaActualHistoriales
        );
    }

    agregarBoton(
        "Siguiente",
        paginaActualHistoriales + 1,
        paginaActualHistoriales === totalPaginas
    );
}

// EVENTOS DE BÚSQUEDA Y PAGINACIÓN
buscarHistoriales.addEventListener("input", () => {
    textoBusquedaHistoriales = buscarHistoriales.value;
    paginaActualHistoriales = 1;

    mostrarHistoriales();
});

registrosPorPaginaHistoriales.addEventListener("change", () => {
    limiteHistoriales = Number(
        registrosPorPaginaHistoriales.value
    );

    paginaActualHistoriales = 1;

    mostrarHistoriales();
});
// PREPARAR MODAL PARA REGISTRAR
/*async function abrirModalNuevoHistorial() {
    idHistorialEdicion = null;

    formHistorial.reset();
    tituloModalHistorial.textContent = "Nuevo historial educativo";
    btnGuardarHistorial.textContent = "Guardar historial";

    try {
        await cargarPilotosHistorial();

        modalHistorial.show();

    } catch (error) {
        console.error("Error al cargar pilotos:", error);

        alert(
            "No se pudo cargar la lista de pilotos: " + error.message
        );
    }
}*/

async function abrirModalNuevoHistorial() {
    idHistorialEdicion = null;

    formHistorial.reset();

    tituloModalHistorial.textContent = "Nuevo historial educativo";

    try {
        await cargarPilotosHistorial();

        // Seleccionar automáticamente al piloto desde el que
        // se abrió el módulo, si continúa activo.
        if (
            idPilotoSeleccionado &&
            [...pilotoHistorial.options].some(
                opcion => opcion.value === idPilotoSeleccionado
            )
        ) {
            pilotoHistorial.value = idPilotoSeleccionado;
        }

        modalHistorial.show();

    } catch (error) {
        console.error("Error al cargar pilotos:", error);

        alert(
            "No se pudo cargar la lista de pilotos: " +
            error.message
        );
    }
}


// PREPARAR MODAL PARA EDITAR
async function abrirModalEditarHistorial(historial) {
    idHistorialEdicion = Number(historial.id_historial);

    formHistorial.reset();

    try {
        await cargarPilotosHistorial();

        institucionHistorial.value = historial.institucion ?? "";
        tituloHistorial.value = historial.titulo ?? "";
        fechaInicioHistorial.value = historial.fecha_inicio ?? "";
        fechaFinHistorial.value = historial.fecha_fin ?? "";

        pilotoHistorial.value = String(historial.id_piloto);

        tituloModalHistorial.textContent = "Editar historial educativo";
        btnGuardarHistorial.textContent = "Guardar cambios";

        modalHistorial.show();

    } catch (error) {
        console.error("Error al preparar la edición:", error);

        alert(
            "No se pudo preparar el formulario: " + error.message
        );
    }
}
// REGISTRAR O ACTUALIZAR HISTORIAL
formHistorial.addEventListener("submit", async evento => {
    evento.preventDefault();

    const institucion = institucionHistorial.value.trim();
    const titulo = tituloHistorial.value.trim();
    const fecha_inicio = fechaInicioHistorial.value;
    const fecha_fin = fechaFinHistorial.value;
    const id_piloto = Number(pilotoHistorial.value);

    // Validar campos obligatorios
    if (
        !institucion ||
        !titulo ||
        !fecha_inicio ||
        !fecha_fin ||
        !id_piloto
    ) {
        alert("Todos los campos son obligatorios.");
        return;
    }

    // Validar coherencia de las fechas
    if (fecha_fin < fecha_inicio) {
        alert(
            "La fecha de finalización no puede ser anterior a la fecha de inicio."
        );
        return;
    }

    const datos = {
        institucion,
        titulo,
        fecha_inicio,
        fecha_fin,
        id_piloto
    };

    const editando = idHistorialEdicion !== null;

    if (editando) {
        datos.id_historial = idHistorialEdicion;
    }

    const metodo = editando ? "PUT" : "POST";

    btnGuardarHistorial.disabled = true;

    try {
        const resultado = await solicitarAPI(
            API_HISTORIALES,
            metodo,
            datos
        );

        alert(
            resultado.mensaje ||
            (
                editando
                    ? "Historial educativo actualizado correctamente."
                    : "Historial educativo registrado correctamente."
            )
        );

        modalHistorial.hide();
        formHistorial.reset();

        idHistorialEdicion = null;

        await cargarHistoriales();

    } catch (error) {
        console.error("Error al guardar historial:", error);

        alert(
            "No se pudo guardar el historial educativo: " + error.message
        );

    } finally {
        btnGuardarHistorial.disabled = false;
    }
});

// EVENTO DEL BOTÓN NUEVO
btnNuevoHistorial.addEventListener(
    "click",
    abrirModalNuevoHistorial
);

async function eliminarHistorial(historial) {
    const confirmar = confirm(
        `¿Estás seguro de que deseas eliminar el historial educativo de "${historial.piloto}"?\n\n` +
        "Esta acción eliminará permanentemente el registro y no se puede deshacer."
    );

    if (!confirmar) {
        return;
    }

    try {
        const datos = {
            id_historial: historial.id_historial
        };

        const respuesta = await solicitarAPI(
            API_HISTORIALES,
            "DELETE",
            datos
        );

        alert(
            respuesta.mensaje ||
            "El historial educativo se eliminó correctamente."
        );

        await cargarHistoriales();

    } catch (error) {
        console.error("Error al eliminar el historial educativo:", error);

        alert(
            "No se pudo eliminar el historial educativo: " +
            error.message
        );
    }
}

// obtener nombre del piloto y actualizar el título de la página.
async function configurarVistaPiloto() {
    if (!idPilotoSeleccionado) {
        return;
    }

    try {
        const pilotos = await solicitarAPI(API_PILOTOS);

        const piloto = pilotos.find(
            p => String(p.id_piloto) === String(idPilotoSeleccionado)
        );

        if (!piloto) {
            return;
        }

        const titulo = document.querySelector(
            ".section-header h1, .section-header h2"
        );

        if (titulo) {
            titulo.textContent =
                `Historial educativo: ${piloto.nombre}`;
        }

    } catch (error) {
        console.error(
            "No se pudo obtener el nombre del piloto:",
            error
        );
    }
    const btnVolverPilotos = document.getElementById(
    "btnVolverPilotos" );

    if (btnVolverPilotos) {
        btnVolverPilotos.hidden = false;
    }
}

// CARGA INICIAL
cargarHistoriales();
configurarVistaPiloto();
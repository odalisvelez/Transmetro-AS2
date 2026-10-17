const API_LINEAS = "lineas.php";
const API_MUNICIPALIDADES_LINEAS = "municipalidades.php";

const tablaLineas = document.getElementById("tablaLineas");
const botonNuevaLinea = document.getElementById("btnNuevaLinea");
const elementoModalLinea = document.getElementById("modalLinea");
const formularioLinea = document.getElementById("formLinea");
const campoNombreLinea = document.getElementById("nombreLinea");
const campoMunicipalidadLinea = document.getElementById("municipalidadLinea");
const tituloModalLinea = document.getElementById("tituloModalLinea");

const modalLinea = new bootstrap.Modal(elementoModalLinea);

// para tabla dinamica
const buscarLineas = document.getElementById("buscarLineas");
const registrosPorPaginaLineas = document.getElementById("registrosPorPaginaLineas");
const infoPaginacionLineas = document.getElementById("infoPaginacionLineas");
const paginacionLineas = document.getElementById("paginacionLineas");

// Datos y estado de la tabla
let listaLineas = [];
let paginaActualLineas = 1;
let textoBusquedaLineas = "";
let limiteLineas = 10;


let idLineaEditando = null;


// =====================================
// 1. CONSULTAR Y MOSTRAR LAS LÍNEAS
// =====================================

async function cargarLineas() {
    tablaLineas.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                Cargando líneas...
            </td>
        </tr>
    `;

    try {
        const lineas = await solicitarAPI(API_LINEAS);

        // Conservar únicamente las líneas administrativamente activas.
        listaLineas = Array.isArray(lineas)
            ? lineas.filter(linea => Number(linea.estado) === 1)
            : [];

        paginaActualLineas = 1;

        renderizarLineas();

    } catch (error) {
        console.error("Error al cargar líneas:", error);

        tablaLineas.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    No se pudieron cargar las líneas.
                </td>
            </tr>
        `;

        infoPaginacionLineas.textContent =
            "No se pudieron cargar los registros.";

        paginacionLineas.innerHTML = "";
    }
}
// rend

function renderizarLineas() {
    const texto = textoBusquedaLineas.toLocaleLowerCase();

    const lineasFiltradas = listaLineas.filter(linea => {
        const estadoOperativo =
            linea.estado_operativo === "OPERATIVA"
                ? "operativa"
                : "en preparación preparacion";

        return (
            String(linea.id_linea ?? "")
                .toLocaleLowerCase().includes(texto) ||
            String(linea.nombre ?? "")
                .toLocaleLowerCase().includes(texto) ||
            String(linea.municipalidad ?? "")
                .toLocaleLowerCase().includes(texto) ||
            String(linea.total_estaciones ?? 0).includes(texto) ||
            String(linea.total_buses ?? 0).includes(texto) ||
            estadoOperativo.includes(texto)
        );
    });

    const totalRegistros = lineasFiltradas.length;

    const totalPaginas = Math.max(
        1,
        Math.ceil(totalRegistros / limiteLineas)
    );

    if (paginaActualLineas > totalPaginas) {
        paginaActualLineas = totalPaginas;
    }

    tablaLineas.innerHTML = "";

    if (totalRegistros === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 7;
        celda.className = "text-center";

        celda.textContent = listaLineas.length === 0
            ? "No hay líneas activas."
            : "No se encontraron líneas con esa búsqueda.";

        fila.appendChild(celda);
        tablaLineas.appendChild(fila);

        infoPaginacionLineas.textContent =
            "Mostrando 0 de 0 registros";

        paginacionLineas.innerHTML = "";
        return;
    }

    const inicio = (paginaActualLineas - 1) * limiteLineas;
    const fin = Math.min(inicio + limiteLineas, totalRegistros);

    const lineasPagina = lineasFiltradas.slice(inicio, fin);

    lineasPagina.forEach(linea => {
        const fila = document.createElement("tr");

        // ID
        const celdaId = document.createElement("td");
        celdaId.textContent = linea.id_linea;

        // Nombre
        const celdaNombre = document.createElement("td");
        celdaNombre.textContent = linea.nombre;

        // Municipalidad
        const celdaMunicipalidad = document.createElement("td");
        celdaMunicipalidad.textContent = linea.municipalidad;

        // Estaciones activas
        const celdaEstaciones = document.createElement("td");
        celdaEstaciones.textContent = Number(linea.total_estaciones);

        // Buses activos asignados
        const celdaBuses = document.createElement("td");
        celdaBuses.textContent = Number(linea.total_buses);

        // Estado operativo
        const celdaEstado = document.createElement("td");
        const etiquetaEstado = document.createElement("span");

        if (linea.estado_operativo === "OPERATIVA") {
            etiquetaEstado.className = "badge text-bg-success";
            etiquetaEstado.textContent = "Operativa";
        } else {
            etiquetaEstado.className = "badge text-bg-warning";
            etiquetaEstado.textContent = "En preparación";
        }

        celdaEstado.appendChild(etiquetaEstado);

        // Acciones
        const celdaAcciones = document.createElement("td");
        celdaAcciones.className = "text-end";

        // Editar
        const botonEditar = document.createElement("button");
        botonEditar.type = "button";
        botonEditar.className =
            "btn btn-sm btn-outline-primary me-2";
        botonEditar.textContent = "Editar";
        botonEditar.dataset.accion = "editar";
        botonEditar.dataset.id = linea.id_linea;

        // Habilitar operación
        if (linea.estado_operativo === "PREPARACION") {
            const botonHabilitar = document.createElement("button");

            botonHabilitar.type = "button";
            botonHabilitar.className =
                "btn btn-sm btn-success me-2";
            botonHabilitar.textContent = "Habilitar operación";
            botonHabilitar.dataset.accion = "habilitar";
            botonHabilitar.dataset.id = linea.id_linea;
            botonHabilitar.dataset.nombre = linea.nombre;

            celdaAcciones.appendChild(botonHabilitar);
        }

        // Desactivar
        const botonDesactivar = document.createElement("button");
        botonDesactivar.type = "button";
        botonDesactivar.className =
            "btn btn-sm btn-outline-danger";
        botonDesactivar.textContent = "Eliminar";
        botonDesactivar.dataset.accion = "desactivar";
        botonDesactivar.dataset.id = linea.id_linea;
        botonDesactivar.dataset.nombre = linea.nombre;

        celdaAcciones.append(botonEditar, botonDesactivar);

        fila.append(
            celdaId,
            celdaNombre,
            celdaMunicipalidad,
            celdaEstaciones,
            celdaBuses,
            celdaEstado,
            celdaAcciones
        );

        tablaLineas.appendChild(fila);
    });

    infoPaginacionLineas.textContent =
        `Mostrando ${inicio + 1}–${fin} de ${totalRegistros} registros`;

    renderizarPaginacionLineas(totalPaginas);
}
// paginacion

function renderizarPaginacionLineas(totalPaginas) {
    paginacionLineas.innerHTML = "";

    function crearBoton(
        texto,
        pagina,
        deshabilitado = false,
        activo = false
    ) {
        const elemento = document.createElement("li");
        elemento.className = "page-item";

        if (deshabilitado) elemento.classList.add("disabled");
        if (activo) elemento.classList.add("active");

        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "page-link";
        boton.textContent = texto;
        boton.disabled = deshabilitado;

        if (activo) {
            boton.setAttribute("aria-current", "page");
        }

        boton.addEventListener("click", () => {
            paginaActualLineas = pagina;
            renderizarLineas();
        });

        elemento.appendChild(boton);
        paginacionLineas.appendChild(elemento);
    }

    crearBoton(
        "Anterior",
        paginaActualLineas - 1,
        paginaActualLineas === 1
    );

    let inicio = Math.max(1, paginaActualLineas - 2);
    let fin = Math.min(totalPaginas, inicio + 4);

    inicio = Math.max(1, fin - 4);

    for (let pagina = inicio; pagina <= fin; pagina++) {
        crearBoton(
            String(pagina),
            pagina,
            false,
            pagina === paginaActualLineas
        );
    }

    crearBoton(
        "Siguiente",
        paginaActualLineas + 1,
        paginaActualLineas === totalPaginas
    );
}
// botones
buscarLineas.addEventListener("input", () => {
    textoBusquedaLineas = buscarLineas.value.trim();
    paginaActualLineas = 1;

    renderizarLineas();
});

registrosPorPaginaLineas.addEventListener("change", () => {
    limiteLineas = Number(registrosPorPaginaLineas.value);
    paginaActualLineas = 1;

    renderizarLineas();
});

// =====================================
// 2. CARGAR LAS MUNICIPALIDADES
// =====================================

async function cargarMunicipalidadesEnLista() {
    try {
        const municipalidades = await solicitarAPI(
            API_MUNICIPALIDADES_LINEAS
        );

        campoMunicipalidadLinea.innerHTML =
            '<option value="">Selecciona una municipalidad</option>';

        municipalidades.forEach(municipalidad => {
            const opcion = document.createElement("option");

            opcion.value = municipalidad.id_municipalidad;
            opcion.textContent = municipalidad.nombre;

            campoMunicipalidadLinea.appendChild(opcion);
        });

    } catch (error) {
        console.error("Error al cargar municipalidades:", error);
        throw error;
    }
}


// =====================================
// 3. ABRIR FORMULARIO PARA NUEVA LÍNEA
// =====================================

botonNuevaLinea.addEventListener("click", async function () {
    idLineaEditando = null;
    formularioLinea.reset();

    tituloModalLinea.textContent = "Nueva línea";

    try {
        await cargarMunicipalidadesEnLista();
        modalLinea.show();
    } catch (error) {
        alert("No se pudieron cargar las municipalidades.");
    }
});


// =====================================
// 4. REGISTRAR Y EDITAR LÍNEAS
// =====================================

formularioLinea.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const nombre = campoNombreLinea.value.trim();
    const idMunicipalidad = campoMunicipalidadLinea.value;

    if (nombre === "") {
        alert("Debes ingresar el nombre de la línea.");
        campoNombreLinea.focus();
        return;
    }

    if (idMunicipalidad === "") {
        alert("Debes seleccionar una municipalidad.");
        campoMunicipalidadLinea.focus();
        return;
    }

    const datos = {
        nombre: nombre,
        id_municipalidad: Number(idMunicipalidad)
    };

    const estaEditando = idLineaEditando !== null;

    if (estaEditando) {
        const confirmar = confirm(
            "¿Deseas guardar los cambios de esta línea?"
        );

        if (!confirmar) {
            return;
        }
    }

    try {
        let resultado;

        if (estaEditando) {
            resultado = await solicitarAPI(
                `${API_LINEAS}?id=${idLineaEditando}`,
                "PUT",
                datos
            );
        } else {
            resultado = await solicitarAPI(
                API_LINEAS,
                "POST",
                datos
            );
        }

        alert(
            resultado.mensaje ||
            (estaEditando
                ? "Línea actualizada correctamente."
                : "Línea registrada correctamente.")
        );

        modalLinea.hide();
        formularioLinea.reset();
        idLineaEditando = null;

        await cargarLineas();

    } catch (error) {
        console.error("Error al guardar la línea:", error);
        alert(error.message || "No se pudo guardar la línea.");
    }
});


// =====================================
// 5. ACCIONES DE LA TABLA
// =====================================

tablaLineas.addEventListener("click", async function (evento) {
    const boton = evento.target.closest("button[data-accion]");

    if (!boton) {
        return;
    }

    const accion = boton.dataset.accion;
    const id = boton.dataset.id;

    // ---------------------------------
    // EDITAR LÍNEA
    // ---------------------------------

    if (accion === "editar") {
        const fila = boton.closest("tr");
        const celdas = fila.querySelectorAll("td");

        idLineaEditando = Number(id);

        campoNombreLinea.value = celdas[1].textContent.trim();

        try {
            await cargarMunicipalidadesEnLista();

            const lineas = await solicitarAPI(API_LINEAS);

            const lineaSeleccionada = lineas.find(
                linea => Number(linea.id_linea) === Number(id)
            );

            if (!lineaSeleccionada) {
                alert("No se encontró la línea seleccionada.");
                idLineaEditando = null;
                return;
            }

            campoMunicipalidadLinea.value =
                String(lineaSeleccionada.id_municipalidad);

            tituloModalLinea.textContent = "Editar línea";
            modalLinea.show();

        } catch (error) {
            console.error("Error al preparar la edición:", error);
            alert("No se pudo cargar la información para editar.");
            idLineaEditando = null;
        }

        return;
    }

    // ---------------------------------
    // HABILITAR OPERACIÓN
    // ---------------------------------

    if (accion === "habilitar") {
        const nombre = boton.dataset.nombre;

        const confirmar = confirm(
            `¿Deseas habilitar la operación de la línea "${nombre}"?\n\n` +
            "El sistema verificará que tenga las estaciones y los buses necesarios."
        );

        if (!confirmar) {
            return;
        }

        boton.disabled = true;
        boton.textContent = "Validando...";

        try {
            const resultado = await solicitarAPI(
                `${API_LINEAS}?accion=habilitar&id=${id}`,
                "PUT"
            );

            alert(
                resultado.mensaje ||
                "La línea ahora está habilitada para operar."
            );

            await cargarLineas();

        } catch (error) {
            console.error("Error al habilitar la línea:", error);

            alert(
                error.message ||
                "No se pudo habilitar la operación de la línea."
            );

            // Si la operación falla, recuperar el botón y permitir reintentar.
            boton.disabled = false;
            boton.textContent = "Habilitar operación";
        }

        return;
    }

    // ---------------------------------
    // DESACTIVAR LÍNEA
    // ---------------------------------

    if (accion === "desactivar") {
        const nombre = boton.dataset.nombre;

        const confirmar = confirm(
            `¿Estás seguro de desactivar la línea "${nombre}"?`
        );

        if (!confirmar) {
            return;
        }

        try {
            const resultado = await solicitarAPI(
                `${API_LINEAS}?id=${id}`,
                "DELETE"
            );

            alert(
                resultado.mensaje ||
                "Línea desactivada correctamente."
            );

            await cargarLineas();

        } catch (error) {
            console.error("Error al desactivar la línea:", error);

            alert(
                error.message ||
                "No se pudo desactivar la línea."
            );
        }
    }
});


// =====================================
// 6. LIMPIAR EL ESTADO AL CERRAR MODAL
// =====================================

elementoModalLinea.addEventListener("hidden.bs.modal", function () {
    formularioLinea.reset();
    idLineaEditando = null;
});


// =====================================
// 7. CARGA INICIAL
// =====================================

cargarLineas();
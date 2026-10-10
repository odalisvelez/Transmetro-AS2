
const API_LINEAS = "lineas.php";
const API_MUNICIPALIDADES_LINEAS = "municipalidades.php";

const tablaLineas = document.getElementById("tablaLineas");
const botonNuevaLinea = document.getElementById("btnNuevaLinea");
const elementoModalLinea = document.getElementById("modalLinea");
const formularioLinea = document.getElementById("formLinea");
const campoNombreLinea = document.getElementById("nombreLinea");
const campoMunicipalidadLinea = document.getElementById(
    "municipalidadLinea"
);
const tituloModalLinea = document.getElementById("tituloModalLinea");

const modalLinea = new bootstrap.Modal(elementoModalLinea);

// Guardará el ID de la línea que estamos editando.
// Si vale null, estamos registrando una nueva línea.
let idLineaEditando = null;


// =====================================
// 1. CONSULTAR Y MOSTRAR LAS LÍNEAS
// =====================================

async function cargarLineas() {
    tablaLineas.innerHTML = `
        <tr>
            <td colspan="5" class="text-center">
                Cargando líneas...
            </td>
        </tr>
    `;

    try {
        const lineas = await solicitarAPI(API_LINEAS);

        tablaLineas.innerHTML = "";

        const lineasActivas = lineas.filter(
            linea => Number(linea.estado) === 1
        );

        if (lineasActivas.length === 0) {
            tablaLineas.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        No hay líneas activas.
                    </td>
                </tr>
            `;
            return;
        }

        lineasActivas.forEach(linea => {
            const fila = document.createElement("tr");

            const celdaId = document.createElement("td");
            celdaId.textContent = linea.id_linea;

            const celdaNombre = document.createElement("td");
            celdaNombre.textContent = linea.nombre;

            const celdaMunicipalidad = document.createElement("td");
            celdaMunicipalidad.textContent = linea.municipalidad;

            const celdaEstado = document.createElement("td");
            const etiquetaEstado = document.createElement("span");

            etiquetaEstado.className = "badge text-bg-success";
            etiquetaEstado.textContent = "Activa";
            celdaEstado.appendChild(etiquetaEstado);

            const celdaAcciones = document.createElement("td");
            celdaAcciones.className = "text-end";

            const botonEditar = document.createElement("button");
            botonEditar.type = "button";
            botonEditar.className =
                "btn btn-sm btn-outline-primary me-2";
            botonEditar.textContent = "Editar";
            botonEditar.dataset.accion = "editar";
            botonEditar.dataset.id = linea.id_linea;

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
                celdaEstado,
                celdaAcciones
            );

            tablaLineas.appendChild(fila);
        });

    } catch (error) {
        console.error("Error al cargar líneas:", error);

        tablaLineas.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    No se pudieron cargar las líneas.
                </td>
            </tr>
        `;
    }
}


// =====================================
// 2. CARGAR LAS MUNICIPALIDADES
// =====================================

async function cargarMunicipalidadesEnLista() {
    try {
        const municipalidades = await solicitarAPI(
            API_MUNICIPALIDADES_LINEAS
        );

        campoMunicipalidadLinea.innerHTML = '<option value="">Selecciona una municipalidad</option>';

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
            // EDITAR: método PUT
            resultado = await solicitarAPI(
                `${API_LINEAS}?id=${idLineaEditando}`,
                "PUT",
                datos
            );
        } else {
            // REGISTRAR: método POST
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
// 5. EDITAR O DESACTIVAR UNA LÍNEA
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

            // Seleccionar la municipalidad actual
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
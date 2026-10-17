
const API_ESTACIONES = "estaciones.php";
const API_MUNICIPALIDADES_ESTACIONES = "municipalidades.php";

const tablaEstaciones = document.getElementById("tablaEstaciones");
const botonNuevaEstacion = document.getElementById("btnNuevaEstacion");
const elementoModalEstacion = document.getElementById("modalEstacion");
const formularioEstacion = document.getElementById("formEstacion");
const campoNombreEstacion = document.getElementById("nombreEstacion");
const campoMunicipalidadEstacion = document.getElementById("municipalidadEstacion");
const tituloModalEstacion = document.getElementById("tituloModalEstacion");

const modalEstacion = new bootstrap.Modal(elementoModalEstacion);

// para tabal dinam
const buscarEstaciones = document.getElementById("buscarEstaciones");
const registrosPorPaginaEstaciones = document.getElementById("registrosPorPaginaEstaciones");
const infoPaginacionEstaciones = document.getElementById("infoPaginacionEstaciones");
const paginacionEstaciones = document.getElementById("paginacionEstaciones");

// Datos y estado de la tabla
let listaEstaciones = [];
let paginaActualEstaciones = 1;
let textoBusquedaEstaciones = "";
let limiteEstaciones = 10;


let idEstacionEditando = null;


// =====================================
// 1. CONSULTAR Y MOSTRAR LAS ESTACIONES
// =====================================

async function cargarEstaciones() {
    tablaEstaciones.innerHTML = `
        <tr>
            <td colspan="5" class="text-center">
                Cargando estaciones...
            </td>
        </tr>
    `;

    try {
        const estaciones = await solicitarAPI(API_ESTACIONES);

        // Conservar únicamente las estaciones activas.
        listaEstaciones = Array.isArray(estaciones)
            ? estaciones.filter(
                estacion => Number(estacion.estado) === 1
            )
            : [];

        paginaActualEstaciones = 1;

        renderizarEstaciones();

    } catch (error) {
        console.error("Error al cargar estaciones:", error);

        tablaEstaciones.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    No se pudieron cargar las estaciones.
                </td>
            </tr>
        `;

        infoPaginacionEstaciones.textContent =
            "No se pudieron cargar los registros.";

        paginacionEstaciones.innerHTML = "";
    }
}
 // renderizar
 
function renderizarEstaciones() {
    const texto = textoBusquedaEstaciones.toLocaleLowerCase();

    const estacionesFiltradas = listaEstaciones.filter(estacion => {
        return (
            String(estacion.id_estacion ?? "")
                .toLocaleLowerCase().includes(texto) ||
            String(estacion.nombre ?? "")
                .toLocaleLowerCase().includes(texto) ||
            String(estacion.municipalidad ?? "")
                .toLocaleLowerCase().includes(texto)
        );
    });

    const totalRegistros = estacionesFiltradas.length;

    const totalPaginas = Math.max(
        1,
        Math.ceil(totalRegistros / limiteEstaciones)
    );

    if (paginaActualEstaciones > totalPaginas) {
        paginaActualEstaciones = totalPaginas;
    }

    tablaEstaciones.innerHTML = "";

    if (totalRegistros === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 5;
        celda.className = "text-center";

        celda.textContent = listaEstaciones.length === 0
            ? "No hay estaciones activas."
            : "No se encontraron estaciones con esa búsqueda.";

        fila.appendChild(celda);
        tablaEstaciones.appendChild(fila);

        infoPaginacionEstaciones.textContent =
            "Mostrando 0 de 0 registros";

        paginacionEstaciones.innerHTML = "";
        return;
    }

    const inicio = (paginaActualEstaciones - 1) * limiteEstaciones;
    const fin = Math.min(inicio + limiteEstaciones, totalRegistros);

    const estacionesPagina = estacionesFiltradas.slice(inicio, fin);

    estacionesPagina.forEach(estacion => {
        const fila = document.createElement("tr");

        // ID
        const celdaId = document.createElement("td");
        celdaId.textContent = estacion.id_estacion;

        // Nombre
        const celdaNombre = document.createElement("td");
        celdaNombre.textContent = estacion.nombre;

        // Municipalidad
        const celdaMunicipalidad = document.createElement("td");
        celdaMunicipalidad.textContent = estacion.municipalidad;

        // Estado
        const celdaEstado = document.createElement("td");
        const etiquetaEstado = document.createElement("span");

        etiquetaEstado.className = "badge text-bg-success";
        etiquetaEstado.textContent = "Activa";

        celdaEstado.appendChild(etiquetaEstado);

        // Acciones
        const celdaAcciones = document.createElement("td");
        celdaAcciones.className = "text-end";

        const botonEditar = document.createElement("button");
        botonEditar.type = "button";
        botonEditar.className =
            "btn btn-sm btn-outline-primary me-2";
        botonEditar.textContent = "Editar";
        botonEditar.dataset.accion = "editar";
        botonEditar.dataset.id = estacion.id_estacion;

        const botonDesactivar = document.createElement("button");
        botonDesactivar.type = "button";
        botonDesactivar.className =
            "btn btn-sm btn-outline-danger";
        botonDesactivar.textContent = "Eliminar";
        botonDesactivar.dataset.accion = "desactivar";
        botonDesactivar.dataset.id = estacion.id_estacion;
        botonDesactivar.dataset.nombre = estacion.nombre;

        celdaAcciones.append(botonEditar, botonDesactivar);

        fila.append(
            celdaId,
            celdaNombre,
            celdaMunicipalidad,
            celdaEstado,
            celdaAcciones
        );

        tablaEstaciones.appendChild(fila);
    });

    infoPaginacionEstaciones.textContent =
        `Mostrando ${inicio + 1}–${fin} de ${totalRegistros} registros`;

    renderizarPaginacionEstaciones(totalPaginas);
}
// paginacion

function renderizarPaginacionEstaciones(totalPaginas) {
    paginacionEstaciones.innerHTML = "";

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
            paginaActualEstaciones = pagina;
            renderizarEstaciones();
        });

        elemento.appendChild(boton);
        paginacionEstaciones.appendChild(elemento);
    }

    crearBoton(
        "Anterior",
        paginaActualEstaciones - 1,
        paginaActualEstaciones === 1
    );

    let inicio = Math.max(1, paginaActualEstaciones - 2);
    let fin = Math.min(totalPaginas, inicio + 4);

    inicio = Math.max(1, fin - 4);

    for (let pagina = inicio; pagina <= fin; pagina++) {
        crearBoton(
            String(pagina),
            pagina,
            false,
            pagina === paginaActualEstaciones
        );
    }

    crearBoton(
        "Siguiente",
        paginaActualEstaciones + 1,
        paginaActualEstaciones === totalPaginas
    );
}
// controles

buscarEstaciones.addEventListener("input", () => {
    textoBusquedaEstaciones = buscarEstaciones.value.trim();
    paginaActualEstaciones = 1;

    renderizarEstaciones();
});

registrosPorPaginaEstaciones.addEventListener("change", () => {
    limiteEstaciones = Number(registrosPorPaginaEstaciones.value);
    paginaActualEstaciones = 1;

    renderizarEstaciones();
});

// =====================================
// 2. CARGAR MUNICIPALIDADES
// =====================================

async function cargarMunicipalidadesEnLista() {
    const municipalidades = await solicitarAPI(
        API_MUNICIPALIDADES_ESTACIONES
    );

    campoMunicipalidadEstacion.innerHTML = `
        <option value="">
            Selecciona una municipalidad
        </option>
    `;

    municipalidades.forEach(municipalidad => {
        const opcion = document.createElement("option");

        opcion.value = municipalidad.id_municipalidad;
        opcion.textContent = municipalidad.nombre;

        campoMunicipalidadEstacion.appendChild(opcion);
    });
}


// =====================================
// 3. ABRIR FORMULARIO NUEVO
// =====================================

botonNuevaEstacion.addEventListener("click", async function () {
    idEstacionEditando = null;
    formularioEstacion.reset();

    tituloModalEstacion.textContent = "Nueva estación";

    try {
        await cargarMunicipalidadesEnLista();
        modalEstacion.show();
    } catch (error) {
        console.error(error);
        alert("No se pudieron cargar las municipalidades.");
    }
});


// =====================================
// 4. REGISTRAR O EDITAR
// =====================================

formularioEstacion.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const nombre = campoNombreEstacion.value.trim();
    const idMunicipalidad = campoMunicipalidadEstacion.value;

    if (nombre === "") {
        alert("Debes ingresar el nombre de la estación.");
        campoNombreEstacion.focus();
        return;
    }

    if (idMunicipalidad === "") {
        alert("Debes seleccionar una municipalidad.");
        campoMunicipalidadEstacion.focus();
        return;
    }

    const estaEditando = idEstacionEditando !== null;

    if (estaEditando) {
        const confirmar = confirm(
            `¿Deseas guardar los cambios de la estación "${nombre}"?`
        );

        if (!confirmar) {
            return;
        }
    }

    const datos = {
        nombre: nombre,
        id_municipalidad: Number(idMunicipalidad)
    };

    try {
        let resultado;

        if (estaEditando) {
            resultado = await solicitarAPI(
                `${API_ESTACIONES}?id=${idEstacionEditando}`,
                "PUT",
                datos
            );
        } else {
            resultado = await solicitarAPI(
                API_ESTACIONES,
                "POST",
                datos
            );
        }

        alert(
            resultado.mensaje ||
            (estaEditando
                ? "Estación actualizada correctamente."
                : "Estación registrada correctamente.")
        );

        modalEstacion.hide();
        formularioEstacion.reset();
        idEstacionEditando = null;

        await cargarEstaciones();

    } catch (error) {
        console.error("Error al guardar estación:", error);
        alert(error.message || "No se pudo guardar la estación.");
    }
});


// =====================================
// 5. EDITAR O DESACTIVAR
// =====================================

tablaEstaciones.addEventListener("click", async function (evento) {
    const boton = evento.target.closest("button[data-accion]");

    if (!boton) {
        return;
    }

    const accion = boton.dataset.accion;
    const id = boton.dataset.id;

    // EDITAR
    if (accion === "editar") {
        try {
            const estaciones = await solicitarAPI(API_ESTACIONES);

            const estacion = estaciones.find(
                item => Number(item.id_estacion) === Number(id)
            );

            if (!estacion || Number(estacion.estado) !== 1) {
                alert("La estación no existe o está inactiva.");
                await cargarEstaciones();
                return;
            }

            await cargarMunicipalidadesEnLista();

            idEstacionEditando = Number(id);
            campoNombreEstacion.value = estacion.nombre;
            campoMunicipalidadEstacion.value =
                String(estacion.id_municipalidad);

            tituloModalEstacion.textContent = "Editar estación";

            modalEstacion.show();

        } catch (error) {
            console.error("Error al preparar la edición:", error);
            alert("No se pudo cargar la información de la estación.");
        }

        return;
    }

    // DESACTIVAR
    if (accion === "desactivar") {
        const nombre = boton.dataset.nombre;

        const confirmar = confirm(
            `¿Estás seguro de desactivar la estación "${nombre}"?`
        );

        if (!confirmar) {
            return;
        }

        try {
            const resultado = await solicitarAPI(
                `${API_ESTACIONES}?id=${id}`,
                "DELETE"
            );

            alert(
                resultado.mensaje ||
                "Estación desactivada correctamente."
            );

            await cargarEstaciones();

        } catch (error) {
            console.error("Error al desactivar estación:", error);
            alert(error.message || "No se pudo desactivar la estación.");
        }
    }
});


// =====================================
// 6. LIMPIAR EL FORMULARIO AL CERRAR
// =====================================

elementoModalEstacion.addEventListener(
    "hidden.bs.modal",
    function () {
        formularioEstacion.reset();
        idEstacionEditando = null;
    }
);


// =====================================
// 7. CARGA INICIAL
// =====================================

cargarEstaciones();
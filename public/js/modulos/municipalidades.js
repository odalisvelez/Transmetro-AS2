

const API_MUNICIPALIDADES = "municipalidades.php";

// Referencias a los elementos HTML
const tablaMunicipalidades = document.getElementById("tablaMunicipalidades");
const botonNuevaMunicipalidad = document.getElementById("btnNuevaMunicipalidad");
const elementoModalMunicipalidad = document.getElementById("modalMunicipalidad");
const formularioMunicipalidad = document.getElementById("formMunicipalidad");
const campoNombreMunicipalidad = document.getElementById("nombreMunicipalidad");
const tituloModalMunicipalidad = document.getElementById("tituloModalMunicipalidad");
const modalMunicipalidad = new bootstrap.Modal(elementoModalMunicipalidad);


const buscarMunicipalidades =document.getElementById("buscarMunicipalidades");
const registrosPorPaginaMunicipalidades =document.getElementById("registrosPorPaginaMunicipalidades");
const infoPaginacionMunicipalidades =document.getElementById("infoPaginacionMunicipalidades");
const paginacionMunicipalidades =document.getElementById("paginacionMunicipalidades");

// Datos y estado de la tabla
let listaMunicipalidades = [];
let paginaActualMunicipalidades = 1;
let textoBusquedaMunicipalidades = "";
let limiteMunicipalidades = 10;


// Guarda el ID cuando estamos editando.
// Si es null, estamos registrando una municipalidad.
let idMunicipalidadEditar = null;


// =====================================
// 1. CONSULTAR Y MOSTRAR MUNICIPALIDADES
// =====================================


async function cargarMunicipalidades() {
    tablaMunicipalidades.innerHTML = `
        <tr>
            <td colspan="3" class="text-center">
                Cargando municipalidades...
            </td>
        </tr>
    `;

    try {
        const municipalidades = await solicitarAPI(
            API_MUNICIPALIDADES
        );

        listaMunicipalidades = Array.isArray(municipalidades)
            ? municipalidades
            : [];

        paginaActualMunicipalidades = 1;

        renderizarMunicipalidades();

    } catch (error) {
        console.error("Error al cargar municipalidades:", error);

        tablaMunicipalidades.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-danger">
                    No se pudieron cargar las municipalidades.
                </td>
            </tr>
        `;

        infoPaginacionMunicipalidades.textContent =
            "No se pudieron cargar los registros.";

        paginacionMunicipalidades.innerHTML = "";
    }
}

// renderizara
function renderizarMunicipalidades() {
    const texto = textoBusquedaMunicipalidades.toLocaleLowerCase();

    const municipalidadesFiltradas = listaMunicipalidades.filter(
        municipalidad => {
            return (
                String(municipalidad.id_municipalidad)
                    .toLocaleLowerCase()
                    .includes(texto) ||
                String(municipalidad.nombre ?? "")
                    .toLocaleLowerCase()
                    .includes(texto)
            );
        }
    );

    const totalRegistros = municipalidadesFiltradas.length;

    const totalPaginas = Math.max(
        1,
        Math.ceil(totalRegistros / limiteMunicipalidades)
    );

    if (paginaActualMunicipalidades > totalPaginas) {
        paginaActualMunicipalidades = totalPaginas;
    }

    tablaMunicipalidades.innerHTML = "";

    if (totalRegistros === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 3;
        celda.className = "text-center";

        celda.textContent = listaMunicipalidades.length === 0
            ? "No hay municipalidades registradas."
            : "No se encontraron municipalidades con esa búsqueda.";

        fila.appendChild(celda);
        tablaMunicipalidades.appendChild(fila);

        infoPaginacionMunicipalidades.textContent =
            "Mostrando 0 de 0 registros";

        paginacionMunicipalidades.innerHTML = "";
        return;
    }

    const inicio =
        (paginaActualMunicipalidades - 1) * limiteMunicipalidades;

    const fin = Math.min(
        inicio + limiteMunicipalidades,
        totalRegistros
    );

    const municipalidadesPagina = municipalidadesFiltradas.slice(
        inicio,
        fin
    );

    municipalidadesPagina.forEach(municipalidad => {
        const fila = document.createElement("tr");

        const celdaId = document.createElement("td");
        celdaId.textContent = municipalidad.id_municipalidad;

        const celdaNombre = document.createElement("td");
        celdaNombre.textContent = municipalidad.nombre;

        const celdaAcciones = document.createElement("td");
        celdaAcciones.className = "text-center";

        const botonEditar = document.createElement("button");
        botonEditar.type = "button";
        botonEditar.className =
            "btn btn-sm btn-outline-primary me-2";
        botonEditar.textContent = "Editar";
        botonEditar.dataset.accion = "editar";
        botonEditar.dataset.id = municipalidad.id_municipalidad;
        botonEditar.dataset.nombre = municipalidad.nombre;

        const botonEliminar = document.createElement("button");
        botonEliminar.type = "button";
        botonEliminar.className =
            "btn btn-sm btn-outline-danger";
        botonEliminar.textContent = "Eliminar";
        botonEliminar.dataset.accion = "eliminar";
        botonEliminar.dataset.id = municipalidad.id_municipalidad;
        botonEliminar.dataset.nombre = municipalidad.nombre;

        celdaAcciones.append(botonEditar, botonEliminar);

        fila.append(celdaId, celdaNombre, celdaAcciones);

        tablaMunicipalidades.appendChild(fila);
    });

    infoPaginacionMunicipalidades.textContent =
        `Mostrando ${inicio + 1}–${fin} de ${totalRegistros} registros`;

    renderizarPaginacionMunicipalidades(totalPaginas);
}
// paginacion
function renderizarPaginacionMunicipalidades(totalPaginas) {
    paginacionMunicipalidades.innerHTML = "";

    function crearBoton(
        texto,
        pagina,
        deshabilitado = false,
        activo = false
    ) {
        const elemento = document.createElement("li");
        elemento.className = "page-item";

        if (deshabilitado) {
            elemento.classList.add("disabled");
        }

        if (activo) {
            elemento.classList.add("active");
        }

        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "page-link";
        boton.textContent = texto;
        boton.disabled = deshabilitado;

        if (activo) {
            boton.setAttribute("aria-current", "page");
        }

        boton.addEventListener("click", () => {
            paginaActualMunicipalidades = pagina;
            renderizarMunicipalidades();
        });

        elemento.appendChild(boton);
        paginacionMunicipalidades.appendChild(elemento);
    }

    crearBoton(
        "Anterior",
        paginaActualMunicipalidades - 1,
        paginaActualMunicipalidades === 1
    );

    let inicio = Math.max(1, paginaActualMunicipalidades - 2);
    let fin = Math.min(totalPaginas, inicio + 4);

    inicio = Math.max(1, fin - 4);

    for (let pagina = inicio; pagina <= fin; pagina++) {
        crearBoton(
            String(pagina),
            pagina,
            false,
            pagina === paginaActualMunicipalidades
        );
    }

    crearBoton(
        "Siguiente",
        paginaActualMunicipalidades + 1,
        paginaActualMunicipalidades === totalPaginas
    );
}
// controloes

buscarMunicipalidades.addEventListener("input", () => {
    textoBusquedaMunicipalidades = buscarMunicipalidades.value.trim();
    paginaActualMunicipalidades = 1;

    renderizarMunicipalidades();
});

registrosPorPaginaMunicipalidades.addEventListener("change", () => {
    limiteMunicipalidades = Number(
        registrosPorPaginaMunicipalidades.value
    );

    paginaActualMunicipalidades = 1;

    renderizarMunicipalidades();
});


// =====================================
// 2. PREPARAR EL MODAL PARA REGISTRAR
// =====================================

botonNuevaMunicipalidad.addEventListener("click", function () {
    idMunicipalidadEditar = null;

    formularioMunicipalidad.reset();

    tituloModalMunicipalidad.textContent =
        "Nueva municipalidad";

    modalMunicipalidad.show();
});


// =====================================
// 3. REGISTRAR O EDITAR CON POST / PUT
// =====================================

formularioMunicipalidad.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const nombre = campoNombreMunicipalidad.value.trim();

    if (nombre === "") {
        alert("Debes ingresar el nombre de la municipalidad.");
        campoNombreMunicipalidad.focus();
        return;
    }

    let metodo = "POST";
    let archivo = API_MUNICIPALIDADES;

    if (idMunicipalidadEditar !== null) {
        const confirmar = confirm(
            `¿Deseas guardar los cambios de la municipalidad "${nombre}"?`
        );

        if (!confirmar) {
            return;
        }

        metodo = "PUT";
        archivo = `${API_MUNICIPALIDADES}?id=${idMunicipalidadEditar}`;
    }

    try {
        const resultado = await solicitarAPI(
            archivo,
            metodo,
            { nombre: nombre }
        );

        alert(
            resultado.mensaje ||
            (metodo === "POST"
                ? "Municipalidad registrada correctamente."
                : "Municipalidad actualizada correctamente.")
        );

        modalMunicipalidad.hide();
        formularioMunicipalidad.reset();
        idMunicipalidadEditar = null;

        await cargarMunicipalidades();

    } catch (error) {
        console.error("Error al guardar municipalidad:", error);
        alert(error.message);
    }
});


// =====================================
// 4. EDITAR O ELIMINAR UNA MUNICIPALIDAD
// =====================================

tablaMunicipalidades.addEventListener("click", async function (evento) {
    const boton = evento.target.closest("button[data-accion]");

    if (!boton) {
        return;
    }

    const id = boton.dataset.id;
    const nombre = boton.dataset.nombre;
    const accion = boton.dataset.accion;

    // EDITAR
    if (accion === "editar") {
        idMunicipalidadEditar = id;

        campoNombreMunicipalidad.value = nombre;

        tituloModalMunicipalidad.textContent =
            "Editar municipalidad";

        modalMunicipalidad.show();
        return;
    }

    // ELIMINAR
    if (accion === "eliminar") {
        const confirmar = confirm(
            `¿Estás seguro de eliminar la municipalidad "${nombre}"?\n\n` +
            "Esta acción no se puede deshacer."
        );

        if (!confirmar) {
            return;
        }

        try {
            const resultado = await solicitarAPI(
                `${API_MUNICIPALIDADES}?id=${id}`,
                "DELETE"
            );

            alert(
                resultado.mensaje ||
                "Municipalidad eliminada correctamente."
            );

            await cargarMunicipalidades();

        } catch (error) {
            console.error("Error al eliminar municipalidad:", error);
            alert(error.message);
        }
    }
});


// =====================================
// 5. CARGA INICIAL
// =====================================

cargarMunicipalidades();
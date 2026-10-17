
const API_PARQUEOS = "parqueos.php";
const API_ESTACIONES = "estaciones.php";

// Referencias al HTML
const tablaParqueos = document.getElementById("tablaParqueos");
const btnNuevoParqueo = document.getElementById("btnNuevoParqueo");
const modalParqueoElemento = document.getElementById("modalParqueo");
const formParqueo = document.getElementById("formParqueo");

const tituloModalParqueo = document.getElementById("tituloModalParqueo");
const ubicacionParqueo = document.getElementById("ubicacionParqueo");
const capacidadParqueo = document.getElementById("capacidadParqueo");
const estacionParqueo = document.getElementById("estacionParqueo");
const btnGuardarParqueo = document.getElementById("btnGuardarParqueo");
// para
const buscarParqueos = document.getElementById("buscarParqueos");
const registrosPorPaginaParqueos = document.getElementById("registrosPorPaginaParqueos");
const infoPaginacionParqueos = document.getElementById("infoPaginacionParqueos");
const paginacionParqueos = document.getElementById("paginacionParqueos");
let listaParqueos = [];
let paginaActualParqueos = 1;
let textoBusquedaParqueos = "";
let limiteParqueos = 10;


const modalParqueo = new bootstrap.Modal(modalParqueoElemento);

// Guarda el ID cuando se edita.
// Si es null, se está registrando un parqueo.
let idParqueoEditar = null;


// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
    await cargarEstaciones();
    await cargarParqueos();
});


// ============================================
// CONSULTAR ESTACIONES ACTIVAS
// ============================================

async function cargarEstaciones(idSeleccionado = null) {
    try {
        const estaciones = await solicitarAPI(API_ESTACIONES);

        estacionParqueo.innerHTML = `
            <option value="">Selecciona una estación</option>
        `;

        const estacionesActivas = estaciones.filter(
            estacion => Number(estacion.estado) === 1
        );

        estacionesActivas.forEach(estacion => {
            const opcion = document.createElement("option");

            opcion.value = estacion.id_estacion;
            opcion.textContent = estacion.nombre;

            estacionParqueo.appendChild(opcion);
        });

        if (idSeleccionado !== null) {
            estacionParqueo.value = String(idSeleccionado);
        }

        if (estacionesActivas.length === 0) {
            estacionParqueo.innerHTML = `
                <option value="">
                    No hay estaciones activas disponibles
                </option>
            `;
        }

    } catch (error) {
        console.error("Error al cargar estaciones:", error);

        estacionParqueo.innerHTML = `
            <option value="">
                Error al cargar las estaciones
            </option>
        `;

        alert("No se pudieron cargar las estaciones: " + error.message);
    }
}


// ============================================
// CONSULTAR PARQUEOS
// ============================================

async function cargarParqueos() {
    tablaParqueos.innerHTML = `
        <tr>
            <td colspan="6" class="text-center">
                Cargando parqueos...
            </td>
        </tr>
    `;

    try {
        const parqueos = await solicitarAPI(API_PARQUEOS);

        listaParqueos = Array.isArray(parqueos) ? parqueos : [];
        paginaActualParqueos = 1;

        mostrarParqueos();

    } catch (error) {
        console.error("Error al cargar parqueos:", error);

        tablaParqueos.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    No se pudieron cargar los parqueos.
                </td>
            </tr>
        `;

        infoPaginacionParqueos.textContent =
            "No se pudieron cargar los registros.";

        paginacionParqueos.replaceChildren();

        alert("Error al consultar los parqueos: " + error.message);
    }
}

// mostrarP
function mostrarParqueos() {
    tablaParqueos.replaceChildren();

    const texto = textoBusquedaParqueos.trim().toLowerCase();

    const parqueosFiltrados = listaParqueos.filter(parqueo => {
        const valores = [
            parqueo.id_parqueo,
            parqueo.ubicacion,
            parqueo.capacidad,
            parqueo.estacion,
            Number(parqueo.estado) === 1 ? "Activo" : "Desactivado"
        ];

        return valores.some(valor =>
            String(valor ?? "").toLowerCase().includes(texto)
        );
    });

    const totalRegistros = parqueosFiltrados.length;
    const totalPaginas = Math.ceil(totalRegistros / limiteParqueos);

    if (totalRegistros === 0) {
        tablaParqueos.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    ${
                        texto
                            ? "No se encontraron parqueos con esa búsqueda."
                            : "No hay parqueos registrados."
                    }
                </td>
            </tr>
        `;

        infoPaginacionParqueos.textContent = "Mostrando 0 registros.";
        renderizarPaginacionParqueos(0);
        return;
    }

    if (paginaActualParqueos > totalPaginas) {
        paginaActualParqueos = totalPaginas;
    }

    const inicio = (paginaActualParqueos - 1) * limiteParqueos;
    const fin = Math.min(inicio + limiteParqueos, totalRegistros);

    const parqueosPagina = parqueosFiltrados.slice(inicio, fin);

    parqueosPagina.forEach(parqueo => {
        const fila = document.createElement("tr");

        const celdaId = document.createElement("td");
        celdaId.textContent = parqueo.id_parqueo;

        const celdaUbicacion = document.createElement("td");
        celdaUbicacion.textContent = parqueo.ubicacion;

        const celdaCapacidad = document.createElement("td");
        celdaCapacidad.textContent = parqueo.capacidad;

        const celdaEstacion = document.createElement("td");
        celdaEstacion.textContent = parqueo.estacion;

        // Estado
        const celdaEstado = document.createElement("td");
        const activo = Number(parqueo.estado) === 1;

        const insignia = document.createElement("span");
        insignia.className = activo
            ? "badge bg-success"
            : "badge bg-secondary";
        insignia.textContent = activo ? "Activo" : "Desactivado";

        celdaEstado.appendChild(insignia);

        // Acciones
        const celdaAcciones = document.createElement("td");
        celdaAcciones.className = "text-end";

        if (activo) {
            const botonEditar = document.createElement("button");
            botonEditar.type = "button";
            botonEditar.className =
                "btn btn-sm btn-outline-primary me-2";
            botonEditar.textContent = "Editar";
            botonEditar.dataset.accion = "editar";
            botonEditar.dataset.id = parqueo.id_parqueo;

            botonEditar.addEventListener("click", () => {
                abrirModalEditar(parqueo);
            });

            const botonDesactivar = document.createElement("button");
            botonDesactivar.type = "button";
            botonDesactivar.className =
                "btn btn-sm btn-outline-danger";
            botonDesactivar.textContent = "Eliminar";
            botonDesactivar.dataset.accion = "desactivar";
            botonDesactivar.dataset.id = parqueo.id_parqueo;
            botonDesactivar.dataset.nombre = parqueo.ubicacion;

            botonDesactivar.addEventListener("click", () => {
                desactivarParqueo(parqueo.id_parqueo);
            });

            celdaAcciones.append(botonEditar, botonDesactivar);
        } else {
            celdaAcciones.textContent = "Sin acciones";
        }

        fila.append(
            celdaId,
            celdaUbicacion,
            celdaCapacidad,
            celdaEstacion,
            celdaEstado,
            celdaAcciones
        );

        tablaParqueos.appendChild(fila);
    });

    infoPaginacionParqueos.textContent =
        `Mostrando ${inicio + 1} a ${fin} de ${totalRegistros} registros.`;

    renderizarPaginacionParqueos(totalPaginas);
}

// paginacion
function renderizarPaginacionParqueos(totalPaginas) {
    paginacionParqueos.replaceChildren();

    /*if (totalPaginas <= 1) {
        return;
    } */

    function agregarBoton(texto, pagina, deshabilitado = false, activo = false) {
        const elemento = document.createElement("li");

        elemento.className =
            `page-item${deshabilitado ? " disabled" : ""}${activo ? " active" : ""}`;

        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "page-link";
        boton.textContent = texto;
        boton.disabled = deshabilitado;

        boton.addEventListener("click", () => {
            paginaActualParqueos = pagina;
            mostrarParqueos();
        });

        elemento.appendChild(boton);
        paginacionParqueos.appendChild(elemento);
    }

    agregarBoton(
        "Anterior",
        paginaActualParqueos - 1,
        paginaActualParqueos === 1
    );

    const inicioPaginas = Math.max(1, paginaActualParqueos - 2);
    const finPaginas = Math.min(totalPaginas, inicioPaginas + 4);
    const inicioAjustado = Math.max(1, finPaginas - 4);

    for (let pagina = inicioAjustado; pagina <= finPaginas; pagina++) {
        agregarBoton(
            String(pagina),
            pagina,
            false,
            pagina === paginaActualParqueos
        );
    }

    agregarBoton(
        "Siguiente",
        paginaActualParqueos + 1,
        paginaActualParqueos === totalPaginas
    );
}

// ============================================
// ABRIR MODAL PARA REGISTRAR
// ============================================

btnNuevoParqueo.addEventListener("click", async () => {
    idParqueoEditar = null;

    formParqueo.reset();

    tituloModalParqueo.textContent = "Nuevo parqueo";
    btnGuardarParqueo.textContent = "Guardar parqueo";

    await cargarEstaciones();

    modalParqueo.show();
});


// ============================================
// ABRIR MODAL PARA EDITAR
// ============================================

async function abrirModalEditar(parqueo) {
    idParqueoEditar = Number(parqueo.id_parqueo);

    formParqueo.reset();

    tituloModalParqueo.textContent = "Editar parqueo";
    btnGuardarParqueo.textContent = "Guardar cambios";

    ubicacionParqueo.value = parqueo.ubicacion;
    capacidadParqueo.value = parqueo.capacidad;

    await cargarEstaciones(parqueo.id_estacion);

    modalParqueo.show();
}


// ============================================
// REGISTRAR O ACTUALIZAR PARQUEO
// ============================================

formParqueo.addEventListener("submit", async event => {
    event.preventDefault();

    const ubicacion = ubicacionParqueo.value.trim();
    const capacidad = Number(capacidadParqueo.value);
    const id_estacion = Number(estacionParqueo.value);

    if (
        ubicacion === "" ||
        !Number.isInteger(capacidad) ||
        capacidad <= 0 ||
        !Number.isInteger(id_estacion) ||
        id_estacion <= 0
    ) {
        alert("Completa los campos con valores válidos.");
        return;
    }

    const datos = {
        ubicacion: ubicacion,
        capacidad: capacidad,
        id_estacion: id_estacion
    };

    const metodo = idParqueoEditar === null ? "POST" : "PUT";

    const archivo = idParqueoEditar === null
        ? API_PARQUEOS
        : `${API_PARQUEOS}?id=${idParqueoEditar}`;

    btnGuardarParqueo.disabled = true;

    try {
        const respuesta = await solicitarAPI(archivo, metodo, datos);

        alert(respuesta.mensaje || "Operación realizada correctamente.");

        modalParqueo.hide();

        formParqueo.reset();

        await cargarParqueos();

    } catch (error) {
        console.error("Error al guardar parqueo:", error);

        alert("No se pudo guardar el parqueo: " + error.message);

    } finally {
        btnGuardarParqueo.disabled = false;
    }
});


// ============================================
// DESACTIVAR PARQUEO
// ============================================

async function desactivarParqueo(id) {
    const confirmar = confirm(
        "¿Estás seguro de desactivar este parqueo?"
    );

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await solicitarAPI(
            `${API_PARQUEOS}?id=${id}`,
            "DELETE"
        );

        alert(respuesta.mensaje || "Parqueo desactivado correctamente.");

        await cargarParqueos();

    } catch (error) {
        console.error("Error al desactivar parqueo:", error);

        alert("No se pudo desactivar el parqueo: " + error.message);
    }
}

buscarParqueos.addEventListener("input", () => {
    textoBusquedaParqueos = buscarParqueos.value;
    paginaActualParqueos = 1;
    mostrarParqueos();
});

registrosPorPaginaParqueos.addEventListener("change", () => {
    limiteParqueos = Number(registrosPorPaginaParqueos.value);
    paginaActualParqueos = 1;
    mostrarParqueos();
});


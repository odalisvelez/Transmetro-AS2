const API_ACCESOS = "accesos.php";
const API_ESTACIONES_ACCESOS = "estaciones.php";

// Referencias al HTML
const tablaAccesos = document.getElementById("tablaAccesos");
const btnNuevoAcceso = document.getElementById("btnNuevoAcceso");
const modalAccesoElemento = document.getElementById("modalAcceso");
const formAcceso = document.getElementById("formAcceso");

// Datos para paginacion y busqueda
const buscarAccesos = document.getElementById("buscarAccesos");
const registrosPorPagina = document.getElementById("registrosPorPagina");
const infoPaginacionAccesos = document.getElementById("infoPaginacionAccesos");
const paginacionAccesos = document.getElementById("paginacionAccesos");

// Datos y estado de la tabla
let listaAccesos = [];
let paginaActualAccesos = 1;
let textoBusquedaAccesos = "";
let limiteAccesos = 10;

const tituloModalAcceso = document.getElementById("tituloModalAcceso");
const nombreAcceso = document.getElementById("nombreAcceso");
const estacionAcceso = document.getElementById("estacionAcceso");
const btnGuardarAcceso = document.getElementById("btnGuardarAcceso");

const modalAcceso = new bootstrap.Modal(modalAccesoElemento);

// Si es null, se está registrando un acceso.
let idAccesoEditar = null;


// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
    await cargarAccesos();
});


// ============================================
// CONSULTAR ESTACIONES ACTIVAS
// ============================================

async function cargarEstacionesAcceso(idSeleccionado = null) {
    try {
        const estaciones = await solicitarAPI(API_ESTACIONES_ACCESOS);

        estacionAcceso.innerHTML = `
            <option value="">Selecciona una estación</option>
        `;

        const estacionesActivas = estaciones.filter(
            estacion => Number(estacion.estado) === 1
        );

        estacionesActivas.forEach(estacion => {
            const opcion = document.createElement("option");

            opcion.value = estacion.id_estacion;
            opcion.textContent = estacion.nombre;

            estacionAcceso.appendChild(opcion);
        });

        if (idSeleccionado !== null) {
            estacionAcceso.value = String(idSeleccionado);
        }

        if (estacionesActivas.length === 0) {
            estacionAcceso.innerHTML = `
                <option value="">
                    No hay estaciones activas disponibles
                </option>
            `;
        }

        return estacionesActivas.length > 0;

    } catch (error) {
        console.error("Error al cargar estaciones:", error);

        estacionAcceso.innerHTML = `
            <option value="">
                Error al cargar las estaciones
            </option>
        `;

        throw error;
    }
}


// ============================================
// CONSULTAR ACCESOS
// ============================================


async function cargarAccesos() {
    tablaAccesos.innerHTML = `
        <tr>
            <td colspan="6" class="text-center">
                Cargando accesos...
            </td>
        </tr>
    `;

    try {
        const accesos = await solicitarAPI(API_ACCESOS);

        // Guardar los datos recibidos del servidor.
        listaAccesos = Array.isArray(accesos) ? accesos : [];

        // Al actualizar los datos, comenzar desde la primera página.
        paginaActualAccesos = 1;

        // Mostrar los registros aplicando búsqueda y paginación.
        renderizarAccesos();

    } catch (error) {
        console.error("Error al cargar accesos:", error);

        tablaAccesos.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    No se pudieron cargar los accesos.
                </td>
            </tr>
        `;

        infoPaginacionAccesos.textContent =
            "No se pudieron cargar los registros.";

        paginacionAccesos.innerHTML = "";
    }
}


function renderizarAccesos() {
    // Filtrar por ID, nombre del acceso, estación o guardias activos.
    const accesosFiltrados = listaAccesos.filter(acceso => {
        const texto = textoBusquedaAccesos.toLocaleLowerCase();

        return (
            String(acceso.id_acceso).toLocaleLowerCase().includes(texto) ||
            String(acceso.acceso ?? "").toLocaleLowerCase().includes(texto) ||
            String(acceso.estacion ?? "").toLocaleLowerCase().includes(texto) ||
            String(acceso.guardias_activos ?? 0).includes(texto)
        );
    });

    const totalRegistros = accesosFiltrados.length;
    const totalPaginas = Math.max(
        1,
        Math.ceil(totalRegistros / limiteAccesos)
    );

    // Evitar que la página actual quede fuera del rango.
    if (paginaActualAccesos > totalPaginas) {
        paginaActualAccesos = totalPaginas;
    }

    tablaAccesos.innerHTML = "";

    // Mostrar mensaje si no hay resultados.
    if (totalRegistros === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 6;
        celda.className = "text-center";

        celda.textContent = listaAccesos.length === 0
            ? "No hay accesos activos registrados."
            : "No se encontraron accesos con esa búsqueda.";

        fila.appendChild(celda);
        tablaAccesos.appendChild(fila);

        infoPaginacionAccesos.textContent =
            "Mostrando 0 de 0 registros";

        paginacionAccesos.innerHTML = "";
        return;
    }

    // Calcular qué registros corresponden a la página actual.
    const inicio = (paginaActualAccesos - 1) * limiteAccesos;
    const fin = Math.min(inicio + limiteAccesos, totalRegistros);
    const accesosPagina = accesosFiltrados.slice(inicio, fin);

    // Crear las filas de la tabla.
    accesosPagina.forEach(acceso => {
        const fila = document.createElement("tr");

        const celdaId = document.createElement("td");
        celdaId.textContent = acceso.id_acceso;

        const celdaNombre = document.createElement("td");
        celdaNombre.textContent = acceso.acceso;

        const celdaEstacion = document.createElement("td");
        celdaEstacion.textContent = acceso.estacion;

        // Conservar el contador de guardias activos.
        const celdaGuardias = document.createElement("td");
        celdaGuardias.textContent = Number(
            acceso.guardias_activos ?? 0
        );

        const celdaEstado = document.createElement("td");
        const insignia = document.createElement("span");

        insignia.className = "badge bg-success";
        insignia.textContent = "Activo";
        celdaEstado.appendChild(insignia);

        const celdaAcciones = document.createElement("td");
        celdaAcciones.className = "text-end";

        const botonEditar = document.createElement("button");
        botonEditar.type = "button";
        botonEditar.className =
            "btn btn-sm btn-outline-primary me-2";
        botonEditar.textContent = "Editar";
        botonEditar.dataset.accion = "editar";
        botonEditar.dataset.id = acceso.id_acceso;

        botonEditar.addEventListener("click", () => {
            abrirModalEditarAcceso(acceso);
        });

        const botonDesactivar = document.createElement("button");
        botonDesactivar.type = "button";
        botonDesactivar.className =
            "btn btn-sm btn-outline-danger";
        botonDesactivar.textContent = "Eliminar";
        botonDesactivar.dataset.accion = "desactivar";
        botonDesactivar.dataset.id = acceso.id_acceso;
        botonDesactivar.dataset.nombre = acceso.acceso;

        botonDesactivar.addEventListener("click", () => {
            desactivarAcceso(
                acceso.id_acceso,
                acceso.acceso
            );
        });

        celdaAcciones.append(botonEditar, botonDesactivar);

        fila.append(
            celdaId,
            celdaNombre,
            celdaEstacion,
            celdaGuardias,
            celdaEstado,
            celdaAcciones
        );

        tablaAccesos.appendChild(fila);
    });

    // Informar qué registros se están mostrando.
    infoPaginacionAccesos.textContent =
        `Mostrando ${inicio + 1}–${fin} de ${totalRegistros} registros`;

    // Actualizar los controles de paginación.
    renderizarPaginacionAccesos(totalPaginas);
}


function renderizarPaginacionAccesos(totalPaginas) {
    paginacionAccesos.innerHTML = "";

    // Crear botón de paginación.
    function agregarBoton(texto, pagina, deshabilitado = false, activo = false) {
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
            paginaActualAccesos = pagina;
            renderizarAccesos();
        });

        elemento.appendChild(boton);
        paginacionAccesos.appendChild(elemento);
    }

    // Botón Anterior.
    agregarBoton(
        "Anterior",
        paginaActualAccesos - 1,
        paginaActualAccesos === 1
    );

    // Mostrar hasta cinco números de página.
    let inicio = Math.max(1, paginaActualAccesos - 2);
    let fin = Math.min(totalPaginas, inicio + 4);

    // Ajustar el inicio cuando estamos cerca de la última página.
    inicio = Math.max(1, fin - 4);

    for (let pagina = inicio; pagina <= fin; pagina++) {
        agregarBoton(
            String(pagina),
            pagina,
            false,
            pagina === paginaActualAccesos
        );
    }

    // Botón Siguiente.
    agregarBoton(
        "Siguiente",
        paginaActualAccesos + 1,
        paginaActualAccesos === totalPaginas
    );
}


buscarAccesos.addEventListener("input", () => {
    textoBusquedaAccesos = buscarAccesos.value.trim();
    paginaActualAccesos = 1;

    renderizarAccesos();
});

registrosPorPagina.addEventListener("change", () => {
    limiteAccesos = Number(registrosPorPagina.value);
    paginaActualAccesos = 1;

    renderizarAccesos();
});


// ============================================
// ABRIR MODAL PARA REGISTRAR
// ============================================

btnNuevoAcceso.addEventListener("click", async () => {
    idAccesoEditar = null;
    formAcceso.reset();

    tituloModalAcceso.textContent = "Nuevo acceso";
    btnGuardarAcceso.textContent = "Guardar acceso";

    try {
        const hayEstaciones = await cargarEstacionesAcceso();

        if (!hayEstaciones) {
            alert("Debes tener al menos una estación activa para registrar un acceso.");
            return;
        }

        modalAcceso.show();

    } catch (error) {
        alert(
            "No se pudieron cargar las estaciones: " +
            error.message
        );
    }
});


// ============================================
// ABRIR MODAL PARA EDITAR
// ============================================

async function abrirModalEditarAcceso(acceso) {
    idAccesoEditar = Number(acceso.id_acceso);

    formAcceso.reset();

    tituloModalAcceso.textContent = "Editar acceso";
    btnGuardarAcceso.textContent = "Guardar cambios";

    nombreAcceso.value = acceso.acceso;

    try {
        await cargarEstacionesAcceso(acceso.id_estacion);

        modalAcceso.show();

    } catch (error) {
        console.error("Error al preparar la edición:", error);

        alert(
            "No se pudo cargar la información del acceso: " +
            error.message
        );

        idAccesoEditar = null;
    }
}


// ============================================
// REGISTRAR O ACTUALIZAR ACCESO
// ============================================

formAcceso.addEventListener("submit", async event => {
    event.preventDefault();

    const nombre = nombreAcceso.value.trim();
    const id_estacion = Number(estacionAcceso.value);

    if (
        nombre === "" ||
        !Number.isInteger(id_estacion) ||
        id_estacion <= 0
    ) {
        alert("Completa los campos con valores válidos.");
        return;
    }

    const datos = {
        nombre: nombre,
        id_estacion: id_estacion
    };

    const estaEditando = idAccesoEditar !== null;

    const metodo = estaEditando ? "PUT" : "POST";

    const archivo = estaEditando
        ? `${API_ACCESOS}?id=${idAccesoEditar}`
        : API_ACCESOS;

    btnGuardarAcceso.disabled = true;

    try {
        const respuesta = await solicitarAPI(
            archivo,
            metodo,
            datos
        );

        alert(
            respuesta.mensaje ||
            "Operación realizada correctamente."
        );

        modalAcceso.hide();
        formAcceso.reset();
        idAccesoEditar = null;

        await cargarAccesos();

    } catch (error) {
        console.error("Error al guardar acceso:", error);

        alert(
            "No se pudo guardar el acceso: " +
            error.message
        );

    } finally {
        btnGuardarAcceso.disabled = false;
    }
});


// ============================================
// DESACTIVAR ACCESO
// ============================================

async function desactivarAcceso(id, nombre) {
    const confirmar = confirm(
        `¿Estás seguro de desactivar el acceso "${nombre}"?`
    );

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await solicitarAPI(
            `${API_ACCESOS}?id=${id}`,
            "DELETE"
        );

        alert(
            respuesta.mensaje ||
            "Acceso desactivado correctamente."
        );

        await cargarAccesos();

    } catch (error) {
        console.error("Error al desactivar acceso:", error);

        alert(
            "No se pudo desactivar el acceso: " +
            error.message
        );
    }
}


// ============================================
// LIMPIAR FORMULARIO AL CERRAR
// ============================================

modalAccesoElemento.addEventListener(
    "hidden.bs.modal",
    () => {
        formAcceso.reset();
        idAccesoEditar = null;
    }
);
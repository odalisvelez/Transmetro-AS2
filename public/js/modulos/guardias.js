
const API_GUARDIAS = "guardias.php";
const API_ACCESOS_GUARDIAS = "accesos.php";

// Elementos de la interfaz
const tablaGuardias = document.getElementById("tablaGuardias");
const btnNuevoGuardia = document.getElementById("btnNuevoGuardia");
const modalGuardiaElemento = document.getElementById("modalGuardia");
const formGuardia = document.getElementById("formGuardia");
const tituloModalGuardia = document.getElementById("tituloModalGuardia");
const nombreGuardia = document.getElementById("nombreGuardia");
const telefonoGuardia = document.getElementById("telefonoGuardia");
const accesoGuardia = document.getElementById("accesoGuardia");
const btnGuardarGuardia = document.getElementById("btnGuardarGuardia");

// para paginacion y busqueda
const buscarGuardias = document.getElementById("buscarGuardias");
const registrosPorPaginaGuardias = document.getElementById("registrosPorPaginaGuardias");
const infoPaginacionGuardias = document.getElementById("infoPaginacionGuardias");
const paginacionGuardias = document.getElementById("paginacionGuardias");

// Datos y estado de la tabla
let listaGuardias = [];
let paginaActualGuardias = 1;
let textoBusquedaGuardias = "";
let limiteGuardias = 10;

const modalGuardia = new bootstrap.Modal(modalGuardiaElemento);

let idGuardiaEditar = null;

// Cargar guardias al abrir el módulo
document.addEventListener("DOMContentLoaded", async () => {
    await cargarGuardias();
});

// Cargar accesos activos en el selector
async function cargarAccesosGuardia(idSeleccionado = null) {
    try {
        const accesos = await solicitarAPI(API_ACCESOS_GUARDIAS);

        accesoGuardia.innerHTML =
            '<option value="">Selecciona un acceso</option>';

        const accesosActivos = accesos.filter(
            acceso => Number(acceso.estado) === 1
        );

        accesosActivos.forEach(acceso => {
            const opcion = document.createElement("option");

            opcion.value = acceso.id_acceso;
            opcion.textContent = acceso.acceso;

            accesoGuardia.appendChild(opcion);
        });

        if (idSeleccionado !== null) {
            accesoGuardia.value = String(idSeleccionado);
        }

        if (accesosActivos.length === 0) {
            accesoGuardia.innerHTML =
                '<option value="">No hay accesos activos disponibles</option>';
        }

        return accesosActivos.length > 0;

    } catch (error) {
        console.error("Error al cargar accesos:", error);

        accesoGuardia.innerHTML =
            '<option value="">Error al cargar los accesos</option>';

        throw error;
    }
}

// Consultar y mostrar guardias

async function cargarGuardias() {
    tablaGuardias.innerHTML = `
        <tr>
            <td colspan="6" class="text-center">
                Cargando guardias...
            </td>
        </tr>
    `;

    try {
        const guardias = await solicitarAPI(API_GUARDIAS);

        listaGuardias = Array.isArray(guardias) ? guardias : [];

        paginaActualGuardias = 1;

        renderizarGuardias();

    } catch (error) {
        console.error("Error al cargar guardias:", error);

        tablaGuardias.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    No se pudieron cargar los guardias.
                </td>
            </tr>
        `;

        infoPaginacionGuardias.textContent =
            "No se pudieron cargar los registros.";

        paginacionGuardias.innerHTML = "";

        alert("No se pudieron cargar los guardias: " + error.message);
    }
}

// renderizacion

function renderizarGuardias() {
    const texto = textoBusquedaGuardias.toLocaleLowerCase();

    // Filtrar por ID, nombre, teléfono, acceso o estado.
    const guardiasFiltrados = listaGuardias.filter(guardia => {
        const estado = Number(guardia.estado) === 1
            ? "activo"
            : "inactivo";

        return (
            String(guardia.id_guardia).toLocaleLowerCase().includes(texto) ||
            String(guardia.nombre ?? "").toLocaleLowerCase().includes(texto) ||
            String(guardia.telefono ?? "").toLocaleLowerCase().includes(texto) ||
            String(guardia.acceso ?? "").toLocaleLowerCase().includes(texto) ||
            estado.includes(texto)
        );
    });

    const totalRegistros = guardiasFiltrados.length;

    const totalPaginas = Math.max(
        1,
        Math.ceil(totalRegistros / limiteGuardias)
    );

    if (paginaActualGuardias > totalPaginas) {
        paginaActualGuardias = totalPaginas;
    }

    tablaGuardias.innerHTML = "";

    // Mostrar un mensaje cuando no hay resultados.
    if (totalRegistros === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 6;
        celda.className = "text-center";

        celda.textContent = listaGuardias.length === 0
            ? "No hay guardias registrados."
            : "No se encontraron guardias con esa búsqueda.";

        fila.appendChild(celda);
        tablaGuardias.appendChild(fila);

        infoPaginacionGuardias.textContent =
            "Mostrando 0 de 0 registros";

        paginacionGuardias.innerHTML = "";
        return;
    }

    // Determinar los registros de la página actual.
    const inicio = (paginaActualGuardias - 1) * limiteGuardias;
    const fin = Math.min(
        inicio + limiteGuardias,
        totalRegistros
    );

    const guardiasPagina = guardiasFiltrados.slice(inicio, fin);

    guardiasPagina.forEach(guardia => {
        const fila = document.createElement("tr");

        // ID
        const celdaId = document.createElement("td");
        celdaId.textContent = guardia.id_guardia;

        // Nombre
        const celdaNombre = document.createElement("td");
        celdaNombre.textContent = guardia.nombre;

        // Teléfono
        const celdaTelefono = document.createElement("td");
        celdaTelefono.textContent = guardia.telefono;

        // Acceso asignado
        const celdaAcceso = document.createElement("td");
        celdaAcceso.textContent = guardia.acceso;

        // Estado
        const celdaEstado = document.createElement("td");
        const insignia = document.createElement("span");

        if (Number(guardia.estado) === 1) {
            insignia.className = "badge bg-success";
            insignia.textContent = "Activo";
        } else {
            insignia.className = "badge bg-secondary";
            insignia.textContent = "Inactivo";
        }

        celdaEstado.appendChild(insignia);

        // Acciones: solo para guardias activos.
        const celdaAcciones = document.createElement("td");
        celdaAcciones.className = "text-end";

        if (Number(guardia.estado) === 1) {
            const botonEditar = document.createElement("button");

            botonEditar.type = "button";
            botonEditar.className =
                "btn btn-sm btn-outline-primary me-2";
            botonEditar.textContent = "Editar";
            botonEditar.dataset.accion = "editar";
            botonEditar.dataset.id = guardia.id_guardia;

            const botonDesactivar = document.createElement("button");

            botonDesactivar.type = "button";
            botonDesactivar.className =
                "btn btn-sm btn-outline-danger";
            botonDesactivar.textContent = "Eliminar";
            botonDesactivar.dataset.accion = "desactivar";
            botonDesactivar.dataset.id = guardia.id_guardia;
            botonDesactivar.dataset.nombre = guardia.nombre;

            botonEditar.addEventListener("click", () => {
                abrirModalEditarGuardia(guardia);
            });

            botonDesactivar.addEventListener("click", () => {
                desactivarGuardia(
                    guardia.id_guardia,
                    guardia.nombre
                );
            });

            celdaAcciones.append(botonEditar, botonDesactivar);
        } else {
            celdaAcciones.textContent = "Sin acciones";
        }

        fila.append(
            celdaId,
            celdaNombre,
            celdaTelefono,
            celdaAcceso,
            celdaEstado,
            celdaAcciones
        );

        tablaGuardias.appendChild(fila);
    });

    infoPaginacionGuardias.textContent =
        `Mostrando ${inicio + 1}–${fin} de ${totalRegistros} registros`;

    renderizarPaginacionGuardias(totalPaginas);
}

// paginación
function renderizarPaginacionGuardias(totalPaginas) {
    paginacionGuardias.innerHTML = "";

    function crearBoton(texto, pagina, deshabilitado = false, activo = false) {
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
            paginaActualGuardias = pagina;
            renderizarGuardias();
        });

        elemento.appendChild(boton);
        paginacionGuardias.appendChild(elemento);
    }

    crearBoton(
        "Anterior",
        paginaActualGuardias - 1,
        paginaActualGuardias === 1
    );

    let inicio = Math.max(1, paginaActualGuardias - 2);
    let fin = Math.min(totalPaginas, inicio + 4);

    inicio = Math.max(1, fin - 4);

    for (let pagina = inicio; pagina <= fin; pagina++) {
        crearBoton(
            String(pagina),
            pagina,
            false,
            pagina === paginaActualGuardias
        );
    }

    crearBoton(
        "Siguiente",
        paginaActualGuardias + 1,
        paginaActualGuardias === totalPaginas
    );
}

// eventos
buscarGuardias.addEventListener("input", () => {
    textoBusquedaGuardias = buscarGuardias.value.trim();
    paginaActualGuardias = 1;

    renderizarGuardias();
});

registrosPorPaginaGuardias.addEventListener("change", () => {
    limiteGuardias = Number(registrosPorPaginaGuardias.value);
    paginaActualGuardias = 1;

    renderizarGuardias();
});



// Abrir formulario para registrar un guardia
btnNuevoGuardia.addEventListener("click", async () => {
    idGuardiaEditar = null;

    formGuardia.reset();

    tituloModalGuardia.textContent = "Nuevo guardia";
    btnGuardarGuardia.textContent = "Guardar guardia";

    try {
        const hayAccesos = await cargarAccesosGuardia();

        if (!hayAccesos) {
            alert("No hay accesos activos disponibles para asignar al guardia.");
            return;
        }

        modalGuardia.show();

    } catch (error) {
        alert("No se pudieron cargar los accesos: " + error.message);
    }
});

// Abrir formulario para editar un guardia
async function abrirModalEditarGuardia(guardia) {
    idGuardiaEditar = Number(guardia.id_guardia);

    formGuardia.reset();

    tituloModalGuardia.textContent = "Editar guardia";
    btnGuardarGuardia.textContent = "Guardar cambios";

    nombreGuardia.value = guardia.nombre;
    telefonoGuardia.value = guardia.telefono;

    try {
        await cargarAccesosGuardia(guardia.id_acceso);

        modalGuardia.show();

    } catch (error) {
        idGuardiaEditar = null;

        alert("No se pudieron cargar los accesos: " + error.message);
    }
}

// Registrar o actualizar un guardia
formGuardia.addEventListener("submit", async event => {
    event.preventDefault();

    const nombre = nombreGuardia.value.trim();
    const telefono = telefonoGuardia.value.trim();
    const id_acceso = Number(accesoGuardia.value);

    if (
        nombre === "" ||
        telefono === "" ||
        !Number.isInteger(id_acceso) ||
        id_acceso <= 0
    ) {
        alert("Completa todos los campos correctamente.");
        return;
    }

    const datos = {
        nombre,
        telefono,
        id_acceso
    };

    const estaEditando = idGuardiaEditar !== null;

    const metodo = estaEditando ? "PUT" : "POST";

    const archivo = estaEditando
        ? `${API_GUARDIAS}?id=${idGuardiaEditar}`
        : API_GUARDIAS;

    btnGuardarGuardia.disabled = true;

    try {
        const respuesta = await solicitarAPI(archivo, metodo, datos);

        alert(
            respuesta.mensaje || "Operación realizada correctamente."
        );

        modalGuardia.hide();
        formGuardia.reset();
        idGuardiaEditar = null;

        await cargarGuardias();

    } catch (error) {
        alert("No se pudo guardar el guardia: " + error.message);

    } finally {
        btnGuardarGuardia.disabled = false;
    }
});

// Desactivar un guardia
async function desactivarGuardia(id, nombre) {
    const confirmar = confirm(
        `¿Estás seguro de desactivar al guardia "${nombre}"?`
    );

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await solicitarAPI(
            `${API_GUARDIAS}?id=${id}`,
            "DELETE"
        );

        alert(
            respuesta.mensaje || "Guardia desactivado correctamente."
        );

        await cargarGuardias();

    } catch (error) {
        alert("No se pudo desactivar el guardia: " + error.message);
    }
}

// Limpiar el formulario al cerrar el modal
modalGuardiaElemento.addEventListener("hidden.bs.modal", () => {
    formGuardia.reset();
    idGuardiaEditar = null;
});


const API_EQUIPOS = "equipo_computo.php";
const API_ESTACIONES_EQUIPOS = "estaciones.php";

// Elementos de la interfaz
const tablaEquipos = document.getElementById("tablaEquipos");
const btnNuevoEquipo = document.getElementById("btnNuevoEquipo");
const modalEquipoElemento = document.getElementById("modalEquipo");
const formEquipo = document.getElementById("formEquipo");
const tituloModalEquipo = document.getElementById("tituloModalEquipo");
const idPc = document.getElementById("idPc");
const codigoInventario = document.getElementById("codigoInventario");
const estadoEquipo = document.getElementById("estadoEquipo");
const estacionEquipo = document.getElementById("estacionEquipo");
const btnGuardarEquipo = document.getElementById("btnGuardarEquipo");

// Elementos para búsqueda y paginación
const buscarEquipos = document.getElementById("buscarEquipos");
const registrosPorPaginaEquipos = document.getElementById("registrosPorPaginaEquipos");
const infoPaginacionEquipos = document.getElementById("infoPaginacionEquipos");
const paginacionEquipos = document.getElementById("paginacionEquipos");

// Datos y estado de la tabla
let listaEquipos = [];
let paginaActualEquipos = 1;
let textoBusquedaEquipos = "";
let limiteEquipos = 10;
let idEquipoEditar = null;
let listaEstacionesEquipos = [];

const modalEquipo = new bootstrap.Modal(modalEquipoElemento);

// Cargar equipos al abrir el módulo
document.addEventListener("DOMContentLoaded", async () => {
    await cargarEquipos();
});

// Cargar estaciones activas en el selector
async function cargarEstacionesEquipo(idSeleccionado = null) {
    try {
        const estaciones = await solicitarAPI(API_ESTACIONES_EQUIPOS);

        listaEstacionesEquipos = Array.isArray(estaciones)
            ? estaciones.filter(
                estacion => Number(estacion.estado) === 1
            )
            : [];

        estacionEquipo.innerHTML =
            '<option value="">Selecciona una estación</option>';

        listaEstacionesEquipos.forEach(estacion => {
            const opcion = document.createElement("option");

            opcion.value = estacion.id_estacion;
            opcion.textContent = estacion.nombre;

            estacionEquipo.appendChild(opcion);
        });

        if (idSeleccionado !== null) {
            estacionEquipo.value = String(idSeleccionado);
        }

        if (listaEstacionesEquipos.length === 0) {
            estacionEquipo.innerHTML =
                '<option value="">No hay estaciones activas disponibles</option>';
        }

        return listaEstacionesEquipos.length > 0;

    } catch (error) {
        console.error("Error al cargar estaciones:", error);

        estacionEquipo.innerHTML =
            '<option value="">Error al cargar las estaciones</option>';

        throw error;
    }
}

// Consultar y mostrar equipos
async function cargarEquipos() {
    tablaEquipos.innerHTML = `
        <tr>
            <td colspan="6" class="text-center">
                Cargando equipos de cómputo...
            </td>
        </tr>
    `;

    try {
        const equipos = await solicitarAPI(API_EQUIPOS);

        listaEquipos = Array.isArray(equipos) ? equipos : [];

        paginaActualEquipos = 1;

        renderizarEquipos();

    } catch (error) {
        console.error("Error al cargar equipos:", error);

        tablaEquipos.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    No se pudieron cargar los equipos de cómputo.
                </td>
            </tr>
        `;

        infoPaginacionEquipos.textContent =
            "No se pudieron cargar los registros.";

        paginacionEquipos.innerHTML = "";

        alert("No se pudieron cargar los equipos: " + error.message);
    }
}

// Renderización de la tabla
function renderizarEquipos() {
    const texto = textoBusquedaEquipos.toLocaleLowerCase();

    // Filtrar por ID, código, estación, estado del equipo
    // y estado del registro.
    const equiposFiltrados = listaEquipos.filter(equipo => {
        const estadoRegistro = Number(equipo.estado_registro) === 1
            ? "activo"
            : "inactivo";

        return (
            String(equipo.id_pc ?? "").toLocaleLowerCase().includes(texto) ||
            String(equipo.codigo_inventario ?? "").toLocaleLowerCase().includes(texto) ||
            String(equipo.estacion ?? "").toLocaleLowerCase().includes(texto) ||
            String(equipo.estado ?? "").toLocaleLowerCase().includes(texto) ||
            estadoRegistro.includes(texto)
        );
    });

    const totalRegistros = equiposFiltrados.length;

    const totalPaginas = Math.max(
        1,
        Math.ceil(totalRegistros / limiteEquipos)
    );

    if (paginaActualEquipos > totalPaginas) {
        paginaActualEquipos = totalPaginas;
    }

    tablaEquipos.innerHTML = "";

    // Mostrar un mensaje cuando no hay resultados
    if (totalRegistros === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 6;
        celda.className = "text-center";

        celda.textContent = listaEquipos.length === 0
            ? "No hay equipos de cómputo registrados."
            : "No se encontraron equipos con esa búsqueda.";

        fila.appendChild(celda);
        tablaEquipos.appendChild(fila);

        infoPaginacionEquipos.textContent =
            "Mostrando 0 de 0 registros";

        paginacionEquipos.innerHTML = "";
        return;
    }

    // Determinar los registros de la página actual
    const inicio = (paginaActualEquipos - 1) * limiteEquipos;
    const fin = Math.min(
        inicio + limiteEquipos,
        totalRegistros
    );

    const equiposPagina = equiposFiltrados.slice(inicio, fin);

    equiposPagina.forEach(equipo => {
        const fila = document.createElement("tr");

        // ID
        const celdaId = document.createElement("td");
        celdaId.textContent = equipo.id_pc;

        // Código de inventario
        const celdaCodigo = document.createElement("td");
        celdaCodigo.textContent = equipo.codigo_inventario;

        // Estación
        const celdaEstacion = document.createElement("td");
        celdaEstacion.textContent = equipo.estacion ?? "Sin estación";

        // Estado del equipo
        const celdaEstadoEquipo = document.createElement("td");
        celdaEstadoEquipo.textContent = equipo.estado ?? "Sin especificar";

        // Estado del registro
        const celdaEstadoRegistro = document.createElement("td");
        const insignia = document.createElement("span");

        if (Number(equipo.estado_registro) === 1) {
            insignia.className = "badge bg-success";
            insignia.textContent = "Activo";
        } else {
            insignia.className = "badge bg-secondary";
            insignia.textContent = "Inactivo";
        }

        celdaEstadoRegistro.appendChild(insignia);

        // Acciones: solo para equipos activos
        const celdaAcciones = document.createElement("td");
        celdaAcciones.className = "text-end";

        if (Number(equipo.estado_registro) === 1) {
            const botonEditar = document.createElement("button");

            botonEditar.type = "button";
            botonEditar.className =
                "btn btn-sm btn-outline-primary me-2";
            botonEditar.textContent = "Editar";

            botonEditar.addEventListener("click", () => {
                abrirModalEditarEquipo(equipo);
            });

            const botonDesactivar = document.createElement("button");

            botonDesactivar.type = "button";
            botonDesactivar.className =
                "btn btn-sm btn-outline-danger";
            botonDesactivar.textContent = "Eliminar";

            botonDesactivar.addEventListener("click", () => {
                desactivarEquipo(
                    equipo.id_pc,
                    equipo.codigo_inventario
                );
            });

            celdaAcciones.append(botonEditar, botonDesactivar);

        } else {
            celdaAcciones.textContent = "Sin acciones";
        }

        fila.append(
            celdaId,
            celdaCodigo,
            celdaEstacion,
            celdaEstadoEquipo,
            celdaEstadoRegistro,
            celdaAcciones
        );

        tablaEquipos.appendChild(fila);
    });

    infoPaginacionEquipos.textContent =
        `Mostrando ${inicio + 1}–${fin} de ${totalRegistros} registros`;

    renderizarPaginacionEquipos(totalPaginas);
}

// Paginación
function renderizarPaginacionEquipos(totalPaginas) {
    paginacionEquipos.innerHTML = "";

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
            paginaActualEquipos = pagina;
            renderizarEquipos();
        });

        elemento.appendChild(boton);
        paginacionEquipos.appendChild(elemento);
    }

    crearBoton(
        "Anterior",
        paginaActualEquipos - 1,
        paginaActualEquipos === 1
    );

    let inicio = Math.max(1, paginaActualEquipos - 2);
    let fin = Math.min(totalPaginas, inicio + 4);

    inicio = Math.max(1, fin - 4);

    for (let pagina = inicio; pagina <= fin; pagina++) {
        crearBoton(
            String(pagina),
            pagina,
            false,
            pagina === paginaActualEquipos
        );
    }

    crearBoton(
        "Siguiente",
        paginaActualEquipos + 1,
        paginaActualEquipos === totalPaginas
    );
}

// Eventos de búsqueda y cantidad por página
buscarEquipos.addEventListener("input", () => {
    textoBusquedaEquipos = buscarEquipos.value.trim();
    paginaActualEquipos = 1;

    renderizarEquipos();
});

registrosPorPaginaEquipos.addEventListener("change", () => {
    limiteEquipos = Number(registrosPorPaginaEquipos.value);
    paginaActualEquipos = 1;

    renderizarEquipos();
});

// Abrir formulario para registrar un equipo
btnNuevoEquipo.addEventListener("click", async () => {
    idEquipoEditar = null;

    formEquipo.reset();
    idPc.value = "";

    tituloModalEquipo.textContent = "Nuevo equipo";
    btnGuardarEquipo.textContent = "Guardar equipo";

    try {
        const hayEstaciones = await cargarEstacionesEquipo();

        if (!hayEstaciones) {
            alert(
                "No hay estaciones activas disponibles para asignar al equipo."
            );
            return;
        }

        modalEquipo.show();

    } catch (error) {
        alert("No se pudieron cargar las estaciones: " + error.message);
    }
});

// Abrir formulario para editar un equipo
async function abrirModalEditarEquipo(equipo) {
    idEquipoEditar = Number(equipo.id_pc);

    formEquipo.reset();

    idPc.value = equipo.id_pc;
    codigoInventario.value = equipo.codigo_inventario;
    estadoEquipo.value = equipo.estado;

    tituloModalEquipo.textContent = "Editar equipo";
    btnGuardarEquipo.textContent = "Guardar cambios";

    try {
        const hayEstaciones = await cargarEstacionesEquipo(
            equipo.id_estacion
        );

        if (!hayEstaciones) {
            alert("No hay estaciones activas disponibles.");
            return;
        }

        // Si la estación asignada está inactiva, avisar.
        if (estacionEquipo.value === "") {
            alert(
                "La estación asignada no está activa. " +
                "Selecciona una estación activa antes de guardar los cambios."
            );
        }

        modalEquipo.show();

    } catch (error) {
        idEquipoEditar = null;

        alert("No se pudieron cargar las estaciones: " + error.message);
    }
}

// Registrar o actualizar un equipo
formEquipo.addEventListener("submit", async event => {
    event.preventDefault();

    const codigo_inventario = codigoInventario.value.trim();
    const estado = estadoEquipo.value.trim();
    const id_estacion = Number(estacionEquipo.value);

    if (
        codigo_inventario === "" ||
        estado === "" ||
        !Number.isInteger(id_estacion) ||
        id_estacion <= 0
    ) {
        alert("Completa todos los campos correctamente.");
        return;
    }

    const datos = {
        codigo_inventario,
        estado,
        id_estacion
    };

    const estaEditando = idEquipoEditar !== null;

    const metodo = estaEditando ? "PUT" : "POST";

    const archivo = estaEditando
        ? `${API_EQUIPOS}?id=${idEquipoEditar}`
        : API_EQUIPOS;

    btnGuardarEquipo.disabled = true;

    try {
        const respuesta = await solicitarAPI(archivo, metodo, datos);

        alert(
            respuesta.mensaje || "Operación realizada correctamente."
        );

        modalEquipo.hide();
        formEquipo.reset();
        idPc.value = "";
        idEquipoEditar = null;

        await cargarEquipos();

    } catch (error) {
        alert("No se pudo guardar el equipo: " + error.message);

    } finally {
        btnGuardarEquipo.disabled = false;
    }
});

// Desactivar un equipo
async function desactivarEquipo(id, codigo) {
    const confirmar = confirm(
        `¿Estás seguro de eliminar el equipo ?`
    );

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await solicitarAPI(
            `${API_EQUIPOS}?id=${id}`,
            "DELETE"
        );

        alert(
            respuesta.mensaje || "Equipo eliminado correctamente."
        );

        await cargarEquipos();

    } catch (error) {
        alert("No se pudo eliminar el equipo: " + error.message);
    }
}

// Limpiar el formulario al cerrar el modal
modalEquipoElemento.addEventListener("hidden.bs.modal", () => {
    formEquipo.reset();
    idPc.value = "";
    idEquipoEditar = null;
});

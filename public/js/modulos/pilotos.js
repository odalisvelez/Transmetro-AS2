
const API_PILOTOS = "pilotos.php";

// CONFIGURACIÓN Y REFERENCIAS HTML
const tablaPilotos = document.getElementById("tablaPilotos");
const btnNuevoPiloto = document.getElementById("btnNuevoPiloto");

const modalPilotoElemento = document.getElementById("modalPiloto");
const formPiloto = document.getElementById("formPiloto");
const tituloModalPiloto = document.getElementById("tituloModalPiloto");

const nombrePiloto = document.getElementById("nombrePiloto");
const direccionPiloto = document.getElementById("direccionPiloto");
const telefonoPiloto = document.getElementById("telefonoPiloto");
const correoPiloto = document.getElementById("correoPiloto");

const buscarPilotos = document.getElementById("buscarPilotos");
const registrosPorPaginaPilotos = document.getElementById("registrosPorPaginaPilotos");
const infoPaginacionPilotos = document.getElementById("infoPaginacionPilotos");
const paginacionPilotos = document.getElementById("paginacionPilotos");

const modalPiloto = bootstrap.Modal.getOrCreateInstance( modalPilotoElemento );

// VARIABLES DEL MÓDULO
let listaPilotos = [];
let paginaActualPilotos = 1;
let textoBusquedaPilotos = "";
let limitePilotos = 10;
let idPilotoEdicion = null;

// CONSULTAR PILOTOS
async function cargarPilotos() {
    tablaPilotos.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                Cargando pilotos...
            </td>
        </tr>
    `;

    try {
        const pilotos = await solicitarAPI(API_PILOTOS);

        if (!Array.isArray(pilotos)) {
            throw new Error("La API no devolvió una lista de pilotos válida.");
        }

        listaPilotos = pilotos;
        paginaActualPilotos = 1;

        mostrarPilotos();

    } catch (error) {
        console.error("Error al cargar pilotos:", error);

        tablaPilotos.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    No se pudieron cargar los pilotos.
                </td>
            </tr>
        `;

        infoPaginacionPilotos.textContent =
            "No se pudieron cargar los registros.";

        paginacionPilotos.replaceChildren();

        alert("Error al consultar los pilotos: " + error.message);
    }
}

// MOSTRAR PILOTOS CON BÚSQUEDA Y PAGINACIÓN
function mostrarPilotos() {
    tablaPilotos.replaceChildren();

    const texto = textoBusquedaPilotos.trim().toLowerCase();

    const pilotosFiltrados = listaPilotos.filter(piloto => {
        const valores = [
            piloto.id_piloto,
            piloto.nombre,
            piloto.direccion,
            piloto.telefono,
            piloto.correo ?? "",
            Number(piloto.estado) === 1 ? "Activo" : "Desactivado"
        ];

        return valores.some(valor =>
            String(valor ?? "").toLowerCase().includes(texto)
        );
    });

    const totalRegistros = pilotosFiltrados.length;
    const totalPaginas = Math.ceil(
        totalRegistros / limitePilotos
    );

    if (totalRegistros === 0) {
        tablaPilotos.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    ${
                        texto
                            ? "No se encontraron pilotos con esa búsqueda."
                            : "No hay pilotos registrados."
                    }
                </td>
            </tr>
        `;

        infoPaginacionPilotos.textContent =
            "Mostrando 0 registros.";

        renderizarPaginacionPilotos(0);
        return;
    }

    if (paginaActualPilotos > totalPaginas) {
        paginaActualPilotos = totalPaginas;
    }

    const inicio = (paginaActualPilotos - 1) * limitePilotos;
    const fin = Math.min(
        inicio + limitePilotos,
        totalRegistros
    );

    const pilotosPagina = pilotosFiltrados.slice(inicio, fin);

    pilotosPagina.forEach(piloto => {
        const fila = document.createElement("tr");
        const activo = Number(piloto.estado) === 1;

        // ID
        const celdaId = document.createElement("td");
        celdaId.textContent = piloto.id_piloto;

        // Nombre
        const celdaNombre = document.createElement("td");
        celdaNombre.textContent = piloto.nombre;

        // Dirección
        const celdaDireccion = document.createElement("td");
        celdaDireccion.textContent = piloto.direccion ?? "—";

        // Teléfono
        const celdaTelefono = document.createElement("td");
        celdaTelefono.textContent = piloto.telefono ?? "—";

        // Correo
        const celdaCorreo = document.createElement("td");
        celdaCorreo.textContent = piloto.correo || "—";

        // Estado
        const celdaEstado = document.createElement("td");
        const insignia = document.createElement("span");

        insignia.className = activo
            ? "badge text-bg-success"
            : "badge text-bg-secondary";

        insignia.textContent = activo ? "Activo" : "Desactivado";

        celdaEstado.appendChild(insignia);

        // Acciones
        const celdaAcciones = document.createElement("td");
        celdaAcciones.className = "text-center";

        // ver historial_educ
        const botonHistorial = document.createElement("button");
        botonHistorial.type = "button";
        botonHistorial.className =
            "btn btn-sm btn-outline-info me-2";
        botonHistorial.textContent = "Historial Educativo";

        botonHistorial.addEventListener("click", () => {
            verHistorialPiloto(piloto);
        });

        celdaAcciones.appendChild(botonHistorial);

        if (activo) {
            const botonEditar = document.createElement("button");
            botonEditar.type = "button";
            botonEditar.className =
                "btn btn-sm btn-outline-primary me-2";
            botonEditar.textContent = "Editar";

            botonEditar.addEventListener("click", () => {
                abrirModalEditarPiloto(piloto);
            });

            const botonDesactivar = document.createElement("button");
            botonDesactivar.type = "button";
            botonDesactivar.className =
                "btn btn-sm btn-outline-danger";
            botonDesactivar.textContent = "Eliminar";

            botonDesactivar.addEventListener("click", () => {
                desactivarPiloto(piloto);
            });

            celdaAcciones.append(
                botonEditar,
                botonDesactivar
            );
        } else {
            celdaAcciones.textContent = "Sin acciones";
        }

        fila.append(
            celdaId,
            celdaNombre,
            celdaDireccion,
            celdaTelefono,
            celdaCorreo,
            celdaEstado,
            celdaAcciones
        );

        tablaPilotos.appendChild(fila);
    });

    infoPaginacionPilotos.textContent =
        `Mostrando ${inicio + 1} a ${fin} de ${totalRegistros} registros.`;

    renderizarPaginacionPilotos(totalPaginas);
}

// PAGINACIÓN
function renderizarPaginacionPilotos(totalPaginas) {
    paginacionPilotos.replaceChildren();

    /*if (totalPaginas <= 1) {
        return;
    }*/

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
            paginaActualPilotos = pagina;
            mostrarPilotos();
        });

        elemento.appendChild(boton);
        paginacionPilotos.appendChild(elemento);
    }

    agregarBoton(
        "Anterior",
        paginaActualPilotos - 1,
        paginaActualPilotos === 1
    );

    const inicioPaginas = Math.max(
        1,
        paginaActualPilotos - 2
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
            pagina === paginaActualPilotos
        );
    }

    agregarBoton(
        "Siguiente",
        paginaActualPilotos + 1,
        paginaActualPilotos === totalPaginas
    );
}

// PREPARAR MODAL PARA REGISTRAR
function abrirModalNuevoPiloto() {
    idPilotoEdicion = null;

    formPiloto.reset();
    tituloModalPiloto.textContent = "Nuevo piloto";

    modalPiloto.show();
}

// PREPARAR MODAL PARA EDITAR
function abrirModalEditarPiloto(piloto) {
    idPilotoEdicion = Number(piloto.id_piloto);

    formPiloto.reset();

    nombrePiloto.value = piloto.nombre ?? "";
    direccionPiloto.value = piloto.direccion ?? "";
    telefonoPiloto.value = piloto.telefono ?? "";
    correoPiloto.value = piloto.correo ?? "";

    tituloModalPiloto.textContent = "Editar piloto";

    modalPiloto.show();
}

// REGISTRAR O ACTUALIZAR PILOTO
formPiloto.addEventListener("submit", async evento => {
    evento.preventDefault();

    const nombre = nombrePiloto.value.trim();
    const direccion = direccionPiloto.value.trim();
    const telefono = telefonoPiloto.value.trim();
    const correoIngresado = correoPiloto.value.trim();

    // Validaciones antes de enviar los datos
    if (!nombre || !direccion || !telefono) {
        alert(
            "El nombre, la dirección y el teléfono son obligatorios."
        );
        return;
    }

    const datos = {
        nombre,
        direccion,
        telefono,
        correo: correoIngresado || null
    };

    const editando = idPilotoEdicion !== null;

    if (editando) {
        datos.id_piloto = idPilotoEdicion;
    }

    const metodo = editando ? "PUT" : "POST";

    try {
        const resultado = await solicitarAPI(
            API_PILOTOS,
            metodo,
            datos
        );

        alert(
            resultado.mensaje ||
            (
                editando
                    ? "Piloto actualizado correctamente."
                    : "Piloto registrado correctamente."
            )
        );

        modalPiloto.hide();
        formPiloto.reset();

        idPilotoEdicion = null;

        await cargarPilotos();

    } catch (error) {
        console.error("Error al guardar piloto:", error);

        alert("No se pudo guardar el piloto: " + error.message);
    }
});

// DESACTIVAR PILOTO
async function desactivarPiloto(piloto) {
    const confirmar = confirm(
        `¿Deseas eliminar al piloto "${piloto.nombre}"?`
    );

    if (!confirmar) {
        return;
    }

    try {
        const resultado = await solicitarAPI(
            API_PILOTOS,
            "DELETE",
            {
                id_piloto: Number(piloto.id_piloto)
            }
        );

        alert(
            resultado.mensaje ||
            "Piloto eliminado correctamente."
        );

        await cargarPilotos();

    } catch (error) {
        console.error("Error al eliminar piloto:", error);

        alert(
            "No se pudo eliminar el piloto: " + error.message
        );
    }
}

// ver historial
function verHistorialPiloto(piloto) {
        const idPiloto = encodeURIComponent(piloto.id_piloto);

        window.location.href =`historial.html?id_piloto=${idPiloto}`;
}

// EVENTOS DE BÚSQUEDA Y PAGINACIÓN
btnNuevoPiloto.addEventListener(
    "click",
    abrirModalNuevoPiloto
);

buscarPilotos.addEventListener("input", () => {
    textoBusquedaPilotos = buscarPilotos.value;
    paginaActualPilotos = 1;

    mostrarPilotos();
});

registrosPorPaginaPilotos.addEventListener("change", () => {
    limitePilotos = Number(
        registrosPorPaginaPilotos.value
    );

    paginaActualPilotos = 1;

    mostrarPilotos();
});

// 5. CARGA INICIAL
cargarPilotos();

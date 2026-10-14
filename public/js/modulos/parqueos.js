
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

        tablaParqueos.innerHTML = "";

        if (!Array.isArray(parqueos) || parqueos.length === 0) {
            tablaParqueos.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        No hay parqueos registrados.
                    </td>
                </tr>
            `;
            return;
        }

        parqueos.forEach(parqueo => {
            const fila = document.createElement("tr");

            const celdaId = document.createElement("td");
            celdaId.textContent = parqueo.id_parqueo;

            const celdaUbicacion = document.createElement("td");
            celdaUbicacion.textContent = parqueo.ubicacion;

            const celdaCapacidad = document.createElement("td");
            celdaCapacidad.textContent = parqueo.capacidad;

            const celdaEstacion = document.createElement("td");
            celdaEstacion.textContent = parqueo.estacion;

            const celdaEstado = document.createElement("td");
            const activo = Number(parqueo.estado) === 1;

            const insignia = document.createElement("span");
            insignia.className = activo
                ? "badge bg-success"
                : "badge bg-secondary";
            insignia.textContent = activo ? "Activo" : "Desactivado";

            celdaEstado.appendChild(insignia);

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

    } catch (error) {
        console.error("Error al cargar parqueos:", error);

        tablaParqueos.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    No se pudieron cargar los parqueos.
                </td>
            </tr>
        `;

        alert("Error al consultar los parqueos: " + error.message);
    }
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
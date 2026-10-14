const API_ACCESOS = "accesos.php";
const API_ESTACIONES_ACCESOS = "estaciones.php";

// Referencias al HTML
const tablaAccesos = document.getElementById("tablaAccesos");
const btnNuevoAcceso = document.getElementById("btnNuevoAcceso");
const modalAccesoElemento = document.getElementById("modalAcceso");
const formAcceso = document.getElementById("formAcceso");

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
            <td colspan="5" class="text-center">
                Cargando accesos...
            </td>
        </tr>
    `;

    try {
        const accesos = await solicitarAPI(API_ACCESOS);

        tablaAccesos.innerHTML = "";

        if (!Array.isArray(accesos) || accesos.length === 0) {
            tablaAccesos.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        No hay accesos activos registrados.
                    </td>
                </tr>
            `;
            return;
        }

        accesos.forEach(acceso => {
            const fila = document.createElement("tr");

            const celdaId = document.createElement("td");
            celdaId.textContent = acceso.id_acceso;

            const celdaNombre = document.createElement("td");
            celdaNombre.textContent = acceso.acceso;

            const celdaEstacion = document.createElement("td");
            celdaEstacion.textContent = acceso.estacion;

            // para conte de guardias
            const celdaGuardias = document.createElement("td");

            const totalGuardias = Number(acceso.guardias_activos ?? 0);

            celdaGuardias.textContent = totalGuardias;
            //

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

    } catch (error) {
        console.error("Error al cargar accesos:", error);

        tablaAccesos.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    No se pudieron cargar los accesos.
                </td>
            </tr>
        `;
    }
}


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
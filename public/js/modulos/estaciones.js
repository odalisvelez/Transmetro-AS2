
const API_ESTACIONES = "estaciones.php";
const API_MUNICIPALIDADES_ESTACIONES = "municipalidades.php";

const tablaEstaciones = document.getElementById("tablaEstaciones");
const botonNuevaEstacion = document.getElementById("btnNuevaEstacion");
const elementoModalEstacion = document.getElementById("modalEstacion");
const formularioEstacion = document.getElementById("formEstacion");
const campoNombreEstacion = document.getElementById("nombreEstacion");
const campoMunicipalidadEstacion = document.getElementById(
    "municipalidadEstacion"
);
const tituloModalEstacion = document.getElementById("tituloModalEstacion");

const modalEstacion = new bootstrap.Modal(elementoModalEstacion);

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

        const estacionesActivas = estaciones.filter(
            estacion => Number(estacion.estado) === 1
        );

        tablaEstaciones.innerHTML = "";

        if (estacionesActivas.length === 0) {
            tablaEstaciones.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        No hay estaciones activas.
                    </td>
                </tr>
            `;
            return;
        }

        estacionesActivas.forEach(estacion => {
            const fila = document.createElement("tr");

            const celdaId = document.createElement("td");
            celdaId.textContent = estacion.id_estacion;

            const celdaNombre = document.createElement("td");
            celdaNombre.textContent = estacion.nombre;

            const celdaMunicipalidad = document.createElement("td");
            celdaMunicipalidad.textContent = estacion.municipalidad;

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

    } catch (error) {
        console.error("Error al cargar estaciones:", error);

        tablaEstaciones.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    No se pudieron cargar las estaciones.
                </td>
            </tr>
        `;
    }
}


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
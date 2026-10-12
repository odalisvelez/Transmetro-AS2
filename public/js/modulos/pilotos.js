const API_PILOTOS = "pilotos.php";

// Referencias a los elementos HTML
const tablaPilotos = document.getElementById("tablaPilotos");
const botonNuevoPiloto = document.getElementById("btnNuevoPiloto");
const elementoModalPiloto = document.getElementById("modalPiloto");
const formularioPiloto = document.getElementById("formPiloto");
const campoNombrePiloto = document.getElementById("nombrePiloto");
// Agrega referencias si tienes estos campos en tu formulario HTML:
const campoDireccionPiloto = document.getElementById("direccionPiloto");
const campoTelefonoPiloto = document.getElementById("telefonoPiloto");
const campoCorreoPiloto = document.getElementById("correoPiloto");

const tituloModalPiloto = document.getElementById("tituloModalPiloto");
const modalPiloto = new bootstrap.Modal(elementoModalPiloto);

// Guarda el ID cuando estamos editando.
// Si es null, estamos registrando un piloto
let idPilotoEditar = null;


// =====================================
// 1. CONSULTAR Y MOSTRAR PILOTOS
// =====================================

async function cargarPilotos() {
    tablaPilotos.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                Cargando pilotos...
            </td>
        </tr>
    `;

    try {
        const respuesta = await solicitarAPI(API_PILOTOS);
        // Aseguramos que 'pilotos' sea un array (dependiendo de cómo responda tu API)
        const pilotos = Array.isArray(respuesta) ? respuesta : respuesta.data || [];

        tablaPilotos.innerHTML = "";

        if (pilotos.length === 0) {
            tablaPilotos.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        No hay pilotos registrados.
                    </td>
                </tr>
            `;
            return;
        }

        pilotos.forEach((piloto) => {
            const fila = document.createElement("tr");

            const celdaId = document.createElement("td");
            celdaId.textContent = piloto.id_piloto;

            const celdaNombre = document.createElement("td");
            celdaNombre.textContent = piloto.nombre;

            const celdaDireccion = document.createElement("td");
            celdaDireccion.textContent = piloto.direccion;

            const celdaTelefono = document.createElement("td");
            celdaTelefono.textContent = piloto.telefono;

            const celdaCorreo = document.createElement("td");
            celdaCorreo.textContent = piloto.correo;

            const celdaEstado = document.createElement("td");
            const etiquetaEstado = document.createElement("span");

            etiquetaEstado.className = "badge text-bg-success";
            etiquetaEstado.textContent = "Activo";
            celdaEstado.appendChild(etiquetaEstado);

            const celdaAcciones = document.createElement("td");
            celdaAcciones.className = "text-end";

            const botonEditar = document.createElement("button");
            botonEditar.type = "button";
            botonEditar.className = "btn btn-sm btn-outline-primary me-2";
            botonEditar.textContent = "Editar";
            botonEditar.dataset.accion = "editar";
            botonEditar.dataset.id = piloto.id_piloto;
            botonEditar.dataset.nombre = piloto.nombre;
            botonEditar.dataset.direccion = piloto.direccion;
            botonEditar.dataset.telefono = piloto.telefono;
            botonEditar.dataset.correo = piloto.correo;
            botonEditar.dataset.estado = piloto.estado;

            const botonEliminar = document.createElement("button");
            botonEliminar.type = "button";
            botonEliminar.className = "btn btn-sm btn-outline-danger";
            botonEliminar.textContent = "Eliminar";
            botonEliminar.dataset.accion = "eliminar";
            botonEliminar.dataset.id = piloto.id_piloto;
            botonEliminar.dataset.nombre = piloto.nombre;

            celdaAcciones.append(botonEditar, botonEliminar);
            fila.append(celdaId, celdaNombre, celdaDireccion, celdaTelefono, celdaCorreo, celdaEstado, celdaAcciones);

            tablaPilotos.appendChild(fila);
        });

    } catch (error) {
        console.error("Error al cargar pilotos:", error);

        tablaPilotos.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    No se pudieron cargar los pilotos.
                </td>
            </tr>
        `;
    }
}


// =====================================
// 2. PREPARAR EL MODAL PARA REGISTRAR
// =====================================

botonNuevoPiloto.addEventListener("click", function () {
    idPilotoEditar = null;
    formularioPiloto.reset();
    tituloModalPiloto.textContent = "Nuevo Piloto";
    modalPiloto.show();
});


// =====================================
// 3. REGISTRAR O EDITAR CON POST / PUT
// =====================================

formularioPiloto.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const nombre = campoNombrePiloto.value.trim();
    if (nombre === "") {
        alert("Ingresar el nombre del piloto");
        campoNombrePiloto.focus();
        return;
    }

    
    const direccion = campoDireccionPiloto.value.trim();
    if (direccion === "") {
        alert(" Ingresar la direccion del piloto");
        campoDireccionPiloto.focus();
        return;
    }

    const telefono = campoTelefonoPiloto.value.trim();
    if (telefono === "") {
        alert(" Ingresar el telefono del piloto");
        campoNombrePiloto.focus();
        return;
    }

    const correo = campoCorreoPiloto.value.trim();  


    //Recoge los demás datos si los tienes en el formulario
    const datosPiloto = {
        nombre: nombre,
        direccion: document.getElementById("direccion")?.value.trim() || "",
        telefono: document.getElementById("telefono")?.value.trim() || "",
        correo: document.getElementById("correo")?.value.trim() || ""
    };  

    let metodo = "POST";
    let archivo = API_PILOTOS;

    if (idPilotoEditar !== null) {
        const confirmar = confirm(`¿Deseas guardar los cambios del piloto "${nombre}"?`);

        if (!confirmar) {
            return;
        }

        metodo = "PUT";
        archivo = `${API_PILOTOS}?id=${idPilotoEditar}`;
    }

    try {
        const resultado = await solicitarAPI(archivo, metodo, datosPiloto);

        alert(
            resultado.mensaje ||
            (metodo === "POST"
                ? "Piloto registrado correctamente."
                : "Piloto actualizado correctamente.")
        );

        modalPiloto.hide();
        formularioPiloto.reset();
        idPilotoEditar = null;

        await cargarPilotos();

    } catch (error) {
        console.error("Error al guardar Piloto:", error);
        alert(error.message);
    }
});


// =====================================
// 4. EDITAR O ELIMINAR UN PILOTO
// =====================================

tablaPilotos.addEventListener("click", async function (evento) {
    const boton = evento.target.closest("button[data-accion]");

    if (!boton) {
        return;
    }

    const id = boton.dataset.id;
    const nombre = boton.dataset.nombre;
    const accion = boton.dataset.accion;

    // EDITAR
    if (accion === "editar") {
        idPilotoEditar = id;
        campoNombrePiloto.value = nombre;
        
        // Rellenar los campos adicionales si existen
        const campoDir = document.getElementById("direccionPiloto");
        if (campoDir) campoDir.value = boton.dataset.direccion || "";

        const campoTel = document.getElementById("telefonoPiloto");
        if (campoTel) campoTel.value = boton.dataset.telefono || "";

        const campoCor = document.getElementById("correoPiloto");
        if (campoCor) campoCor.value = boton.dataset.correo || "";

        tituloModalPiloto.textContent = "Editar Piloto";
        modalPiloto.show();
        return;
    }

    // ELIMINAR
    if (accion === "eliminar") {
        const confirmar = confirm(
            `¿Estás seguro de eliminar al Piloto "${nombre}"?\n\n` +
            "Esta acción no se puede deshacer."
        );

        if (!confirmar) {
            return;
        }

        try {
            const resultado = await solicitarAPI(
                `${API_PILOTOS}?id=${id}`,
                "DELETE"
            );

            alert(
                resultado.mensaje ||
                "Piloto eliminado correctamente."
            );

            await cargarPilotos();

        } catch (error) {
            console.error("Error al eliminar Piloto:", error);
            alert(error.message);
        }
    }
});


// =====================================
// 5. CARGA INICIAL
// =====================================

cargarPilotos();
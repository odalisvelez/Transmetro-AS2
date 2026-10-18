
    
    // ELEMENTOS DEL HTML
const tablaOperadores = document.getElementById("tablaOperadores");
const buscarOperadores = document.getElementById("buscarOperadores");
const registrosPorPaginaOperadores = document.getElementById("registrosPorPaginaOperadores");
const infoPaginacionOperadores = document.getElementById("infoPaginacionOperadores");
const paginacionOperadores = document.getElementById("paginacionOperadores");
const btnNuevoOperador = document.getElementById("btnNuevoOperador");

const formOperador = document.getElementById("formOperador");
const modalOperadorElemento = document.getElementById("modalOperador");
const modalOperador = new bootstrap.Modal(modalOperadorElemento);

const tituloModalOperador = document.getElementById("tituloModalOperador");
const nombreOperador = document.getElementById("nombreOperador");
const telefonoOperador = document.getElementById("telefonoOperador");
const usuarioOperador = document.getElementById("usuarioOperador");
const estacionOperador = document.getElementById("estacionOperador");
const btnGuardarOperador = document.getElementById("btnGuardarOperador");

// Variables de control
let listaOperadores = [];
let todosLosOperadores = [];
let listaUsuarios = [];
let listaEstaciones = [];

let paginaActualOperadores = 1;
let textoBusquedaOperadores = "";
let limiteOperadores = 10;
let idOperadorEditando = null;

//CARGAR OPERADORES
async function cargarOperadores() {
    try {
        todosLosOperadores = await solicitarAPI("operadores.php");

        // La tabla muestra únicamente los operadores activos.
        listaOperadores = todosLosOperadores.filter(
            operador => Number(operador.estado) === 1
        );

        renderizarOperadores();

    } catch (error) {
        console.error("Error al cargar operadores:", error);

        tablaOperadores.replaceChildren();

        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 7;
        celda.className = "text-center text-danger";
        celda.textContent = error.message;

        fila.appendChild(celda);
        tablaOperadores.appendChild(fila);

        infoPaginacionOperadores.textContent =
            "No fue posible cargar los operadores.";
    }
}

//RENDERIZAR TABLA
function renderizarOperadores() {
    const texto = textoBusquedaOperadores.toLowerCase().trim();

    const operadoresFiltrados = listaOperadores.filter(operador => {
        return (
            String(operador.id_operador).toLowerCase().includes(texto) ||
            String(operador.usuario ?? "").toLowerCase().includes(texto) ||
            String(operador.nombre ?? "").toLowerCase().includes(texto) ||
            String(operador.telefono ?? "").toLowerCase().includes(texto) ||
            String(operador.estacion ?? "").toLowerCase().includes(texto)
        );
    });

    const totalRegistros = operadoresFiltrados.length;
    const totalPaginas = Math.ceil(
        totalRegistros / limiteOperadores
    );

    // ajustar la página si cambia el numero de resultados.
    if (totalPaginas > 0 && paginaActualOperadores > totalPaginas) {
        paginaActualOperadores = totalPaginas;
    }

    if (totalPaginas === 0) {
        paginaActualOperadores = 1;
    }

    const inicio = (paginaActualOperadores - 1) * limiteOperadores;

    const operadoresPagina = operadoresFiltrados.slice(
        inicio,
        inicio + limiteOperadores
    );

    tablaOperadores.replaceChildren();

    if (operadoresPagina.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 7;
        celda.className = "text-center text-muted";
        celda.textContent = "No se encontraron operadores.";

        fila.appendChild(celda);
        tablaOperadores.appendChild(fila);

    } else {
        operadoresPagina.forEach(operador => {
            const fila = document.createElement("tr");

            const valores = [
                operador.id_operador,
                operador.usuario,
                operador.nombre,
                operador.telefono || "No registrado",
                operador.estacion
            ];

            valores.forEach(valor => {
                const celda = document.createElement("td");
                celda.textContent = valor ?? "";
                fila.appendChild(celda);
            });

            // Estado
            const celdaEstado = document.createElement("td");
            const insignia = document.createElement("span");

            insignia.className = "badge bg-success";
            insignia.textContent = "Activo";

            celdaEstado.appendChild(insignia);
            fila.appendChild(celdaEstado);

            // Acciones
            const celdaAcciones = document.createElement("td");
            celdaAcciones.className = "text-end";

            const btnEditar = document.createElement("button");
            btnEditar.type = "button";
            btnEditar.className = "btn btn-sm btn-outline-primary me-1";
            btnEditar.textContent = "Editar";
            btnEditar.title = "Editar"; 
            btnEditar.dataset.accion = "editar";
            btnEditar.dataset.id = operador.id_operador;

            const btnDesactivar = document.createElement("button");
            btnDesactivar.type = "button";
            btnDesactivar.className = "btn btn-sm btn-outline-danger";
            btnDesactivar.textContent = "Eliminar";
            btnDesactivar.title = "Desactivar";  
            btnDesactivar.dataset.accion = "desactivar";
            btnDesactivar.dataset.id = operador.id_operador;

            celdaAcciones.append(btnEditar, btnDesactivar);
            fila.appendChild(celdaAcciones);

            tablaOperadores.appendChild(fila);
        });
    }

    // info de paginacion
    const desde = totalRegistros === 0 ? 0 : inicio + 1;
    const hasta = Math.min(inicio + limiteOperadores, totalRegistros);

    infoPaginacionOperadores.textContent =
        `Mostrando ${desde} a ${hasta} de ${totalRegistros} operadores`;

    renderizarPaginacionOperadores(totalPaginas);
}

// PAGINACION

function renderizarPaginacionOperadores(totalPaginas) {
    paginacionOperadores.replaceChildren();

    if (totalPaginas <= 1) {
        return;
    }

    function crearBoton(texto, pagina, deshabilitado = false, activo = false) {
        const elemento = document.createElement("li");
        elemento.className = `page-item${deshabilitado ? " disabled" : ""}${activo ? " active" : ""}`;

        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "page-link";
        boton.textContent = texto;
        boton.disabled = deshabilitado;

        boton.addEventListener("click", () => {
            paginaActualOperadores = pagina;
            renderizarOperadores();
        });

        elemento.appendChild(boton);
        paginacionOperadores.appendChild(elemento);
    }

    crearBoton(
        "Anterior",
        paginaActualOperadores - 1,
        paginaActualOperadores === 1
    );

    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
        crearBoton(
            String(pagina),
            pagina,
            false,
            pagina === paginaActualOperadores
        );
    }

    crearBoton(
        "Siguiente",
        paginaActualOperadores + 1,
        paginaActualOperadores === totalPaginas
    );
}

// CARGAR USUARIOS Y ESTACIONES PARA EL FORMULARIO

async function cargarListasFormulario() {
    // Actualizar los operadores para comprobar las asignaciones.
    todosLosOperadores = await solicitarAPI("operadores.php");

    const [usuarios, estaciones] = await Promise.all([
        solicitarAPI("usuarios.php"),
        solicitarAPI("estaciones.php")
    ]);

    listaUsuarios = usuarios;
    listaEstaciones = estaciones;

    cargarUsuariosEnLista();
    cargarEstacionesEnLista();
}


function cargarUsuariosEnLista() {
    usuarioOperador.replaceChildren();

    const opcionInicial = document.createElement("option");
    opcionInicial.value = "";
    opcionInicial.textContent = "Selecciona un usuario";
    usuarioOperador.appendChild(opcionInicial);

    const usuariosDisponibles = listaUsuarios.filter(usuario => {
        const idUsuario = Number(usuario.id_usuario);

        // Solo se permiten usuarios activos.
        if (Number(usuario.estado) !== 1) {
            return false;
        }

        // No permitir usuarios asociados a otro operador.
        // Se excluye el operador que estamos editando.
        const yaAsignado = todosLosOperadores.some(operador =>
            Number(operador.id_usuario) === idUsuario &&
            Number(operador.id_operador) !== Number(idOperadorEditando)
        );

        return !yaAsignado;
    });

    usuariosDisponibles.forEach(usuario => {
        const opcion = document.createElement("option");

        opcion.value = usuario.id_usuario;
        opcion.textContent = usuario.username;

        usuarioOperador.appendChild(opcion);
    });
}

function cargarEstacionesEnLista() {
    estacionOperador.replaceChildren();

    const opcionInicial = document.createElement("option");
    opcionInicial.value = "";
    opcionInicial.textContent = "Selecciona una estación";
    estacionOperador.appendChild(opcionInicial);

    const estacionesDisponibles = listaEstaciones.filter(estacion => {
        const idEstacion = Number(estacion.id_estacion);

        // Solo se permiten estaciones activas.
        if (Number(estacion.estado) !== 1) {
            return false;
        }

        // No permitir estaciones ocupadas por otro operador activo.
        // La estación actual si se conserva durante la edición.
        const yaAsignada = todosLosOperadores.some(operador =>
            Number(operador.id_estacion) === idEstacion &&
            Number(operador.estado) === 1 &&
            Number(operador.id_operador) !== Number(idOperadorEditando)
        );

        return !yaAsignada;
    });

    estacionesDisponibles.forEach(estacion => {
        const opcion = document.createElement("option");

        opcion.value = estacion.id_estacion;
        opcion.textContent = estacion.nombre;

        estacionOperador.appendChild(opcion);
    });
}

//
///ABRIR MODAL PARA NUEVO OPERADOR

btnNuevoOperador.addEventListener("click", async () => {
    idOperadorEditando = null;

    formOperador.reset();

    tituloModalOperador.textContent = "Nuevo operador";
    btnGuardarOperador.innerHTML =
        '<i class="bi bi-save"></i> Guardar operador';

    try {
        btnGuardarOperador.disabled = true;

        await cargarListasFormulario();

        modalOperador.show();

    } catch (error) {
        alert("No fue posible cargar usuarios y estaciones: " + error.message);
    } finally {
        btnGuardarOperador.disabled = false;
    }
});


//EDITAR OPERADOR
async function editarOperador(id) {
    try {
        idOperadorEditando = Number(id);

        await cargarListasFormulario();

        const operador = todosLosOperadores.find(
            elemento =>
                Number(elemento.id_operador) === Number(idOperadorEditando)
        );

        if (!operador || Number(operador.estado) !== 1) {
            alert("El operador no existe o está desactivado.");
            return;
        }

        formOperador.reset();

        nombreOperador.value = operador.nombre ?? "";
        telefonoOperador.value = operador.telefono ?? "";

        // Seleccionar las asignaciones actuales.
        usuarioOperador.value = operador.id_usuario;
        estacionOperador.value = operador.id_estacion;

        tituloModalOperador.textContent = "Editar operador";
        btnGuardarOperador.innerHTML =
            '<i class="bi bi-save"></i> Actualizar operador';

        modalOperador.show();

    } catch (error) {
        alert("No fue posible cargar el operador: " + error.message);
    }
}

//GUARDAR O ACTUALIZAR OPERADOR

formOperador.addEventListener("submit", async evento => {
    evento.preventDefault();

    const datos = {
        nombre: nombreOperador.value.trim(),
        telefono: telefonoOperador.value.trim() || null,
        id_usuario: Number(usuarioOperador.value),
        id_estacion: Number(estacionOperador.value)
    };

    if (
        !datos.nombre ||
        !datos.id_usuario ||
        !datos.id_estacion
    ) {
        alert("Completa el nombre, el usuario y la estación.");
        return;
    }

    try {
        btnGuardarOperador.disabled = true;

        if (idOperadorEditando === null) {
            // Registrar operador
            await solicitarAPI("operadores.php", "POST", datos);

            alert("Operador registrado correctamente.");

        } else {
            // Actualizar operador
            datos.id_operador = Number(idOperadorEditando);

            await solicitarAPI("operadores.php", "PUT", datos);

            alert("Operador actualizado correctamente.");
        }

        modalOperador.hide();

        formOperador.reset();

        idOperadorEditando = null;

        await cargarOperadores();

    } catch (error) {
        alert("No fue posible guardar el operador: " + error.message);
    } finally {
        btnGuardarOperador.disabled = false;
    }
});

//DESACTIVAR OPERADOR

async function desactivarOperador(id) {
    const confirmar = confirm(
        "¿Deseas eliminar a este operador? Ya no aparecerá en la lista de activos."
    );

    if (!confirmar) {
        return;
    }

    try {
        await solicitarAPI(
            `operadores.php?id_operador=${encodeURIComponent(id)}`,
            "DELETE"
        );

        alert("Operador eliminado correctamente.");

        await cargarOperadores();

    } catch (error) {
        alert("No fue posible eliminar el operador: " + error.message);
    }
}

// EVENTOS DE LA TABLA
tablaOperadores.addEventListener("click", evento => {
    const boton = evento.target.closest("button[data-accion]");

    if (!boton) {
        return;
    }

    const id = boton.dataset.id;

    if (boton.dataset.accion === "editar") {
        editarOperador(id);
    }

    if (boton.dataset.accion === "desactivar") {
        desactivarOperador(id);
    }
});


//BÚSQUEDA Y CANTIDAD DE REGISTROS

buscarOperadores.addEventListener("input", () => {
    textoBusquedaOperadores = buscarOperadores.value;
    paginaActualOperadores = 1;

    renderizarOperadores();
});

registrosPorPaginaOperadores.addEventListener("change", () => {
    limiteOperadores = Number(registrosPorPaginaOperadores.value);
    paginaActualOperadores = 1;

    renderizarOperadores();
});


//LIMPIAR FORMULARIO AL CERRAR EL MODAL

modalOperadorElemento.addEventListener("hidden.bs.modal", () => {
    formOperador.reset();

    idOperadorEditando = null;

    tituloModalOperador.textContent = "Nuevo operador";
    btnGuardarOperador.innerHTML =
        '<i class="bi bi-save"></i> Guardar operador';
});


//INICIALIZAR MÓDULO
cargarOperadores();

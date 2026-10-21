
const API_USUARIOS = "usuarios.php";

    // ELEMENTOS DEL DOM
    const tablaUsuarios = document.getElementById("tablaUsuarios");
    const buscarUsuarios = document.getElementById("buscarUsuarios");
    const registrosPorPagina = document.getElementById(
        "registrosPorPaginaUsuarios"
    );
    const infoPaginacion = document.getElementById(
        "infoPaginacionUsuarios"
    );
    const paginacion = document.getElementById("paginacionUsuarios");

    const btnNuevoUsuario = document.getElementById("btnNuevoUsuario");
    const modalElemento = document.getElementById("modalUsuario");
    const formulario = document.getElementById("formUsuario");
    const tituloModal = document.getElementById("tituloModalUsuario");

    const campoUsername = document.getElementById("usernameUsuario");
    const campoPassword = document.getElementById("passwordUsuario");
    const campoRol = document.getElementById("rolUsuario");
    const ayudaPassword = document.getElementById("ayudaPasswordUsuario");

    const btnGuardar = document.getElementById("btnGuardarUsuario");

    const modalUsuario = bootstrap.Modal.getOrCreateInstance(modalElemento);

    // VARIABLES DEL MODULO
    let listaUsuarios = [];
    let paginaActual = 1;
    let textoBusqueda = "";
    let limiteRegistros = 10;
    let idUsuarioEdicion = null;
    let guardando = false;

    // CARGAR USUARIOS
    async function cargarUsuarios() {

        tablaUsuarios.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    Cargando usuarios...
                </td>
            </tr>
        `;

        try {
            const respuesta = await solicitarAPI(API_USUARIOS);

            if (!Array.isArray(respuesta)) {
                throw new Error(
                    respuesta?.error ||
                    "La API no devolvió una lista válida de usuarios."
                );
            }

            listaUsuarios = respuesta;
            paginaActual = 1;

            mostrarUsuarios();

        } catch (error) {
            console.error("Error al cargar usuarios:", error);

            tablaUsuarios.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        No se pudieron cargar los usuarios.
                    </td>
                </tr>
            `;

            infoPaginacion.textContent = "No hay datos disponibles.";
            paginacion.innerHTML = "";

            alert(
                error.message ||
                "Ocurrió un error al cargar los usuarios."
            );
        }
    }

    // MOSTRAR USUARIOS, BUSCAR Y PAGINAR

    function mostrarUsuarios() {

        const usuariosFiltrados = listaUsuarios.filter(usuario => {

            const texto = textoBusqueda.toLowerCase();

            return (
                String(usuario.id_usuario ?? "")
                    .toLowerCase().includes(texto) ||
                String(usuario.username ?? "")
                    .toLowerCase().includes(texto) ||
                String(usuario.rol ?? "")
                    .toLowerCase().includes(texto) ||
                String(usuario.estado ?? "")
                    .toLowerCase().includes(texto) ||
                (Number(usuario.estado) === 1 ? "activo" : "inactivo")
                    .includes(texto)
            );
        });

        const totalRegistros = usuariosFiltrados.length;
        const totalPaginas = Math.ceil(
            totalRegistros / limiteRegistros
        );

        if (totalPaginas > 0 && paginaActual > totalPaginas) {
            paginaActual = totalPaginas;
        }

        const inicio = (paginaActual - 1) * limiteRegistros;

        const usuariosPagina = usuariosFiltrados.slice(
            inicio,
            inicio + limiteRegistros
        );

        tablaUsuarios.replaceChildren();

        if (usuariosPagina.length === 0) {

            const fila = document.createElement("tr");
            const celda = document.createElement("td");

            celda.colSpan = 5;
            celda.className = "text-center text-muted";
            celda.textContent = "No se encontraron usuarios.";

            fila.appendChild(celda);
            tablaUsuarios.appendChild(fila);

        } else {

            usuariosPagina.forEach(usuario => {

                const fila = document.createElement("tr");

                // ID
                agregarCelda(fila, usuario.id_usuario);

                // Username
                agregarCelda(fila, usuario.username);

                // Rol
                agregarCelda(fila, usuario.rol);

                // Estado
                const celdaEstado = document.createElement("td");
                const insignia = document.createElement("span");

                const activo = Number(usuario.estado) === 1;

                insignia.className = activo
                    ? "badge bg-success"
                    : "badge bg-secondary";

                insignia.textContent = activo
                    ? "Activo"
                    : "Inactivo";

                celdaEstado.appendChild(insignia);
                fila.appendChild(celdaEstado);

                // Acciones
                const celdaAcciones = document.createElement("td");
                celdaAcciones.className = "text-center";

                if (activo) {

                    const botonEditar = document.createElement("button");
                    botonEditar.type = "button";
                    botonEditar.className =
                        "btn btn-sm btn-outline-primary me-2";
                    botonEditar.textContent = "Editar";

                    botonEditar.addEventListener("click", () => {
                        abrirModalEditar(usuario);
                    });

                    celdaAcciones.appendChild(botonEditar);

                    const botonDesactivar = document.createElement("button");
                    botonDesactivar.type = "button";
                    botonDesactivar.className =
                        "btn btn-sm btn-outline-danger";
                    botonDesactivar.textContent = "Eliminar";

                    botonDesactivar.addEventListener("click", () => {
                        desactivarUsuario(usuario);
                    });

                    celdaAcciones.appendChild(botonDesactivar);

                } else {

                    celdaAcciones.textContent = "Sin acciones";
                }

                fila.appendChild(celdaAcciones);
                tablaUsuarios.appendChild(fila);
            });
        }

        // Informacion de paginacion
        const desde = totalRegistros === 0 ? 0 : inicio + 1;
        const hasta = Math.min(
            inicio + limiteRegistros,
            totalRegistros
        );

        infoPaginacion.textContent =
            `Mostrando ${desde} a ${hasta} de ${totalRegistros} usuarios.`;

        mostrarPaginacion(totalPaginas);
    }

    function agregarCelda(fila, valor) {

        const celda = document.createElement("td");

        celda.textContent = valor ?? "";

        fila.appendChild(celda);
    }

    // PAGINACION
    function mostrarPaginacion(totalPaginas) {

        paginacion.replaceChildren();
        /*
        if (totalPaginas <= 1) {
            return;
        } */

        agregarBotonPagina(
            "Anterior",
            paginaActual - 1,
            paginaActual === 1
        );

        for (let numero = 1; numero <= totalPaginas; numero++) {

            // Mostrar un maximo de cinco paginas alrededor
            // de la pagina actual.
            if (
                numero === 1 ||
                numero === totalPaginas ||
                Math.abs(numero - paginaActual) <= 2
            ) {
                agregarBotonPagina(
                    numero,
                    numero,
                    false,
                    numero === paginaActual
                );
            }
        }

        agregarBotonPagina(
            "Siguiente",
            paginaActual + 1,
            paginaActual === totalPaginas
        );
    }

    function agregarBotonPagina(
        texto,
        numero,
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

            paginaActual = numero;
            mostrarUsuarios();
        });

        elemento.appendChild(boton);
        paginacion.appendChild(elemento);
    }

    // MODAL nievo usuario
    function abrirModalNuevo() {

        formulario.reset();

        idUsuarioEdicion = null;

        tituloModal.textContent = "Nuevo usuario";

        campoPassword.required = true;

        ayudaPassword.textContent =
            "Obligatoria para crear un usuario.";

        campoRol.value = "2";

        btnGuardar.innerHTML =
            'Guardar usuario';

        modalUsuario.show();
    }

    // MODAL Eeditar usuairo
    function abrirModalEditar(usuario) {

        formulario.reset();

        idUsuarioEdicion = Number(usuario.id_usuario);

        tituloModal.textContent = "Editar usuario";

        campoUsername.value = usuario.username ?? "";
        campoRol.value = String(usuario.id_rol);

        // no recuperar ni mostrar el hash de contraseña
        campoPassword.value = "";
        campoPassword.required = false;

        ayudaPassword.textContent =
            "Opcional. Déjala vacía para conservar la contraseña actual.";

        btnGuardar.innerHTML =
            ' Guardar cambios';

        modalUsuario.show();
    }

    // CREAR O ACTUALIZAR USUARIO
    formulario.addEventListener("submit", async evento => {

        evento.preventDefault();

        if (guardando) {
            return;
        }

        const username = campoUsername.value.trim();
        const password = campoPassword.value;
        const idRol = Number(campoRol.value);

        if (!username) {
            alert("Debes ingresar un nombre de usuario.");
            campoUsername.focus();
            return;
        }

        if (!Number.isInteger(idRol) || idRol <= 0) {
            alert("Debes seleccionar un rol válido.");
            campoRol.focus();
            return;
        }

        if (idUsuarioEdicion === null && password.length === 0) {
            alert("Debes ingresar una contraseña para el nuevo usuario.");
            campoPassword.focus();
            return;
        }

        const datos = {
            username: username,
            id_rol: idRol
        };

        let metodo;

        if (idUsuarioEdicion === null) {

            metodo = "POST";
            datos.password = password;

        } else {

            metodo = "PUT";
            datos.id_usuario = idUsuarioEdicion;

            // Solo enviar contraseña si se escribio una nueva
            if (password.length > 0) {
                datos.password = password;
            }
        }

        guardando = true;
        btnGuardar.disabled = true;

        try {

            const respuesta = await solicitarAPI(
                API_USUARIOS,
                metodo,
                datos
            );

            modalUsuario.hide();

            alert(
                respuesta?.mensaje ||
                (
                    metodo === "POST"
                        ? "Usuario creado correctamente."
                        : "Usuario actualizado correctamente."
                )
            );

            await cargarUsuarios();

        } catch (error) {

            console.error("Error al guardar usuario:", error);

            alert(
                error.message ||
                "No se pudo guardar el usuario."
            );

        } finally {

            guardando = false;
            btnGuardar.disabled = false;
        }
    });

    // DESACTIVAR USUARIO
    async function desactivarUsuario(usuario) {

        const confirmar = confirm(
            `¿Deseas desactivar al usuario "${usuario.username}"?\n\n` +
            "La cuenta se conservará en la base de datos."
        );

        if (!confirmar) {
            return;
        }

        try {

            const respuesta = await solicitarAPI(
                API_USUARIOS,
                "DELETE",
                {
                    id_usuario: Number(usuario.id_usuario)
                }
            );

            alert(
                respuesta?.mensaje ||
                "Usuario desactivado correctamente."
            );

            await cargarUsuarios();

        } catch (error) {

            console.error("Error al desactivar usuario:", error);

            alert(
                error.message ||
                "No se pudo desactivar el usuario."
            );
        }
    }

    // EVENTOS DE BUSQUEDA Y PAGINACION
    buscarUsuarios.addEventListener("input", () => {

        textoBusqueda = buscarUsuarios.value.trim();
        paginaActual = 1;

        mostrarUsuarios();
    });

    registrosPorPagina.addEventListener("change", () => {

        limiteRegistros = Number(registrosPorPagina.value);
        paginaActual = 1;

        mostrarUsuarios();
    });

    btnNuevoUsuario.addEventListener("click", abrirModalNuevo);

    // INICIALIZAR MODUL
    cargarUsuarios();
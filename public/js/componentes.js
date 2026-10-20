
async function cargarComponente(idContenedor, archivo) {
    const contenedor = document.getElementById(idContenedor);

    if (!contenedor) {
        return;
    }

    try {
        const respuesta = await fetch(archivo);

        if (!respuesta.ok) {
            throw new Error(`No se pudo cargar ${archivo}`);
        }

        contenedor.innerHTML = await respuesta.text();

        if (idContenedor === "contenedorMenu") {
            const sesionValida = await aplicarPermisosMenu();

            if (sesionValida) {
                actualizarMenuActivo();
            }
        }

    } catch (error) {
        console.error(error);
        contenedor.innerHTML =
            "<p class='text-danger'>Error al cargar el componente.</p>";
    }
}


async function aplicarPermisosMenu() {
    try {
        const respuesta = await fetch(
            "/Transmetro-AS/login/sesion.php",
            {
                method: "GET",
                credentials: "same-origin"
            }
        );

        const sesion = await respuesta.json();

        if (!respuesta.ok || !sesion.autenticado) {
            window.location.replace(
                "/Transmetro-AS/public/login.html"
            );
            return false;
        }

        const idRol = Number(sesion.usuario?.id_rol);

        if (![1, 2].includes(idRol)) {
            window.location.replace(
                "/Transmetro-AS/public/login.html"
            );
            return false;
        }

        const elementos = document.querySelectorAll("[data-roles]");
        /*
        const elementos = document.querySelectorAll(
            "#contenedorMenu [data-roles]"
        ); */

        elementos.forEach(elemento => {
            const rolesPermitidos = elemento.dataset.roles
                .split(",")
                .map(rol => Number(rol));

            elemento.hidden = !rolesPermitidos.includes(idRol);
        });

        return true;

    } catch (error) {
        console.error("Error al verificar la sesión:", error);

        window.location.replace(
            "/Transmetro-AS/public/login.html"
        );

        return false;
    }
}


function actualizarMenuActivo() {
    const paginaActual = window.location.pathname;

    const enlaces = document.querySelectorAll(
        "#contenedorMenu .nav-link"
    );

    enlaces.forEach(enlace => {
        const destino = new URL(
            enlace.getAttribute("href"),
            window.location.origin
        ).pathname;

        enlace.classList.toggle(
            "active",
            destino === paginaActual
        );
    });
}


// inicializacion compartida para las páginas
document.addEventListener("DOMContentLoaded", async () => {

    const contenedorMenu = document.getElementById("contenedorMenu");

    if (contenedorMenu) {
        await cargarComponente(
            "contenedorMenu",
            "/Transmetro-AS/public/componentes/menu.html"
        );
    }

    // cierre de sesion compartido
    document.addEventListener("click", async evento => {
        const boton = evento.target.closest("#btnCerrarSesion");

        if (!boton) {
            return;
        }

        boton.disabled = true;
        boton.innerHTML =
            '<span class="spinner-border spinner-border-sm"></span> Cerrando sesión...';

        try {
            const respuesta = await fetch(
                "/Transmetro-AS/login/logout.php",
                {
                    method: "POST",
                    credentials: "same-origin"
                }
            );

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    resultado.error ||
                    resultado.mensaje ||
                    "No se pudo cerrar la sesión."
                );
            }

            window.location.replace(
                "/Transmetro-AS/public/login.html"
            );

        } catch (error) {
            console.error(error);
            alert(error.message);

            boton.disabled = false;
            boton.innerHTML =
                '<i class="bi bi-box-arrow-right"></i> Cerrar sesión';
        }
    });
});
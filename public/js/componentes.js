
async function cargarComponente(idContenedor, archivo) {
    const contenedor = document.getElementById(idContenedor);

    try {
        const respuesta = await fetch(archivo);

        if (!respuesta.ok) {
            throw new Error(`No se pudo cargar ${archivo}`);
        }

        contenedor.innerHTML = await respuesta.text();

        if (idContenedor === "contenedorMenu") {
            actualizarMenuActivo();
        }

    } catch (error) {
        console.error(error);
        contenedor.innerHTML =
            "<p class='text-danger'>Error al cargar el componente.</p>";
    }
}


function actualizarMenuActivo() {
    const paginaActual = window.location.pathname
        .split("/")
        .pop();

    const enlaces = document.querySelectorAll(
        "#contenedorMenu .nav-link"
    );

    enlaces.forEach(enlace => {
        const destino = enlace.getAttribute("href");

        if (destino === paginaActual) {
            enlace.classList.add("active");
        } else {
            enlace.classList.remove("active");
        }
    });
}

const URL_LOGIN = "/Transmetro-AS/login/login.php";

const formularioLogin = document.getElementById("formLogin");
const mensajeLogin = document.getElementById("mensajeLogin");
const btnLogin = document.getElementById("btnLogin");

function mostrarMensaje(texto, tipo) {
    mensajeLogin.textContent = texto;
    mensajeLogin.className = `alert alert-${tipo}`;
}

formularioLogin.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    mensajeLogin.className = "alert d-none";
    btnLogin.disabled = true;
    btnLogin.textContent = "Verificando...";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    try {
        const respuesta = await fetch(URL_LOGIN, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                resultado.error || "No se pudo iniciar sesión."
            );
        }

        // consultar la sesión y comprobar que la cookie se conservo
        const respuestaSesion = await fetch(
            "/Transmetro-AS/login/sesion.php",
            {
                method: "GET",
                credentials: "same-origin"
            }
        );

        const sesion = await respuestaSesion.json();

        if (!respuestaSesion.ok || !sesion.autenticado) {
            throw new Error(
                "Se inició el proceso de acceso, pero no se pudo verificar la sesión."
            );
        }

        mostrarMensaje("Inicio de sesión exitoso.", "success");

        // guardar el destino segun el rol
        // Por ahora ambos roles se dirigen al inicio
        window.location.href = "index.html";

    } catch (error) {
        mostrarMensaje(error.message, "danger");
    } finally {
        btnLogin.disabled = false;
        btnLogin.textContent = "Iniciar sesión";
    }
});

const API_BASE_URL = "/Transmetro-AS/api/";

async function solicitarAPI(archivo, metodo = "GET", datos = null) {
    const opciones = {
        method: metodo,
        headers: {}
    };

    if (datos !== null) {
        opciones.headers["Content-Type"] = "application/json";
        opciones.body = JSON.stringify(datos);
    }

    const respuesta = await fetch(
        `${API_BASE_URL}${archivo}`,
        opciones
    );

    let resultado;

    try {
        resultado = await respuesta.json();
    } catch {
        throw new Error("La API no devolvió JSON válido.");
    }

    if (!respuesta.ok) {
        throw new Error(
            resultado?.error ||
            resultado?.mensaje ||
            `Error HTTP ${respuesta.status}`
        );
    }

    return resultado;
}
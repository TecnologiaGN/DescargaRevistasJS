import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { takeScreenshots } from '../funcionalidades/takeScreenshots.js';
import { mandarMensaje } from '../funcionalidades/mandarMensaje.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let credenciales;
let [webpPaths, imagePaths, originalLinks, svgUrlArray] = [[], [], [], []]

const loadCredenciales = async () => {
    // Si las credenciales están en memoria, no las volvemos a cargar
    if (!credenciales) {
        // Cambiar la ruta para ir al directorio raíz y acceder a 'config\credenciales'
        const filePath = path.join(__dirname, '../..', 'config', 'credenciales', 'credencialesCalameo.json');
        credenciales = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return credenciales;
};

export async function descargarCalameo(linkDescarga, callback, page, networkPath) {
    const { user, password } = await loadCredenciales();
    mandarMensaje('Estableciendo conexión con Calameo, pronto comenzará la descarga...', callback);
    mandarMensaje('Calameo sale el PDF ordenado.', callback);

    // Escuchar las solicitudes de red
    page.on('response', response => {
        const url = response.url();
        if (response.request().method() === 'GET' && url.includes('.svgz')) {
            mandarMensaje(`Respuesta recibida desde: ${url}`, callback);
            originalLinks.push(url);
        }
    });

    await page.goto(linkDescarga, {waitUntil: 'networkidle2', timeout: 340000});
    await page.reload({ waitUntil: 'networkidle2' });
    const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    await waitFor(10000);

    if (originalLinks.length === 0) {
        mandarMensaje('Iniciando Login, espera por fa.', callback)
        // Usuario contraseña
        await page.type('input[name="login"]', user);
        await page.type('input[name="password"]', password);
        await page.click('button.button-submit')
        await new Promise(resolve => setTimeout(resolve, 10000));
    }

    // Tomar el primer enlace
    const firstLink = originalLinks[0];
    mandarMensaje('Descargando desde: ' + firstLink, callback);

    // Función para verificar si una URL existe
    const checkUrlExists = async (url) => {
        try {
            const response = await axios.head(url);
            return response.status === 200; // Devuelve true si la URL existe
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return false; // Devuelve false si la URL no existe
            }
            console.error(`Error al verificar la URL: ${error.message}`);
            return false; // En cualquier otro error, también devolvemos false
        }
    };

    // Función para agregar la URL al array
    const addUrlToArray = (url, pageNumber) => {
        return url.replace(/p\d+.svgz/, `p${pageNumber}.svgz`);
    };

    // Bucle para agregar URLs al array hasta que ya no existan más páginas
    let pageNumber = 1;
    while (true) {
        const url = addUrlToArray(firstLink, pageNumber);
        const exists = await checkUrlExists(url); // Verifica si la URL existe

        if (!exists) break; // Salir del bucle si la URL no existe
        mandarMensaje(`Página ${pageNumber} añadida al array.`, callback);
        svgUrlArray.push(url); // Agrega la URL al array
        pageNumber++;
    }

    // Tomar Screenshots
    imagePaths = await takeScreenshots(svgUrlArray, networkPath, callback);
    // Limpiar y retornar
    const result = { webpPaths: [...webpPaths], imagePaths: [...imagePaths]}
    webpPaths.length = 0;
    imagePaths.length = 0;
    originalLinks.length = 0;
    svgUrlArray.length = 0;
    return result;
}
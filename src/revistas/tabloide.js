import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { mandarMensaje } from '../funcionalidades/mandarMensaje.js';
import { getNameFile } from '../funcionalidades/crearCarpetas.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let credenciales;
let [webpPaths, imagePaths, originalLinks] = [[], [], []]

const loadCredenciales = async () => {
    // Si las credenciales están en memoria, no las volvemos a cargar
    if (!credenciales) {
        // Cambiar la ruta para ir al directorio raíz y acceder a 'config\credenciales'
        const filePath = path.join(__dirname, '../..', 'config', 'credenciales', 'credencialesTabloide.json');
        credenciales = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return credenciales;
};

export async function descargarTabloide(linkDescarga, callback, page, networkPath) {
    const { user, password } = await loadCredenciales();
    mandarMensaje('Tabloide Puede que salga en la primera vez, intenta dos veces más si no resulta.', callback)    

    // Intentar cargar las cookies guardadas de sesiones anteriores
    const cookiesPath = path.join(__dirname, '../..', 'config', 'cookies', 'cookiesTabloide.json');
    if (fs.existsSync(cookiesPath)) {
        const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
        await page.setCookie(...cookies);
    }

    page.on('response', async response => {
        const url = response.url();
        if (response.request().method() === 'GET' && (url.includes('.pdf'))) {
            mandarMensaje(`Respuesta recibida desde: ${url}`, callback);
            originalLinks.push(url);
        }
    });

    await page.setViewport({ width: 1025, height: 768 });
    await page.goto(linkDescarga, { waitUntil: 'networkidle2', timeout: 340000 });
    const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Si no estamos logueados, hacer login
    let loggedIn = false;

    async function logInTabloide() {
        mandarMensaje('Iniciando Login, espera por fa...', callback)
        await page.waitForSelector('.jeg_popuplink'); 
        await page.click('.jeg_popuplink');
        await waitFor(5000);
        await page.type('input[placeholder="Usuario"]', user);
        await page.type('input[type="password"][placeholder="Contraseña"]', password)
        await page.click('input[name="jeg_login_button"]');
        loggedIn = true;
    }

    // Función para descargar la imagen
    const downloadPdf = async () => {
        const firstLink = originalLinks[0];
        mandarMensaje(`Descargando desde: ${firstLink}`, callback);
        try {
            const response = await axios.get(firstLink, { responseType: 'arraybuffer' });
            const filePath = path.join(networkPath, `${await getNameFile()}.pdf`); // Guardar en ruta de red
            fs.writeFileSync(filePath, response.data);
            return filePath;
        } catch (error) {
            console.error(`Error al descargar el pdf: `, error.message);
            return null; // Retornar null si hay un error
        }
    };

    try {
        await logInTabloide();
    } catch (error) {
        mandarMensaje(`Ya está logueado.`, callback);
        console.log('Ya está logueado o ocurrió un error al intentar loguearse', error.message);
    }

    await waitFor(15000);
    await page.evaluate((link) => {window.location.href = link}, linkDescarga);
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await waitFor(5000)
    await page.evaluate(() => window.scrollBy(0, 800));
    await waitFor(10000);
    mandarMensaje('Realizando descarga...', callback);
    await downloadPdf();

    mandarMensaje('PDF descargado exitosamente en la ruta de red.', callback);
    mandarMensaje('PDF ORDENADO.', callback)

    if (loggedIn) {
        // Guardar las cookies para la próxima vez
        const cookies = await page.cookies();
        fs.writeFileSync(cookiesPath, JSON.stringify(cookies));
    }
    // Limpiar y retornar
    const result = { webpPaths: [...webpPaths], imagePaths: [...imagePaths]}
    webpPaths.length = 0;
    imagePaths.length = 0;
    originalLinks.length = 0;
    return result;
}    
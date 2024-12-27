import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getGeneralPath } from '../router/enrutador.js';
import { mandarMensaje } from '../funcionalidades/mandarMensaje.js';
import { eliminarArchivos } from '../funcionalidades/eliminarArchivos.js';
import { crearCarpetas, getNameFile } from '../funcionalidades/crearCarpetas.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let credenciales;

const loadCredenciales = async () => {
    // Si las credenciales están en memoria, no las volvemos a cargar
    if (!credenciales) {
        // Cambiar la ruta para ir al directorio raíz y acceder a 'config\credenciales'
        const filePath = path.join(__dirname, '../..', 'config', 'credenciales', 'credencialesRollingStone.json');
        credenciales = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return credenciales;
};


export async function descargarRollingStone(linkDescarga, callback) {
    const { user, password } = await loadCredenciales(); // Cargar las credenciales desde la memoria si ya fueron cargadas
    const generalPath = getGeneralPath();
    await eliminarArchivos(generalPath);
    const networkPath = await crearCarpetas();
    console.log('El networkpath es: ' + networkPath);
    mandarMensaje('PDF en la red, un minuto por favor...', callback);

    // Lanzar un nuevo navegador
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Intentar cargar las cookies guardadas de sesiones anteriores
    const cookiesPath = path.join(__dirname, '../..', 'config', 'cookies', 'cookiesRollingStone.json');
    if (fs.existsSync(cookiesPath)) {
        const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
        await page.setCookie(...cookies);
    }

    let originalLinks = [];

    // Escuchar las solicitudes de red
    page.on('response', async response => {
        const url = response.url();
        if (response.request().method() === 'GET' && (url.includes('.pdf'))) {
            originalLinks.push(url);
        }
    });

    await page.goto(linkDescarga, { waitUntil: 'networkidle2', timeout: 340000 });

    const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    await waitFor(10000);

    // Si no estamos logueados, hacer login
    let loggedIn = false;

    try {
        await page.waitForSelector('input[placeholder="Nombre de usuario o correo electrónico"]', { timeout: 10000 });
        await page.type('input[placeholder="Nombre de usuario o correo electrónico"]', user);
        await page.waitForSelector('input[placeholder="Password"]');
        await page.type('input[placeholder="Password"]', password);
        await page.waitForSelector('button[name="uael-login-submit"]', { visible: true });
        await page.click('button[name="uael-login-submit"]');

        await waitFor(10000);
        await page.reload({ waitUntil: 'networkidle2' });
        loggedIn = true;
    } catch (error) {
        console.log('Ya está logueado o ocurrió un error al intentar loguearse', error.message);
    }

    await waitFor(20000);
    console.log(originalLinks);

    try {
        const response = await axios.get(originalLinks[0], { responseType: 'arraybuffer' });
        const filePath = path.join(networkPath, `${await getNameFile()}.pdf`); // Guardar en ruta de red
        fs.writeFileSync(filePath, response.data);
    } catch (error) {
        console.error(`Error al descargar el PDF: `, error.message);
    }

    if (loggedIn) {
        // Guardar las cookies para la próxima vez
        const cookies = await page.cookies();
        fs.writeFileSync(cookiesPath, JSON.stringify(cookies));
    }

    mandarMensaje(`PDF Descargado`, callback);

    // Limpieza de arrays
    originalLinks = [];

    // Cerrar el navegador
    await browser.close();
}
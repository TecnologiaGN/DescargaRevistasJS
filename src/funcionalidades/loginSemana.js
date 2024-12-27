import fs from 'fs';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let credenciales;

const loadCredenciales = async () => {
    // Si las credenciales están en memoria, no las volvemos a cargar
    if (!credenciales) {
        // Cambiar la ruta para ir al directorio raíz y acceder a 'config\credenciales'
        const filePath = path.join(__dirname, '../..', 'config', 'credenciales', 'credencialesSemana.json');
        credenciales = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return credenciales;
};

export async function loginSemana(linkDescarga) {
    const { user, password } = await loadCredenciales();

    // Lanzar un navegador y abrir una nueva página
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Intentar cargar las cookies guardadas de sesiones anteriores
    const cookiesPath = path.join(__dirname, '../..', 'config', 'credenciales', 'cookiesSemana.json');
    if (fs.existsSync(cookiesPath)) {
        const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
        console.log("Cookies cargadas:", cookies);  // Verifica si las cookies se están cargando correctamente
        await page.setCookie(...cookies);
    }

    // Ir a la URL principal donde está el iframe
    await page.goto(linkDescarga, { waitUntil: 'networkidle2' });

    // Si no estamos logueados, hacer login
    let loggedIn = false;

    // Hacer clic en el enlace "Iniciar sesión"
    try {
        if (linkDescarga.includes('/articulo/')) {
            await page.waitForSelector('a[data-google-interstitial="false"][href="/login-revista-semana/"]')
            await page.click('a[data-google-interstitial="false"][href="/login-revista-semana/"]');
        } else {
            await page.waitForSelector('#logInId')
            await page.click('#logInId');
        }   
        await page.waitForSelector('input[placeholder="nombre@correoelectronico.com"]'); 
        await page.type('input[placeholder="nombre@correoelectronico.com"]', user);
        await page.type('input[type="password"]', password);
        if (linkDescarga.includes('/articulo/')) {
            await page.click('#gtmIniciarSesionPaywall');
        } else {
            console.log('hizo click')
            await page.click('#gtmIniciarSesionStore');
        }

        // Esperar a que la página se cargue después del login
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 });

        // Si la página contiene el iframe, marcar como logueado
        if (await page.waitForSelector('iframe', { timeout: 5000 })) {
            loggedIn = true;  // Marcar como logueado solo si se carga el iframe
        }
    } catch (error) {
        console.log('Ya está logueado o ocurrió un error al intentar loguearse', error.message);
    }

    // Si se ha logueado, guardar las cookies
    if (loggedIn) {
        const cookies = await page.cookies();
        fs.writeFileSync(cookiesPath, JSON.stringify(cookies));
    }

    // Esperar a que el iframe esté cargado y extraer el enlace
    await page.waitForSelector('iframe');
    const iframeSrc = await page.$eval('iframe[src*="fliphtml5.com"]', iframe => iframe.src);

    // Imprimir el enlace extraído
    console.log('Enlace del iframe:', iframeSrc);

    // Cerrar el navegador
    await browser.close();

    // Retornar el enlace si lo necesitas en una variable
    return iframeSrc;
}

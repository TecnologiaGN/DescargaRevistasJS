import puppeteer from 'puppeteer';

// Lista global para mantener un registro de todos los navegadores abiertos
const openBrowsers = [];

/**
 * Inicia un navegador Puppeteer
 * @returns {Promise<Object>} Instancia del navegador y página
 */
export async function startBrowser() {
    const browser = await puppeteer.launch({ headless: false });
    openBrowsers.push(browser); // Registrar este navegador en la lista global
    const page = await browser.newPage();
    return { browser, page };
}

/**
 * Cierra un navegador específico
 * @param {Object} browser - Instancia del navegador a cerrar
 * @returns {Promise<boolean>} True si se cerró correctamente, false si hubo error
 */
export async function closeBrowser(browser) {
    try {
        if (browser && typeof browser.close === 'function') {
            await browser.close();
            
            // Eliminar este navegador de la lista global
            const index = openBrowsers.indexOf(browser);
            if (index > -1) {
                openBrowsers.splice(index, 1);
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error al cerrar navegador:', error.message);
        return false;
    }
}

/**
 * Cierra todos los navegadores abiertos
 * @returns {Promise<void>}
 */
export async function closeAllBrowsers() {
    try {
        for (const browser of openBrowsers) {
            if (browser && typeof browser.close === 'function') {
                await browser.close().catch(e => console.error('Error al cerrar navegador:', e.message));
            }
        }
        // Limpiar la lista después de cerrar todos los navegadores
        openBrowsers.length = 0;
    } catch (error) {
        console.error('Error en closeAllBrowsers:', error.message);
    }
}

/**
 * Función de utilidad para esperar un tiempo determinado
 * @param {number} ms - Tiempo en milisegundos
 * @returns {Promise<void>}
 */
export const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Registrar eventos para cerrar navegadores en caso de cierre inesperado
process.on('exit', () => {
    // No podemos usar async/await aquí, así que cerramos de forma sincrónica
    openBrowsers.forEach(browser => {
        if (browser && typeof browser.close === 'function') {
            try {
                browser.close();
            } catch (e) {
                console.error('Error al cerrar navegador en exit:', e.message);
            }
        }
    });
});

process.on('SIGINT', async () => {
    console.log('Recibida señal SIGINT, cerrando navegadores...');
    await closeAllBrowsers();
    process.exit(0);
});

process.on('uncaughtException', async (error) => {
    console.error('Excepción no capturada:', error);
    await closeAllBrowsers();
    process.exit(1);
}); 
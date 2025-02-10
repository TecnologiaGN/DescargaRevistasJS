import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { mandarMensaje } from '../funcionalidades/mandarMensaje.js';
import { fileURLToPath } from 'url';
import { getArchivo } from '../router/enrutador.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let credenciales;
let formato = 'webp';
let mayorPagina = 0;
let stopClickNextButton = false;
let [webpPaths, imagePaths, originalLinks] = [[], [], []]

const loadCredenciales = async () => {
    // Si las credenciales están en memoria, no las volvemos a cargar
    if (!credenciales) {
        // Cambiar la ruta para ir al directorio raíz y acceder a 'config\credenciales'
        const filePath = path.join(__dirname, '../..', 'config', 'credenciales', 'credencialesPressreader.json');
        credenciales = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return credenciales;
};

export async function descargarClarin(linkDescarga, callback, page, networkPath) {
    const { user, password } = await loadCredenciales();
    mandarMensaje('URLs cifradas, el PDF sale ordenado. Espera por fa.', callback);
    mandarMensaje('Hay una miniatura de la revista con todas las páginas, la debes buscar y ELIMINAR!!!', callback);     
    
    // Intentar cargar las cookies guardadas de sesiones anteriores
    const cookiesPath = path.join(__dirname, '../..', 'config', 'cookies', 'cookiesPressreader.json');
    if (fs.existsSync(cookiesPath)) {
        const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
        await page.setCookie(...cookies);
    }

    let validacionPaginasActivada = true;

    // Obtiene el número de la página del link
    function getPageNumber(url) {
        const pageMatch = url.match(/page=(\d+)/);
        return pageMatch ? parseInt(pageMatch[1], 10) : null;
    }

    // Escuchar las solicitudes de red
    page.on('response', async response => {
        const url = response.url();
        if (response.request().method() === 'GET' && (url.includes('page=') && url.includes('/img?') && url.includes('scale=') && url.includes('ticket'))) {

            const currentPage = getPageNumber(url);

            // Se valida si hay más páginas
            if (validacionPaginasActivada) {
                console.log('Se llamó la función validacionPaginasActivada')
                validacionPaginasActivada = false;
                let paginaAEvaluar = currentPage + 1; // Se evalua si va a existir la siguiente página
                console.log('mayorPagina es: ', mayorPagina)
                if (paginaAEvaluar > mayorPagina) {
                    mayorPagina = paginaAEvaluar
                } else {
                    stopClickNextButton = true; // Para el cambio de página si no existe
                }
                console.log('contando... ' + ' La página evaluando es: ' + paginaAEvaluar)
                console.log(`Evaluando: &page=${paginaAEvaluar}&`)

                // Comprueba si tiempo después hay un indice nuevo de página
                setTimeout(() => {
                    console.log("La condición ha sido verificada después de 10 segundos");
                    console.log("Los links que hay son: ");
                    console.log (originalLinks);

                    for (let i = 0; i < originalLinks.length; i++) {
                        if (originalLinks[i].includes(`page=${paginaAEvaluar}`)) {
                            console.log('Se han encontrado más páginas, el proceso continua');
                            break;
                        } 
                    }
                    validacionPaginasActivada = true // Después de 10 segudos vuelve a evaluar                 
                }, 30000);
            }

            //--------------------------------------------------------------------------------------------
            // Extrae el valor de `scale=` usando una expresión regular
            const widthMatch = url.match(/scale=(\d+)/);
            let pageMaxScale = {}; // Guarda el scale máximo encontrado por cada página
            
            if (widthMatch) {
                const width = parseInt(widthMatch[1], 10);
                const currentPageNumber = getPageNumber(url); // Obtiene el número de página
            
                if (!pageMaxScale[currentPageNumber] || width > pageMaxScale[currentPageNumber]) {
                    // Si la página no tiene un scale registrado o encontramos un scale mayor, actualizamos
                    pageMaxScale[currentPageNumber] = width;
            
                    // Reemplazar el enlace de la página en el array `originalLinks`
                    originalLinks = originalLinks.filter(link => getPageNumber(link) !== currentPageNumber);
                    originalLinks.push(url);
            
                    console.log(`Nuevo scale máximo (${width}) encontrado para página ${currentPageNumber}, reemplazando enlace.`);
                    mandarMensaje(`Enlace actualizado para página ${currentPageNumber}: ${url}`, callback);
                }
            }
            
            // mandarMensaje(`Respuesta recibida desde: ${url} (ancho más grande encontrado: ${largestWidth})`, callback);
        }
    });

    await page.goto(linkDescarga, { waitUntil: 'networkidle2', timeout: 340000 });
    const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    await waitFor(5000);
    if (getArchivo() === 'pressreader') {
        mandarMensaje('Iniciando Login, espera por fa.', callback)
        // Usuario contraseña
        try {
            await page.click('span[data-bind="text: $.nd.res.val(\'ToolbarTop.SigIn\')"]')
            await page.type('input[id="SignInEmailAddress"]', user);
            await page.type('input[data-bind*="signIn.password"]', password);
            await page.click('button[data-bind*="Dialogs.Signin.Signin"]');
            await waitFor(10000);
            const cookies = await page.cookies();
            fs.writeFileSync(cookiesPath, JSON.stringify(cookies));
        }
        catch (error) {
            console.error('Posible log realizado: ', error)
        }
    }

    // Función para hacer clic en la flecha derecha y esperar
    const clickNextButton = async () => {
        await waitFor(1000)
        // const button = await page.$('.readingnav.rn-right')
        // await button.click();
        await page.keyboard.press('ArrowRight');
        await waitFor(2000)
        await page.mouse.click(200, 65) // clic a la izquierda
        await waitFor(2000)
        await page.mouse.click(200, 65) // clic a la izquierda
        await waitFor(2000)
        await page.mouse.click(500, 65) // clic a la derecha
        await waitFor(2000)
        await page.mouse.click(500, 65) // clic a la derecha
        await waitFor(2000)
    };

    // Repetir clic en el botón correr página
    for (let i = 0; i < 500; i++) { // Cambiar por veces a intentar
        await clickNextButton();
        if (stopClickNextButton) {
            console.log('Se ha parado hijos de fruta!!')
            break;
        }
    }

    // Arreglar el array
    // Paso 1: Agregar un nuevo enlace con `page=1`
    let newLink = originalLinks[0].replace(/page=\d+/, "page=1");
    let paginaUno = newLink.replace(/(&scale=\d+).*$/, '$1');
    originalLinks.push(paginaUno);
    // Paso 2: Eliminar `left, top, right y bottom` de cada URL
    originalLinks = originalLinks.map(url => url.replace(/&left=[^&]+&top=[^&]+&right=[^&]+&bottom=[^&]+/, ''));
    // Paso 3: Ordenar las URLs por el valor de `page`
    originalLinks.sort((a, b) => {
        let pageA = parseInt(a.match(/page=(\d+)/)[1], 10);
        let pageB = parseInt(b.match(/page=(\d+)/)[1], 10);
        return pageA - pageB;
    });

    console.log(originalLinks);

    // Tomar el primer enlace
    mandarMensaje(`Descargando desde: ${originalLinks[0]}`, callback);

    // Función para descargar la imagen
    const downloadImage = async (pageNumber) => {
        const newUrl = originalLinks[pageNumber-1];
        mandarMensaje(newUrl, callback);
        if(originalLinks[0].includes('.webp')) formato = 'webp';
        try {
            console.log('newUrl: ' + newUrl)
            // Configura los encabezados para simular una solicitud desde un navegador
            const response = await axios.get(newUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
                }
            });
            const filePath = path.join(networkPath, `page_${pageNumber}.${formato}`); // Guardar en ruta de red
            fs.writeFileSync(filePath, response.data);
            return filePath;
        } catch (error) {
            console.error(`Error al descargar la página ${pageNumber}:`, error.message);
            return null; // Retornar null si hay un error
        }
    };

    mandarMensaje('Realizando procesos de conversión, espera por favor', callback);
    let pageNumber = 1;
    while (true) {
        if (pageNumber > originalLinks.length) {
            mandarMensaje('No hay más enlaces para descargar.', callback);
            break; // Romper el bucle si no hay más enlaces
        }
        const result = await downloadImage(pageNumber);
        if (result === null) break// Salir si hay un error
        mandarMensaje(`Página ${pageNumber} descargada.`, callback);
        if (formato = 'webp') {
            webpPaths.push(result)
        } else if (formato = 'jpg') {
            imagePaths.push(result)
        }
        pageNumber++;
        }
    // Limpiar y retornar
    const result = { webpPaths: [...webpPaths], imagePaths: [...imagePaths]}
    webpPaths.length = 0;
    imagePaths.length = 0;
    originalLinks.length = 0;
    mayorPagina = 0;
    stopClickNextButton = false;
    return result;
}

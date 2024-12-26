import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getGeneralPath } from '../router/enrutador.js';
import { mandarMensaje } from '../funcionalidades/mandarMensaje.js';
import { crearPdf } from '../funcionalidades/crearPdf.js';
import { webpAjpg } from '../funcionalidades/webpAjpg.js';
import { eliminarArchivos } from '../funcionalidades/eliminarArchivos.js';
import { crearCarpetas } from '../funcionalidades/crearCarpetas.js';

let formato = 'webp';
let largestWidth = 0;
let mayorPagina = 0;
let stopClickNextButton = false;

export async function descargarClarin(linkDescarga, callback) {
    const generalPath = getGeneralPath();
    await eliminarArchivos(generalPath);
    const networkPath = await crearCarpetas();
    console.log('El networkpath es: ' + networkPath)
    mandarMensaje('URLs cifradas, ten MUCHA paciencia y ordena el PDF al final.', callback)    
    // Lanzar un nuevo navegador
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    let originalLinks = [];
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
            //------------------------------------------TIEMPO-------------------------------------------

            const currentPage = getPageNumber(url);

            // 
            if (validacionPaginasActivada) {
                console.log('Se llamó la función validacionPaginasActivada')
                validacionPaginasActivada = false;
                let paginaAEvaluar = currentPage + 1;
                if (paginaAEvaluar > mayorPagina) {
                    mayorPagina = paginaAEvaluar
                } else {
                    stopClickNextButton = true;
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
                    validacionPaginasActivada = true                 
                }, 30000);
            }

            //--------------------------------------------------------------------------------------------
            // Extrae el valor de `scale=` usando una expresión regular
            const widthMatch = url.match(/scale=(\d+)/);
            if (widthMatch) {
                const width = parseInt(widthMatch[1], 10);
                if (width > largestWidth) {
                    // Actualiza el mayor ancho encontrado y resetea el array con el nuevo valor más alto
                    largestWidth = width;
                    originalLinks = [url]; // Reinicia el array con el enlace actual
                    console.log('se ha reiniciado el array con un scale más grande.')
                } else if (width === largestWidth) {
                    // Si tiene el scale máximo
                    if (originalLinks.length === 0) originalLinks.push(url); // Agrega al array si está vacío
                    // Recorrer todas las URLs y solo agregar una por página
                    let isPageExist = originalLinks.some(originalLink => getPageNumber(originalLink) === currentPage);
                    // Si el 'page=' no existe en el array, agregar el nuevo enlace
                    if (!isPageExist) {
                        originalLinks.push(url);
                        mandarMensaje("Enlace agregado: " + url, callback);
                    } 
                }
            }
            // mandarMensaje(`Respuesta recibida desde: ${url} (ancho más grande encontrado: ${largestWidth})`, callback);
        }
    });

    // Navegar a la página específica
    await page.goto(linkDescarga, { waitUntil: 'networkidle2', timeout: 340000 });

    // Se crea waitFor para esperar dentro puppeter
    const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Función para hacer clic en la flecha derecha y esperar
    const clickNextButton = async () => {
        await waitFor(1000)
        // const button = await page.$('.readingnav.rn-right')
        // await button.click();
        await page.keyboard.press('ArrowRight');
        await waitFor(2000)
        await page.mouse.click(100, 70) // clic a la izquierda
        await waitFor(2000)
        await page.mouse.click(100, 70) // clic a la izquierda
        await waitFor(2000)
        await page.mouse.click(500, 70) // clic a la derecha
        await waitFor(2000)
        await page.mouse.click(500, 70) // clic a la derecha
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
    // Paso 2: Eliminar `&scale=x&` y `&ticket=...` de cada URL
    originalLinks = originalLinks.map(url => url.replace(/&left=[^&]+&top=[^&]+&right=[^&]+&bottom=[^&]+/, ''));
    // Paso 3: Ordenar las URLs por el valor de `page`
    originalLinks.sort((a, b) => {
        let pageA = parseInt(a.match(/page=(\d+)/)[1], 10);
        let pageB = parseInt(b.match(/page=(\d+)/)[1], 10);
        return pageA - pageB;
    });

    console.log(originalLinks);

    // Tomar el primer enlace
    const firstLink = originalLinks[0];
    mandarMensaje(`Descargando desde: ${firstLink}`, callback);

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

    let jpgPaths = [];

    mandarMensaje('Realizando procesos de conversión, espera por favor', callback);
    let imagePaths = [];
    let pageNumber = 1;
    while (true) {
        if (pageNumber > originalLinks.length) {
            mandarMensaje('No hay más enlaces para descargar.', callback);
            if (formato = 'webp') jpgPaths = await webpAjpg(imagePaths, callback);
            break; // Romper el bucle si no hay más enlaces
        }
        const result = await downloadImage(pageNumber);
        if (result === null) break// Salir si hay un error
        mandarMensaje(`Página ${pageNumber} descargada.`, callback);
        imagePaths.push(result);
        pageNumber++;
    }
   // Limpiar imágenes descargadas
    await new Promise(resolve => setTimeout(resolve, 5000));
    try {
        imagePaths.forEach(imagePath => fs.unlinkSync(imagePath));
        console.log('Archivos Webp eliminados correctamente.')
    } catch (error) {
        console.error('error al eliminar los webp: ' + error.message)
    }

    // Crear un nuevo PDF
    mandarMensaje('Creándose PDF, espera...', callback);
    await waitFor(5000);
    await crearPdf(jpgPaths, networkPath, callback);
    mandarMensaje('PDF creado exitosamente en la ruta de red.', callback);
    mandarMensaje('ORDENA EL PDF!!!.', callback)

    // Limpieza de arrays
    originalLinks = [];
    jpgPaths = [];
    imagePaths = [];

    // Cerrar el navegador
    await browser.close();
}

import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getArchivo, getGeneralPath } from '../enrutador.js';
import { mandarMensaje } from '../funcionalidades/mandarMensaje.js';
import { crearPdf } from '../funcionalidades/crearPdf.js';
import { webpAjpg } from '../funcionalidades/webpAjpg.js';
import { eliminarArchivos } from '../funcionalidades/eliminarArchivos.js';
import { crearCarpetas } from '../funcionalidades/crearCarpetas.js';

let formato = '';
let largestWidth = 0;

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
    let linksFaltantes = true;

    let validacionPaginasActivada = true;

    function getPageNumber(url) {
        const pageMatch = url.match(/page=(\d+)/);
        return pageMatch ? parseInt(pageMatch[1], 10) : null;
    }

    // Escuchar las solicitudes de red
    page.on('response', async response => {
        const url = response.url();
        if (response.request().method() === 'GET' && (url.includes('page=') && url.includes('/img?') && url.includes('scale=') && url.includes('ticket'))) {
            //------------------------------------------TIEMPO-------------------------------------------

            // Extraer el número de la página de la URL
            const currentPage = getPageNumber(url);

            if (validacionPaginasActivada) {
                validacionPaginasActivada = false;
                let paginaAEvaluar = currentPage + 1;
                console.log('contando... ' + ' La página evaluando es: ' + paginaAEvaluar)
                console.log(`Evaluando: &page=${paginaAEvaluar}&`)
                setTimeout(() => {
                    console.log("La condición ha sido verificada después de 10 segundos");
                    console.log("Los links que hay son: ");
                    console.log (originalLinks);

                    for (let i = 0; i < originalLinks.length; i++) {
                        if (originalLinks[i].includes(`page=${paginaAEvaluar}`)) {
                            linksFaltantes = true;
                            console.log('NO HAY MÁS PÁGINAS.');
                          break;  // No es necesario seguir buscando si ya encontramos uno
                        } else {
                            console.log(originalLinks[i])
                            console.log('No la incluyó wtf!')
                        }
                      }

                    if (!originalLinks.includes(`page=${paginaAEvaluar+1}`)) {

                    }
                }, 30000);
            }

            //--------------------------------------------------------------------------------------------
            // Extrae el valor de `w=` usando una expresión regular
            const widthMatch = url.match(/scale=(\d+)/);
            if (widthMatch) {
                const width = parseInt(widthMatch[1], 10);
    
                if (width > largestWidth) {
                    // Actualiza el mayor ancho encontrado y resetea el array con el nuevo valor más alto
                    largestWidth = width;
                    originalLinks = [url]; // Reinicia el array con el enlace actual
                } else if (width === largestWidth) {
                    // Solo agrega el enlace si tiene el mismo ancho máximo
                    originalLinks.push(url);
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
        if (!linksFaltantes) return false;
        await waitFor(1000)
        const button = await page.$('.readingnav.rn-right')
        await button.click();
        await waitFor(1000)
        await page.mouse.click(300, 70)
        console.log('Se ha dado clic en: 200, 200.')
        await waitFor(1000)
        await page.mouse.click(300, 70)
        console.log('Se ha dado clic en: 200, 200.')
        await waitFor(1000)
        await page.mouse.click(700, 70)
        console.log('Se ha dado clic en: 700, 200.')
        await waitFor(1000)
        await page.mouse.click(700, 70)
        console.log('Se ha dado clic en: 700, 200.')
        await waitFor(1000)
        return true;
    };

    // Repetir clic en el botón correr página
    for (let i = 0; i < 500; i++) { // Cambiar por veces a intentar
        const success = await clickNextButton();
        if (!success) {
            break;
        }
    }

    //
    console.log(originalLinks)

































    // Tomar el primer enlace
    const firstLink = originalLinks[0];
    mandarMensaje(`Descargando desde: ${firstLink}`, callback);

    // Función para descargar la imagen
    const downloadImage = async (pageNumber) => {
        const newUrl = originalLinks[pageNumber-1];
        mandarMensaje(newUrl, callback);
        if(originalLinks[0].includes('.webp')) formato = 'webp';
        try {
            const response = await axios.get(newUrl, { responseType: 'arraybuffer' });
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

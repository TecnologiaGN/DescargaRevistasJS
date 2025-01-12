import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getArchivo, getGeneralPath } from '../router/enrutador.js';
import { mandarMensaje } from '../funcionalidades/mandarMensaje.js';
import { crearPdf } from '../funcionalidades/crearPdf.js';
import { webpAjpg } from '../funcionalidades/webpAjpg.js';
import { eliminarArchivos } from '../funcionalidades/eliminarArchivos.js';
import { crearCarpetas } from '../funcionalidades/crearCarpetas.js';
import { loginSemana } from '../funcionalidades/loginSemana.js';

let formato = '';
let linkDescargaiFrame;

export async function descargarPaginasCifradas(linkDescarga, callback) {
    const generalPath = getGeneralPath();
    await eliminarArchivos(generalPath);
    const networkPath = await crearCarpetas();
    console.log('El networkpath es: ' + networkPath)
    mandarMensaje('URLs cifradas, ten paciencia y ordena el PDF al final.', callback) 

    if (getArchivo() === 'semana') {
        linkDescargaiFrame = await loginSemana(linkDescarga);
    }  
    // Lanzar un nuevo navegador
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    let originalLinks = [];

    // Escuchar las solicitudes de red
    page.on('response', async response => {
        const url = response.url();
        if (response.request().method() === 'GET' && (url.includes('original') || (url.includes('.webp') && url.includes('/large/')) || (url.includes('page=') && url.includes('/img?') && url.includes('scale=') && url.includes('ticket')))) {
            mandarMensaje(`Respuesta recibida desde: ${url}`, callback);
            originalLinks.push(url);
        }
    });

    // Navegar a la página específica
    await page.goto(linkDescargaiFrame, { waitUntil: 'networkidle2', timeout: 340000 });

    // Se crea waitFor para esperar dentro puppeter
    const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Función para hacer clic en la flecha derecha y esperar
    const clickNextButton = async () => {
        try {
            await page.waitForSelector('.flip_button_right', { visible: true, timeout: 5000}); // Cambia esto al selector correcto de la flecha
            const button = await page.$('.flip_button_right'); // Obtén el elemento
            await button.scrollIntoView(); // Desplázate al elemento
            await button.click(); // Haz clic en el botón
            await waitFor(1500); // Esperar 1 segundo
        } catch (error) {
            console.error('Error al hacer clic en el botón:', error.message);
            return false; // Rompe el bucle for
        }
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
    if (getArchivo() === 'semana') await waitFor (30000);
    await crearPdf(jpgPaths, networkPath, callback);
    mandarMensaje('PDF creado exitosamente en la ruta de red.', callback);
    mandarMensaje('ORDENA EL PDF!!!.', callback)

    // Limpieza de arrays
    originalLinks = [];
    jpgPaths = [];
    imagePaths = [];

    // Cerrar el navegador
    await browser.close();

    mandarMensaje('Puppeter Cerrado, ya puedes ingresar otro link.', callback)
}

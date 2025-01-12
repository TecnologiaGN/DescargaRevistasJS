import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { eliminarArchivos } from '../funcionalidades/eliminarArchivos.js';
import { mandarMensaje } from '../funcionalidades/mandarMensaje.js';
import { crearPdf } from '../funcionalidades/crearPdf.js';
import { crearCarpetas } from '../funcionalidades/crearCarpetas.js';
import { getGeneralPath } from '../router/enrutador.js';

export async function descargarYumpu(linkDescarga, callback) {
    const generalPath = getGeneralPath();
    await eliminarArchivos(generalPath);
    const networkPath = await crearCarpetas();
    console.log('El networkpath es: ' + networkPath)
    mandarMensaje('URLs YUMPU cifradas, ten paciencia y ordena el PDF al final.', callback);    
    mandarMensaje('ESTA PÁGINA SE DEBE ORDENAR!!', callback)
    mandarMensaje('Hay una pagina que contiene miniatura de las paginas de la revista, ELIMINAR!!', callback)
    mandarMensaje('Procesando imágenes, no cierres el navegador...', callback)

    // Lanzar un nuevo navegador
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    let originalLinks = [];

    // Escuchar las solicitudes de red
    page.on('response', async response => {
        const url = response.url();
        if (response.request().method() === 'GET' && url.includes('.jpg?') && !url.includes('/bg')) {
            // Verificar si el enlace ya ha sido agregado
            if (!originalLinks.includes(url)) {
                console.log(`Respuesta recibida desde: ${url}`);
                originalLinks.push(url);
            }
        }
    });

    // Navegar a la página específica
    await page.goto(linkDescarga, { waitUntil: 'networkidle2', timeout: 340000 });

    // Se crea waitFor para esperar dentro puppeter
    const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Espera activa hasta que se detecten nuevos enlaces
    let lastLength = 0;
    let maxRetries = 7;
    let retries = 0;
    while (retries < maxRetries) {
        await waitFor(5000); // Espera 5 segundos antes de verificar
        if (originalLinks.length > lastLength) {
            // Si el número de enlaces ha aumentado, resetear los intentos
            retries = 0;
            lastLength = originalLinks.length;
        } else {
            // Si no ha habido nuevos enlaces, aumentar el contador de intentos
            retries++;
            console.log('maxRetries = ' + maxRetries)
            console.log('retries = ' + retries)
        }
    }

    console.log(originalLinks);

    // Tomar el primer enlace
    const firstLink = originalLinks[0];
    mandarMensaje(`Descargando desde: ${firstLink}`, callback);

    // Función para descargar la imagen
    const downloadImage = async (pageNumber) => {
        const newUrl = originalLinks[pageNumber - 1];
        mandarMensaje(newUrl, callback);
        try {
            const response = await axios.get(newUrl, { responseType: 'arraybuffer' });
            const filePath = path.join(networkPath, `page_${pageNumber}.jpg`); // Guardar en ruta de red
            fs.writeFileSync(filePath, response.data);
            return filePath;
        } catch (error) {
            console.error(`Error al descargar la página ${pageNumber}:`, error.message);
            return null; // Retornar null si hay un error
        }
    };

    let jpgPaths = [];
    let pageNumber = 1;
    while (true) {
        if (pageNumber > originalLinks.length) {
            mandarMensaje('No hay más enlaces para descargar.', callback);
            break; // Romper el bucle si no hay más enlaces
        }
        const result = await downloadImage(pageNumber);
        if (result === null) break; // Salir si hay un error
        mandarMensaje(`Página ${pageNumber} descargada.`, callback);
        jpgPaths.push(result);
        pageNumber++;
    }

    // Crear un nuevo PDF
    mandarMensaje('Creándose PDF, espera...', callback);
    await waitFor(5000);
    await crearPdf(jpgPaths, networkPath, callback);
    mandarMensaje('PDF creado exitosamente en la ruta de red.', callback);
    mandarMensaje('ORDENA EL PDF!!!.', callback);

    // Limpieza de arrays
    originalLinks = [];
    jpgPaths = [];

    // Cerrar el navegador
    await browser.close();
    mandarMensaje('Puppeter Cerrado, ya puedes ingresar otro link.', callback)
}

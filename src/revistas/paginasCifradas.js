import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getArchivo } from '../router/enrutador.js';
import { mandarMensaje } from '../funcionalidades/mandarMensaje.js';
import { extraerLinkIFrame } from '../funcionalidades/extraerLinkIFrame.js';

let originalLinks = [];
let webpPaths = [];
let imagePaths = [];
let formato = '';

export async function descargarPaginasCifradas(linkDescarga, callback, page, networkPath) {
    mandarMensaje('Estableciendo conexión, pronto comenzará la descarga...', callback);
    mandarMensaje('URLs cifradas, ten paciencia y ordena el PDF al final.', callback) 

    //-----------------------------BUSCAR-IFRAME-SI-SE-REQUIERE--------------------------------
    if (getArchivo() === 'semana' || getArchivo() === 'eldiario') {
        linkDescarga = await extraerLinkIFrame(linkDescarga);
    }
    
    //--------------------------------PASO-1:FILTRAR-LAS-URLS----------------------------------
    // Escuchar las solicitudes de red
    page.on('response', async response => {
        const url = response.url();
        if (response.request().method() === 'GET' && (url.includes('original') || (url.includes('.webp') && url.includes('/large/')) || (url.includes('page=') && url.includes('/img?') && url.includes('scale=') && url.includes('ticket')))) {
            mandarMensaje(`Respuesta recibida desde: ${url}`, callback);
            originalLinks.push(url);
        }
    });

    await page.goto(linkDescarga, { waitUntil: 'networkidle2', timeout: 340000 });
    const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    //-------------------------PASO-2:PASAR-PÁGINAS-PARA-CARGAR-MEMORIA-------------------------
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
    console.log(originalLinks)

    //-----------------------------PASO-3:FUNCIÓN-DESCARGAR-IMÁGENES-------------------------------
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

    //---------------------------PASO-4:EJECUTAR-DESCARGA-IMÁGENES-----------------------------
    let pageNumber = 1;
    while (true) {
        if (pageNumber > originalLinks.length) {
            mandarMensaje('No hay más enlaces para descargar.', callback);
            break; // Romper el bucle si no hay más enlaces
        }
        const result = await downloadImage(pageNumber);
        if (result === null) break; // Salir si hay un error
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
    return result;
}
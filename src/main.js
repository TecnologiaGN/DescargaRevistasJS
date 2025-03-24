import puppeteer from 'puppeteer';
import fs from 'fs';
import { mandarMensaje } from './funcionalidades/mandarMensaje.js';
import { eliminarArchivos } from './funcionalidades/eliminarArchivos.js';
import { crearPdf } from './funcionalidades/crearPdf.js';
import { descargar, getGeneralPath } from './router/enrutador.js';
import { webpAjpg } from './funcionalidades/webpAjpg.js';
import { crearCarpetas } from './funcionalidades/crearCarpetas.js';

let browser;
let [webpPaths, imagePaths] = [[], []]

export async function main(linkDescarga, callback) {
    try {
        //-----------------------------PASO-1:ELIMINAR-Y-CREAR-CARPETAS-----------------------------------
        const generalPath = getGeneralPath();
        await eliminarArchivos(generalPath);
        const networkPath = await crearCarpetas();

        //---------------------------------PASO-2:LANZAR-EL-NAVEGADOR-------------------------------------
        browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        //------------------------------PASO-3:NAVEGAR-Y-DESCARGAR-PÁGINAS--------------------------------
        ({ webpPaths, imagePaths } = await descargar(linkDescarga, callback, page, networkPath));
        console.log('los webppaths de main: ', webpPaths)
        console.log('los imagepaths de main: ', imagePaths)

        //--------------------------------PASO-4:CONVERSIÓN-DE-FORMATOS-----------------------------------
        if (webpPaths.length > 0) {
            console.log(webpPaths)
            imagePaths = await webpAjpg(webpPaths, callback);
            console.log(imagePaths);
            // Limpiar imágenes descargadas
            await waitFor(5000)
            try {
                webpPaths.forEach(webpPath => {fs.unlinkSync(webpPath)});
                console.log('Archivos Webp eliminados correctamente.');
            } catch (error) {
                console.error('error al eliminar los webp: ' + error.message);
            }
        };

        //-------------------------------------PASO-5:CREAR-EL-PDF----------------------------------------
        if (imagePaths.length > 0) {
            mandarMensaje('Creándose PDF, espera...', callback);
            await waitFor(5000)
            await crearPdf(imagePaths, networkPath, callback);
        }
    } 

    catch (error) {
        mandarMensaje('OCURRIÓ UN ERROR EN LA DESCARGA, VUÉLVELO A INTENTAR.', callback, error.message);
        console.error('Error en la función de descarga:', error.message);
    }

    finally {
        //----------------------------------PASO-6:CERRAR-EL-BROWSER----------------------------------------
        webpPaths.length = 0; imagePaths.length = 0; // Se datos almacenados
        await browser.close();
        browser = null;
        mandarMensaje('Ya puedes ingresar otro link.', callback);
    }
}
import fs from 'fs';
import { mandarMensaje } from './funcionalidades/mandarMensaje.js';
import { eliminarArchivos } from './funcionalidades/eliminarArchivos.js';
import { crearPdf } from './funcionalidades/crearPdf.js';
import { descargar, getGeneralPath } from './router/enrutador.js';
import { webpAjpg } from './funcionalidades/webpAjpg.js';
import { crearCarpetas } from './funcionalidades/crearCarpetas.js';
import { logLink, logError, logInfo } from './funcionalidades/logger.js';
import { startBrowser, closeBrowser, closeAllBrowsers, waitFor } from './browser.js';

// Array para almacenar rutas de archivos
let [webpPaths, imagePaths] = [[], []];

export async function main(linkDescarga, callback) {
    let browser, page;
    let exitoso = false;
    let mensajeError = '';
    
    // Registrar inicio del proceso
    logInfo('Iniciando procesamiento de link', { url: linkDescarga });
    
    try {
        //-----------------------------PASO-1:ELIMINAR-Y-CREAR-CARPETAS-----------------------------------
        const generalPath = getGeneralPath();
        await eliminarArchivos(generalPath);
        const networkPath = await crearCarpetas();
        logInfo('Carpetas preparadas', { networkPath });

        //---------------------------------PASO-2:LANZAR-EL-NAVEGADOR-------------------------------------
        ({ browser, page } = await startBrowser());
        logInfo('Navegador iniciado correctamente');

        //------------------------------PASO-3:NAVEGAR-Y-DESCARGAR-PÁGINAS--------------------------------
        ({ webpPaths, imagePaths } = await descargar(linkDescarga, callback, page, networkPath));
        logInfo('Imágenes descargadas', { 
            webpCount: webpPaths.length,
            imageCount: imagePaths.length
        });

        //--------------------------------PASO-4:CONVERSIÓN-DE-FORMATOS-----------------------------------
        if (webpPaths.length > 0) {
            imagePaths = await webpAjpg(webpPaths, callback);
            logInfo('Conversión de formato completada', { imageCount: imagePaths.length });
            
            // Limpiar imágenes descargadas
            await waitFor(5000);
            try {
                webpPaths.forEach(webpPath => {fs.unlinkSync(webpPath)});
                logInfo('Archivos WebP temporales eliminados');
            } catch (error) {
                logError('Error al eliminar archivos WebP', { error: error.message });
            }
        };

        //-------------------------------------PASO-5:CREAR-EL-PDF----------------------------------------
        if (imagePaths.length > 0) {
            mandarMensaje('Creándose PDF, espera...', callback);
            await waitFor(5000);
            await crearPdf(imagePaths, networkPath, callback);
            logInfo('PDF creado exitosamente', { networkPath });
        }
        
        // Si llegamos aquí sin errores, el proceso fue exitoso
        exitoso = true;
    } 
    catch (error) {
        mensajeError = error.message;
        logError('Error durante el procesamiento', { 
            url: linkDescarga, 
            error: error.message,
            stack: error.stack
        });
        mandarMensaje('OCURRIÓ UN ERROR EN LA DESCARGA, VUÉLVELO A INTENTAR.', callback, error.message);
    }
    finally {
        //----------------------------------PASO-6:CERRAR-EL-BROWSER----------------------------------------
        // Limpiar datos almacenados
        webpPaths.length = 0; 
        imagePaths.length = 0;
        
        // Intentar cerrar el navegador
        try {
            if (!await closeBrowser(browser)) {
                await closeAllBrowsers();
            }
            logInfo('Navegador cerrado correctamente');
        } catch (error) {
            logError('Error al cerrar navegador', { error: error.message });
            mensajeError = mensajeError || `Error al cerrar navegador: ${error.message}`;
            exitoso = false;
        }
        
        // Registrar resultado del procesamiento
        logLink(linkDescarga, exitoso, mensajeError);
        
        mandarMensaje('Ya puedes ingresar otro link.', callback);
    }
}
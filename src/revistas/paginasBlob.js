import fs from 'fs';
import path from 'path';
import { mandarMensaje } from '../funcionalidades/mandarMensaje.js';

let webpPaths = [];
let imagePaths = [];
let validImageUrls = [];

export async function descargarPaginasBlob(linkDescarga, callback, page, networkPath) {
    mandarMensaje('Links tipo blob, ten paciencia y ordena el PDF al final.', callback)    
    await page.goto(linkDescarga, { waitUntil: 'networkidle2', timeout: 340000 }); // Navegar a la página específica
    await page.waitForSelector('.page-img-content', { timeout: 60000 }); // Se toman los links desde el div del HTML   
    const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms)); // Se crea waitFor para esperar dentro puppeteer

    //-----------------------------------1.-CREACIÓN DE FUNCIONES--------------------------------
    //----------------------------1.1.-FUNCIÓN-DE-GUARDAR-URLS-TIPO-BLOB-------------------------
    const updateImageList = async () => {
        // Obtener todas las imágenes visibles en la página
        const newBlobUrls = await page.evaluate(async () => {
            const blobElements = document.querySelectorAll('.page-img-content');
            const imageUrls = Array.from(blobElements).map(element => element.src);
    
            // Crear un array para almacenar las dimensiones de las imágenes
            const imageInfo = await Promise.all(imageUrls.map(async (url) => {
                const response = await fetch(url);
                const blob = await response.blob();
                const imgBitmap = await createImageBitmap(blob);
                return { url, width: imgBitmap.width, height: imgBitmap.height };
            }));
    
            return imageInfo; // Retorna la información de las imágenes (url, width, height)
        });
        // Agregar solo las nuevas imágenes que sean mayores a 1500x1500
        newBlobUrls.forEach(({ url, width, height }) => {
            if (width > 1000 && height > 1000 && !validImageUrls.includes(url)) {
                validImageUrls.push(url);
                mandarMensaje(`Descargando desde: ${url} (${width}x${height})`, callback);
            }
        });
    };

    //----------------------------1.2.-FUNCIÓN-DE-HACER-ZOOM-------------------------
    const clickZoomIcon = async () => {
        try {
            try {
                // Mantén presionada la tecla "Control" y luego presiona "+"
                await page.keyboard.down('Control');
                await page.keyboard.press('+');
                await page.mouse.wheel({ deltaY: -100 });
            } catch (error) {
                console.error('No se pudo hacer zoom con periféricos.', error.message);
            }
            await waitFor(1000)
            await page.waitForSelector('a.btnZoomMore.hz-icon.hz-icn-zoom-more[data-disable-events="true"][data-disable-zoom="true"]');
            const zoomMoreElement = await page.$('a.btnZoomMore.hz-icon.hz-icn-zoom-more[data-disable-events="true"][data-disable-zoom="true"]');
            if (zoomMoreElement) {
                for (let i = 0; i < 4; i++) {
                    await zoomMoreElement.click();
                    await waitFor(1000);
                }
            } else {
                console.error('No se encontró el botón de zoom más.');
            }
            await waitFor(3000);
        } catch (error) {
            console.error('Error al hacer clic en el ícono de zoom:', error.message);
        }
    };

    //----------------------------1.3.-FUNCIÓN-DE-PASAR-PÁGINAS-------------------------
    const pressRightArrowKey = async () => {
        try {
            await page.keyboard.press('ArrowRight'); // Presiona la tecla flecha derecha
            console.log('Tecla flecha derecha presionada.');
            await waitFor(10000); // Espera un poco para permitir que se cargue el nuevo contenido
    
            const initialImageCount = validImageUrls.length; // Número de imágenes antes de actualizar la lista
            await updateImageList(); // Actualiza la lista de imágenes después de cada pulsación de tecla
            const newImageCount = validImageUrls.length; // Número de imágenes después de actualizar la lista
    
            if (newImageCount > initialImageCount) {
                return true; // Si hay nuevas imágenes, continúa presionando la tecla
            } else {
                mandarMensaje('No se encontraron nuevas imágenes. Deteniendo la navegación.', callback);
                return false; // Si no hay nuevas imágenes, deja de presionar la tecla
            }
        } catch (error) {
            console.error('Error al presionar la tecla flecha derecha:', error.message);
            return false; // Detén el proceso en caso de error
        }
    };

    //----------------------------2.-EJECUCIÓN-DE-FUNCIONES-------------------------
    await clickZoomIcon(); // Se hace zoom
    await waitFor(5000);

    // Se recorren las páginas para guardar las imágenes en memoria
    for (let i = 0; i < 500; i++) { // Cambiar por veces a intentar
        const success = await pressRightArrowKey();
        if (!success) {
            break;
        }
    }
    console.log(validImageUrls);

    //-----------------------------2.1-DESCARGA-URLS-BLOB-----------------------------
    for (const imageUrl of validImageUrls) {
        const imageBuffer = await page.evaluate(async (blobUrl) => {
            const response = await fetch(blobUrl);
            const blob = await response.blob();
            const buffer = await blob.arrayBuffer();
            return Array.from(new Uint8Array(buffer)); // Convertir a un array de bytes
        }, imageUrl);
    
        const fileName = `page_${validImageUrls.indexOf(imageUrl)+1}.png`;
        const filePath = path.join(networkPath, fileName);
        fs.writeFileSync(filePath, Buffer.from(imageBuffer));
        mandarMensaje(`Imagen ${validImageUrls.indexOf(imageUrl)+1} descargada`, callback);
        imagePaths.push(filePath)
    }
    // Limpiar y retornar
    const result = { webpPaths: [...webpPaths], imagePaths: [...imagePaths]}
    webpPaths.length = 0;
    imagePaths.length = 0;
    validImageUrls.length = 0;
    return result;
}
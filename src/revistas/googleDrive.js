import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { mandarMensaje } from '../funcionalidades/mandarMensaje.js';

let originalLinks = [];
let imagePaths = [];
let webpPaths = [];

export async function descargarGoogleDrive(linkDescarga, callback, page, networkPath) {
    mandarMensaje('Estableciendo conexión, pronto comenzará la descarga...', callback);
    mandarMensaje('El PDF estará ordenado.', callback);

    //--------------------------------PASO-1:FILTRAR-LAS-URLS----------------------------------
    let pageData = {}; // Objeto para rastrear la mayor `w=` por cada `page=`
    let maxWidth = 0;  // Variable para rastrear el `w=` más grande encontrado
    
    page.on('response', response => {
        const url = response.url();    
        if (response.request().method() === 'GET' &&
            (!url.includes('thumb') && !url.includes('extfile') || (url.includes('page=') && url.includes('/img?') && url.includes('w=')))) {
            // Extrae `page=`, `id=` y `w=`
            const pageMatch = url.match(/page=(\d+)/);
            const idMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
            const widthMatch = url.match(/w=(\d+)/);
    
            if (pageMatch && idMatch && widthMatch) {
                const pageNum = parseInt(pageMatch[1], 10);
                const id = idMatch[1];
                const width = parseInt(widthMatch[1], 10);
    
                // Si encontramos un `w=` más grande, actualizamos todo el array
                if (width > maxWidth) {
                    maxWidth = width;
                    originalLinks = originalLinks.map(link => link.replace(/w=\d+/, `w=${maxWidth}`));
                }
    
                // Si la página no está en `pageData`, o encontramos un `w=` más grande, actualizamos
                if (!pageData[pageNum] || width > pageData[pageNum].width) {
                    pageData[pageNum] = { url, width, id };
    
                    // Buscar si la página ya está en `originalLinks`
                    const existingIndex = originalLinks.findIndex(link => link.includes(`page=${pageNum}`));
    
                    if (existingIndex !== -1) {
                        // Reemplaza el link con el nuevo de mayor `w=`
                        originalLinks[existingIndex] = url.replace(/w=\d+/, `w=${maxWidth}`);
                    } else {
                        // Si no estaba en el array, lo agrega con el `w=` más grande
                        originalLinks.push(url.replace(/w=\d+/, `w=${maxWidth}`));
                    }
    
                    // Ordena `originalLinks` por número de `page=`
                    originalLinks.sort((a, b) => {
                        const pageA = parseInt(a.match(/page=(\d+)/)[1], 10);
                        const pageB = parseInt(b.match(/page=(\d+)/)[1], 10);
                        return pageA - pageB;
                    });
    
                    console.log("Lista actualizada de links:", originalLinks);
                }
            }
        }
    });
    
    await page.goto(linkDescarga, { waitUntil: 'networkidle2', timeout: 340000 });
    await page.reload({ waitUntil: 'networkidle2' });
    const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    //----------------------PASO-3:HACER-SCROLL-HASTA-EL-FIN-DE-LA-PÁGINA-------------------------
    let scroll = 0
    mandarMensaje('Recorriendo páginas de PDF, demora 2 minutos...', callback);
    while (scroll < 250) {
        console.log(`Scroll #${scroll + 1}`);
        await page.keyboard.press('PageDown');
        await waitFor(100);
        scroll++;
    }
    scroll = 0
    console.log('fin de scroll')

    //----------------------PASO-2:HACER-ZOOM-PARA-CARGAR-IMÁGENES-GRANDES------------------------
    await page.waitForSelector('[aria-label="Ampliar"]');
    await waitFor(1500);
    for (let i = 0; i < 12; i++) {
        await page.click('[aria-label="Ampliar"]');
    }
    await waitFor(10000);
    originalLinks.forEach((link, index) => {
        originalLinks[index] = link.replace("webp=true", "jpg=true");
    });
    await waitFor(10000);
    
    //-----------------------------PASO-3:FUNCIÓN-DESCARGAR-IMÁGENES-------------------------------
    let formato = 'png';
    // Tomar el primer enlace
    const firstLink = originalLinks[0];
    mandarMensaje(`Descargando desde: ${firstLink}`, callback);

    // Función para descargar la imagen
    const downloadImage = async (pageNumber) => {
        const newUrl = originalLinks[pageNumber-1];
        mandarMensaje(newUrl, callback);

        let intento = 0;
        let maxintentos = 101;
        while (intento < maxintentos){
            try {
                const response = await axios({
                    method: 'GET',
                    url: newUrl,  // 🔹 Aquí faltaba poner `url:` antes de `newUrl`
                    responseType: 'stream',
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36' }
                });
            
                const filePath = path.join(networkPath, `page_${pageNumber}.${formato}`); // Guardar en ruta de red
                const writer = fs.createWriteStream(filePath);
            
                await new Promise((resolve, reject) => {
                    response.data.pipe(writer);
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
            
                return filePath;
            } catch (error) {
                console.error(`Error al descargar la página ${pageNumber}:`, error.message);

                    mandarMensaje('Bloqueo de google, se reintentará .', callback);
                    intento++;
                    if (intento === maxintentos) return null;
                    await waitFor(500);
                    mandarMensaje(`Intento #${intento}`, callback);

            }
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
        imagePaths.push(result)
        pageNumber++;
    }

    // Limpiar y retornar
    const result = { webpPaths: [...webpPaths], imagePaths: [...imagePaths] }
    webpPaths.length = 0;
    imagePaths.length = 0;
    originalLinks.length = 0;
    return result;
}
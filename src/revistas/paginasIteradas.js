import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { mandarMensaje } from '../funcionalidades/mandarMensaje.js';
import { getArchivo } from '../router/enrutador.js';

let originalLinks = [];
let webpPaths = [];
let imagePaths = [];

export async function descargarPaginasIteradas(linkDescarga, callback, page, networkPath) {
    mandarMensaje('Estableciendo conexión, pronto comenzará la descarga...', callback);
    mandarMensaje('El PDF estará ordenado.', callback);

    //--------------------------------PASO-1:FILTRAR-LAS-URLS----------------------------------
    let largestWidth = 0;
    const regex = /\/page_\d+\.jpg$/;
    // Escuchar las solicitudes de red
    page.on('response', response => {
        const url = response.url();
        if (response.request().method() === 'GET' &&
            (url.includes('original') || url.includes('.jpg?') && !url.includes('thumb') && !url.includes('extfile') || regex.test(url) || (url.includes('page=') && url.includes('/img?') && url.includes('w=')))) {
            if (getArchivo() === 'googleDrive') {
                // Extrae el valor de `w=` usando una expresión regular
                const widthMatch = url.match(/w=(\d+)/);
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
                console.log(`Respuesta recibida desde: ${url} (ancho más grande encontrado: ${largestWidth})`);
            } else {
                console.log(`Respuesta recibida desde: ${url}`);
                originalLinks.push(url);
            }
        }
    });

    await page.goto(linkDescarga, { waitUntil: 'networkidle2', timeout: 340000 });
    await page.reload({ waitUntil: 'networkidle2' });
    const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    await waitFor(10000)

    //----------------------PASO-2:HACER-ZOOM-PARA-CARGAR-IMÁGENES-GRANDES------------------------
    if (getArchivo() === 'googleDrive') {
        await page.waitForSelector('[aria-label="Ampliar"]');
        await waitFor(1500);
        for (let i = 0; i < 12; i++) {
            await page.click('[aria-label="Ampliar"]');
        }
    }
    await waitFor(10000);

    // Tomar el primer enlace
    let firstLink = originalLinks[0];
    if (getArchivo() === 'yumpu') {
        originalLinks = originalLinks.filter(url => {
            const match = url.match(/(\d+)x(\d+)/);  // Buscamos el formato WxH
            if (match) {
                const width = parseInt(match[1]);
                const height = parseInt(match[2]);
                return width >= 1000 && height >= 1000;  // Filtramos si ambos valores son >= 1000
            }
            return false;  // Si no se encuentra resolución, no la incluimos
        });
        firstLink = originalLinks[0]
    }
    mandarMensaje('Descargando desde: ' + firstLink, callback);

    //----------------------------PASO-3:FUNCIÓN-DESCARGAR-IMÁGENES--------------------------------
    let formato = 'jpg';
    const downloadImage = async (url, pageNumber) => {
        let newUrl;

        if (getArchivo() === 'flipsnack') {
            newUrl = url.replace(/page_\d+/, `page_${pageNumber}`); // para flipsnack
        } else if (getArchivo() === 'camacol') {
            newUrl = url.replace(/page\/\d+/, `page/${pageNumber}`)
        } else if (getArchivo() === 'issuu') {
            newUrl = url.replace(/page_\d+/, `page_${pageNumber}`); // para issuu
            formato = 'webp'
        } else if (getArchivo() === 'yumpu') {
            newUrl = url.replace(/(https:\/\/img\.yumpu\.com\/\d+)\/(\d+)(\/)/, `$1/${pageNumber}$3`);
        } else if (getArchivo() === 'googleDrive') {
            newUrl = url.replace(/page=\d+/, `page=${pageNumber}`);  // para google drive
            formato = 'webp'
        }
        try {
            console.log(`Página ${pageNumber} = ${newUrl}`);
            const response = await axios.get(newUrl, { responseType: 'arraybuffer' });
            const filePath = path.join(networkPath, `page_${pageNumber}.${formato}`); // Guardar en ruta de red
            fs.writeFileSync(filePath, response.data);
            return filePath;
        } catch (error) {
            console.error(`Error al descargar la página ${pageNumber}:`, error.message);
            return null; // Retornar null si hay un error
        }
    };

    //-----------------------------PASO-4:EJECUTAR-DESCARGA-IMÁGENES-------------------------------
    let pageNumber = 1;
    if (getArchivo() === 'googleDrive') pageNumber = 0;
    console.log(pageNumber)
    while (true) {
        const result = await downloadImage(firstLink, pageNumber);
        if (result === null) break; // Salir si hay un error
        mandarMensaje(`Página ${pageNumber} descargada.`, callback);
        if (getArchivo() === 'issuu' || getArchivo() === 'googleDrive') {webpPaths.push(result)    
        } else {imagePaths.push(result)}
        pageNumber++;
    }
    // Limpiar y retornar
    const result = { webpPaths: [...webpPaths], imagePaths: [...imagePaths]}
    webpPaths.length = 0;
    imagePaths.length = 0;
    originalLinks.length = 0;
    return result;
}
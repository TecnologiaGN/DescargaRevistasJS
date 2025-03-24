import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const URL_OBJETIVO = 'https://drive.google.com/file/d/1kEn_naBpDWN0_g9-GNkomXkPwi56sQXP/view'; // ?? Reemplázalo con la URL real
const MAX_INTENTOS = 5;

const descargarImagen = async (urlImagen) => {
    try {
        const response = await axios({ url: urlImagen, responseType: 'arraybuffer' });
        const nombreArchivo = path.basename(new URL(urlImagen).pathname);
        fs.writeFileSync(nombreArchivo, response.data);
        console.log(`? Imagen descargada como: ${nombreArchivo}`);
    } catch (error) {
        console.error('? Error descargando la imagen:', error.message);
    }
};

const buscarImagen = (page) => {
    return new Promise((resolve) => {
        page.on('response', async (response) => {
            const url = response.url();
            if (response.request().resourceType() === 'image' && /\.(jpg|png|jpeg)$/i.test(url)) { 
                console.log(`?? Imagen detectada: ${url}`);
                resolve(url);
            }
        });
    });
};

const main = async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    let intentos = 0;
    let urlImagen = null;

    while (intentos < MAX_INTENTOS) {
        console.log(`?? Intento #${intentos + 1}: Cargando página...`);
        await page.goto(URL_OBJETIVO, { waitUntil: 'networkidle2' });

        urlImagen = await buscarImagen(page);
        if (urlImagen) break; // Sale si encuentra la imagen

        console.log(`?? No se encontró la imagen. Recargando...`);
        intentos++;
    }

    if (urlImagen) {
        await page.goto(urlImagen, { waitUntil: 'networkidle2' });
        await descargarImagen(urlImagen);
    } else {
        console.log('? No se encontró una imagen después de varios intentos.');
    }

    await browser.close();
};

main();
import puppeteer from 'puppeteer';
import { getArchivo } from '../router/enrutador.js';
import { loginSemana } from './loginSemana.js';

let iframeSrc;
let browser;

export async function extraerLinkIFrame(linkDescarga) {
    if (getArchivo() === 'semana') iframeSrc = await loginSemana(linkDescarga);
    else {
        try {
            browser = await puppeteer.launch({ headless: false });
            const page = await browser.newPage();
            await page.goto(linkDescarga, { waitUntil: 'networkidle2' });
            await page.waitForSelector('iframe', { timeout: 5000 });
            iframeSrc = await page.$eval('iframe[src*="fliphtml5.com"]', iframe => iframe.src);
            console.log('Enlace del iframe:', iframeSrc);
            await browser.close();
        } catch (error) {
            console.error('Error al extraer el iframe', error.message);
            await browser.close();
            browser = null;
        }
    }
    return iframeSrc
}
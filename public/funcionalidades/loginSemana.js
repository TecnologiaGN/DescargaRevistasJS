import puppeteer from 'puppeteer';

export async function loginSemana(linkDescarga) {
    // Lanzar un navegador y abrir una nueva página
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Ir a la URL principal donde está el iframe
    await page.goto(linkDescarga, { waitUntil: 'networkidle2' });

    // Hacer clic en el enlace "Iniciar sesión"
    await page.click('#logInId');

    // Esperar que aparezca el modal de inicio de sesión (puedes ajustar el selector si es necesario)
    await page.waitForSelector('input[placeholder="nombre@correoelectronico.com"]'); // Esperar el campo del correo electrónico

    // Ingresar el correo electrónico
    await page.type('input[placeholder="nombre@correoelectronico.com"]', 'william.diaz@globalnews.com.co');

    // Ingresar la contraseña
    await page.type('input[type="password"]', 'Semana2020');

    // Hacer clic en el botón "Iniciar sesión"
    await page.click('#gtmIniciarSesionStore');

    // Esperar a que se complete el proceso de inicio de sesión (puedes ajustar este paso según lo que ocurra después del login)
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Esperar a que el iframe esté cargado en la página
    await page.waitForSelector('iframe');

    // Extraer el enlace (src) del iframe
    const iframeSrc = await page.$eval('iframe', iframe => iframe.src);

    // Imprimir el enlace extraído
    console.log('Enlace del iframe:', iframeSrc);

    // Cerrar el navegador
    await browser.close();

    // Retornar el enlace si lo necesitas en una variable
    return iframeSrc;
} 
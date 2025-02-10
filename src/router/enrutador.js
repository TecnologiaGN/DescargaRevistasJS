import { descargarPaginasIteradas } from '../revistas/paginasIteradas.js';
import { descargarPaginasCifradas } from '../revistas/paginasCifradas.js';
import { descargarPaginasBlob } from '../revistas/paginasBlob.js';
import { descargarCalameo } from '../revistas/calameo.js';
import { descargarTabloide } from '../revistas/tabloide.js';
import { descargarClarin } from '../revistas/clarin.js';
import { descargarYumpu } from '../revistas/yumpu.js';
import { descargarRollingStone } from '../revistas/rollingStone.js';

let _archivo = '';
let _generalPath = '\\\\192.168.1.153\\Area-Tecnologia\\DESCARGAREVISTASJS';

export function getGeneralPath() {
    return _generalPath;
}
export function getArchivo() {
    return _archivo;
}
export async function setArchivo(nuevoNombre) {
    _archivo = nuevoNombre;
}
export async function descargar(linkDescarga, callback, page, networkPath) {
    let webpPaths, imagePaths;

    // Mapa de archivos y sus respectivas funciones de descarga
    const downloadFunctions = {
        'flipsnack': descargarPaginasIteradas,
        'camacol': descargarPaginasIteradas,
        'issuu': descargarPaginasIteradas,
        'yumpu': descargarPaginasIteradas,
        'googleDrive': descargarPaginasIteradas,
        'anyflip': descargarPaginasCifradas,
        'semana': descargarPaginasCifradas,
        'fliphtml5': descargarPaginasCifradas,
        'eldiario': descargarPaginasCifradas,
        'heyzine': descargarPaginasBlob,
        'ladevi': descargarPaginasBlob,
        'calameo': descargarCalameo,
        'tabloide': descargarTabloide,
        'clarin': descargarClarin,
        'pressreader': descargarClarin,
        'yumpu2': descargarYumpu,
        'rollingStone': descargarRollingStone
    };
    // Verificar si la función existe en el mapa
    if (downloadFunctions[_archivo]) {
        const result = await downloadFunctions[_archivo](linkDescarga, callback, page, networkPath);
        webpPaths = result.webpPaths;
        imagePaths = result.imagePaths;
    } else {
        console.error(`Función no definida para el archivo: ${_archivo}`);
    }
    return { webpPaths, imagePaths };
}
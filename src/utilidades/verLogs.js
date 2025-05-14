import { readLogLines, filterByLevel } from '../funcionalidades/logger.js';
import chalk from 'chalk';

/**
 * Muestra las líneas de log en la consola
 * @param {Array<string>} lines - Líneas de log
 * @param {boolean} colorize - Si se deben colorear las líneas según su tipo
 * @param {boolean} prettyPrint - Si se debe formatear el JSON para mejor legibilidad
 */
function mostrarLineasLog(lines, colorize = true, prettyPrint = false) {
    if (lines.length === 0) {
        console.log('No hay logs disponibles con los criterios especificados.');
        return;
    }
    
    lines.forEach(line => {
        try {
            // Parsear el JSON del log
            const logData = JSON.parse(line);
            
            // Formatear la salida
            let output;
            if (prettyPrint) {
                const { timestamp, level, message, ...rest } = logData;
                output = `[${timestamp}] [${level}] ${message}`;
                
                // Añadir metadatos si existen
                if (Object.keys(rest).length > 0) {
                    output += '\n' + JSON.stringify(rest, null, 2);
                }
            } else {
                output = line;
            }
            
            // Aplicar colores según el nivel
            if (colorize) {
                switch (logData.level) {
                    case 'DEBUG':
                        console.log(chalk.gray(output));
                        break;
                    case 'INFO':
                        console.log(chalk.blue(output));
                        break;
                    case 'WARNING':
                        console.log(chalk.yellow(output));
                        break;
                    case 'ERROR':
                        console.log(chalk.red(output));
                        break;
                    case 'CRITICAL':
                        console.log(chalk.bgRed.white(output));
                        break;
                    default:
                        console.log(output);
                }
            } else {
                console.log(output);
            }
        } catch (err) {
            // Si no se puede parsear como JSON, mostrar la línea tal cual
            console.log(line);
        }
    });
}

/**
 * Muestra los logs según los parámetros especificados
 * @param {Object} options - Opciones de visualización
 */
function mostrarLogs(options = {}) {
    const { 
        lineas = 20, 
        nivel = 'todos',
        colorize = true,
        prettyPrint = true
    } = options;
    
    let filterFunction = null;
    
    // Determinar función de filtro según el nivel
    if (nivel !== 'todos') {
        filterFunction = filterByLevel(nivel.toUpperCase());
    }
    
    // Leer y filtrar logs
    const logs = readLogLines(lineas, filterFunction);
    
    // Mostrar encabezado
    console.log('\n===== LOGS DE LA APLICACIÓN =====');
    console.log(`Nivel: ${nivel.toUpperCase()}`);
    console.log(`Mostrando: últimas ${lineas} entradas\n`);
    
    // Mostrar logs
    mostrarLineasLog(logs, colorize, prettyPrint);
}

// Ejecución desde línea de comandos
if (process.argv[1].endsWith('verLogs.js')) {
    const args = process.argv.slice(2);
    const options = {
        lineas: 20,
        nivel: 'todos',
        colorize: true,
        prettyPrint: true
    };
    
    // Procesar argumentos
    args.forEach(arg => {
        if (arg === '--info' || arg === '-i') {
            options.nivel = 'info';
        } else if (arg === '--error' || arg === '-e') {
            options.nivel = 'error';
        } else if (arg === '--warning' || arg === '-w') {
            options.nivel = 'warning';
        } else if (arg === '--debug' || arg === '-d') {
            options.nivel = 'debug';
        } else if (arg === '--critical' || arg === '-c') {
            options.nivel = 'critical';
        } else if (arg.startsWith('--lineas=')) {
            options.lineas = parseInt(arg.split('=')[1]) || 20;
        } else if (arg.startsWith('-n=')) {
            options.lineas = parseInt(arg.split('=')[1]) || 20;
        } else if (arg === '--no-color') {
            options.colorize = false;
        } else if (arg === '--raw') {
            options.prettyPrint = false;
        }
    });
    
    mostrarLogs(options);
}

export { mostrarLogs }; 
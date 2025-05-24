import fs from 'fs';
import path from 'path';

// Niveles de log con valores numéricos para facilitar filtrado por nivel
const LOG_LEVELS = {
    DEBUG: { value: 0, name: 'DEBUG' },
    INFO: { value: 1, name: 'INFO' },
    WARNING: { value: 2, name: 'WARNING' },
    ERROR: { value: 3, name: 'ERROR' },
    CRITICAL: { value: 4, name: 'CRITICAL' }
};

// Configuración de logs
const LOG_DIR = 'logs';
const LOG_FILE = 'app.log';
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Asegura que el directorio de logs exista
 * @returns {string} Ruta al directorio de logs
 */
function ensureLogDirectory() {
    const logDirPath = path.join(process.cwd(), LOG_DIR);
    if (!fs.existsSync(logDirPath)) {
        fs.mkdirSync(logDirPath, { recursive: true });
    }
    return logDirPath;
}

/**
 * Rota el archivo de log si excede el tamaño máximo
 * @param {string} logPath - Ruta completa al archivo de log
 */
function rotateLogFileIfNeeded(logPath) {
    if (!fs.existsSync(logPath)) {
        return;
    }
    
    const stats = fs.statSync(logPath);
    if (stats.size >= MAX_LOG_SIZE) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${logPath}.${timestamp}`;
        fs.renameSync(logPath, backupPath);
    }
}

/**
 * Formatea una entrada de logs
 * @param {Object} level - Nivel de log (de LOG_LEVELS)
 * @param {string} message - Mensaje principal
 * @param {Object} metadata - Metadatos adicionales
 * @returns {string} - Línea de log formateada
 */
function formatLogEntry(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    
    // Agregamos información del contexto de ejecución
    const context = {
        ...metadata,
        pid: process.pid
    };
    
    // Formato JSON para facilitar el procesamiento por herramientas de análisis
    const logData = {
        timestamp,
        level: level.name,
        message,
        ...context
    };
    
    return JSON.stringify(logData);
}

/**
 * Escribe una entrada en el archivo de log
 * @param {string} entry - Entrada de log formateada
 */
function writeToLog(entry) {
    const logDirPath = ensureLogDirectory();
    const logFilePath = path.join(logDirPath, LOG_FILE);
    
    // Verificar rotación de logs
    rotateLogFileIfNeeded(logFilePath);
    
    // Añadir entrada al archivo
    fs.appendFileSync(logFilePath, entry + '\n', 'utf8');
}

/**
 * Función principal de logging
 * @param {Object} level - Nivel de log (de LOG_LEVELS)
 * @param {string} message - Mensaje de log
 * @param {Object} metadata - Metadatos adicionales
 */
function log(level, message, metadata = {}) {
    const entry = formatLogEntry(level, message, metadata);
    writeToLog(entry);
}

// Funciones de API pública
export function debug(message, metadata = {}) {
    log(LOG_LEVELS.DEBUG, message, metadata);
}

export function info(message, metadata = {}) {
    log(LOG_LEVELS.INFO, message, metadata);
}

export function warn(message, metadata = {}) {
    log(LOG_LEVELS.WARNING, message, metadata);
}

export function error(message, metadata = {}) {
    log(LOG_LEVELS.ERROR, message, metadata);
}

export function critical(message, metadata = {}) {
    log(LOG_LEVELS.CRITICAL, message, metadata);
}

// Para mantener compatibilidad con el código existente
export function logLink(url, successful, details = '') {
    const level = successful ? LOG_LEVELS.INFO : LOG_LEVELS.ERROR;
    const message = successful ? 'Link procesado exitosamente' : 'Error al procesar link';
    const metadata = {
        url,
        successful,
        details: details || (successful ? 'Operación completada' : 'Error desconocido')
    };
    
    log(level, message, metadata);
}

export function logError(message, errorData = {}) {
    error(message, errorData);
}

export function logInfo(message, data = {}) {
    info(message, data);
}

/**
 * Obtiene las líneas de log
 * @param {number} lines - Número de líneas a leer
 * @param {function} filterFn - Función opcional para filtrar líneas
 * @returns {Array<string>} - Array con las líneas de log
 */
export function readLogLines(lines = 50, filterFn = null) {
    const logDirPath = ensureLogDirectory();
    const logFilePath = path.join(logDirPath, LOG_FILE);
    
    if (!fs.existsSync(logFilePath)) {
        return [];
    }
    
    try {
        const content = fs.readFileSync(logFilePath, 'utf8');
        let logLines = content.split('\n').filter(line => line.trim() !== '');
        
        // Aplicar filtro si existe
        if (filterFn && typeof filterFn === 'function') {
            logLines = logLines.filter(filterFn);
        }
        
        // Devolver las últimas 'lines' líneas
        return logLines.slice(-lines);
    } catch (error) {
        console.error('Error al leer el archivo de log:', error.message);
        return [];
    }
}

// Funciones de filtro para los logs
export const filterByLevel = (levelName) => (line) => {
    try {
        const log = JSON.parse(line);
        return log.level === levelName;
    } catch {
        return false;
    }
};

export const filterSuccessLogs = filterByLevel('INFO');
export const filterErrorLogs = filterByLevel('ERROR'); 
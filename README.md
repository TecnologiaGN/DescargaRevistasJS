# Descargador de Revistas JS

Aplicación para descargar revistas de diferentes plataformas y convertirlas a PDF.

## Características

- Descarga revistas de múltiples plataformas
- Convierte imágenes a formato PDF
- Sistema avanzado de logs para seguimiento y depuración
- Gestión robusta del navegador con Puppeteer

## Requisitos

- Node.js (versión 14 o superior)
- NPM
- Conexión a Internet

## Instalación

1. Clona el repositorio:
```
git clone https://github.com/tu-usuario/descargarevistasjs.git
```

2. Instala las dependencias:
```
cd descargarevistasjs
npm install
```

## Uso

Para descargar una revista, ejecuta:
```
node src/index.js
```

## Sistema de Logs

La aplicación incluye un sistema de logs profesional que registra todos los eventos importantes durante la ejecución.

### Archivos de Logs

Los logs se almacenan en la carpeta `logs` en la raíz del proyecto en un único archivo:

- `app.log` - Registro de todas las operaciones y errores en formato JSON

El sistema implementa rotación automática de logs cuando el archivo alcanza 5MB.

### Visualización de Logs

Utiliza el siguiente comando para ver los logs:

```bash
# Ver todos los logs
node src/utilidades/verLogs.js

# Ver solo logs de error
node src/utilidades/verLogs.js --error

# Ver solo logs de información
node src/utilidades/verLogs.js --info

# Ver logs de warning
node src/utilidades/verLogs.js --warning

# Ver logs de depuración
node src/utilidades/verLogs.js --debug

# Limitar cantidad de logs mostrados
node src/utilidades/verLogs.js --lineas=10

# Desactivar colores
node src/utilidades/verLogs.js --no-color

# Ver en formato JSON sin procesar
node src/utilidades/verLogs.js --raw
```

### Opciones de Visualización

| Opción | Descripción |
|--------|-------------|
| `--info` o `-i` | Muestra solo logs de nivel INFO |
| `--error` o `-e` | Muestra solo logs de nivel ERROR |
| `--warning` o `-w` | Muestra solo logs de nivel WARNING |
| `--debug` o `-d` | Muestra solo logs de nivel DEBUG |
| `--critical` o `-c` | Muestra solo logs de nivel CRITICAL |
| `--lineas=N` o `-n=N` | Limita la salida a N líneas (por defecto 20) |
| `--no-color` | Desactiva la colorización de la salida |
| `--raw` | Muestra el JSON sin formato |

## Estructura de Logs

Cada entrada de log es un objeto JSON con la siguiente estructura:

```json
{
  "timestamp": "2025-05-13T14:33:22.879Z",
  "level": "INFO",
  "message": "Sistema iniciado",
  "pid": 12345,
  "property1": "value1",
  "property2": "value2"
}
```

Los campos principales son:
- `timestamp` - Fecha y hora en formato ISO 8601
- `level` - Nivel de log (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- `message` - Descripción del evento
- `pid` - ID del proceso
- Propiedades adicionales específicas de cada evento

## Niveles de Log

El sistema implementa los siguientes niveles de log en orden de gravedad:

1. `DEBUG` - Información detallada para depuración
2. `INFO` - Mensajes informativos sobre el funcionamiento normal
3. `WARNING` - Advertencias que no interrumpen el flujo
4. `ERROR` - Errores que afectan operaciones específicas
5. `CRITICAL` - Errores graves que pueden afectar al sistema

## Gestión del Navegador

La aplicación utiliza un sistema robusto para manejar el navegador Puppeteer:

- Gestión automática de instancias del navegador
- Cierre seguro incluso en caso de errores
- Evita fugas de memoria cerrando correctamente los navegadores

## Desarrollo

Para desarrolladores que quieran extender la aplicación, el código está organizado en módulos:

- `src/main.js` - Flujo principal de la aplicación
- `src/browser.js` - Gestión del navegador Puppeteer
- `src/funcionalidades/` - Funciones específicas (PDF, conversión, etc.)
- `src/router/` - Enrutamiento y gestión de descargas
- `src/utilidades/` - Herramientas y utilidades adicionales 
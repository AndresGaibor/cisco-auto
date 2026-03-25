# MCP-Packet-Tracer-
MCP para Packet Tracer para conectar con Claude, en base al proyecto de Mats2208 # 🌐 Guía Completa: Conexión Packet Tracer + Claude

## 📋 Tabla de Contenidos
1. [Requisitos Previos](#requisitos-previos)
2. [Paso 1: Clonar el Repositorio](#paso-1-clonar-el-repositorio)
3. [Paso 2: Instalar Dependencias](#paso-2-instalar-dependencias)
4. [Paso 3: Configurar Claude API](#paso-3-configurar-claude-api)
5. [Paso 4: Instalar Extensión PTBuilder](#paso-4-instalar-extensión-ptbuilder)
6. [Paso 5: Ejecutar Bootstrap](#paso-5-ejecutar-bootstrap)
7. [Paso 6: Verificar Conexión](#paso-6-verificar-conexión)
8. [Solución de Problemas](#solución-de-problemas)

---

## 📦 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado en tu PC:

- **Python** (v3.8 o superior) - [Descargar](https://www.python.org/)
- **Node.js** (v16 o superior) - [Descargar](https://nodejs.org/)
- **Packet Tracer 8.0+** - [Descargar](https://www.netacad.com/portal/resources/packet-tracer)
- **Git** - [Descargar](https://git-scm.com/)
- **Visual Studio Code** (recomendado) - [Descargar](https://code.visualstudio.com/)

---

## Paso 1: Clonar el Repositorio

Abre tu terminal (PowerShell en Windows, Terminal en macOS/Linux) y ejecuta:

```bash
git clone https://github.com/Mats2208/MCP-Packet-Tracer.git
cd <LA DIRECCIÓN DONDE SE GUARDÓ EL REPOSITORIO>
```

Esto descargará todo el código necesario en tu PC.

---

## Paso 2: Instalar Dependencias

Una vez dentro de la carpeta del proyecto, instala todas las dependencias necesarias:

```bash
pip install -e .
```

Estos comandos instalarán:
- Las librerías de Python requeridas

---

## Paso 3: Configurar Claude API

### Configurar el archivo `claude_config.json`

En el Modo Desarrollador de Claude, encuentra o crea el archivo `claude_config.json` y complétalo con tu información:

```json
{
  "mcpServers": {
    "packet-tracer": {
      "command": "py",
      "args": [
        "-m",
        "src.packet_tracer_mcp",
        "--stdio"
      ],
      "cwd": "DIRECCIÓN DENTRO DEL PC DONDE SE GUARDÓ EL REPOSITORIO",
      "env": {
        "PYTHONPATH": "DIRECCIÓN DENTRO DEL PC DONDE SE GUARDÓ EL REPOSITORIO"
      }
    }
  }
}
```

## Paso 4: Instalar Extensión PTBuilder

### Descargar la Extensión

1. Ve al repositorio de PTBuilder:
   ```
   https://github.com/kimmknight/PTBuilder.git
   ```

2. Descarga o clona el repositorio:
   ```bash
   git clone https://github.com/kimmknight/PTBuilder.git
   ```

### Instalar en Packet Tracer

1. **Abre Packet Tracer**
2. Ve a **Tools → Options → Extensions** (o **Packet Tracer → Preferences → Extensions** en macOS)
3. Haz clic en **Load Extension**
4. Navega a la carpeta donde descargaste PTBuilder
5. Selecciona el archivo de la extensión (usualmente con extensión `.pts` o similar)
6. Haz clic en **Open**
7. Reinicia Packet Tracer

Deberías ver el botón de PTBuilder en la interfaz de Packet Tracer después de reiniciar.

---

## Paso 5: Ejecutar Bootstrap

El bootstrap inicializa y configura todo el sistema. Ejecutalo en PT:

```bash
/* PT-MCP Bridge */ window.webview.evaluateJavaScriptAsync("setInterval(function(){var x=new XMLHttpRequest();x.open('GET','http://127.0.0.1:54321/next',true);x.onload=function(){if(x.status===200&&x.responseText){$se('runCode',x.responseText)}};x.onerror=function(){};x.send()},500)");
```


Este comando hará:
- ✅ Verificar todas las dependencias
- ✅ Validar la conexión con Claude API
- ✅ Configurar la conexión con Packet Tracer
- ✅ Inicializar la base de datos (si aplica)
- ✅ Crear carpetas necesarias

## Paso 6: Verificar Conexión

Una vez completado el bootstrap, verifica que la conexión con Claude funciona correctamente:

### Opción 1: Verificación Automática

```bash
npm run test:connection
```

O:

```bash
python verify_connection.py
```

### Opción 2: Prueba Manual

Abre Packet Tracer y:

1. **Crea una topología simple**:
   - Añade 1 Router
   - Añade 2 PCs
   - Conecta los dispositivos

2. **Usa la extensión PTBuilder**:
   - Haz clic en el botón de PTBuilder en Packet Tracer
   - Selecciona "Analizar con Claude"

3. **Verifica la Retroalimentación**:

   Claude enviará un análisis como este:
   
   ```
   📊 ANÁLISIS DE RED
   
   ✅ Estado General: Conectado
   - Dispositivos detectados: 3
   - Conexiones activas: 2
   
   🔧 Configuración:
   - Router: Conectado correctamente
   - PC1: IP asignada, conectada
   - PC2: IP asignada, conectada
   
   ✅ Recomendaciones:
   - La topología es funcional
   - Considere implementar DHCP para asignación automática de IPs
   - Las conexiones están bien configuradas
   ```

### Opción 3: Usar la API Directamente

Abre una nueva terminal y prueba:

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"analyze": true}'
```

**✅ Si ves la retroalimentación de Claude, ¡la conexión está funcionando correctamente!**

---

---

## 🔍 Solución de Problemas

### "Error al obtener topología de Packet Tracer"

**Solución:**
1. Verifica que Packet Tracer esté abierto
2. Asegúrate de que la extensión PTBuilder está instalada correctamente
3. Reinicia Packet Tracer

### "Error al ejecutar bootstrap"

**Solución:**
1. Asegúrate de tener todas las dependencias instaladas: `pip install -r requirements.txt && npm install`
2. Verifica que la estructura de carpetas es correcta
3. Revisa los mensajes de error en la terminal

### "No se recibe retroalimentación de Claude"

**Solución:**
1. Verifica tu conexión a internet
2. Comprueba que la clave API es válida
3. Asegúrate de que Packet Tracer tiene una topología activa
4. Revisa los logs del servidor

---

# Guía de Uso con Asistentes de IA

Esta guía te explica cómo usar el proyecto cisco-auto con diferentes asistentes de IA (iFlow, Gemini, Claude) para obtener ayuda experta en tus tareas de redes Cisco.

## Tabla de Contenidos

1. [¿Qué es la Skill de Cisco Networking Assistant?](#qué-es-la-skill-de-cisco-networking-assistant)
2. [Requisitos Previos](#requisitos-previos)
3. [Uso con iFlow CLI](#uso-con-iflow-cli)
4. [Uso con Gemini CLI](#uso-con-gemini-cli)
5. [Uso con Claude Code](#uso-con-claude-code)
6. [Modos de Operación](#modos-de-operación)
7. [Ejemplos de Conversaciones](#ejemplos-de-conversaciones)
8. [Solución de Problemas](#solución-de-problemas)

---

## ¿Qué es la Skill de Cisco Networking Assistant?

Es una extensión de conocimiento que permite a los asistentes de IA (como iFlow, Gemini o Claude) ayudarte específicamente con:

- Configuración de laboratorios Cisco Packet Tracer
- Generación de comandos IOS para copiar y pegar
- Troubleshooting de problemas de red
- Análisis de archivos PKA y YAML
- Guía paso a paso para completar talleres

La skill incluye:
- **4 guías de referencia** detalladas (VLANs, Routing, Seguridad, Troubleshooting)
- **2 scripts auxiliares** (analizador de labs, wizard de configuración)
- **Templates** de configuración
- **Checklists** de verificación

---

## Requisitos Previos

1. **Tener instalado el proyecto cisco-auto**:
   ```bash
   git clone https://github.com/AndresGaibor/cisco-auto.git
   cd cisco-auto
   bun install
   ```

2. **Tener instalado al menos uno de los CLIs de IA**:
   - iFlow CLI (recomendado)
   - Gemini CLI
   - Claude Code

3. **Las skills ya están incluidas** en el proyecto en las carpetas:
   - `.iflow/skills/cisco-networking-assistant/` (para iFlow)
   - `.gemini/skills/cisco-networking-assistant/` (para Gemini)

---

## Uso con iFlow CLI

### Instalación de iFlow CLI

1. Descarga iFlow CLI desde el repositorio oficial
2. Instálalo según las instrucciones de tu sistema operativo
3. Verifica la instalación:
   ```bash
   iflow --version
   ```

### Uso del Proyecto

1. Navega al directorio del proyecto:
   ```bash
   cd /Users/andresgaibor/code/javascript/cisco-auto
   ```

2. Inicia iFlow:
   ```bash
   iflow
   ```

3. La skill se cargará automáticamente. Verás un mensaje indicando que la skill `cisco-networking-assistant` está disponible.

### Interacción

Simplemente escribe tus preguntas en lenguaje natural:

```
"Necesito ayuda con VLANs"
"Analiza mi archivo lab.pka"
"Qué comandos necesito para configurar OSPF?"
"Las PCs no se comunican, ayuda con troubleshooting"
```

---

## Uso con Gemini CLI

### Instalación de Gemini CLI

1. Instala Gemini CLI usando npm:
   ```bash
   npm install -g @google/gemini-cli
   ```

2. Autentícate con tu cuenta de Google:
   ```bash
   gemini auth login
   ```

3. Verifica la instalación:
   ```bash
   gemini --version
   ```

### Uso del Proyecto

1. Navega al directorio del proyecto:
   ```bash
   cd /Users/andresgaibor/code/javascript/cisco-auto
   ```

2. Inicia Gemini:
   ```bash
   gemini
   ```

3. La skill se cargará automáticamente desde `.gemini/skills/cisco-networking-assistant/`

### Comandos Útiles de Gemini

```bash
# Ver skills disponibles
gemini skills list

# Recargar skills
gemini skills reload

# Ver información de una skill
gemini skills info cisco-networking-assistant
```

---

## Uso con Claude Code

### Instalación de Claude Code

1. Instala Claude Code usando npm:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. Autentícate:
   ```bash
   claude auth login
   ```

### Uso del Proyecto

1. Navega al directorio del proyecto:
   ```bash
   cd /Users/andresgaibor/code/javascript/cisco-auto
   ```

2. Inicia Claude:
   ```bash
   claude
   ```

**Nota**: Para Claude, la skill debe estar en `.claude/skills/`. Puedes copiarla:
```bash
cp -r .iflow/skills/cisco-networking-assistant .claude/skills/
```

---

## Modos de Operación

La skill tiene dos modos principales:

### 1. Modo Guía (Aprendizaje)

Ideal cuando quieres aprender y entender cada paso.

**Características**:
- Explicaciones detalladas de cada comando
- Conceptos teóricos claros
- Verificaciones paso a paso
- Tips y mejores prácticas

**Niveles disponibles**:
- **Principiante**: Explica cada modo CLI, qué hace cada comando, por qué es necesario
- **Intermedio**: Comandos con comentarios breves, optimizaciones
- **Avanzado**: Configuraciones optimizadas, troubleshooting profundo

**Ejemplo de uso**:
```
"Necesito ayuda configurando VLANs, soy principiante"
"Explícame paso a paso cómo configurar OSPF"
"Guíame para hacer troubleshooting de conectividad"
```

### 2. Modo Automático (Rápido)

Ideal cuando tienes prisa o ya sabes lo que haces.

**Características**:
- Análisis automático de archivos PKA
- Generación de configuraciones
- Modificación directa de archivos
- Resumen de cambios realizados

**Ejemplo de uso**:
```
"Completa este laboratorio por mí: archivo.pka"
"Genera configuración para Router-on-a-stick"
"Modifica este YAML para agregar VLAN 30"
```

---

## Ejemplos de Conversaciones

### Escenario 1: Configurando VLANs por Primera Vez

**Usuario**: "Necesito ayuda con VLANs, soy principiante"

**IA**:
```
🔍 Entendido. Voy a ayudarte con VLANs paso a paso.

Las VLANs (Virtual LANs) permiten crear redes lógicas separadas dentro 
de un mismo switch físico. Es como tener varios switches en uno.

¿Qué necesitas exactamente?
1. Crear VLANs en switches
2. Configurar Inter-VLAN routing
3. Solucionar un problema
4. Analizar un archivo existente

Mientras tanto, aquí están los conceptos básicos:

📚 CONCEPTOS BÁSICOS DE VLANs
==============================

✅ VLAN: Segmentación lógica de red
✅ Puerto Access: Conecta a un dispositivo final (PC)
✅ Puerto Trunk: Conecta switches entre sí
✅ Native VLAN: VLAN sin etiquetar en enlaces trunk

Pasos típicos:
1. Crear VLANs en el switch
2. Asignar puertos a VLANs
3. Configurar trunk entre switches
4. Configurar router para Inter-VLAN routing (si aplica)

¿Tienes un archivo de Packet Tracer o quieres empezar desde cero?
```

### Escenario 2: Troubleshooting

**Usuario**: "Las PCs no se hacen ping"

**IA**:
```
🔧 VAMOS A DIAGNOSTICAR EL PROBLEMA
====================================

Voy a guiarte por un proceso sistemático.

PASO 1: Verificar Capa 1 (Física)
----------------------------------
En Packet Tracer, observa los cables:
- ¿Están verdes (conectados)?
- ¿O están rojos (desconectados) o naranjas (bloqueados)?

Comando para verificar:
show ip interface brief

¿Qué ves en el estado de las interfaces?
```

### Escenario 3: Modo Automático

**Usuario**: "Analiza este archivo y dime qué falta: labs/vlan-basico.yaml"

**IA**:
```
🤖 ANALIZANDO ARCHIVO
======================

Archivo: labs/vlan-basico.yaml

📊 TOPOLOGÍA DETECTADA:
- 2 Switches (SW-CORE, SW-ACCESS)
- 1 Router (R1)
- 4 PCs (PC1-PC4)

✅ CONFIGURACIÓN EXISTENTE:
- VLAN 10 (VENTAS) creada
- VLAN 20 (CONTABILIDAD) creada
- Enlace trunk entre switches configurado

⚠️ POSIBLES PROBLEMAS:
1. No hay configuración de Router-on-a-stick
2. Las PCs no tienen gateway configurado
3. Falta VTP domain en switches

💡 RECOMENDACIONES:
1. Configurar subinterfaces en R1
2. Verificar IPs de gateway en PCs
3. Agregar VTP domain si se usa VTP

¿Quieres que genere la configuración completa?
```

---

## Solución de Problemas

### Problema: La skill no responde

**Solución**:
1. Verifica que estás en el directorio correcto del proyecto
2. Comprueba que la skill existe:
   ```bash
   ls -la .iflow/skills/cisco-networking-assistant/
   ```
3. Reinicia el CLI de IA

### Problema: Los comandos de la CLI no funcionan

**Solución**:
1. Verifica que Bun está instalado:
   ```bash
   bun --version
   ```
2. Reinstala dependencias:
   ```bash
   bun install
   ```
3. Verifica permisos de ejecución en scripts

### Problema: No puede parsear archivos PKA

**Solución**:
Los archivos PKA de Packet Tracer 8.x están encriptados. La skill puede:
- Intentar extraer información de versiones anteriores
- Usar definiciones YAML en su lugar
- Guiarte para configurar manualmente

### Problema: Gemini/iFlow no encuentra la skill

**Solución**:
1. Verifica la estructura de directorios:
   ```bash
   # Para iFlow
   ls .iflow/skills/cisco-networking-assistant/SKILL.md
   
   # Para Gemini
   ls .gemini/skills/cisco-networking-assistant/SKILL.md
   ```

2. Verifica que SKILL.md existe y tiene contenido

3. Recarga las skills:
   ```bash
   # iFlow: reinicia el CLI
   # Gemini:
   gemini skills reload
   ```

---

## Consejos para Mejores Resultados

1. **Sé específico**: En lugar de "no funciona", di "las PCs en VLAN 10 no pueden hacer ping a la gateway"

2. **Proporciona archivos**: Si tienes un archivo .pka o .yaml, menciónalo para que la IA lo analice

3. **Indica tu nivel**: Dile a la IA si eres principiante, intermedio o avanzado para que adapte las explicaciones

4. **Usa el modo apropiado**:
   - Modo Guía cuando estás aprendiendo
   - Modo Automático cuando tienes prisa

5. **Verifica paso a paso**: En modo guía, confirma cada paso antes de continuar

---

## Recursos Adicionales

- **Documentación técnica**: Revisa la carpeta `docs/`
- **Guías de referencia**: En `.iflow/skills/cisco-networking-assistant/references/`
- **Ejemplos de labs**: En la carpeta `labs/`
- **README principal**: `README.md` en la raíz del proyecto

---

## Soporte

Si encuentras problemas:

1. Revisa esta guía y el README
2. Consulta las guías de referencia en `references/`
3. Abre un issue en GitHub con detalles del problema

---

**Nota**: Esta skill está diseñada para ser usada con asistentes de IA. La calidad de las respuestas depende del modelo de IA subyacente (Gemini, Claude, etc.).

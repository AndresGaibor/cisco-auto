# 🪐 GEMINI.md — Reglas y contexto para Gemini CLI

## Project Overview
**cisco-auto** es una herramienta para automatizar la configuración y validación de laboratorios Cisco Packet Tracer, orientada a estudiantes de redes (ESPOCH). Permite definir topologías en YAML, generar configuraciones IOS, desplegar en paralelo y validar automáticamente.

---

## Reglas Específicas para Gemini CLI

### 1. Prioridad de Ejecución
- **CLI primero:** Ejecuta siempre que sea posible usando la CLI (`bun run ...`).
- Prefiere comandos directos sobre manipulación manual de archivos.
- Consulta los comandos disponibles en `apps/cli/` y la ayuda integrada (`--help`).

### 2. Uso de Archivos y Recursos
- Consulta y modifica archivos fuente antes de recurrir a explicaciones teóricas.
- Si existe un archivo relevante (YAML, PKA, config), úsalo como fuente de verdad.
- No repitas teoría de red ni lógica de skills aquí; referencia los archivos en `docs/` y `references/`.

### 3. Skills, Comandos Locales y Markdown
- Usa skills y documentación Markdown del proyecto para guiar flujos y resolver dudas.
- No dupliques contenido de skills ni de `AGENTS.md`.
- Consulta `.gemini/skills/` para skills locales, `.gemini/commands/` para definiciones de comandos locales y `references/` para guías rápidas.

### 4. Engram (Memoria Auxiliar)
- Consulta Engram antes de tomar decisiones de arquitectura, patrones o convenciones.
- Guarda aprendizajes, decisiones y problemas no triviales en Engram tras cada tarea relevante.
- Mantén Engram pequeño y enfocado: solo lo esencial, sin repetir lo que ya está en Markdown.

### 5. Tickets y Reportes
- Crea un ticket si una tarea no puede completarse por falta de información, bloqueo externo o error crítico.
- Crea un reporte al finalizar tareas complejas, cambios de arquitectura o descubrimientos importantes.
- Usa los formatos de tickets/reportes definidos en el proyecto.

### 6. Idioma y Estilo
- Toda interacción y documentación debe estar en **español**.
- Usa un tono práctico y directo.

---

## Guía breve de gestión del conocimiento (para Gemini)

- Este archivo es un punto de entrada conciso: referencia las reglas globales en `AGENTS.md` en lugar de repetirlas.
- Sigue la política "CLI primero / Archivos primero": ejecuta comandos desde la CLI (`bun run ...`) y usa archivos fuente (YAML, PKA, config) como fuente de verdad.
- No dupliques contenido de skills ni de `.claude/skills/` — apunta a la skill especializada: `.claude/skills/cisco-networking-assistant/SKILL.md` cuando necesites la lógica o plantillas oficiales.
- Las definiciones de comandos de Gemini viven en `.gemini/commands/`; úsalas para generar tickets y reportes estandarizados (no copies plantillas aquí).
- Engram: registra decisiones y aprendizajes no triviales; consulta Engram antes de cambios de arquitectura. Evita duplicar lo que ya está documentado en Markdown.
- Mantén este documento corto: objetivo = orientar dónde buscar (AGENTS.md, skills, .gemini/commands/) y cómo actuar, no reemplazar esas fuentes.

## Referencias Locales
- **Comandos principales:** Ver sección "Main Commands" arriba o ejecuta `bun run apps/cli/src/index.ts --help`.
- **Guías rápidas:** Consulta `docs/` y `references/` para detalles de configuración, teoría de red y troubleshooting.
- **Skills:** `.gemini/skills/` para skills locales, `.claude/skills/` para skills de Claude, `.iflow/skills/` para iFlow.
- **Comandos locales:** `.gemini/commands/` contiene las definiciones de comandos locales para Gemini CLI.
- **Engram:** Usa solo para aprendizajes y decisiones no triviales.

---

## Notas
- No repitas ni sobrescribas la visión general del proyecto.
- Este archivo complementa, no reemplaza, `AGENTS.md`.
- Si tienes dudas sobre flujos, consulta primero `AGENTS.md` y luego los archivos de skills.

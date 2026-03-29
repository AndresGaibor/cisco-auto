# AGENTS.md — Reglas Globales para Agentes

Este archivo define las reglas y prioridades globales para el uso de agentes, skills y memoria en el proyecto **cisco-auto**. No repite la teoría de red ni la lógica de skills, solo establece el marco de operación para todos los asistentes y hosts.

---

## 1. Prioridad de Acciones (de mayor a menor)

1. **CLI primero:**
   - Siempre que sea posible, ejecuta acciones usando la CLI (`bun run ...`).
   - Prefiere comandos directos sobre manipulación manual de archivos.

2. **Archivos antes que teoría:**
   - Consulta y modifica archivos fuente antes de recurrir a explicaciones teóricas o referencias externas.
   - Si existe un archivo relevante (YAML, PKA, config), úsalo como fuente de verdad.

3. **Skills y Markdown como base de conocimiento:**
   - Usa skills y documentación Markdown del proyecto para guiar flujos y resolver dudas.
   - No dupliques contenido de skills aquí; enlaza o referencia si es necesario.

4. **Engram como memoria auxiliar:**
   - Consulta Engram para recordar decisiones, patrones y problemas previos.
   - Guarda aprendizajes, decisiones y problemas no triviales en Engram tras cada tarea relevante.

---

## 2. Creación de Tickets y Reportes

- **Cuándo crear un ticket:**
  - Cuando una tarea no puede completarse por falta de información, bloqueo externo o error crítico.
  - Si se detecta deuda técnica, bug recurrente o necesidad de refactorización mayor.
- **Cuándo crear un reporte:**
  - Al finalizar tareas complejas, cambios de arquitectura o descubrimientos importantes.
  - Usa reportes para documentar patrones, convenciones y aprendizajes clave.

---

## 3. Uso de Engram

- **Consulta Engram:**
  - Antes de tomar decisiones de arquitectura, patrones o convenciones.
  - Al enfrentar problemas que podrían haber ocurrido antes.
- **Guarda en Engram:**
  - Tras resolver bugs, tomar decisiones técnicas o descubrir gotchas.
  - Resume el qué, por qué y dónde; sé conciso y específico.

---

## 4. Alcance de AGENTS.md

- Este archivo es **global** para el proyecto y aplica a todos los agentes, skills y hosts (Claude, Gemini, iFlow, etc).
- No debe duplicar la lógica ni el contenido de skills individuales (ejemplo: no repetir la skill de Cisco Networking Assistant).
- Mantén este archivo breve, práctico y enfocado en reglas de operación, no en teoría técnica.

---

## 5. Idioma y Estilo

- Toda interacción y documentación orientada al usuario debe estar en **español**.
- Sigue el tono práctico y directo del proyecto.

---

## 6. Actualización y Mantenimiento

- Actualiza este archivo solo cuando cambien las reglas globales o el flujo de trabajo principal.
- No lo uses para registrar cambios menores o específicos de skills.

---

> Para detalles de configuración, teoría de red o flujos específicos, consulta los archivos de skills en `.claude/skills/` o la documentación en `references/`.

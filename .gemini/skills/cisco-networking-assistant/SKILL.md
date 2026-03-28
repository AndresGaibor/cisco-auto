---
name: cisco-networking-assistant
# Modular orchestration driver for Cisco/Packet Tracer automation
# No teoría, no comandos extensos: solo flujo, triggers y enlaces

description: |
  Driver modular para tareas de redes Cisco y Packet Tracer.
  Usa esta skill como punto de entrada para:
  - Configuración, análisis y troubleshooting de laboratorios Cisco
  - Generación y validación de configuraciones IOS
  - Modificación automática de archivos .pka/.pkt/.yaml
  - Guía paso a paso según nivel de usuario
  - Automatización y control en tiempo real de Packet Tracer (PT control)
  
  No contiene teoría ni comandos extensos: consulta los archivos de soporte enlazados.
---

# Cisco Networking Assistant (Driver Modular)

**Entrypoint orquestador para flujos de automatización y soporte en redes Cisco y Packet Tracer.**

## ¿Cuándo activar esta skill?
- El usuario menciona Cisco Packet Tracer en cualquier contexto (general, abreviado, descripción, pregunta o flujo)
- El usuario menciona PT control, control en tiempo real, automatización o integración con Packet Tracer
- El usuario menciona archivos de laboratorio Packet Tracer (.pka, .pkt, .yaml) o flujos relacionados
- El usuario solicita configuración, análisis, troubleshooting, validación o automatización de Packet Tracer, aunque no mencione archivos
- El usuario requiere comandos IOS, análisis de archivos, o guía paso a paso

## Flujo estándar
1. **Detectar intención**: ¿Guía paso a paso, modificación automática, análisis, troubleshooting?
2. **Nivel de usuario**: Preguntar si es principiante, intermedio o avanzado
3. **Archivos involucrados**: ¿Hay .pka/.pkt/.yaml? ¿Se requiere crear/modificar?
4. **Seleccionar modo**:
   - **Guía**: Usar playbooks modulares
   - **Automático**: Usar scripts y generadores
   - **Troubleshooting**: Seguir checklist y playbooks
5. **Apuntar a recursos**: Redirigir a referencias, scripts, templates y checklists según el caso
6. **Registrar hallazgos clave en Engram**: Decisiones, problemas, patrones (ver sección Engram)

## Gap detection
- Si falta información clave (archivo, objetivo, nivel), preguntar antes de proceder
- Si el flujo no está cubierto, crear ticket usando `scripts/create-ticket.ts`

## Recursos y enlaces
- **Playbooks modulares**:
  - [Bridge Setup](references/playbooks/bridge-setup.md)
  - [PT Runtime](references/playbooks/pt-runtime.md)
  - [Common Failures](references/playbooks/common-failures.md)
- **Checklists**:
  - [Verificación post-configuración](assets/checklists/verification.md)
- **Templates**:
  - [Lab VLAN base](assets/templates/vlan-lab-template.yaml)
- **Scripts**:
  - [Analizador de laboratorio](scripts/lab-analyzer.ts)
  - [Generador de configuración](scripts/config-wizard.ts)
  - [Crear ticket](scripts/create-ticket.ts)
- **Guías de referencia** (teoría avanzada):
  - [VLANs y Switching](references/vlan-guide.md)
  - [Routing](references/routing-guide.md)
  - [Seguridad](references/security-guide.md)
  - [Troubleshooting](references/troubleshooting-guide.md)
- **Engram (memoria persistente)**:
  - Consultar memoria antes de tomar decisiones de flujo, patrones o troubleshooting recurrente
  - Guardar solo: patrones útiles, problemas resueltos, decisiones técnicas y gotchas relevantes
  - No almacenar: teoría general, comandos extensos, ejemplos, ni datos sensibles de usuarios o laboratorios
  - Mantener las entradas breves y orientadas a acción

## Notas
- No dupliques teoría ni comandos aquí: usa los enlaces
- El archivo SKILL.md es solo el entrypoint, no contiene lógica pesada
- Para detalles, consulta los archivos de soporte en la carpeta

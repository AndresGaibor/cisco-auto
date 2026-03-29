# Plan: Sistema de Knowledge Management para cisco-auto

## TL;DR

> **Objetivo**: Implementar un sistema skill-first, CLI-first, file-first donde la skill sea el director, la CLI la fuente de verdad, Engram la memoria auxiliar breve, y Markdown el backlog de producto.

> **Entregables**: AGENTS.md + GEMINI.md + SKILL.md modular + knowledge base + templates + scripts + integración Engram + comandos Gemini

> **Esfuerzo estimado**: Medio (~4-6 horas de implementación inicial, mejora continua)
> **Paralelismo**: YES - 3 waves
> **Camino crítico**: AGENTS.md → SKILL.md central → references/ → templates/scripts → Engram → Gemini commands → Sync hosts

---

## Contexto

### Solicitud Original
El usuario quiere un sistema de knowledge management donde:
- La **skill** sea el "director de orquesta" con reglas de auto-detección
- La **CLI** sea la fuente de verdad
- **Engram** sea memoria auxiliar breve (no el cerebro principal)
- **Markdown** guarde tickets, reportes y conocimiento pesado
- La skill **auto-sugiera mejoras** creando tickets estructurados
- Sea **skill central + archivos de apoyo** (modular)
- Funcione en **todos los hosts**: iFlow, Claude Code, Gemini CLI, OpenCode

### Estado Actual del Proyecto
- ✅ `GEMINI.md` existe (básico, 74 líneas)
- ✅ `CLAUDE.md` existe (reglas de Bun)
- ✅ `.claude/skills/cisco-networking-assistant/SKILL.md` existe (421 líneas)
- ❌ `AGENTS.md` no existe
- ❌ `.ai/tickets/` no existe
- ❌ `.ai/reports/` no existe
- ❌ `references/` está vacío (la skill lo menciona pero no existe)
- ❌ `.gemini/commands/` no existe
- ❌ Engram no está integrado en la skill

### Decisiones Tomadas (confirmadas por usuario)
- **Hosts**: Todos (iFlow + Claude + Gemini + OpenCode)
- **Engram**: Ya configurado y en uso
- **Auto-suggestion**: Automático (crea tickets al detectar gaps)
- **Modularity**: Skill central + archivos de apoyo

---

## Objetivos de Trabajo

### Objetivo Central
Crear un sistema de knowledge management donde la skill:
1. Detecte automáticamente gaps de CLI, flujos repetitivos, errores y oportunidades de mejora
2. Cree tickets Markdown estructurados en `.ai/tickets/`
3. Cree reportes en `.ai/reports/`
4. Use Engram solo para memorias breves y reutilizables
5. Consulte la knowledge base local para contexto técnico

### Entregables Concrete
- [x] `AGENTS.md` — Reglas globales del proyecto para agentes
- [x] Actualizar `GEMINI.md` — Contexto y reglas para Gemini CLI
- [x] `SKILL.md` central — Skill modular y pequeña (sin conocimiento pesado)
- [x] `references/concepts/` — 6 archivos de conceptos de red
- [x] `references/devices/` — 3 archivos de dispositivos
- [x] `references/validations/` — 3 checklists de validación
- [x] `references/playbooks/` — 3 playbooks de troubleshooting
- [x] `references/cli/` — Comandos PT y capacidades faltantes
- [x] `templates/` — 4 plantillas (ticket, error, efficiency, repeated-flow)
- [x] `scripts/` — 3 scripts CLI (create-ticket, append-report, summarize-log)
- [x] Integración Engram — Reglas de consulta y guardado en skill
- [x] `.gemini/commands/` — 3 comandos locales para Gemini
- [x] Sync a todos los hosts — `.gemini/skills/`, `.iflow/skills/`, `.claude/skills/`

### Definición de Terminado
- [ ] `bun run pt ...` funciona como fuente de verdad
- [ ] La skill detecta gaps y crea tickets automáticamente
- [ ] Los tickets tienen formato estructurado y accionable
- [ ] Engram guarda/consulta memorias breves correctamente
- [ ] Todos los hosts cargan la skill correctamente
- [ ] No hay información duplicada entre skill y references/

### Debe Tener
- Skill que auto-detecte gaps y cree tickets
- Knowledge base modular en Markdown
- Integración clara de Engram (consultar y guardar)
- Templates funcionales para tickets y reportes
- Comandos locales de Gemini para crear tickets/reportes

### No Debe Tener (Guardrails)
- NO poner conocimiento pesado en Engram (solo memorias breves)
- NO crear tickets vagos o sin evidencia
- NO duplicar información entre SKILL.md y references/
- NO skill monolítica de 400+ líneas (debe ser modular)
- NO無視 (ignorar) errores o patrones repetitivos

---

## Estrategia de Verificación

### Política de Verificación
- **Cero intervención humana** — toda verificación es agent-executed
- Cada task incluye QA scenarios con comandos exactos

### Test Infrastructure
- **No hay tests formales** para este sistema de archivos/knowledge
- **Verificación manual**: revisar que los archivos se crean correctamente
- **Comprobación de sintaxis**: validate markdown, run scripts

### QA Policy
Cada task incluye agent-executed QA scenarios:
- **Skill**: Verificar que se carga correctamente en cada host
- **Templates**: Crear ticket/reporte de prueba y verificar formato
- **Scripts**: Ejecutar con argumentos y verificar salida
- **Engram**: Guardar y recuperar una memoria de prueba

---

## Estrategia de Ejecución

### Ondas de Paralelización

```
Wave 1 (Foundation — Start Immediately):
├── T1: Crear AGENTS.md
├── T2: Crear .ai/ estructura de carpetas + .gitkeep
├── T3: Crear templates/ (4 archivos)
├── T4: Crear scripts/create-ticket.ts
├── T5: Crear scripts/append-report.ts
└── T6: Crear scripts/summarize-log.ts

Wave 2 (Knowledge Base — After Wave 1):
├── T7: references/concepts/ (6 archivos)
├── T8: references/devices/ (3 archivos)
├── T9: references/validations/ (3 archivos)
├── T10: references/playbooks/ (3 archivos)
└── T11: references/cli/ (2 archivos)

Wave 3 (Skill Core + Integrations — After Wave 2):
├── T12: SKILL.md central (modular, pequeña)
├── T13: Integración Engram en SKILL.md
├── T14: Actualizar GEMINI.md
├── T15: .gemini/commands/ (3 archivos .toml)
└── T16: Sync a .gemini/skills/, .iflow/skills/

Wave FINAL (Verification):
├── F1: Plan compliance audit
├── F2: Code quality review (validar markdown, scripts)
├── F3: Real manual QA (probar skill en cada host)
└── F4: Scope fidelity check
```

### Dependencias

- **T7-T11** dependen de T2 (carpetas creadas)
- **T12** depende de T7-T11 (knowledge base completa)
- **T13** depende de T12 (skill central lista)
- **T14** depende de T12 (skill central lista)
- **T15** depende de T12 (skill central lista)
- **T16** depende de T12-T15

---

## TODOs

### T1: Crear AGENTS.md

**Qué hacer**:
- Crear archivo `AGENTS.md` en raíz del proyecto
- Incluir reglas de:
  - Prioridad de fuentes (CLI > archivos > knowledge base > Engram)
  - Preferencias del proyecto (Bun, Markdown, seguridad)
  - Cuándo crear tickets y reportes
  - Cuándo usar Engram (consultar/guardar)
  - Convenciones de nomenclatura
- Hacer referencia a la skill central en `.claude/skills/`

**No hacer**:
- No duplicar contenido de GEMINI.md
- No incluir conocimiento técnico pesado (va en references/)

**Perfil Recomendado**: `writing`
-理由: Documentación técnica, reglas de proyecto

**Referencias**:
- `GEMINI.md` - existente, no duplicar
- `.claude/skills/cisco-networking-assistant/SKILL.md` - existente

---

### T2: Crear estructura de carpetas .ai/

**Qué hacer**:
- Crear carpetas:
  ```
  .ai/
  ├── tickets/
  ├── reports/
  │   ├── errors/
  │   ├── efficiency/
  │   └── repeated-flows/
  └── memory-cache/
  ```
- Agregar .gitkeep en cada carpeta
- Opcional: crear README.md brief explicando el sistema

**No hacer**:
- No crear archivos de contenido todavía (van en otras tasks)

**Perfil Recomendado**: `quick`

---

### T3: Crear templates/

**Qué hacer**:
Crear 4 archivos en `.claude/skills/cisco-networking-assistant/templates/`:

1. **ticket.md** - Template de ticket estructurado con:
   - Frontmatter (id, type, status, priority, area, source, created_at)
   - Secciones: Resumen, Contexto, Problema actual, Comportamiento deseado, Evidencia, Impacto, Workaround, Propuesta, Salida esperada, Señales de prioridad, Criterios de aceptación

2. **error-report.md** - Template de reporte de error con:
   - Frontmatter, Qué falló, Contexto, Evidencia, Hipótesis, Workaround, Estado final, Recomendación, ¿Crear ticket?

3. **efficiency-report.md** - Template de reporte de eficiencia con:
   - Flujo observado, Pasos repetidos, Tiempo perdido, Mejora propuesta, Beneficio, Riesgos

4. **repeated-flow-report.md** - Template de flujo repetitivo con:
   - Nombre, Cuándo aparece, Pasos actuales, Por qué es repetitivo, Qué automatizar, Propuesta CLI

**No hacer**:
- No inventar campos innecesarios
- No hacer los templates demasiado largos

**Perfil Recomendado**: `writing`

**QA Scenarios**:
```
Scenario: Template de ticket se crea correctamente
  Tool: Bash
  Steps:
    1. ls .claude/skills/cisco-networking-assistant/templates/
    2. Verificar que ticket.md existe
    3. Verificar que tiene frontmatter con id, type, status, priority
  Expected: Archivo existe con formato correcto
  Evidence: .sisyphus/evidence/T3-template-ticket.md
```

---

### T4: Crear scripts/create-ticket.ts

**Qué hacer**:
- Script Bun que acepta argumentos CLI: `--title`, `--type`, `--priority`, `--area`, `--slug`, etc.
- Genera archivo en `.ai/tickets/YYYY-MM-DD-slug.md`
- Usa el template de ticket
- Output: path del archivo creado
- Manejo de errores: tipo inválido, argumentos faltantes

**Comando de uso**:
```bash
bun run .claude/skills/cisco-networking-assistant/scripts/create-ticket.ts \
  --title "Falta utilidad de subnetting" \
  --type feature-gap \
  --priority medium \
  --area cli
```

**No hacer**:
- No crear formato diferente al template
- No sobreescribir tickets existentes (error si ya existe)

**Perfil Recomendado**: `quick`

**Referencias**:
- `templates/ticket.md` - para formateo
- `packages/` - para conocer estructura del proyecto si needed

**QA Scenarios**:
```
Scenario: Crear ticket con argumentos válidos
  Tool: Bash
  Steps:
    1. bun run .claude/skills/cisco-networking-assistant/scripts/create-ticket.ts \
         --title "Test ticket" --type feature-gap --priority high --area cli
    2. ls .ai/tickets/
  Expected: Archivo creado en .ai/tickets/ con formato correcto
  Evidence: .sisyphus/evidence/T4-create-ticket-success.md

Scenario: Crear ticket sin título (debe fallar)
  Tool: Bash
  Steps:
    1. bun run .claude/skills/cisco-networking-assistant/scripts/create-ticket.ts --type feature-gap
  Expected: Error con mensaje "title is required"
  Evidence: .sisyphus/evidence/T4-create-ticket-error.md
```

---

### T5: Crear scripts/append-report.ts

**Qué hacer**:
- Script Bun que acepta: `--type` (errors/efficiency/repeated-flows), `--title`, `--body`
- Genera archivo en `.ai/reports/{type}/YYYY-MM-DD-slug.md`
- Valida que type sea uno de los 3 válidos
- Uso: `bun run .../append-report.ts --type errors --title "Bridge inestable" --body "..."`

**No hacer**:
- No aceptar types arbitrarios

**Perfil Recomendado**: `quick`

**QA Scenarios**:
```
Scenario: Crear reporte de tipo errors
  Tool: Bash
  Steps:
    1. bun run .claude/skills/cisco-networking-assistant/scripts/append-report.ts \
         --type errors --title "Test error" --body "Descripción del error"
    2. ls .ai/reports/errors/
  Expected: Archivo creado en .ai/reports/errors/
  Evidence: .sisyphus/evidence/T5-append-report-success.md

Scenario: Tipo inválido
  Tool: Bash
  Steps:
    1. bun run .claude/skills/cisco-networking-assistant/scripts/append-report.ts \
         --type invalid-type --title "Test"
  Expected: Error "Tipo inválido: invalid-type"
  Evidence: .sisyphus/evidence/T5-append-report-error.md
```

---

### T6: Crear scripts/summarize-log.ts

**Qué hacer**:
- Script Bun que acepta path a archivo de log
- Analiza y cuenta: errors, warnings, timeouts
- Muestra samples de líneas relevantes
- Output JSON con summary
- Uso: `bun run .../summarize-log.ts /path/to/log.txt`

**No hacer**:
- No modificar archivos de log

**Perfil Recomendado**: `quick`

**QA Scenarios**:
```
Scenario: Resumir log con errores
  Tool: Bash
  Steps:
    1. echo "error occurred\nwarning detected\nnormal line" > /tmp/test-log.txt
    2. bun run .claude/skills/cisco-networking-assistant/scripts/summarize-log.ts /tmp/test-log.txt
  Expected: JSON con errorCount=1, warningCount=1, notableSamples
  Evidence: .sisyphus/evidence/T6-summarize-log-success.md
```

---

### T7: references/concepts/ (6 archivos)

**Qué hacer**:
Crear en `.claude/skills/cisco-networking-assistant/references/concepts/`:

1. **vlan.md** - VLANs, trunking, VTP, STP
   - Conceptos, comandos IOS, troubleshooting

2. **ospf.md** - OSPF single/multi-area, stub, NSSA
   - Conceptos, comandos, redistance, summarization

3. **eigrp.md** - EIGRP básico y avanzado
   - Conceptos, comandos, métricas

4. **stp.md** - Spanning Tree Protocol
   - Conceptos, estados de puertos, tipos de STP

5. **acl.md** - ACLs estándar y extendidas
   - Conceptos, wildcards, tipos, placement

6. **subnetting.md** - Cálculo de subredes
   - CIDR, máscaras, wildcard, ranges

**Cada archivo debe incluir**:
- Qué resuelve
- Cuándo usar
- Datos a calcular/comandos esenciales
- Validaciones mínimas
- Si la CLI no tiene utilidad → crear ticket

**No hacer**:
- No hacer guíasTutoriales (son para learning, no para referencia)
- No duplicar información entre archivos

**Perfil Recomendado**: `writing`

---

### T8: references/devices/ (3 archivos)

**Qué hacer**:
Crear en `.claude/skills/cisco-networking-assistant/references/devices/`:

1. **packet-tracer-models.md** - Modelos de PT
   - Routers: 1941, 2911, 4321, etc.
   - Switches: 2960, 3650, etc.
   - Módulos comunes

2. **routers.md** - Características por modelo
   - Capacidades de cada modelo
   - Interfaces típicas

3. **switches.md** - Características por modelo
   - L2 vs L3
   - PoE, VLANs, Stack

**No hacer**:
- No listar cada comando posible (eso va en cli/)

**Perfil Recomendado**: `writing`

---

### T9: references/validations/ (3 archivos)

**Qué hacer**:
Crear en `.claude/skills/cisco-networking-assistant/references/validations/`:

1. **vlan-checklist.md** - Validar VLANs
   - show vlan brief
   - show interfaces trunk
   - show spanning-tree

2. **routing-checklist.md** - Validar routing
   - show ip route
   - show ip protocols
   - show ip ospf neighbor

3. **troubleshooting-checklist.md** - Troubleshooting general
   - Orden: físico → enlace → red → transporte → aplicación
   - Comandos por capa

**No hacer**:
- No hacer troubleshooting específico (eso va en playbooks/)

**Perfil Recomendado**: `writing`

---

### T10: references/playbooks/ (3 archivos)

**Qué hacer**:
Crear en `.claude/skills/cisco-networking-assistant/references/playbooks/`:

1. **bridge-setup.md** - Setup del bridge PT
   - Pasos de instalación
   - Troubleshooting común
   - Comandos de verificación

2. **pt-runtime.md** - Runtime de PT
   - Estados del runtime
   - Eventos
   - Logs

3. **common-failures.md** - Fallos comunes
   - Bridge no conecta
   - Runtime inestable
   - PKA parsing errors

**No hacer**:
- No repetir información de la skill

**Perfil Recomendado**: `writing`

---

### T11: references/cli/ (2 archivos)

**Qué hacer**:
Crear en `.claude/skills/cisco-networking-assistant/references/cli/`:

1. **pt-commands.md** - Comandos actuales de la CLI
   - Listado de comandos disponibles
   - Uso de cada uno
   - Formato de salida

2. **missing-capabilities.md** - Candidatos a nuevas utilidades
   - Lista de capacidades que faltan
   - Señales de prioridad
   - Cuándo crear ticket

**No hacer**:
- No inventar comandos que no existan

**Perfil Recomendado**: `writing`

---

### T12: SKILL.md central (modular)

**Qué hacer**:
Reescribir `.claude/skills/cisco-networking-assistant/SKILL.md` para que sea:
- ~150 líneas máximo (actual: 421)
- Modular: NO incluir conocimiento pesado (va en references/)
- Incluir:
  - Frontmatter con descripción clara de triggers
  - Flujo estándar (entender → verificar CLI → consultar KB → ejecutar → validar → detectar gaps)
  - Reglas de auto-detección (cuándo crear ticket/reporte)
  - Integración Engram (cuándo consultar/guardar)
  - Referencias a archivos de apoyo
  - Convenciones del proyecto

**Estructura propuesta**:
```
---
name: cisco-networking-assistant
description: |
  Triggers: ...
allowed-tools: ...
---

# Cisco Networking Assistant

## Objetivo
## Regla principal
## Flujo estándar
## Auto-detección de gaps
## Uso de Engram
## Archivos de apoyo
## Convenciones
```

**No hacer**:
- NO incluir troubleshooting paso a paso (va en playbooks/)
- NO incluir teoría de redes (va en concepts/)
- NO incluir listas de comandos IOS (van en cli/)
- NO hacer más de 150 líneas

**Perfil Recomendado**: `writing`

**Referencias**:
- SKILL.md actual (421 líneas) - para extraer lo útil
- AGENTS.md (T1)
- templates/ (T3)
- references/ (T7-T11)

**QA Scenarios**:
```
Scenario: SKILL.md se carga correctamente
  Tool: Read
  Steps:
    1. Read .claude/skills/cisco-networking-assistant/SKILL.md
    2. Verificar que tiene < 200 líneas
    3. Verificar que tiene frontmatter con name y description
  Expected: Archivo modular con < 200 líneas
  Evidence: .sisyphus/evidence/T12-skill-modular.md
```

---

### T13: Integración Engram en SKILL.md

**Qué hacer**:
Agregar sección en SKILL.md (o archivo separado si es muy largo):

**Consultar Engram cuando**:
- Problema parezca repetido
- Exista preferencia del usuario
- Haya workaround conocido
- Vengas de otra sesión

**Guardar en Engram solo**:
- Preferencias del usuario
- Workarounds confirmados
- Patrones exitosos
- Limitaciones importantes
- Resúmenes breves de sesión

**NO guardar en Engram**:
- Logs completos
- Tickets completos
- Documentación técnica pesada
- Reportes largos

**Formato de mem_save**:
```
title: "..."
type: "decision|bugfix|pattern|..."
content: "**What**: ... **Why**: ... **Where**: ... **Learned**: ..."
```

**No hacer**:
- No usar Engram como base de conocimiento principal
- No guardar documentos extensos

**Perfil Recomendado**: `writing`

---

### T14: Actualizar GEMINI.md

**Qué hacer**:
Actualizar `GEMINI.md` existente para incluir:
- Reglas principales del proyecto
- Prioridad de fuentes
- Preferencias (Bun, CLI first)
- Cuándo crear ticket/reporte
- Cuándo usar Engram
- Referencias a commands/ locales

**Mantener**:
- Información de proyecto que ya existe (Overview, Tech stack, Architecture)

**No hacer**:
- No duplicar AGENTS.md
- No hacer más largo de lo necesario

**Perfil Recomendado**: `writing`

**Referencias**:
- GEMINI.md existente
- AGENTS.md (T1)
- SKILL.md (T12)

---

### T15: .gemini/commands/ (3 archivos .toml)

**Qué hacer**:
Crear en `.gemini/commands/`:

1. **ticket.toml** - Comando para crear tickets
   - description, prompt con referencia a template

2. **report-errors.toml** - Comando para reportes de error
   - description, prompt

3. **report-efficiency.toml** - Comando para reportes de eficiencia
   - description, prompt

**No hacer**:
- No inventar sintaxis de comandos (seguir formato Gemini CLI)

**Perfil Recomendado**: `writing`

---

### T16: Sync a todos los hosts

**Qué hacer**:
Sincronizar la skill central a:
- `.gemini/skills/cisco-networking-assistant/` (actualizar)
- `.iflow/skills/cisco-networking-assistant/` (actualizar)
- `.claude/skills/cisco-networking-assistant/` (ya existe, asegurar一致性)

**Para cada host**:
1. Copiar SKILL.md actualizado
2. Copiar references/ completo
3. Copiar templates/
4. Copiar scripts/
5. Verificar que carga correctamente

**No hacer**:
- No modificar la skill original del .claude/ (es la fuente)

**Perfil Recomendado**: `quick`

---

## Onda de Verificación Final

### F1: Plan Compliance Audit — `oracle`

Leer el plan end-to-end. Para cada "Must Have": verificar que existe en el codebase. Para cada "Must NOT Have": buscar evidencia de que no existe.

Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT`

### F2: Code Quality Review — `unspecified-high`

- Validar markdown de todos los archivos
- Verificar scripts tienen `#!/usr/bin/env bun` y son ejecutables
- Verificar templates tienen frontmatter válido
- `bun run scripts/create-ticket.ts --help` para verificar CLI

Output: `Markdown [N/N valid] | Scripts [N/N executable] | Templates [N/N valid] | VERDICT`

### F3: Real Manual QA — `unspecified-high` (+ `playwright` skill si UI)

1. Probar skill en Claude Code:
   - "¿Hay algún ticket existente?"
   - "Crea un ticket para falta de subnetting"

2. Probar skill en Gemini CLI:
   - `/ticket "Test ticket"`

3. Probar scripts:
   - `bun run scripts/create-ticket.ts --title "Test" --type feature-gap --area cli`
   - `bun run scripts/append-report.ts --type errors --title "Test error" --body "Test"`

Output: `Claude [OK/FAIL] | Gemini [OK/FAIL] | Scripts [OK/FAIL] | VERDICT`

### F4: Scope Fidelity Check — `deep`

Para cada task: leer "Qué hacer", verificar que se hizo exactamente.
Detectar:
- Tasks no hechas
- Tasks sobrepasadas
- Contaminación cruzada

Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Estrategia de Commits

```
Wave 1:   git commit -m "feat: add AGENTS.md, folder structure, templates, scripts"
Wave 2:   git commit -m "docs: add knowledge base references (concepts, devices, validations, playbooks, cli)"
Wave 3:   git commit -m "feat: refactor SKILL.md to modular, add Engram integration, Gemini commands, sync hosts"
Final:    git commit -m "chore: add knowledge management system"
```

---

## Criterios de Éxito

### Verificación de Comandos
```bash
# Skill carga en Claude
claude --check "skill loaded"  # depende del host

# Scripts funcionan
bun run .claude/skills/cisco-networking-assistant/scripts/create-ticket.ts --help
bun run .claude/skills/cisco-networking-assistant/scripts/append-report.ts --help

# Archivos existen
ls .ai/tickets/
ls .ai/reports/errors/
ls .claude/skills/cisco-networking-assistant/references/concepts/
```

### Checklist Final
- [x] AGENTS.md existe y tiene < 100 líneas
- [x] GEMINI.md actualizado con reglas de proyecto
- [x] SKILL.md tiene < 200 líneas y es modular
- [x] references/ tiene 17+ archivos de conocimiento
- [x] templates/ tiene 4 plantillas válidas
- [x] scripts/ tiene 3 scripts ejecutables
- [x] .gemini/commands/ tiene 3 comandos .toml
- [x] .ai/ tiene estructura de carpetas
- [x] Skill sincronizada en .gemini/, .iflow/, .claude/
- [x] Engram integrado en SKILL.md

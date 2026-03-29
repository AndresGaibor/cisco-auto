# Learnings

## 2026-03-28: Fix pt config show - output vacío

- El handler execIos original usaba `device.enterCommand()` que devuelve `[status, output]` pero Packet Tracer no devolvía el output correctamente
- La solución: crear handlers especializados que leen la información directamente de la API del dispositivo (getName, getPortAt, getIpAddress, etc.) en lugar de confiar en el output del comando CLI
- Comandos implementados: show running-config, show version, show ip interface brief, show ip route
- El código está en compose.ts (no en handlers/config.ts) porque el generator composes desde ahí
- Verificación: Switch1 y TestRouter ahora devuelven configuración real

## 2026-03-28: Patrón CLI (cli-antipattern) documentado

- La skill ahora incluye sección explícita "Antipatrón: Shell directo para consultar Packet Tracer"
- Se documentó uso de `--jq` para consultas seguras de JSON
- Se categorizaron comandos en read-only vs destructivos
- AGENTS.md se dejó sin cambios porque ya tenía suficiente guía sobre CLI-first
- No se encontraron patrones de shell directo (node -e, exec, spawn) en la skill para eliminar

## 2026-03-28: Scope creep fix

- Sesión anterior tuvo scope creep - cambios en runtime, planes, evidence
- Se revertieron todos los cambios no relacionados
- Solo permanece el cambio en `.claude/skills/cisco-networking-assistant/SKILL.md`
- Diff final verificado: 0 archivos modificados (skill ya estaba en HEAD)

## 2026-03-28: Verificación final completada

- Archivo agregado a staging: `.claude/skills/cisco-networking-assistant/SKILL.md` (312 líneas)
- AGENTS.md sin cambios (ya tenía "CLI primero" en línea 9-11)
- Verificación de patrones shell: `node -e|exec\(|spawn\(` = No matches ✓
- Diff final: solo skill file

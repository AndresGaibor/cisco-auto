# Draft: Mejora PT control v2 + skill Cisco

## Requirements (confirmed)
- Mejorar PT control v2 para que el asistente de redes sea más inteligente y autónomo.
- Hacer que ante solicitudes de redes use la CLI de forma proactiva y autónoma.
- Registrar logs de conversaciones y ejecuciones para aprender de lo que funcionó y falló.
- Revisar que virtual topology esté bien implementado con la CLI de PT control v2.
- Analizar y quitar PT control v1.
- Arreglar la documentación.

## Technical Decisions
- **Autonomía**: Proactiva con confirmación para acciones destructivas/riesgosas (reset, delete, cambios de config).
- **Logging**: NDJSON/JSON estructurado, almacenamiento en `.sisyphus/logs/` con `session_id`, `correlation_id`, `action`, `target_device`, `outcome`, `duration_ms`.
- **PT Control v1**: Eliminar completamente, sin compatibilidad temporal.
- **Tests**: Tests después de implementar (infraestructura existente con Bun test).
- **Scope autonomía**: Packet Tracer/CLI + documentación/diagnóstico automático; pedir confirmación solo en acciones destructivas.

## Final Decisions (from user)
- **Acciones destructivas (requieren confirmación)**: `device-reset`, `vlan-delete`, `interface-shutdown`, `routing-change`, `acl-modify`, `config-write`, `topology-change`.
- **Política de retención de logs**: 7 días.
- **Datos sensibles en logs**: NO enmascarar (todo es local/educativo).
- **Documentación a actualizar**: TODO, incluyendo:
  - `README.md`
  - `docs/PT_CONTROL_*.md` (5 archivos)
  - `.iflow/skills/cisco-networking-assistant/SKILL.md`
  - Todas las skills del proyecto
- **Virtual topology "verificado"**: 
  - Integración con PT control v2 funciona
  - Tests de topology pasan
  - Genera visualizaciones correctas
  - PT control puede hacer consultas a topology sin problema

## Research Findings
- Hay una implementación grande de PT control v2 en `packages/pt-control-v2/` con runtime generator, comandos y eventos.
- El template principal de runtime ya registra `init`, `runtime-loaded`, `result`, `error`, `device-added`, `link-created` y snapshots en `events.ndjson`/`state.json`.
- Hay referencias a una skill de Cisco networking en `.iflow/skills/cisco-networking-assistant/` y también una versión en `.claude/skills/`.
- El repo tiene cambios masivos y varias rutas históricas eliminadas; parece haber migración fuerte desde `src/` hacia `packages/`.
- Patrón recomendado para logs: JSON estructurado, `session_id`, `correlation_id`, `action`, `target_device`, `outcome`, duración, y protección de secretos.

## Open Questions
- ✅ Todas las preguntas han sido respondidas.

## Scope Boundaries
- **INCLUDE**:
  - PT control v2: mejora de CLI, runtime generator, comandos
  - Skill Cisco networking assistant: integración con CLI, autonomía proactiva
  - Logging/auditoría: NDJSON estructurado en `.sisyphus/logs/`
  - Virtual topology: verificación e integración con PT control v2
  - Documentación: actualización y arreglo
  - PT control v1: eliminación completa
  - Tests: después de implementar (Bun test)
- **EXCLUDE**:
  - Cambios no relacionados con redes o Packet Tracer
  - Features de redes no solicitadas
  - Migración de datos legacy (no aplica)

## Test Strategy Decision
- **Infrastructure exists**: SÍ (Bun test)
- **Automated tests**: Tests después de implementar
- **Framework**: bun test
- **Agent-Executed QA**: SÍ (obligatorio para todas las tareas)

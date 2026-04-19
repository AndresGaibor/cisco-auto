# Mapa de Migración Runtime → Control (Fase 4)

## Módulos a mover de runtime a control

| Módulo/Handler | Ubicación Actual | Por qué no debe seguir en runtime | Nueva ubicación en control | Tipo | Estado |
|---|---|---|---|---|---|
| handlers/vlan.ts | runtime/handlers | lógica de negocio compuesta | pt-control/src/application/workflows/ | workflow | pending |
| handlers/dhcp.ts | runtime/handlers | lógica de negocio compuesta | pt-control/src/application/workflows/ | workflow | pending |
| handlers/device-classifier.ts | runtime/handlers | lógica semántica | pt-control/src/application/diagnosis/ | diagnosis | pending |
| handlers/ios-plan-builder.ts | runtime/handlers | workflow legacy | pt-control/src/application/planners/ | planner | pending |
| handlers/omniscience-*.ts | runtime/handlers | hacks a formalizar | pt-control/src/ports/ | omni adapter | pending |

## Pendiente para siguientes fases

- Verificación semántica alta
- Diagnosis compleja
- Workflows compuestos
# Matriz de Cobertura Funcional

> Última actualización: Fase 7
> Dominios cubiertos por primitive, workflow, omni capability, verification, regression suite y soporte.

## Dominios y Cobertura

| Dominio | Primitive | Workflow | Omni Capability | Verification | Regression Suite | Support |
|--------|-----------|----------|---------------|---------------|-----------------|---------|
| **device** | ✅ `device.add` `device.remove` `device.move` | ✅ `workflow:device-add` | ✅ `device.siphon` `device.serial` `device.boot.skip` `device.xml` | ✅ `verify-device-exists` | ✅ `device-basic` | `supported` |
| **link** | ✅ `link.add` `link.remove` | ✅ `workflow:link-add` | ✅ `link.physical` `link.logical` | ✅ `verify-link-connectivity` | ✅ `link-basic` | `supported` |
| **module** | ✅ `module.add` `module.remove` | - | ✅ `module.add` `module.remove` `module.inspect` | - | - | `partial` |
| **host** | ✅ `host.config` | ✅ `workflow:host-config` | - | - | - | `supported` |
| **terminal** | ✅ `terminal.exec` | ✅ `workflow:exec` | ✅ `terminal.raw` `terminal.assessment` | ✅ `verify-terminal-responsive` | ✅ `terminal-core` | `supported` |
| **snapshot** | ✅ `snapshot.take` | - | - | - | - | `experimental` |
| **assessment** | - | - | ✅ `assessment.read` `assessment.write` | - | - | `dangerous` |
| **environment** | - | - | ✅ `environment.inspect` `environment.manipulate` | - | - | `experimental` |
| **process** | - | - | ✅ `process.inspect` `process.kill` | - | - | `dangerous` |
| **global-scope** | - | - | ✅ `global-scope.read` `global-scope.write` | - | - | `dangerous` |

## Dominios No Cubiertos (Pendientes)

| Dominio | Estado |备注 |
|---------|--------|------|
| **VLAN/trunk/access** | `partial` | Primitives existen, workflows en desarrollo |
| **routing base** | `partial` | OSPF config existe, verificación limitada |
| **DHCP/services** | `partial` | DHCP server config existe, verificación limitada |
| **diagnosis** | `experimental` | En desarrollo |
| **verification** | `experimental` | Integración con omni en progreso |

## Status Definitions

- **supported**: Funcionalidad estable, cobertura completa, regression suite disponible
- **partial**: Funcionalidad parcialmente estable, coverage gaps, suite limitada
- **experimental**: Funcionalidad en desarrollo, puede cambiar
- **dangerous**: Requiere elevated/dangerous permissions, no para uso general

## Reglas de Cobertura

1. **Nueva capability** → debe entrar en esta matriz
2. **Nuevo dominio** → requiere al menos: primitive O workflow O omni capability
3. **Dominio crítico** → requiere: primitive + workflow + verification + regression suite
4. **Dominios dangerous** → no deben ser default en workflows

## Regresión Suite IDs

```typescript
const REGRESSION_SUITES = {
  'regression-smoke': '5 core capabilities',
  'terminal-core': 'exec/config básica',
  'device-basic': 'add/remove/move',
  'link-basic': 'connect/disconnect',
  'workflow-basic': 'planos simples',
  'omni-safe': 'capabilities safe',
} as const;
```
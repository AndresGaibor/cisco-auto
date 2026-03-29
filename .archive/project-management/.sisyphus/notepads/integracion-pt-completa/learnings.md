# Aprendizajes - Integración Services CLI

- Implementé el comando CLI `lab services` con subcomandos `dhcp create`, `ntp add-server` y `syslog add-server`.
- Reutilicé ServicesGenerator.generateDHCP / generateNTP / generateSyslog para producir comandos IOS válidos.
- Para enviar comandos a dispositivos usé `pushCommands` desde `src/bridge/ios-command-pusher.ts`.
- Añadí validaciones previas usando ServicesGenerator.validateDHCP/validateNTP cuando aplica.
- Tests unitarios creados en `apps/cli/__tests__/commands/services.test.ts` que verifican generación básica de comandos.

Próximos pasos:
- Registrar comportamientos en integración con bridge real (end-to-end).
- Añadir manejo de opciones avanzadas (dns, excluded addresses, prefer, severity) en CLI si se requiere.


## T3d: ACL CLI Command — Wave 3

## What I implemented

- Añadido archivo apps/cli/src/commands/acl.ts con subcomandos: create, add-rule, apply
- El subcomando create usa SecurityGenerator.generateACLs() para producir líneas IOS para una ACL vacía
- El subcomando add-rule genera una sola línea `access-list <acl> <rule>` para salida por stdout
- El subcomando apply envía comandos al bridge usando pushCommands(device, commands)

## Files changed

- apps/cli/src/commands/acl.ts — nuevo
- apps/cli/src/commands/lab/index.ts — registro del comando acl
- tests/cli/commands/acl.test.ts — tests básicos para asegurar presencia de subcomandos

## Verification

- Ejecuté `bun test tests/cli/commands/acl.test.ts` → 2 tests pasan
- Ejecuté lsp_diagnostics y type_check en archivos modificados → sin errores

## Notes / Decisions

- Para mantener simple el add-rule, acepto la regla como string y la paso tal cual al comando `access-list`.
- No se añadieron nuevas funciones de generación; se reutiliza SecurityGenerator.
- Se usó pushCommands del bridge para aplicar ACLs a interfaces.

## T3a: VLAN CLI Command — Wave 3

- Añadido `apps/cli/src/commands/vlan.ts` con helpers que reutilizan `VlanGenerator` y `ios-command-pusher`.
- Implementados subcomandos `lab vlan create`, `lab vlan apply` y `lab vlan trunk` con validación de parámetros y mensajes de usuario.
- Los tests en `apps/cli/__tests__/commands/vlan.test.ts` cubren los helpers de generación y la estructura del comando lab vlan.

## T4a: PT Bridge Integration Test — Wave 4

### What I implemented

- Creado archivo `tests/integration/pt-bridge.test.ts` con 28 tests de integración
- Tests de conectividad: /health, /status devuelven 200 y datos correctos
- Tests de enqueue/dequeue: POST /execute y GET /next funcionan correctamente
- Tests de polling loop: servidor responde de forma sostenida en puerto 54321
- Tests de edge cases: JSON inválido, tipos de comando desconocidos, tipos de datos complejos

### Files created

- `tests/integration/pt-bridge.test.ts` — suite completa de tests

### Verification

- Ejecuté `bun test tests/integration/pt-bridge.test.ts` → 28 tests pasan, 0 fail
- LSP diagnostics → sin errores en el archivo de tests

### Key findings / Gotchas

- **CommandQueue es un singleton global**: El servidor bridge usa `const commandQueue = new CommandQueue()` a nivel de módulo, lo que significa que el estado persiste entre tests. Los tests que dependen de comandos específicos deben consumir comandos pendientes primero.
- **Solución aplicada**: En tests que verifican comandos específicos, añadí un "drain loop" antes de encolar nuevos comandos para limpiar el estado compartido.
- **Puerto 54321**: El servidor corre en 127.0.0.1:54321, pero Bun permite que fetch() a localhost funcione correctamente en tests.
- **CORS**: El servidor valida origen localhost pero Bun test ignora esta restricción, por lo que los tests funcionan sin modificaciones.

## T4b: PT Execute Script Test — Wave 4

### What I implemented

- Creado archivo `tests/integration/pt-execute-script.test.ts` con 32 tests de integración
- Tests de generación JavaScript: cabecera, pt.addDevice, pt.addLink, pt.configureIosDevice, pt.configurePcIp
- Tests de generación Python: snake_case para funciones (pt.add_device, pt.configure_ios_device)
- Tests de comandos IOS: verificación de que aparecen en scripts generados
- Tests de edge cases: topología vacía, plan inválido, server sin IP
- Tests de metadata: itemCount, extras con deviceCount/linkCount

### Files created

- `tests/integration/pt-execute-script.test.ts` — suite completa de tests

### Verification

- Ejecuté `bun test tests/integration/pt-execute-script.test.ts` → 32 tests pasan, 0 fail
- LSP diagnostics → sin errores en el archivo de tests

### Key findings / Gotchas

- **Format de Python usa comillas dobles**: El código genera `pt.configure_pc_ip("PC1", ...)` con comillas dobles en Python, no simples. Los tests deben verificar con el formato correcto.
- **Fixtures tipadas**: Usé `as any` en algunos lugares para el casting de TopologyPlan ya que los tipos internos de DevicePlan tienen campos adicionales que no necesitamos en los fixtures.
- **Handler del tool**: Se accede a través de `ptGenerateScriptTool.handler(input, context)` donde el segundo parámetro es un contexto vacío `{} as any`.

## T4c: PT Validate Topology Test — Wave 4

### What I implemented

- Creado archivo `tests/integration/pt-validate-topology.test.ts` con 27 tests de integración
- Tests de estructura de respuesta: verifica que queryTopology devuelve devices, links y timestamp
- Tests de mapeo de tipos: router, switch, pc se mapean correctamente
- Tests de mapeo de estados: up, down, unknown se manejan correctamente
- Tests de verificación post-deploy: dispositivos up, enlaces connected, IPs configuradas
- Tests de topología VLAN: multi-switch con 3 switches y 2 PCs
- Tests de manejo de errores: bridge no disponible, timeout, URL inválida
- Tests de validación de plan: modelo válido, IPs duplicadas, puertos inválidos, router sin IP
- Tests de integración: queryTopology + validatePlan trabajando juntos

### Files created

- `tests/integration/pt-validate-topology.test.ts` — suite completa de tests

### Verification

- Ejecuté `bun test tests/integration/pt-validate-topology.test.ts` → 27 tests pasan, 0 fail
- LSP diagnostics → sin errores en el archivo de tests

### Key findings / Gotchas

- **ToolHandler requiere 2 argumentos**: El handler de un tool espera `(input, context)`, no solo `(input)`. Hay que pasar contexto vacío `{} as any`.
- **deviceCatalog tiene modelos específicos**: Los modelos son `2960-24TT` (no `2960`), y los puertos son `GigabitEthernet0/0` (no `Gig0/0`). Los tests deben usar los nombres exactos del catálogo.
- **ToolResult es discriminated union**: Cuando `resultado.success === true`, TypeScript no infiere automáticamente que `resultado.data` es del tipo correcto. Hay que hacer type assertion: `const data = resultado.data as TopologyQueryResult`.
- **Array.isArray() no distingue empty arrays**: Pasar `[] as any` no falla la validación porque `Array.isArray([])` es `true`. Para tests de estructura inválida hay que usar `null`, `undefined` o strings.

## Goal

T1: Device Name Resolver — Wave 1



## Instructions

Implementé resolver de nombres para conciliar plan con topología actual de Packet Tracer. No modifiqué tipos existentes.



## Discoveries

- query-topology.ts exporta QueriedDevice con campos id,name,type,status

- PT renombra dispositivos con sufijo (n) cuando hay conflicto



## Accomplished

- Añadido src/tools/topology/device-name-resolver.ts

- Añadidos tests en src/tools/topology/__tests__/device-name-resolver.test.ts (2 tests pasados)



## Next Steps

- Integrar resolveDeviceNames en pipeline de deploy antes de aplicar configs



## Relevant Files

src/tools/topology/device-name-resolver.ts — nuevo, resuelve y actualiza deviceName en links

 src/tools/topology/__tests__/device-name-resolver.test.ts — tests unitarios

## Additional Learnings

- `assets/pt-scripts/bridge-client.js` ahora incluye cola con límite, heartbeat y reconexión exponencial y está diseñado para ejecutarse dentro del WebView de Packet Tracer usando `XMLHttpRequest` y `$se('runCode', ...)`.
- La verificación con `bun --check` falla en macOS porque `XMLHttpRequest` no existe fuera del navegador; el script solo puede probarse en Packet Tracer/WebView, pero el comando demuestra que Bun detecta esa dependencia.

## Goal

T2: Extender generate-script.ts — Wave 2

## Instructions

Amplié la generación de scripts para Packet Tracer usando los generadores IOS existentes sin cambiar TopologyPlan.

## Discoveries

- `DevicePlan` no expone STP/EtherChannel/IPv6 directamente, así que la integración necesita leer propiedades extendidas con `any` sin romper compatibilidad.
- `RoutingPlan` de topology usa otra forma que `RoutingGenerator`, por lo que hubo que mapear rutas estáticas, OSPF y EIGRP antes de llamar al generador.
- `ServicesGenerator.generateDHCP()` acepta un spec distinto al de `DHCPPlan`, así que el pool necesita una transformación explícita.

## Accomplished

- `src/tools/topology/generate-script.ts` ahora expone `generateIosCommands()` y arma comandos IOS completos para JS/Python.
- Se añadieron tests para VLAN, STP, routing, ACL y servicios en `src/tools/topology/__tests__/generate-script.test.ts`.

## Next Steps

- Revisar si T3 puede reutilizar `generateIosCommands()` para evitar duplicación en los comandos CLI.

## Relevant Files

src/tools/topology/generate-script.ts — composición de comandos IOS completos

src/tools/topology/__tests__/generate-script.test.ts — cobertura de VLAN/STP/routing/ACL/services

- src/bridge/ios-command-pusher.ts — Añadida función pushCommands con reintentos, backoff y timeout
  - URL: http://127.0.0.1:54321/execute
  - Timeout: 30s, Retries: 3 (1s,2s,4s)

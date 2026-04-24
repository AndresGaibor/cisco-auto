# Reporte Técnico: Bug de Creación de Enlaces en Packet Tracer 9.0.0.0810

## Problema
En la versión 9.0.0.0810 de Cisco Packet Tracer, el método canónico de la API de LogicalWorkspace `createLink(dev1, port1, dev2, port2, type)` está roto o desactivado. 
- **Síntoma:** El método retorna `null` o genera una excepción silenciosa.
- **Resultado:** El CLI reporta "Packet Tracer rejected the request" y no aparece el cable verde en el canvas.

## Solución (Workaround)
Se ha identificado que el método `autoConnectDevices(dev1, dev2)` sigue siendo funcional en esta versión. Este método utiliza el algoritmo de "Smart Connection" de Packet Tracer para elegir los puertos automáticamente y establecer el enlace físico.

## Implementación del Fix
Se ha modificado el handler `add-link.ts` en `pt-runtime` para implementar una estrategia de "Fallback":
1. Intentar `createLink` (para mantener la precisión de puertos si es posible).
2. Si falla o estamos en la versión 9.0, ejecutar `autoConnectDevices`.
3. Informar al usuario que se usó una conexión automática debido a limitaciones de la versión.

## Limitaciones Conocidas
Al usar `autoConnectDevices`, se pierde la capacidad de elegir puertos específicos (ej: Fa0/24), ya que PT elige el primer puerto disponible.

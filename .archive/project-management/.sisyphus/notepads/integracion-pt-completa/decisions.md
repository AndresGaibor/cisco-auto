# Decisiones - Services CLI

- Reutilizar ServicesGenerator (implementado en src/core/config-generators/services.generator.ts) para toda generación de comandos IOS relacionados con DHCP, NTP y Syslog.
- Usar `pushCommands` (src/bridge/ios-command-pusher.ts) para enviar comandos al bridge y manejar reintentos/timeouts.
- Implementar validación previa (validateDHCP / validateNTP) antes de enviar comandos para prevenir payloads inválidos.

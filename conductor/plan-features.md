# Plan de Implementación de Características Avanzadas (1 a 1 Packet Tracer)

## Objetivo
Alcanzar el 100% de paridad con las funcionalidades avanzadas de Cisco Packet Tracer, permitiendo la configuración programática de servidores (DNS, FTP, Email), Listas de Control de Acceso (ACLs) y traducciones de red (NAT/PAT) a través del Motor de Entidades (`Entity Object Model`).

## Alcance e Impacto
Esta actualización enriquecerá las clases `Server` y `Router` del motor de entidades. No romperá ninguna funcionalidad existente. Permitirá a los usuarios automatizar la configuración de servicios web, resolución de nombres y políticas de seguridad exactamente como lo exige el archivo `.pka`.

## Pasos de Implementación

### 1. Ampliación de Servicios en `Server.ts`
- **DNS Server:** Corregir el esquema interno del XML que inyecta la clase (usar `<NAMESERVER-DATABASE>` y `<RESOURCE-RECORD>`).
- **FTP Server:** Añadir método `setFtpService(enabled)` y `addFtpAccount(username, password, permissions)` interactuando con `<FTP_SERVER>`.
- **Email Server:** Añadir método `setEmailService(domain, smtp, pop3)` interactuando con `<EMAIL_SERVER>`.

### 2. Ampliación de Seguridad y Routing en `Router.ts`
- **Listas de Acceso (ACLs):** 
  - Añadir método `addStandardACL(number, action, source, wildcard)` que inyecte comandos en la `RUNNINGCONFIG`.
  - Añadir método `addExtendedACL(number, action, protocol, source, sourceWildcard, dest, destWildcard, eqPort)` para controles granulares.
  - Añadir método `applyACLToInterface(interfaceName, aclNumber, direction)` para asociar la lista (`ip access-group <num> <in|out>`).
- **NAT Dinámico / PAT (Overload):**
  - Añadir método `setupNATOverload(aclNumber, outsideInterface)` para configurar PAT (`ip nat inside source list <acl> interface <iface> overload`).

## Verificación
- Tras implementar estas mejoras, se probará su validez generando un nuevo script similar a `mod-test.ts` que inyecte cuentas FTP, registros DNS y políticas ACL en los dispositivos.
- El archivo resultante será verificado abriéndolo directamente en Cisco Packet Tracer 8.0+.

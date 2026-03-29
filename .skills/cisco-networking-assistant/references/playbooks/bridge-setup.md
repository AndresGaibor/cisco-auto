# Playbook: Bridge Setup (Packet Tracer Bridge)

## Objetivo
Configurar y verificar el bridge entre cisco-auto y Packet Tracer para habilitar el control en tiempo real.

## Pasos Rápidos

1. **Iniciar el bridge:**
   ```bash
   cisco-auto bridge start
   ```
   - Verifica que el puerto 54321 esté libre.
   - Espera el mensaje de URL local (ej: http://127.0.0.1:54321).

2. **Instalar el bridge en Packet Tracer:**
   ```bash
   cisco-auto bridge install
   ```
   - Copia el script bootstrap al directorio de scripts de Packet Tracer.
   - Si falla, sigue la instalación manual (ver abajo).

3. **Verificar estado:**
   ```bash
   cisco-auto bridge status
   ```
   - Confirma: puerto escuchando, dispositivos sincronizados, conexión activa.

4. **Solución de problemas comunes:**
   - Si Packet Tracer no detecta el bridge:
     - Verifica que el script esté en la carpeta correcta.
     - Reinstala usando la ruta completa.
   - Si hay conflicto de puerto:
     - Cambia la variable `BRIDGE_PORT` y reinstala.
   - Si el bridge no responde:
- Revisa logs con `cisco-auto bridge status` o `cisco-auto bridge start --verbose`.
      - Verifica firewall, VPN o proxies.
   - Si hay problemas de permisos:
     - Otorga permisos de accesibilidad a Packet Tracer (macOS/Windows).

5. **Desinstalar bridge:**
   ```bash
   cisco-auto bridge uninstall
   ```

## Instalación Manual (Fallback)
- Copia el script `assets/bridges/bridge-bootstrap.js` a la carpeta de scripts de Packet Tracer.
- Crea un script en PT que conecte a la URL local.
- Habilita el script en la pestaña de Automation.

## Checklist de Verificación
- [ ] El comando `bridge status` muestra "conexión activa".
- [ ] Packet Tracer responde a comandos desde la CLI.
- [ ] No hay errores de puerto ni permisos.

> Si algún paso falla y no puedes resolverlo, abre un ticket con logs y detalles del entorno.
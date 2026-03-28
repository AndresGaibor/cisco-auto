# Playbook: PT Runtime (Estados y Eventos)

## Objetivo
Diagnosticar y actuar ante eventos y estados del runtime de Packet Tracer controlado por cisco-auto.

## Estados Clave
- **Iniciado**: El runtime está activo y escuchando comandos.
- **Sincronizando**: Se están aplicando cambios a la topología o dispositivos.
- **Error**: El runtime reporta fallo (ver logs).
- **Desconectado**: No hay comunicación con Packet Tracer.

## Acciones Rápidas

1. **Verificar estado actual:**
   ```bash
   cisco-auto bridge status
   ```
   - Muestra estado del runtime, dispositivos sincronizados y logs recientes.

2. **Reiniciar runtime:**
   ```bash
   cisco-auto bridge start
   ```
   - Útil si el runtime se quedó "colgado" o no responde.

3. **Sincronizar topología manualmente:**
   ```bash
   bun run pt snapshot
   ```
   - Fuerza la actualización del estado de la red.

4. **Ver eventos recientes:**
   - Usa `cisco-auto bridge status` para ver logs recientes y eventos del runtime.
   - Si necesitas más detalle, consulta la salida de la CLI tras ejecutar cualquier comando de bridge.

## Problemas Frecuentes
- **No responde a comandos:**
  - Verifica que el runtime esté iniciado y Packet Tracer abierto.
  - Revisa logs por errores de permisos o rutas.
- **Desincronización de dispositivos:**
  - Ejecuta `pt snapshot` para forzar sincronización.
- **Errores de archivo:**
  - Verifica permisos de escritura en `~/pt-dev/`.

## Checklist de Verificación
- [ ] El estado muestra "activo" y dispositivos sincronizados.
- [ ] Los comandos CLI reflejan cambios en Packet Tracer.
- [ ] No hay errores recientes en los logs.

> Si el runtime sigue sin responder tras reiniciar y revisar logs, documenta el error y abre un ticket.
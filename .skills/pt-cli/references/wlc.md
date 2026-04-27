# WLC y wireless en esta versión de pt-cli

## Estado de soporte

No asumas que existe un comando público `bun run pt wlc`. En el árbol actual hay código WLC legacy/no registrado públicamente. Antes de usar cualquier comando WLC, confirma con:

```bash
bun run pt --help
bun run pt wlc --help
```

Si no aparece, usa estas rutas:

1. `bun run pt device list --json --links` para inventario.
2. `bun run pt device ports <device> --json --refresh` para puertos/power/link.
3. `bun run pt cmd <device> "<comando>"` si el dispositivo expone terminal útil.
4. `bun run pt omni device genome <device> --json` para inspección forense.
5. Configuración GUI manual si Packet Tracer no expone la función por terminal/API.

## Flujo recomendado para labs wireless

1. Inventario:
   ```bash
   bun run pt device list --json --links
   ```
2. Validar power/puertos de AP y switch:
   ```bash
   bun run pt device ports AP1 --json --refresh
   bun run pt device ports SW1 --json --refresh
   ```
3. Cableado:
   ```bash
   bun run pt link suggest AP1 SW1 --json
   bun run pt link add AP1:GigabitEthernet0 SW1:FastEthernet0/3 --wait-green 30000 --json
   ```
4. Red de gestión:
   - Configura switch/router con `cmd --config`.
   - Configura hosts/servers con `set host` si aplica.
5. Si WLC/WLAN/AAA no responde por CLI/API, documenta que requiere UI de Packet Tracer y pide al usuario que confirme la parte manual.

## No inventar

No afirmes que puedes crear SSIDs, WPA2, RADIUS o WLANs por CLI si no hay evidencia en esta versión. Primero prueba/consulta capabilities con `omni capability list` o pide al usuario salida de PT/omni si quiere exploración profunda.

## Historial

| Versión | Fecha | cambios |
|--------|-------|--------|
| 2.0 | 2026-04 | Rewrite: marked as unavailable |
| 1.0 | 2024-... | Original WLC commands |
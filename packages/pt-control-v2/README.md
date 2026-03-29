# pt-control-v2

**pt-control-v2** es la nueva CLI profesional para controlar Cisco Packet Tracer en tiempo real desde TypeScript/Bun. Este paquete reemplaza los flujos legacy basados en YAML y .pka para nuevos laboratorios y automatizaciones.

---

## 🚀 Comandos Principales

### VLAN

```bash
bun run pt vlan apply <SWITCH> <VLAN_ID>...
```
- Aplica múltiples VLANs a un switch Cisco en tiempo real.
- Ejemplo: `bun run pt vlan apply Switch1 10 20 30`

### Trunk

```bash
bun run pt trunk apply <SWITCH> <PORT>...
```
- Configura puertos trunk en switches Cisco.
- Ejemplo: `bun run pt trunk apply Switch1 GigabitEthernet0/1 GigabitEthernet0/2`

### SSH

```bash
bun run pt ssh setup <ROUTER> [--domain <DOMAIN>] [--user <USER>] [--pass <PASS>]
```
- Configura SSHv2 en routers Cisco automáticamente.
- Ejemplo: `bun run pt ssh setup Router1 --domain cisco-lab.local --user admin --pass admin`

### Script de Topología (Automatización Completa)

El script `topologia-apply.ts` descubre dispositivos automáticamente y aplica configuración de forma dinámica.

#### Opción 1: Archivo de configuración

```bash
# Crear tu archivo de configuración (basado en el ejemplo)
cp topology-config.example.json topology-config.json

# Editar según tu topología
nano topology-config.json

# Aplicar configuración
bun run scripts/topologia-apply.ts --config topology-config.json
```

#### Opción 2: Argumentos CLI rápidos

```bash
# Solo VLANs
bun run scripts/topologia-apply.ts --vlans 10,20,30

# VLANs + SSH
bun run scripts/topologia-apply.ts --vlans 10,20,30 --ssh-domain cisco.local

# Con credenciales SSH personalizadas
bun run scripts/topologia-apply.ts --vlans 10,20,30 --ssh-domain cisco.local --ssh-user admin --ssh-pass secret
```

#### Opción 3: Solo descubrimiento

```bash
# Sin configuración, solo lista dispositivos detectados
bun run scripts/topologia-apply.ts
```

#### Flags adicionales

- `--dry-run`: Simula sin aplicar cambios
- `--verbose`: Muestra detalles de debugging

**Ejemplo completo:**

```bash
bun run scripts/topologia-apply.ts --config topology-config.json --dry-run --verbose
```

---

## 🏁 Flujo Recomendado

1. Instala y configura el módulo de scripting en Packet Tracer (ver [PT_CONTROL_QUICKSTART.md](../../docs/PT_CONTROL_QUICKSTART.md)).
2. Usa los comandos `pt vlan apply`, `pt trunk apply`, `pt ssh setup` para configurar dispositivos individuales.
3. Para automatización total:
   - Copia `topology-config.example.json` → `topology-config.json`
   - Edita según tu topología
   - Ejecuta: `bun run scripts/topologia-apply.ts --config topology-config.json`
4. Evita YAML/.pka para nuevos laboratorios: usa la CLI y scripts dinámicos.

---

## ℹ️ Notas

- El soporte para YAML y .pka es solo para migraciones puntuales. Para nuevos flujos, usa pt-control-v2 y scripts.
- Todos los comandos pueden ejecutarse desde cualquier terminal compatible con Bun.
- Consulta la [guía rápida](../../docs/PT_CONTROL_QUICKSTART.md) para instalación y troubleshooting.

---

## 📄 Licencia

MIT

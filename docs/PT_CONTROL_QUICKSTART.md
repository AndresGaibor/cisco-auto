# PT Control - Control en Tiempo Real de Packet Tracer

Controla Cisco Packet Tracer en tiempo real desde la CLI. Este flujo reemplaza los métodos legacy basados en YAML y .pka para nuevos laboratorios.

## 🚀 Quick Start

### Prerrequisitos
- **Cisco Packet Tracer** (8.x+)
- **Bun** runtime

### 1. Build y Deploy
```bash
bun run pt:build
```
Esto genera los archivos y los copia automáticamente a `~/pt-dev/`.

### 2. Carga el módulo en PT
```bash
# Abre Packet Tracer
# File > Open > selecciona ~/pt-dev/main.js
```

### 3. Usa la CLI
```bash
# Ver ayuda
bun run pt --help

# Listar dispositivos
bun run pt device list

# Agregar dispositivo
bun run pt device add Router1 2911

# Agregar dispositivo con posición
bun run pt device add Switch1 2960-24TT-L --xpos 300 --ypos 200
```

---

## 🏁 Flujo Moderno Recomendado

1. **Evita YAML/.pka para nuevos laboratorios**: esos flujos son legacy y solo deben usarse para migraciones puntuales.
2. **Usa la CLI pt** para toda la configuración y automatización:
   - `bun run pt device add` — Agregar dispositivos
   - `bun run pt device list` — Listar dispositivos
   - `bun run pt vlan apply` — Aplicar VLANs a switches
   - `bun run pt trunk apply` — Configurar puertos trunk
   - `bun run pt ssh setup` — Configurar SSHv2 en routers
   - `bun run pt topology apply` — Aplicar topología completa

---

## 📖 Ejemplos de Comandos

### Dispositivos
```bash
# Agregar router
bun run pt device add R1 2911

# Agregar switch
bun run pt device add S1 2960-24TT-L

# Agregar PC
bun run pt device add PC1 pc

# Listar dispositivos
bun run pt device list

# Remover dispositivo
bun run pt device remove R1
```

### VLAN
```bash
bun run pt vlan apply Switch1 10 20 30
```

### Trunk
```bash
bun run pt trunk apply Switch1 GigabitEthernet0/1 GigabitEthernet0/2
```

### SSH
```bash
bun run pt ssh setup Router1 --domain cisco-lab.local --user admin --pass admin
```

### Automatización Completa
```bash
bun run scripts/topologia-apply.ts
# Flags opcionales: --dry-run, --verbose
```

---

## ℹ️ Notas

- Todos los comandos se ejecutan via `bun run pt <comando>`
- La CLI se comunica con PT a través de:
  - `pt-control` → `file-bridge` → runtime en `~/pt-dev/` → PT real
- Para flujos legacy, consulta la documentación histórica.

---

## 📄 Licencia
MIT

# PT Control - Control en Tiempo Real de Packet Tracer

Controla Cisco Packet Tracer en tiempo real desde la CLI de TypeScript/Bun. Este flujo reemplaza los métodos legacy basados en YAML y .pka para nuevos laboratorios.

## 🚀 Quick Start

### Prerrequisitos
- **Cisco Packet Tracer** (8.x+)
- **Bun** runtime

### 1. Instala el módulo de scripting en PT
Sigue los pasos detallados en la sección original para instalar el módulo y habilitar permisos de sistema de archivos.

### 2. Configura la CLI
```bash
bun install
mkdir -p ~/pt-dev
cp pt-extension/runtime.js ~/pt-dev/runtime.js
bun run pt device list
```

---

## 🏁 Flujo Moderno Recomendado

1. **Evita YAML/.pka para nuevos laboratorios**: esos flujos son legacy y solo deben usarse para migraciones puntuales.
2. **Usa la CLI pt-control** para toda la configuración y automatización:
   - `pt vlan apply` — Aplica VLANs a switches Cisco en tiempo real.
   - `pt trunk apply` — Configura puertos trunk automáticamente.
   - `pt ssh setup` — Configura SSHv2 en routers Cisco.
   - `bun run scripts/topologia-apply.ts` — Descubre y configura toda la topología automáticamente (VLANs, trunks, SSH, IPs).

---

## 📖 Ejemplos de Comandos

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

## 📚 Documentación y Ayuda
- Consulta [packages/pt-control/README.md](../packages/pt-control/README.md) para detalles y ejemplos avanzados.
- El soporte YAML/.pka está deprecado para nuevos flujos.
- Para troubleshooting, revisa la sección correspondiente en este archivo.

---

## ℹ️ Notas
- Todos los comandos pueden ejecutarse desde cualquier terminal compatible con Bun.
- El script de topología es el punto de entrada recomendado para automatización total.
- Para flujos legacy, consulta la documentación histórica.

---

## 📄 Licencia
MIT

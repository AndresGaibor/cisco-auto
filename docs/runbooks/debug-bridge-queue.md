# Runbook: Debug Bridge Queue

## Show Running-Config Contaminado

### Signos

El output de `show running-config` contiene:
- Tokens de authentication (`enable secret`, `username`)
- Configuración de otros contextos mezclados
- Secuencias de pager `--More--` sin resolver
- Prompt en medio del output

### Validación

```bash
# Obtener output raw
bun run pt cmd <device> "show running-config" --json

# Buscar contaminantes
cat <(bun run pt cmd <device> "show running-config" --json) | \
  jq -r '.raw' | \
  grep -E "(enable secret|username|--More--)"

# Verificar prompt al final
cat <(bun run pt cmd <device> "show running-config" --json) | \
  jq -r '.raw' | tail -5
```

### Causas comunes

1. **Sesión quedó en paging mode** — `--More--` anterior no se resolvió
2. **Modo privilegiado no alcanzado** — el output es de `show running-config` vs `show running-config`
3. **Buffer de output mezclado** — comandos anteriores dejaron residuo

### Resolución

```bash
# 1. Limpiar con ctrl+c y reintentar
# Enviar enter varias veces para salir de --More--
bun run pt cmd <device> "" --continue-pager
bun run pt cmd <device> "" --continue-pager

# 2. Forzar modo privilegiado
bun run pt cmd <device> "enable" --json
sleep 1

# 3. Ejecutar con --complete
bun run pt cmd <device> "show running-config" --complete --json

# 4. Verificar modo antes de ejecutar
bun run pt cmd <device> "show privilege" --json
```

---

## Benchmark Real

### Setup

```bash
# Crear lab de prueba
bun run pt device add R1 2911
bun run pt device add SW1 2960-24TT

# Agregar enlaces
bun run pt link add R1 GigabitEthernet0/0 SW1 GigabitEthernet0/1
```

### Benchmark de comandos básicos

```bash
# Secuencia de comandos IOS
time bun run pt cmd R1 "show version" --json
time bun run pt cmd R1 "show ip int brief" --json
time bun run pt cmd R1 "show running-config" --complete --json
```

### Benchmark de cola

```bash
# 1. Medir latencia de cola vacía
for i in {1..10}; do
  time bun run pt cmd R1 "show version" --json
done

# 2. Medir throughput con cola llena
# Enviar 20 comandos rápidos y medir último resultado
for i in {1..20}; do
  bun run pt cmd R1 "show version" &
done
wait

# 3. Medir bridge overhead
# Comparar tiempo total vs tiempo de ejecución IOS
```

### Métricas a collecting

| Métrica | Valor normal | Umbral alerta |
|---------|-------------|---------------|
| Latencia cola vacía | < 500ms | > 2000ms |
| Tiempo `show running-config` | < 3s | > 10s |
| Throughput comandos/s | > 5/s | < 1/s |
| Backpressure queue | 0 | > 10 |

### Debug de backpressure

```bash
# Ver estado de backpressure
bun run pt bridge status --json

# Ver utilization
cat ~/pt-dev/sequence-store  # última seq procesada

# Limpiar dead-letter si hay
ls ~/pt-dev/dead-letter/
```

### Benchmark de hot-reload

```bash
# Medir tiempo de reload
cd packages/pt-runtime && bun run deploy
# Medir: ¿cuánto tarda en estar disponible en PT?

# Test de reload sin perder estado
bun run pt cmd R1 "configure terminal" --json
bun run pt cmd R1 "hostname TEST" --json
# En PT: File > Open > ~/pt-dev/main.js
bun run pt cmd R1 "show version" --json
# Verificar que R1 sigue configurado
```

---

## Qué NO hacer sin PT real

1. **No asumir que `show running-config` funciona igual en todos los modelos** — algunos tienen paginación obligatoria
2. **No asumir que el prompt al final es confiable** — puede quedar `--More--`
3. **No medir latencia en primer comando** — el primero incluye warm-up del kernel
4. **No hacer benchmark sin validar que la sesión está limpia** — resultados falseados por residuos
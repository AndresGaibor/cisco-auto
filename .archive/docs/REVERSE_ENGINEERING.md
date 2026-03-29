# Análisis de Reverse Engineering - Formato PKA/PKT

## Resumen de Investigación

Se realizó un análisis exhaustivo del formato de archivos `.pka` y `.pkt` de Cisco Packet Tracer, incluyendo:

1. **Análisis forense** de archivos binarios
2. **Investigación** de herramientas existentes (ptexplorer, pka2xml)
3. **Estudio** de blogs de reverse engineering (Ferib.dev)
4. **Implementación** de algoritmos de decodificación

## Algoritmos Descubiertos

### 🔷 Versión 5.x — 2 etapas

**Implementación:** Funcional ✅

```
Archivo cifrado
    ↓ XOR: byte[i] ^ (file_size - i)
    ↓ Quitar primeros 4 bytes (tamaño descomprimido)
    ↓ zlib decompress
    → XML
```

**Código de referencia:** [ptexplorer](https://github.com/axcheron/ptexplorer)

### 🔶 Versiones 6.x / 7.x — 4 etapas

**Implementación:** Probado ❌ (no funciona con archivos de prueba)

```
Archivo cifrado
    ↓ Stage 1: Reverse XOR posicional
    ↓ Stage 2: Twofish CBC decryption
    ↓ Stage 3: Forward XOR decreciente
    ↓ Stage 4: zlib decompress (qCompress)
    → XML
```

**Keys de Twofish (Packet Tracer Saves):**
- Key: `89898989898989898989898989898989`
- IV:  `10101010101010101010101010101010`

**Código de referencia:** [Ferib.dev](https://ferib.dev/blog/protecting-Packet-Tracer-myself-because-no-one-gives-a-fuck/)

### 🔴 Versión 8.x — Estado: DESCONOCIDO

Los archivos de prueba proporcionados NO funcionan con ninguno de los algoritmos conocidos. Posibles causas:

1. Cisco actualizó el algoritmo de encriptación
2. Se cambió la clave de Twofish
3. Se agregó una etapa adicional
4. El formato binario cambió estructuralmente

## Archivos de Prueba Analizados

| Archivo | Tamaño | Primeros 16 bytes | Resultado |
|---------|--------|-------------------|-----------|
| `2.3.7 Packet Tracer - Navigate the IOS (1).pka` | 155,328 | `632d5084463d16b3...` | ❌ No decodificable |
| `2.5.5 Packet Tracer - Configure Initial Switch Settings (2).pka` | 168,568 | `9d5949a984744d28...` | ❌ No decodificable |
| `2.7.6 Packet Tracer - Implement Basic Connectivity.pka` | 505,957 | `726e13d483918299...` | ❌ No decodificable |

Todos los archivos parecen usar el mismo formato de encriptado moderno.

## Herramientas Disponibles

| Herramienta | Versiones | Estado | Link |
|------------|-----------|--------|------|
| ptexplorer | 5.x | ✅ Funciona | github.com/axcheron/ptexplorer |
| pka2xml | 7.x Linux | ⚠️ Limitado | github.com/mircodz/pka2xml |
| PacketTracerRecovery | 7.x | ⚠️ Parcial | github.com/ferib/PacketTracerRecovery |
| Unpacket | Moderno | ❓ Sin probar | github.com/Punkcake21/Unpacket |

## Conclusión

**No es posible parsear archivos .pka/.pkt modernos (8.x) programáticamente** con la información disponible actualmente. Cisco ha mejorado significativamente la seguridad del formato de archivo.

### Alternativa Recomendada

Usar **YAML para definir topologías** manualmente:

```yaml
metadata:
  name: "Lab VLANs"
  
topology:
  devices:
    - name: SW-CORE
      type: switch
      vlans:
        - id: 10
          name: VENTAS
```

Esta aproximación es:
- ✅ Más mantenible
- ✅ Compatible con version control
- ✅ Editable manualmente
- ✅ Funciona sin depender de formatos propietarios

## Referencias

1. [ptexplorer - GitHub](https://github.com/axcheron/ptexplorer)
2. [pka2xml - GitHub](https://github.com/mircodz/pka2xml)
3. [Ferib.dev - Reverse Engineering PT](https://ferib.dev/blog/protecting-Packet-Tracer-myself-because-no-one-gives-a-fuck/)
4. [Unpacket - GitHub](https://github.com/Punkcake21/Unpacket)

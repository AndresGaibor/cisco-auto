# ⚙️ Packet Tracer Engine Internals & Bypasses

Este documento registra los hallazgos críticos sobre el comportamiento del motor C++ de Packet Tracer v9.0 descubiertos durante el desarrollo de `cisco-auto`.

---

## 1. El Fenómeno de "Lazy Convergence"
Packet Tracer optimiza el uso de CPU suspendiendo el procesamiento de protocolos de red (STP, ARP, OSPF) si no hay interacción del usuario o si el laboratorio acaba de ser inyectado.

### 🚩 El Problema
- Los puertos permanecen en estado **Ámbar** (`2`) durante mucho más de los 30 segundos estándar.
- Los pings fallan con **100% loss** a pesar de tener IPs y cables correctos porque las tablas ARP no se pueblan.

### ✅ La Solución (Time Jumping)
Es obligatorio forzar el avance del reloj de simulación. Al mover los frames de simulación, obligamos al motor a procesar los eventos de la cola de red.
- **Comando CLI:** `pt simulation jump --frames 50`
- **Llamada Interna:** `ipc.simulation().forward()` en un bucle.

---

## 2. Bug de Serialización de Tipos Nativos (Qt Proxy)
Muchos métodos de la API (específicamente los de red) devuelven objetos nativos de C++ que no son compatibles con el serializador JSON del Bridge.

### 🚩 El Problema
- Al llamar a `port.getIpAddress()`, el Bridge devuelve `[object Object]` o una cadena vacía.
- Esto rompe la validación automática de laboratorios.

### ✅ La Solución (String Casting)
Se debe forzar la conversión a cadena **dentro del entorno de Packet Tracer** antes de que el dato sea enviado al exterior.
- **Técnica:** `String(port.getIpAddress())` o `port.getIpAddress().toString()`.
- **Implementación:** Integrado en el colector de puertos de `pt-runtime`.

---

## 3. Diccionario de Estados de Puerto (L1/L2)
| Código | Significado | Color LED | Acción Recomendada |
|---|---|---|---|
| `0` | Administratively Down | Rojo | `no shutdown` |
| `1` | Up / Forwarding | Verde | Ninguna |
| `2` | STP Negotiating | Ámbar | `pt simulation jump` |

---

## 4. Persistencia de IP en Dispositivos Finales (PCs)
Las PCs no almacenan la IP en el puerto físico, sino en un gestor de software (`IPv4Config`).

### 🚩 El Problema
- `port.setIpAddress()` suele ser ignorado en PCs.
- La IP desaparece después de un reseteo de la interfaz por STP.

### ✅ La Solución
Usar el comando de terminal inyectado `ipconfig <ip> <mask>` o el método nativo del manager: `device.getIPv4Config().setStaticIpAddress()`.

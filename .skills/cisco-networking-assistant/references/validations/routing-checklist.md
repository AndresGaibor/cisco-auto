# Checklist de Validación de Routing

1. **Verificar interfaces activas y con IP:**
   - `show ip interface brief`
   - Confirma que todas las interfaces relevantes estén up y con IP correcta.

2. **Verificar tabla de routing:**
   - `show ip route`
   - Revisa que existan rutas para todas las redes necesarias.

3. **Verificar protocolos de routing:**
   - `show running-config | section router`
   - `show ip protocols`
   - Confirma que el protocolo (OSPF, EIGRP, etc.) esté configurado y activo.

4. **Verificar vecinos de routing:**
   - OSPF: `show ip ospf neighbor`
   - EIGRP: `show ip eigrp neighbors`
   - BGP: `show ip bgp summary`

5. **Verificar rutas por defecto (si aplica):**
   - `show ip route 0.0.0.0`
   - Confirma que la ruta por defecto esté presente y activa.

6. **Verificar NAT (si aplica):**
   - `show ip nat translations`
   - `show running-config | section nat`

7. **Prueba de conectividad extremo a extremo:**
   - Realiza ping entre dispositivos de diferentes redes/VLANs.

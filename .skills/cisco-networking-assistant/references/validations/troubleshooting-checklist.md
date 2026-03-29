# Checklist de Troubleshooting General

1. **Recopilar síntomas y alcance:**
   - ¿Qué no funciona? ¿Quién está afectado? ¿Desde cuándo?

2. **Verificar conectividad física:**
   - Observa cables en Packet Tracer (verde = OK, naranja/rojo = problema)
   - `show ip interface brief`
   - `show interfaces status`

3. **Verificar configuración IP:**
   - `show running-config`
   - `show ip interface brief`
   - Confirma IP, máscara y gateway en PCs y dispositivos.

4. **Verificar VLANs y trunking:**
   - `show vlan brief`
   - `show interfaces trunk`

5. **Verificar tabla de routing:**
   - `show ip route`

6. **Verificar ACLs y NAT:**
   - `show access-lists`
   - `show ip nat translations`

7. **Verificar Spanning Tree:**
   - `show spanning-tree`

8. **Pruebas de conectividad:**
   - `ping` y `traceroute` entre dispositivos clave

9. **Analizar resultados y aislar la capa problemática (OSI):**
   - Físico, Enlace, Red, Transporte, Aplicación

10. **Documentar hallazgos y acciones tomadas.**

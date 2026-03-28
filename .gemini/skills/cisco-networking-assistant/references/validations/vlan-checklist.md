# Checklist de Validación de VLANs

1. **Verificar VLANs creadas:**
   - `show vlan brief`
   - Confirma que todas las VLANs requeridas existen y tienen nombre correcto.

2. **Verificar asignación de puertos:**
   - `show vlan brief`
   - Revisa que los puertos estén asignados a la VLAN correcta.

3. **Verificar enlaces trunk:**
   - `show interfaces trunk`
   - Asegúrate de que los enlaces trunk estén activos y transportando las VLANs necesarias.

4. **Verificar estado de interfaces:**
   - `show interfaces status`
   - Busca interfaces administrativamente down o erróneas.

5. **Verificar tabla MAC:**
   - `show mac address-table`
   - Confirma que las MACs de los dispositivos aparecen en la VLAN esperada.

6. **Verificar Spanning Tree:**
   - `show spanning-tree`
   - Revisa que no haya puertos bloqueados inesperadamente.

7. **Prueba de conectividad entre hosts de la misma VLAN:**
   - Realiza ping entre PCs de la misma VLAN.

8. **Verificar configuración de VTP (si aplica):**
   - `show vtp status`
   - Confirma modo y dominio VTP.
